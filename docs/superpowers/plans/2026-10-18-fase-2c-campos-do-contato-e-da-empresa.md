# Fase 2C — Campos do contato e da empresa (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** D1 a D5 de `docs/modulos/2-contatos-e-empresas.md` (seção 4, tabela D), que são o C11, o C13 e a D16 do PRD de Negócios, mais o que ficou "Em breve" para cá: o grupo único "Informações Gerais" da ficha (1H, N3), a subaba "Visualização de campos" da janela da origem (1F), o grupo "Campos do contato" do "Personalizar colunas" (2A, N6), os personalizados no painel de Filtros (2B) e o botão "Campos" da barra de lote (2B, N12). **Frente B** (decisão 9 do roteiro): worktree `wt-frente-b`, migration **9104**. **Dois PRs:** **A** = banco, catálogo por objeto e a janela "Gerenciamento de campos" (D1, D2, D3; Tasks 1–6); **B** = grupos na ficha, colunas, filtros e lote com os personalizados, campos ocultos por origem (D4, D5; Tasks 7–12).

## Decisões delegadas (18/10: o usuário mandou o Claude decidir as perguntas; valem as propostas abaixo, como estão)

| # | Pergunta | Decisão (o que o plano faz) |
|---|---|---|
| Q1 | **"Restringir visibilidade" (D3).** Na Clint o campo fica "Oculto para: {grupos de permissão}". Nós não temos grupos de permissão (resposta 3 do PRD: viram trilha à parte). O plano restringe por **papel mínimo**: "Sempre visível" (padrão), "A partir de atendente", "A partir de gerente", "Só administrador". Quem está abaixo do papel não vê o campo na ficha, nas colunas, nos filtros, no lote nem na exportação. Está bem, ou prefere restringir por pessoas (como a lista de pessoas da 1J)? | N6 |
| Q2 | **"Data e Hora".** A Clint tem 9 tipos (Texto, Número, Monetário, Texto Rico, Telefone, Seleção, Múltipla seleção, Data, Data e Hora). O nosso motor não tem "data e hora". O plano acrescenta o tipo `datetime` ao esquema do original (dois encaixes pequenos) e o edita com o `SeletorDeDataEHora` da 1I. "Texto Rico" vira o nosso `textarea` (sem formatação). Está bem? | N4 |
| Q3 | **Campos do contato de hoje (resposta 5 do PRD).** Como desde a 1F-a o contato usa as definições do catálogo do **negócio**, a migração copia para o catálogo do contato só as chaves que têm valor gravado em algum contato (mesma chave e definição). As outras não viram campo do contato. CPF ("Documento"), nascimento e Instagram viram campos fixos do grupo "Informações Gerais". Confirma? | N3 |
| Q4 | **Quadro (D5).** O filtro do quadro roda no navegador sobre os negócios carregados, que não trazem os campos personalizados do contato. Levar os personalizados do contato ao filtro do quadro exige avaliar no servidor (a função da 1D). O plano **deixa o quadro para uma task curta depois da 2E**, e entrega agora a lista de contatos (colunas e filtros), a barra de lote e a ficha. Está bem? | Fora desta fase, registrado no PRD |
| Q5 | **Grupo de origens.** A Clint tem "Utilizar a mesma configuração do grupo" na Visualização de campos. O plano grava a configuração da origem em `settings.escale_campos_ocultos` e, com a caixinha marcada, lê a do grupo em `crm_pipeline_groups.settings` com a mesma chave. Editar a do grupo fica na janela do grupo **se ela já tiver seções** (a 1J pôs a lista de pessoas do grupo em algum lugar; a Task 11 confere). Se não houver janela do grupo, a caixinha fica desligada com "Em breve". Está bem? | N9 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código e os textos da Clint, citados abaixo):
1. ❌ "Gerenciamento de campos" (lista de campos de um objeto, um grupo aberto, "Adicionar campo" clicado, o ⋮ de um campo, "Restringir visibilidade" aberto, a confirmação de excluir).
2. ❌ A subaba "Visualização de campos" da janela da origem (as chaves de ligar e desligar, "Utilizar a mesma configuração do grupo").
3. ❌ A barra de lote com "Campos" aberto já existe (2b-32 e 2b-33).

**Goal:** Os campos personalizados passam a ter **três catálogos da organização** (negócio, contato e empresa), com **grupos**, **visibilidade por papel** e uma janela "Gerenciamento de campos" igual à da Clint. O contato deixa de depender do funil padrão; a empresa nasce com os oito campos da Clint; os campos aparecem com grupos nas abas Contato, Empresa e Negócio da ficha, nas colunas e nos filtros da lista de contatos e no "Campos" da barra de lote; cada origem esconde campos. Sem a casca, nada muda.

**Architecture:**
- **Banco (9104):** tabela `crm_grupos_de_campos` (um grupo por objeto e organização) e tabela `crm_campos_do_crm` (campos de **contato** e **empresa**, mesma forma de `definicao` da 9006). O catálogo do **negócio** continua em `crm_campos_do_negocio` (os gatilhos da 9006 seguem projetando em `settings.fields`), que ganha as colunas `grupo_id` e `papel_minimo`. `companies` ganha `custom_fields jsonb`. A função `fn_escale_campo_valido` passa a aceitar `datetime`. A `fn_escale_semear_campos_padrao(p_org)` cria "Informações Gerais" nos três objetos e os quatro campos padrão da empresa (Site, Categoria, Segmento, Número de funcionários; os outros quatro são colunas). A migração roda a semente em toda organização e copia as chaves do contato (Q3). A 9103 ganha as ações `alterar_campo` e `limpar_campo`.
- **Catálogo (TS):** `lib/escale/campos/regras.ts` (objetos, tipos da Clint, chave a partir do nome, campos fixos, visibilidade) e `lib/escale/campos/banco.ts` (ler e gravar nos dois lugares). Rotas `GET /api/v1/campos-do-crm?objeto=` (viewer, já filtrado pelo papel), `POST` (admin), `PATCH/DELETE /api/v1/campos-do-crm/[id]`, `POST/PATCH/DELETE /api/v1/campos-do-crm/grupos[/id]`, `PUT /api/v1/campos-do-crm/ordem`.
- **Telas:** `JanelaDeGerenciarCampos` (abas Contato, Empresa e Negócio; grupos à esquerda com arraste; lista de campos; "Adicionar campo" com o formulário da Clint; "Adicionar grupo"; ⋮ com Editar nome, Restringir visibilidade, Usar como variável, Copiar identificador, Excluir). A `CamposDaFicha` ganha grupos de verdade. A lista de contatos ganha os personalizados nas colunas, nos filtros e no "Campos" do lote. A janela da origem ganha a subaba "Visualização de campos".

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix (Dialog, Popover, DropdownMenu), `@hello-pangea/dnd`, zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (RLS, funções invoker e uma definer fechada).

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 1g-02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-02-aba-contato.jpg | aba Contato com os grupos à esquerda ("Informações Gerais", "Kaio IA"), "Ocultar vazios", "Gerenciar campos", "Pesquisar campos..." | 8 |
| 1g-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-03-aba-empresa.jpg | aba Empresa com os oito campos padrão | 8 |
| 1g-04 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-04-aba-negocio-grupos-de-campos.jpg | aba Negócio com nove grupos à esquerda (o grupo ativo tem barra lilás e fundo claro) | 8 |
| 2b-21 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-21-campos-grupos.jpg | seletor de campo do filtro com os grupos Contato, Negócio e Empresa | 10 |
| 2b-22 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-22-campos-contato.jpg | o grupo Contato aberto: Documento, Nome, Cargo, Email, Notas do contato, Telefone, Link da conversa Manychat (campos fixos e personalizados misturados, em ordem alfabética) | 10 |
| 2b-32 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-32-campos-em-massa.jpg | "Campos" da barra de lote aberto | 12 |
| 2b-33 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-33-campos-em-massa-valor.jpg | "Campos" com o campo escolhido e o valor | 12 |
| v2-14 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-14-personalizar-empresa.png | lista de campos com interruptores agrupados por objeto (o visual da Visualização de campos) | 11 |
| F01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1f\2026-10-16-03-geral-visualizacao-aberta.jpg | a janela da origem na casca superior, com "Visualização de campos" no menu | 11 |

### Medidas (prints 1g em 1:1)

| Peça | Medida |
|---|---|
| Coluna dos grupos (1g-04) | 238px de largura (já é a da `CamposDaFicha`); cada grupo 38px de altura, texto 13px `casca-texto`; o ativo com barra de 2px `casca-marca` à esquerda, fundo `casca-marca-suave` e texto 500 |
| Janela "Gerenciamento de campos" (código `FieldsConfigTab`) | `JanelaDaCasca` de `min(960px,100%)`, altura `min(680px, 92vh)`; título 16px/500 "Gerenciamento de campos" e subtítulo 12px `casca-suave` "Campos cadastrados"; abas `AbasDaCasca` Contato / Empresa / Negócio; à direita "Adicionar grupo" (`BotaoDaCasca variante="novo"`) e "Adicionar campo" (`variante="marca"`) |
| Linha de campo (código `FieldsConfig`) | 48px; alça ⠿ 16px `casca-meta`; ícone do tipo 15px; nome 13px/500; identificador 11px `casca-suave` em fonte mono; pílula de visibilidade 11px ("Sempre visível" cinza, "Restrito para {papel}" `casca-marca-suave`); ⋮ 18px |
| Formulário "Adicionar campo" (código `AddFieldForm`) | três pílulas de objeto (ícone 22 + rótulo 12px/500, borda `casca-marca` na ativa); "Nome do campo" `CampoDeTexto`; "Grupo" `SeletorDaCasca aparencia="janela"` + botão de "+" 24px com a dica "Adicionar um grupo"; "Tipo do campo" em grade de 5 colunas (`md`), cartões de 64px com ícone 18 `casca-marca` e rótulo 11px/500; "Opções de seleção" com alça, número, `CampoDeTexto` e X, e "Nova opção" em `casca-marca` |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (linhas 192–208, 8223–8248, 8279–8289, 8926–8934) e dos bundles `raw-v2\js\AddFieldForm-QPytJAXT.js.txt`, `index-Df550LdA.js.txt`, `index-CTaP4T6N.js.txt` e `fields-BMMAGjVh.js.txt`:

- **Janela:** "Gerenciamento de campos"; "Campos cadastrados"; "Adicionar campo"; "Adicionar grupo"; "Contato"; "Empresa"; "Negócio"; "Nenhum campo neste grupo"; "Adicione um campo para começar a coletar informações neste grupo."; "Nenhum campo encontrado"; "Tente ajustar o termo da busca ou limpar o filtro."; "Arraste para reordenar os grupos"; "Nome do campo"; "Identificador"; "Editar nome do campo"; "Não é possível editar um campo padrão do sistema"; "Copiar identificador"; "Identificador copiado!"; "Usar como variável"; "Restringir visibilidade"; "Restrito para"; "Sempre visível"; "Sem restrição"; "Oculto para: {groups}"; "A exclusão desse campo remove em toda origem. Deseja continuar?"; "Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida."; "As alterações foram salvas com sucesso!"; "Ocorreu um erro ao salvar".
- **Formulário:** "Estou criando um campo para:"; "Nome do campo"; "Ex: Linkedin"; "Ex: Número de funcionários"; "Ex: Projeto interessado"; "Grupo"; "Selecione um grupo"; "Adicionar um grupo"; "Nome do Grupo"; "Digite para criar um novo grupo"; "O nome do grupo é obrigatório!"; "Tipo do campo"; "Texto"; "Número"; "Monetário"; "Texto Rico"; "Telefone"; "Seleção"; "Múltipla seleção"; "Data"; "Data e Hora"; "Opções de seleção"; "Nova opção"; "Já existe um outro campo com o nome informado, o campo deve ser único."; "Este grupo foi removido. Atualize a página e tente novamente.".
- **Campos padrão da empresa** (`fields-BMMAGjVh`): "Nome da empresa", "URL" (rótulo da Clint para o site; na ficha ela mostra "Site", 1g-03, e é esse que usamos), "Cidade", "Estado", "Categoria", "Segmento", "Número de funcionários", "CNPJ".
- **Visualização de campos** (`HiddenFields`): "Visualização de campos"; "Configure aqui a sua visualização de campos."; "Os campos desativados ficarão ocultos na origem."; "Campos preenchidos e/ou campos de Checkout não serão ocultos."; "Utilizar a mesma configuração do grupo"; "Se marcada essa opção, a configuração no grupo desta origem será priorizada"; "Ocorreu um erro ao carregar os dados"; "Ocorreu um erro ao salvar as alterações!".
- **Lote** (`FieldsBulkPopover`): "Campos"; "Selecione uma opção"; "Digite o valor"; e os do print 2b-32: "Alterar campo", "Limpar campo", "Aplicar".
- **Ficha** (`FieldsTab`, já na 1H): "Ocultar vazios", "Gerenciar campos", "Pesquisar campos...", "Nenhum campo encontrado", "Exibir grupos ocultos", "Esconder grupos ocultos", "Ocultos".
- **Textos nossos** (a Clint não tem): os papéis da visibilidade ("A partir de atendente", "A partir de gerente", "Só administrador"); "Campos preenchidos não serão ocultos." (sem "Checkout", que não existe aqui); "Esse campo é padrão e não pode ser excluído."; "Variável copiada!".

### Comportamento da Clint conferido no código

- **Chave do campo** (`AddFieldForm`, função `Te`): nome → NFD sem acentos → minúsculas → sem pontuação → espaços viram `_` → `__` vira `_` → no máximo 20 caracteres → sem `_` no fim; se a chave já existe no objeto (ou é `ddi`, `valid_phone`, `duplicate_phone`, `whatsapp_number`), ganha `_1`, `_2`… **O nome é único por objeto** ("Já existe um outro campo com o nome informado"). O grupo é obrigatório; o novo campo entra no fim do grupo (`order` = último + 1). O exemplo do placeholder muda com o objeto.
- **Grupo novo** (`AddFieldGroup`): chave pela mesma régua; se já existe, `_2`. Criado inline, de dentro do formulário do campo, e já selecionado.
- **Gerenciamento** (`FieldsConfigTab`): abas CONTACT, ORGANIZATION e DEAL; a mesma tela abre como modal (`isModal`) a partir do "Gerenciar campos" da ficha; a permissão é `OWNER_DEAL_CONFIG` (aqui: administrador). Por campo: editar nome (campo padrão não edita), restringir visibilidade, "Usar como variável" (copia `{{objeto.chave}}` para colar em mensagens) e "Copiar identificador"; excluir com os dois avisos. Grupos reordenam por arraste.
- **Visualização de campos** (`HiddenFields`, `index-CTaP4T6N`): abas Contato, Negócio e Empresa (nessa ordem); um interruptor por campo; `settings.hidden_fields` guarda os **desligados**; a caixinha "Utilizar a mesma configuração do grupo" faz valer a do grupo (`originGroup.settings.hidden_fields`); "Campos preenchidos … não serão ocultos" (campo com valor continua aparecendo).
- **Ficha** (`FieldsTab`, 1H): os grupos vêm de `fields_template[objeto].groups`; cada campo tem `group`; há "Exibir grupos ocultos" quando algum grupo ficou vazio pelo "Ocultar vazios".

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Dois PRs** (A: Tasks 1–6; B: Tasks 7–12), o B nasce da `escale-crm/main` depois do merge do A. Sem rodada cheia nem `test:db` completo entre eles: a bateria é uma só, no fim da Frente B (regra "executa tudo, testa tudo, publica tudo", 18/10) | política em vigor |
| N2 | **Três catálogos, duas tabelas.** O negócio fica em `crm_campos_do_negocio` (os gatilhos da 9006 projetam em `settings.fields`, e 30 leitores dependem disso); contato e empresa vão para `crm_campos_do_crm` com a coluna `objeto`. Os grupos ficam numa tabela só, `crm_grupos_de_campos`, com `objeto`. `lib/escale/campos/banco.ts` esconde a diferença | não mexer no que a 1F-a estabilizou |
| N3 | **Migração do contato (Q3):** para cada organização, as chaves de `contacts.custom_fields` (sem `link_*`) que existem em `crm_campos_do_negocio` viram campos do contato com a mesma chave e definição, no grupo "Informações Gerais". Os valores não mudam. **Campos fixos do contato:** Nome, Telefone, Email, Instagram, Documento (CPF, só leitura: o CPF é cifrado e tem rota própria) e Data de nascimento, mais os links da 1H. **Fixos da empresa:** Nome da empresa (`trade_name`), Cidade (`city`), Estado (`state`), CNPJ (`cnpj`). Fixos não aparecem na janela de gerenciamento como editáveis ("Não é possível editar um campo padrão do sistema"), mas aparecem para ordenar e restringir | resposta 5 do PRD; `fields-BMMAGjVh` |
| N4 | **Tipos (Q2):** TEXT→`text`, NUMBER→`number`, CURRENCY→`currency`, RICH_TEXT→`textarea`, PHONE→`phone`, SELECT→`select`, MULTIPLE_SELECT→`multiselect`, DATE→`date`, DATETIME→`datetime` (novo no `customFieldSchema` e na `fn_escale_campo_valido`; o editor do original cai em `<input type="datetime-local">`; a ficha usa o `SeletorDeDataEHora`). Os tipos do original sem par na Clint (`boolean`, `email`, `url`) continuam válidos e aparecem com ícone próprio, mas a janela não os oferece ao criar | igual à Clint; o motor não quebra |
| N5 | **Chave e nome** pela régua da Clint (`chaveDoNome`), gerada no servidor; nome único por objeto (422 com o texto da Clint); no máximo 200 campos por objeto (`CAMPOS_DO_CRM_MAX`) e 30 grupos | `AddFieldForm` |
| N6 | **Visibilidade (Q1):** `papel_minimo` nulo (sempre visível) ou `agent` / `manager` / `admin`. O `GET` do catálogo já devolve só o que o papel de quem pede vê; a ficha, as colunas, os filtros, o lote e a exportação consomem o `GET`. Um campo oculto para o papel não é gravável pela ficha (a rota do contato não valida chave a chave: a trava é de tela, como na Clint) | resposta 3 do PRD |
| N7 | **Quem gerencia:** administrador (`podeAdministrarEmpresa`), como a 1F-a. A RLS de `crm_campos_do_crm` e de `crm_grupos_de_campos` é a mesma da 9006 (todo membro lê, admin escreve). As rotas escrevem com a sessão | PRD §5 |
| N8 | **Excluir campo:** some do catálogo e das regras de obrigatório das origens (o gatilho da 9006 já faz isso para o negócio); os valores gravados ficam no banco sem aparecer (1F-a Q5). Campo `padrao` não se exclui nem se renomeia. Excluir grupo move os campos dele para "Informações Gerais" (o grupo padrão não se exclui) | Clint; 1F-a |
| N9 | **Ocultos por origem (Q5):** `settings.escale_campos_ocultos = { usar_do_grupo: boolean, contato: chave[], negocio: chave[], empresa: chave[] }`, seção nova `campos_visiveis` da rota de configurações (só admin, como `campos`). Efeito: nas abas da ficha de um negócio daquela origem, o campo oculto **sem valor** some; com valor, aparece (texto da Clint). Não mexe em colunas, filtros, capa nem exportação | `HiddenFields` |
| N10 | **Ficha com grupos:** `CamposDaFicha` recebe `grupos` e cada `CampoEditavel` ganha `grupo` (chave). O grupo ativo filtra a lista; a busca procura em todos; "Ocultar vazios" pode esvaziar um grupo, e aí ele some da coluna e aparece "Exibir grupos ocultos" (Clint). "Gerenciar campos" abre a `JanelaDeGerenciarCampos` já na aba do objeto (admin); para os outros, desligado com a dica da 1H | 1g-02/03/04 |
| N11 | **Colunas e filtros da lista de contatos:** o grupo "Campos do contato" do "Personalizar colunas" e o grupo "Contato" do seletor de campo do filtro passam a listar os fixos + os do catálogo (visíveis ao papel), em ordem alfabética como a Clint (2b-22). A linha ganha `campos: Record<string, unknown>`; a célula mostra pelo tipo (`valorParaLeitura`). O servidor já avalia `custom_fields -> chave` (9102) | 2A N6; 2B |
| N12 | **Lote "Campos":** ações novas `alterar_campo` e `limpar_campo` em `crm_acoes_em_massa` (9104 troca a `check`); o executor lê o contato, mescla `custom_fields` e grava pelo `patchContactHandler` (que substitui o objeto inteiro) | 2B N12; prints 2b-32/33 |
| N13 | **Aba Empresa** continua só leitura nesta fase (os valores chegam com o vínculo da 2D), mas já lista os campos do catálogo da empresa com grupos e "Gerenciar campos" ligado | 2D depende disto |
| N14 | **Uma migration (9104)**, mesmo SQL no `baseline.sql` depois do bloco da 9103 | regra 7 do roteiro |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo` (**da Frente A**: não troque de branch nele, não faça stash, não mexa nos arquivos). **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b` (hoje na `feat/fase-2b-acoes-em-massa`, já mergeada). Todo comando roda dentro dela.
- **Branches:** PR A `feat/fase-2c-catalogo-de-campos`; PR B `feat/fase-2c-campos-na-casca`. Cada uma de `escale-crm/main` (a Task 1 e a Task 7 provam).
- **Base:** `escale-crm/main` com a 2B inteira (PRs #28 e #34) e a 1J (#33). A 1K não precisa estar mergeada. A última migration da Frente B é a 9103.
- **Migration:** **9104**, `supabase/migrations/20261102120000_9104_campos_por_objeto.sql`. Antes de criar: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se 9104 já existir em outra branch, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`. **Merge direto na `main` ao terminar cada PR** (regra de 18/10), sem esperar o check de imagem.
- **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção no meio da frente.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só na Task 2, com o arquivo novo e as varreduras; precisa do Docker Desktop (se `docker info` falhar, PARE e peça ao usuário).

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2C`. Sem a casca, nenhum deles muda o comportamento (o `datetime` só aparece se alguém criar um campo desse tipo).

| Arquivo | Mudança | PR |
|---|---|---|
| `supabase/baseline.sql` | bloco da 9104 logo depois do bloco da 9103 e antes de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` | A |
| `lib/schemas/settings.ts` | `"datetime"` no `type` do `customFieldSchema` (L157–216) | A |
| `components/contacts/CustomFieldsEditor.tsx` | `"datetime"` no `CustomFieldType` (L31–59) e um ramo `type === "datetime"` com `<Input type="datetime-local">` | A |
| `lib/i18n/dicionario.ts` | blocos novos logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` | A, B |
| `lib/audit/actions.ts` | ações novas logo depois de `"contacts.export_downloaded",` | A, B |
| `tests/invariants/rls-completude-varredura.test.ts` | duas entradas em `PROVA_PROPRIA`, logo depois da de `crm_campos_do_negocio` | A |

Os do fork que mudam: `lib/escale/negocio/campos.ts`, `components/escale/negocio/abas/{CamposDaFicha,AbasDeCampos,EditorDeCampo}.tsx`, `lib/escale/contatos/{regras,filtros,lista,opcoes-do-filtro,origens-da-pagina}.ts`, `components/escale/contatos/{PainelDeColunas,CelulasDoContato}.tsx`, `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx`, `components/escale/contatos/massa/{BarraDeLote,AcoesEmMassa}.tsx`, `lib/escale/massa/{tipos,executar}.ts`, `lib/escale/configuracoes/{gravar,tipos,rascunho,montar}.ts`, `components/escale/configuracoes/JanelaDaOrigem.tsx`, `app/api/v1/pipelines/[id]/configuracoes/route.ts`, `lib/ui/icons-da-casca.ts`.

**Conflito esperado com a Frente A (1K):** `baseline.sql`, `dicionario.ts`, `actions.ts`, `JanelaDaOrigem.tsx` e `lib/escale/configuracoes/*`. Antes de cada PR: `git fetch escale-crm && git rebase escale-crm/main`, mantendo os dois blocos (o da `main` primeiro).

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` | um grupo só "Informações Gerais"; "Gerenciar campos" como link para `/app/settings/tenant/pipelines`; a Empresa com "Em breve" | grupos de verdade e a janela (Task 8) |
| `tests/unit/escale-painel-de-colunas.test.tsx` | o grupo "Campos do contato" com os itens de `CAMPOS_DO_CONTATO_2A` | ganha o catálogo (Task 9) |
| `tests/unit/escale-barra-e-acoes-em-massa.test.tsx` | "Campos" desligado "Em breve" | liga (Task 12) |
| `tests/unit/escale-campos-do-crm-migration.test.ts` | a lista de tipos válidos da `fn_escale_campo_valido` | ganha `datetime` (Task 2) |
| `tests/unit/escale-acoes-em-massa-migration.test.ts` | a `check` de `acao` com cinco valores | ganha duas (Task 2) |

### Cercas que precisam ficar verdes

- `controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`, `evidencia-citada`, `escale-casca-v2-original-intacto`, `navegacao-completude` (nenhuma `page.tsx` nova: a janela é modal), `i18n-espanhol-cobre-a-tela` (Tasks 6 e 12), `rls-completude-varredura`, `rbac-config-ia-canais`, `travas-de-suporte-cobrem-toda-tabela-na-instalacao`, `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura` (a `fn_escale_semear_campos_padrao` é definer fechada a `public`, `anon` e `authenticated`), `manifest-x-migrations`, `tabelas-do-motor-nao-se-leem-pelo-login`, `dispatcher-org-parada` (o consumidor da 2B não muda de nome), `audit-lista-do-painel-e-derivada`.

### Verificação (regra de 18/10: executa tudo, testa tudo, publica tudo)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados (`grep -rlF` como na 2B), typecheck e eslint dos arquivos alterados. Prettier só nos arquivos novos.
2. **`test:db`:** só na Task 2 (arquivo novo + varreduras de RLS/definer + `escale-campos-do-crm` + `escale-acoes-em-massa`).
3. **Nenhuma rodada cheia e nenhum revisor por PR.** A bateria (unitários cheios, `test:db`, `test:db:update`) e a revisão (um revisor Opus 5.5 para a frente inteira) ficam para o fim da Frente B, no plano da 2F.
4. **Conferência visual** uma vez por módulo, na fase de testes, em app.escaleia.com com a casca ligada.
5. Comandos longos sempre em segundo plano.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` e o PRD para `docs/escale/modulos/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/campos/regras.ts` | novo | A | objetos, tipos da Clint, `chaveDoNome`, campos fixos, visibilidade, `camposPorGrupo`, tipos TS do catálogo |
| `supabase/migrations/20261102120000_9104_campos_por_objeto.sql`, `supabase/baseline.sql` | novo / bloco | A | grupos, campos por objeto, colunas novas, semente, migração do contato, `datetime`, ações do lote |
| `lib/schemas/settings.ts`, `components/contacts/CustomFieldsEditor.tsx` | encaixes | A | `datetime` |
| `lib/escale/campos/banco.ts` | novo | A | ler e gravar o catálogo nas duas tabelas; semear |
| `app/api/v1/campos-do-crm/route.ts`, `[id]/route.ts`, `grupos/route.ts`, `grupos/[id]/route.ts`, `ordem/route.ts` | novos | A | rotas do catálogo |
| `hooks/escale/useCatalogoDeCampos.ts` | novo | A | ler e mudar o catálogo |
| `components/escale/campos/{JanelaDeGerenciarCampos,ListaDeCampos,FormularioDeCampo,FormularioDeGrupo,BalaoDeVisibilidade,IconeDoTipo}.tsx` | novos | A | a janela da Clint |
| `lib/ui/icons-da-casca.ts` | alterado | A | ícones dos tipos e da janela |
| `lib/escale/negocio/campos.ts`, `components/escale/negocio/abas/{CamposDaFicha,AbasDeCampos,EditorDeCampo}.tsx` | alterados | B | grupos na ficha, `datetime`, catálogos do contato e da empresa, janela no "Gerenciar campos" |
| `lib/escale/campos/ocultos.ts` | novo | B | ler e aplicar `escale_campos_ocultos` |
| `lib/escale/contatos/{regras,filtros,lista,opcoes-do-filtro,origens-da-pagina}.ts`, `components/escale/contatos/{PainelDeColunas,CelulasDoContato}.tsx`, `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx` | alterados | B | personalizados nas colunas e nos filtros |
| `lib/escale/massa/{tipos,executar}.ts`, `components/escale/contatos/massa/{BarraDeLote,AcoesEmMassa,PainelDeCampos}.tsx` | alterados / novo | B | "Campos" do lote |
| `lib/escale/configuracoes/{tipos,gravar,montar,rascunho}.ts`, `components/escale/configuracoes/{JanelaDaOrigem,SecaoCamposVisiveis}.tsx`, `app/api/v1/pipelines/[id]/configuracoes/route.ts` | alterados / novo | B | subaba "Visualização de campos" |
| `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `tests/invariants/rls-completude-varredura.test.ts` | alterados | A, B | ações, espanhol, varredura |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` | alterado (fora do repositório) | A, B | linha da 2C na seção 8 |

---

# PR A — Catálogo por objeto e a janela "Gerenciamento de campos" (D1, D2, D3)

### Task 1: Worktree, base e as regras puras do catálogo

**Files:**
- Create: `lib/escale/campos/regras.ts`, `tests/unit/escale-campos-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-18-fase-2c-campos-do-contato-e-da-empresa.md`; o PRD para `docs/escale/modulos/2-contatos-e-empresas.md`

**Interfaces:**
- Produces: `OBJETOS_DE_CAMPO`, `ObjetoDeCampo`, `TIPOS_DA_CLINT`, `TipoDaClint`, `tipoDoMotor(tipoDaClint)`, `chaveDoNome(nome, existentes)`, `GRUPO_PADRAO`, `NOME_DO_GRUPO_PADRAO`, `PAPEIS_DE_VISIBILIDADE`, `PapelMinimo`, `visivelPara(papelMinimo, papel)`, `CAMPOS_FIXOS_DO_CONTATO`, `CAMPOS_FIXOS_DA_EMPRESA`, `CampoFixo`, `GrupoDeCampos`, `CampoDoCatalogo`, `Catalogo`, `camposPorGrupo(catalogo)`, `GRUPOS_MAX = 30`, `variavelDoCampo(objeto, chave)`.

- [ ] **Step 1: Worktree e base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm
git switch -c feat/fase-2c-catalogo-de-campos escale-crm/main
git log --oneline -1 escale-crm/main
ls supabase/migrations | grep -E "_910[0-9]_"
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: a `main` tem o merge do PR #34; a lista mostra 9101, 9102 e 9103 e **nenhuma 9104**. Copie este plano e o PRD para o repositório (`mkdir -p docs/superpowers/plans docs/escale/modulos`).

- [ ] **Step 2: O teste das regras (vai falhar)**

Create `tests/unit/escale-campos-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  CAMPOS_FIXOS_DA_EMPRESA,
  CAMPOS_FIXOS_DO_CONTATO,
  GRUPO_PADRAO,
  OBJETOS_DE_CAMPO,
  TIPOS_DA_CLINT,
  camposPorGrupo,
  chaveDoNome,
  tipoDoMotor,
  variavelDoCampo,
  visivelPara,
} from "@/lib/escale/campos/regras";

describe("regras do catálogo de campos (Fase 2C)", () => {
  it("os três objetos, na ordem da Clint", () => {
    expect(OBJETOS_DE_CAMPO).toEqual(["contato", "empresa", "negocio"]);
  });

  it("chave pela régua da Clint: sem acento, minúscula, _ no lugar de espaço, 20 caracteres", () => {
    expect(chaveDoNome("Número de funcionários", [])).toBe("numero_de_funcionari");
    expect(chaveDoNome("Projeto  interessado!", [])).toBe("projeto_interessado");
    expect(chaveDoNome("Linkedin", ["linkedin"])).toBe("linkedin_1");
    expect(chaveDoNome("Linkedin", ["linkedin", "linkedin_1"])).toBe("linkedin_2");
    expect(chaveDoNome("ddi", [])).toBe("ddi_1");
    expect(chaveDoNome("   ", [])).toBeNull();
    expect(chaveDoNome("123 abc", [])).toBe("c_123_abc");
  });

  it("os nove tipos da Clint viram tipos do motor", () => {
    expect(TIPOS_DA_CLINT.map((t) => t.chave)).toEqual([
      "TEXT", "NUMBER", "CURRENCY", "RICH_TEXT", "PHONE", "SELECT", "MULTIPLE_SELECT", "DATE", "DATETIME",
    ]);
    expect(tipoDoMotor("RICH_TEXT")).toBe("textarea");
    expect(tipoDoMotor("DATETIME")).toBe("datetime");
  });

  it("visibilidade por papel mínimo", () => {
    expect(visivelPara(null, "viewer")).toBe(true);
    expect(visivelPara("agent", "viewer")).toBe(false);
    expect(visivelPara("manager", "agent")).toBe(false);
    expect(visivelPara("manager", "manager")).toBe(true);
    expect(visivelPara("admin", "manager")).toBe(false);
    expect(visivelPara("admin", "admin")).toBe(true);
  });

  it("campos fixos: contato e empresa", () => {
    expect(CAMPOS_FIXOS_DO_CONTATO.map((c) => c.chave)).toEqual([
      "nome", "telefone", "email", "instagram", "documento", "nascimento",
    ]);
    expect(CAMPOS_FIXOS_DA_EMPRESA.map((c) => c.chave)).toEqual(["nome", "cidade", "estado", "cnpj"]);
  });

  it("agrupa pelo grupo, com os sem grupo em Informações Gerais, na ordem", () => {
    const grupos = camposPorGrupo({
      grupos: [
        { id: "g1", chave: GRUPO_PADRAO, nome: "Informações Gerais", posicao: 0, padrao: true },
        { id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
      ],
      campos: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "g2", papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "notas", definicao: { label: "Notas", type: "textarea" }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    expect(grupos.map((g) => [g.grupo.chave, g.campos.map((c) => c.chave)])).toEqual([
      [GRUPO_PADRAO, ["notas"]],
      ["kaio_ia", ["cargo"]],
    ]);
  });

  it("a variável do campo é {{objeto.chave}}", () => {
    expect(variavelDoCampo("contato", "cargo")).toBe("{{contato.cargo}}");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campos-regras.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: As regras**

Create `lib/escale/campos/regras.ts`:

```ts
/**
 * Regras puras do catálogo de campos por objeto (Fase 2C).
 *
 * Três objetos (contato, empresa, negócio), grupos, visibilidade por papel
 * mínimo e a régua da Clint para a chave a partir do nome (AddFieldForm).
 */
import type { CustomFieldDef } from "@/lib/schemas/settings";
import { ROLE_RANK, type Role } from "@/lib/auth/types";

export const OBJETOS_DE_CAMPO = ["contato", "empresa", "negocio"] as const;
export type ObjetoDeCampo = (typeof OBJETOS_DE_CAMPO)[number];

export const ROTULO_DO_OBJETO: Record<ObjetoDeCampo, string> = {
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
};

/** Tipos oferecidos ao criar, na ordem e com os rótulos da Clint. */
export const TIPOS_DA_CLINT = [
  { chave: "TEXT", rotulo: "Texto", motor: "text" },
  { chave: "NUMBER", rotulo: "Número", motor: "number" },
  { chave: "CURRENCY", rotulo: "Monetário", motor: "currency" },
  { chave: "RICH_TEXT", rotulo: "Texto Rico", motor: "textarea" },
  { chave: "PHONE", rotulo: "Telefone", motor: "phone" },
  { chave: "SELECT", rotulo: "Seleção", motor: "select" },
  { chave: "MULTIPLE_SELECT", rotulo: "Múltipla seleção", motor: "multiselect" },
  { chave: "DATE", rotulo: "Data", motor: "date" },
  { chave: "DATETIME", rotulo: "Data e Hora", motor: "datetime" },
] as const;
export type TipoDaClint = (typeof TIPOS_DA_CLINT)[number]["chave"];
export type TipoDoMotor = CustomFieldDef["type"];

export function tipoDoMotor(tipo: TipoDaClint): TipoDoMotor {
  return TIPOS_DA_CLINT.find((t) => t.chave === tipo)!.motor;
}

/** Rótulo (da Clint) de um tipo do motor; os sem par na Clint têm rótulo nosso. */
export const ROTULO_DO_TIPO: Record<TipoDoMotor, string> = {
  text: "Texto",
  number: "Número",
  currency: "Monetário",
  textarea: "Texto Rico",
  phone: "Telefone",
  select: "Seleção",
  multiselect: "Múltipla seleção",
  date: "Data",
  datetime: "Data e Hora",
  boolean: "Sim ou não",
  email: "E-mail",
  url: "Link",
};

export const CHAVE_MAX = 20;
export const GRUPOS_MAX = 30;
export const GRUPO_PADRAO = "informacoes_gerais";
export const NOME_DO_GRUPO_PADRAO = "Informações Gerais";

/** Chaves que a Clint reserva e que aqui colidem com colunas ou links. */
const RESERVADAS = new Set(["ddi", "valid_phone", "duplicate_phone", "whatsapp_number", "id", "nome", "telefone", "email"]);

/**
 * A régua da Clint (AddFieldForm `Te`): sem acento, minúscula, sem pontuação,
 * espaço vira `_`, `__` vira `_`, 20 caracteres, sem `_` no fim; se já existe,
 * `_1`, `_2`… Chave que começa com dígito ganha `c_` (a nossa check exige letra).
 */
export function chaveDoNome(nome: string, existentes: readonly string[]): string | null {
  let chave = nome
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[`~!@#$%^&*()|+\-=?;:'",.<>{}[\]\\/]/g, "")
    .trim()
    .replace(/\s+/g, "_")
    .replace(/_+/g, "_");
  if (!chave) return null;
  if (/^\d/.test(chave)) chave = `c_${chave}`;
  if (chave.length > CHAVE_MAX) chave = chave.slice(0, CHAVE_MAX);
  chave = chave.replace(/_+$/, "");
  if (!chave) return null;
  const usadas = new Set([...existentes, ...RESERVADAS]);
  const base = chave.replace(/_\d+$/, "");
  let n = 1;
  let final = chave;
  while (usadas.has(final) || final.startsWith("link_")) {
    final = `${base}_${n}`;
    n += 1;
  }
  return final;
}

export const PAPEIS_DE_VISIBILIDADE = ["agent", "manager", "admin"] as const;
export type PapelMinimo = (typeof PAPEIS_DE_VISIBILIDADE)[number];

export const ROTULO_DA_VISIBILIDADE: Record<PapelMinimo | "todos", string> = {
  todos: "Sempre visível",
  agent: "A partir de atendente",
  manager: "A partir de gerente",
  admin: "Só administrador",
};

export function visivelPara(papelMinimo: PapelMinimo | null, papel: Role): boolean {
  if (!papelMinimo) return true;
  return ROLE_RANK[papel] >= ROLE_RANK[papelMinimo];
}

export interface GrupoDeCampos {
  id: string;
  chave: string;
  nome: string;
  posicao: number;
  padrao: boolean;
}

export interface CampoDoCatalogo {
  id: string;
  objeto: ObjetoDeCampo;
  chave: string;
  definicao: Omit<CustomFieldDef, "key">;
  grupo_id: string | null;
  papel_minimo: PapelMinimo | null;
  posicao: number;
  padrao: boolean;
}

export interface Catalogo {
  grupos: GrupoDeCampos[];
  campos: CampoDoCatalogo[];
}

export const CATALOGO_VAZIO: Catalogo = { grupos: [], campos: [] };

/** Campos que são colunas (ou links) e não linhas do catálogo. */
export interface CampoFixo {
  chave: string;
  rotulo: string;
  tipo: TipoDoMotor;
  /** Só leitura na ficha (o CPF é cifrado e tem rota própria). */
  soLeitura?: boolean;
}

export const CAMPOS_FIXOS_DO_CONTATO: readonly CampoFixo[] = [
  { chave: "nome", rotulo: "Nome", tipo: "text" },
  { chave: "telefone", rotulo: "Telefone", tipo: "phone" },
  { chave: "email", rotulo: "Email", tipo: "email" },
  { chave: "instagram", rotulo: "Instagram", tipo: "text" },
  { chave: "documento", rotulo: "Documento", tipo: "text", soLeitura: true },
  { chave: "nascimento", rotulo: "Data de nascimento", tipo: "date" },
];

export const CAMPOS_FIXOS_DA_EMPRESA: readonly CampoFixo[] = [
  { chave: "nome", rotulo: "Nome da empresa", tipo: "text" },
  { chave: "cidade", rotulo: "Cidade", tipo: "text" },
  { chave: "estado", rotulo: "Estado", tipo: "text" },
  { chave: "cnpj", rotulo: "CNPJ", tipo: "text" },
];

/** Os quatro campos padrão da empresa que são linhas do catálogo (semeados pela 9104). */
export const CAMPOS_PADRAO_DA_EMPRESA = [
  { chave: "site", label: "Site", type: "url" },
  { chave: "categoria", label: "Categoria", type: "text" },
  { chave: "segmento", label: "Segmento", type: "text" },
  { chave: "numero_de_funcionarios", label: "Número de funcionários", type: "number" },
] as const;

export interface GrupoComCampos {
  grupo: GrupoDeCampos;
  campos: CampoDoCatalogo[];
}

/** Agrupa na ordem dos grupos; campo sem grupo (ou de grupo sumido) cai no padrão. */
export function camposPorGrupo(catalogo: Catalogo): GrupoComCampos[] {
  const grupos = [...catalogo.grupos].sort((a, b) => a.posicao - b.posicao || a.nome.localeCompare(b.nome));
  const padrao = grupos.find((g) => g.chave === GRUPO_PADRAO) ?? grupos[0];
  const porGrupo = new Map<string, CampoDoCatalogo[]>(grupos.map((g) => [g.id, []]));
  for (const campo of [...catalogo.campos].sort((a, b) => a.posicao - b.posicao || a.chave.localeCompare(b.chave))) {
    const alvo = (campo.grupo_id && porGrupo.get(campo.grupo_id)) || (padrao && porGrupo.get(padrao.id));
    alvo?.push(campo);
  }
  return grupos.map((grupo) => ({ grupo, campos: porGrupo.get(grupo.id) ?? [] }));
}

export function variavelDoCampo(objeto: ObjetoDeCampo, chave: string): string {
  return `{{${objeto}.${chave}}}`;
}

/** Só os campos que o papel enxerga. */
export function catalogoVisivel(catalogo: Catalogo, papel: Role): Catalogo {
  return { grupos: catalogo.grupos, campos: catalogo.campos.filter((c) => visivelPara(c.papel_minimo, papel)) };
}
```

Confira antes de rodar: `ROLE_RANK` e `Role` vêm de `lib/auth/types.ts` (L25–26); `CustomFieldDef["type"]` ainda não tem `datetime` (a Task 2 acrescenta; até lá o typecheck deste arquivo reclama de `ROTULO_DO_TIPO.datetime`: faça a Task 2 Step 5 antes de rodar o typecheck, ou rode só o vitest agora).

- [ ] **Step 4: Rodar o teste**

Run: `corepack pnpm vitest run tests/unit/escale-campos-regras.test.ts`
Expected: PASS (7 testes).

- [ ] **Step 5: Commit**

```bash
git add lib/escale/campos/regras.ts tests/unit/escale-campos-regras.test.ts docs/superpowers/plans/2026-10-18-fase-2c-campos-do-contato-e-da-empresa.md docs/escale/modulos/2-contatos-e-empresas.md
git commit -m "feat(escale): regras do catálogo de campos por objeto (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Migration 9104 — grupos, campos por objeto, semente e `datetime`

**Files:**
- Create: `supabase/migrations/20261102120000_9104_campos_por_objeto.sql`, `tests/unit/escale-campos-por-objeto-migration.test.ts`, `tests/invariants/escale-campos-por-objeto.test.ts`
- Modify: `supabase/baseline.sql` (bloco depois do da 9103), `tests/invariants/rls-completude-varredura.test.ts` (`PROVA_PROPRIA`), `lib/schemas/settings.ts` (`datetime`), `components/contacts/CustomFieldsEditor.tsx` (`datetime`), `tests/unit/escale-campos-do-crm-migration.test.ts` e `tests/unit/escale-acoes-em-massa-migration.test.ts` (as listas que mudam)

**Interfaces:**
- Produces:
  - `public.crm_grupos_de_campos (id, organization_id, objeto, chave, nome, posicao, padrao, created_at, updated_at)`;
  - `public.crm_campos_do_crm (id, organization_id, objeto in ('contato','empresa'), chave, definicao, grupo_id, papel_minimo, posicao, padrao, created_at, updated_at)`;
  - `public.crm_campos_do_negocio` ganha `grupo_id uuid` e `papel_minimo text`;
  - `public.companies.custom_fields jsonb not null default '{}'`;
  - `public.fn_escale_semear_campos_padrao(p_org uuid) returns void` (definer, só `service_role`): grupo padrão nos três objetos e os quatro campos padrão da empresa, idempotente;
  - `public.fn_escale_campo_valido(jsonb)` aceita `datetime`;
  - `crm_acoes_em_massa.acao` aceita `alterar_campo` e `limpar_campo`.

- [ ] **Step 1: Cercas de migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
grep -rlE "_910[0-9]_|9103" tests/unit tests/invariants | sort
```

Leia os arquivos listados procurando regra de numeração contínua ou lista fechada de migrations. Se alguma exigir mudança além das duas listas da tabela "Testes que mudam de propósito", PARE e pergunte.

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-campos-por-objeto-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261102120000_9104_campos_por_objeto.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9104 (campos por objeto)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("cria as duas tabelas com RLS, policies de leitura e de admin", () => {
    for (const tabela of ["crm_grupos_de_campos", "crm_campos_do_crm"]) {
      expect(MIGRATION).toContain(`create table if not exists public.${tabela}`);
      expect(MIGRATION).toContain(`alter table public.${tabela} enable row level security;`);
      expect(MIGRATION).toContain(`create policy ${tabela}_select`);
      expect(MIGRATION).toContain(`create policy ${tabela}_admin_write`);
      expect(MIGRATION).toContain(`revoke all on public.${tabela} from anon;`);
    }
  });

  it("o negócio ganha grupo e papel; a empresa ganha custom_fields", () => {
    expect(MIGRATION).toContain("alter table public.crm_campos_do_negocio add column if not exists grupo_id uuid");
    expect(MIGRATION).toContain("alter table public.crm_campos_do_negocio add column if not exists papel_minimo text");
    expect(MIGRATION).toContain("alter table public.companies add column if not exists custom_fields jsonb not null default '{}'::jsonb");
  });

  it("a semente é definer fechada e a validação aceita datetime", () => {
    expect(MIGRATION).toMatch(/function public\.fn_escale_semear_campos_padrao\(p_org uuid\)[\s\S]*?security definer/);
    expect(MIGRATION).toContain("revoke all on function public.fn_escale_semear_campos_padrao(uuid) from public, anon, authenticated;");
    expect(MIGRATION).toContain("grant execute on function public.fn_escale_semear_campos_padrao(uuid) to service_role;");
    expect(MIGRATION).toMatch(/fn_escale_campo_valido[\s\S]*?'datetime'/);
  });

  it("a check das ações em massa ganha alterar_campo e limpar_campo", () => {
    expect(MIGRATION).toContain("drop constraint if exists crm_acoes_em_massa_acao_valida");
    expect(MIGRATION).toMatch(/acao in \('criar_negocios', ?'incluir_tag', ?'remover_tag', ?'exportar', ?'excluir', ?'alterar_campo', ?'limpar_campo'\)/);
  });

  it("o baseline traz o mesmo bloco, depois do da 9103 e antes da 0323", () => {
    const i9103 = BASELINE.indexOf("FORK ESCALE · ações em massa das listas (migration 9103)");
    const i9104 = BASELINE.indexOf("FORK ESCALE · campos por objeto (migration 9104)");
    const i0323 = BASELINE.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(i9103).toBeGreaterThan(-1);
    expect(i9104).toBeGreaterThan(i9103);
    expect(i0323).toBeGreaterThan(i9104);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
```

Confira antes de rodar: o nome da constraint da 9103 (`grep -n "acao in" supabase/migrations/20261101120000_9103_acoes_em_massa.sql`). Se ela se chamar diferente de `crm_acoes_em_massa_acao_valida`, use o nome real no teste e na migration.

Run: `corepack pnpm vitest run tests/unit/escale-campos-por-objeto-migration.test.ts`
Expected: FAIL.

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261102120000_9104_campos_por_objeto.sql` (a primeira linha é uma só):

```sql
-- manifest: **Campos por objeto (fork Escale, Fase 2C).** Grupos de campos por objeto (`crm_grupos_de_campos`), catálogo do contato e da empresa (`crm_campos_do_crm`, mesma forma de `definicao` da 9006, todo membro lê e só administrador escreve), `grupo_id` e `papel_minimo` no catálogo do negócio, `custom_fields` em `companies`, o tipo `datetime` em `fn_escale_campo_valido`, a semente idempotente `fn_escale_semear_campos_padrao` (definer fechada ao `service_role`: "Informações Gerais" nos três objetos e os quatro campos padrão da empresa), a cópia das chaves já usadas pelos contatos para o catálogo do contato e as ações `alterar_campo` e `limpar_campo` em `crm_acoes_em_massa`.
-- 9104: campos por objeto (fork Escale, Frente B).

-- ── 1. Grupos de campos ──────────────────────────────────────────────────────
create table if not exists public.crm_grupos_de_campos (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  objeto text not null,
  chave text not null,
  nome text not null,
  posicao integer not null default 0,
  padrao boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_grupos_de_campos_objeto check (objeto in ('negocio', 'contato', 'empresa')),
  constraint crm_grupos_de_campos_chave check (chave ~ '^[a-z][a-z0-9_]{0,23}$'),
  constraint crm_grupos_de_campos_nome check (char_length(btrim(nome)) between 1 and 60)
);

create unique index if not exists uq_crm_grupos_de_campos_chave
  on public.crm_grupos_de_campos (organization_id, objeto, chave);
create unique index if not exists uq_crm_grupos_de_campos_nome
  on public.crm_grupos_de_campos (organization_id, objeto, lower(btrim(nome)));

alter table public.crm_grupos_de_campos enable row level security;
drop policy if exists crm_grupos_de_campos_select on public.crm_grupos_de_campos;
drop policy if exists crm_grupos_de_campos_admin_write on public.crm_grupos_de_campos;
create policy crm_grupos_de_campos_select on public.crm_grupos_de_campos
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_grupos_de_campos_admin_write on public.crm_grupos_de_campos
  using (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')))
  with check (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')));
revoke all on public.crm_grupos_de_campos from anon;
grant select, insert, update, delete on public.crm_grupos_de_campos to authenticated;
grant all on public.crm_grupos_de_campos to service_role;
drop trigger if exists trg_crm_grupos_de_campos_updated_at on public.crm_grupos_de_campos;
create trigger trg_crm_grupos_de_campos_updated_at
  before update on public.crm_grupos_de_campos for each row execute function public.fn_set_updated_at();
comment on table public.crm_grupos_de_campos is 'Fork Escale (2C): grupos de campos por objeto (negócio, contato, empresa), como o fields_template.groups da Clint.';

-- ── 2. O tipo datetime (a mesma lista da 9006, mais um) ──────────────────────
create or replace function public.fn_escale_campo_valido(p jsonb)
returns boolean
language sql
immutable
set search_path = public, pg_temp
as $$
  select jsonb_typeof(p) = 'object'
     and coalesce(p->>'key', '') ~* '^[a-z][a-z0-9_]*$'
     and char_length(p->>'key') <= 40
     and char_length(coalesce(p->>'label', '')) between 1 and 80
     and (p->>'type') in ('text','textarea','number','currency','date','datetime','select','multiselect','boolean','email','phone','url');
$$;

-- ── 3. Catálogo do contato e da empresa ──────────────────────────────────────
create table if not exists public.crm_campos_do_crm (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  objeto text not null,
  chave text not null,
  definicao jsonb not null,
  grupo_id uuid references public.crm_grupos_de_campos(id) on delete set null,
  papel_minimo text,
  posicao integer not null default 0,
  padrao boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_campos_do_crm_objeto check (objeto in ('contato', 'empresa')),
  constraint crm_campos_do_crm_chave check (chave ~ '^[a-z][a-z0-9_]{0,39}$' and chave not like 'link\_%'),
  constraint crm_campos_do_crm_definicao check (
    jsonb_typeof(definicao) = 'object' and not (definicao ?| array['key', 'obrigatorio_em'])
    and public.fn_escale_campo_valido(definicao || jsonb_build_object('key', chave))
  ),
  constraint crm_campos_do_crm_tamanho check (octet_length(definicao::text) <= 262144),
  constraint crm_campos_do_crm_papel check (papel_minimo is null or papel_minimo in ('agent', 'manager', 'admin'))
);

create unique index if not exists uq_crm_campos_do_crm_chave
  on public.crm_campos_do_crm (organization_id, objeto, chave);
create unique index if not exists uq_crm_campos_do_crm_rotulo
  on public.crm_campos_do_crm (organization_id, objeto, lower(btrim(definicao->>'label')));
create index if not exists idx_crm_campos_do_crm_grupo on public.crm_campos_do_crm (grupo_id);

alter table public.crm_campos_do_crm enable row level security;
drop policy if exists crm_campos_do_crm_select on public.crm_campos_do_crm;
drop policy if exists crm_campos_do_crm_admin_write on public.crm_campos_do_crm;
create policy crm_campos_do_crm_select on public.crm_campos_do_crm
  for select using (public.fn_is_platform_admin() or organization_id in (select public.fn_user_org_ids()));
create policy crm_campos_do_crm_admin_write on public.crm_campos_do_crm
  using (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')))
  with check (public.fn_is_platform_admin_full()
         or (organization_id in (select public.fn_user_org_ids()) and public.fn_role_at_least(organization_id, 'admin')));
revoke all on public.crm_campos_do_crm from anon;
grant select, insert, update, delete on public.crm_campos_do_crm to authenticated;
grant all on public.crm_campos_do_crm to service_role;
drop trigger if exists trg_crm_campos_do_crm_updated_at on public.crm_campos_do_crm;
create trigger trg_crm_campos_do_crm_updated_at
  before update on public.crm_campos_do_crm for each row execute function public.fn_set_updated_at();
comment on table public.crm_campos_do_crm is 'Fork Escale (2C): campos personalizados do contato e da empresa, da organização, em grupos (o negócio continua em crm_campos_do_negocio).';

-- Um campo padrão não muda de chave, de objeto nem é apagado.
create or replace function public.fn_escale_campos_do_crm_protege_padrao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.padrao then
      raise exception 'campo_padrao_nao_se_exclui' using errcode = '22023';
    end if;
    return old;
  end if;
  if new.chave <> old.chave or new.objeto <> old.objeto or new.organization_id <> old.organization_id then
    raise exception 'campo_nao_muda_de_chave' using errcode = '22023';
  end if;
  if old.padrao and (new.definicao->>'label') is distinct from (old.definicao->>'label') then
    raise exception 'campo_padrao_nao_se_renomeia' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_crm_campos_do_crm_protege_padrao on public.crm_campos_do_crm;
create trigger trg_crm_campos_do_crm_protege_padrao
  before update or delete on public.crm_campos_do_crm for each row execute function public.fn_escale_campos_do_crm_protege_padrao();

-- O grupo padrão não é apagado nem muda de chave.
create or replace function public.fn_escale_grupos_de_campos_protege_padrao()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  if tg_op = 'DELETE' then
    if old.padrao then raise exception 'grupo_padrao_nao_se_exclui' using errcode = '22023'; end if;
    return old;
  end if;
  if new.objeto <> old.objeto or new.organization_id <> old.organization_id or new.chave <> old.chave then
    raise exception 'grupo_nao_muda_de_chave' using errcode = '22023';
  end if;
  return new;
end;
$$;
drop trigger if exists trg_crm_grupos_de_campos_protege_padrao on public.crm_grupos_de_campos;
create trigger trg_crm_grupos_de_campos_protege_padrao
  before update or delete on public.crm_grupos_de_campos for each row execute function public.fn_escale_grupos_de_campos_protege_padrao();

-- ── 4. O catálogo do negócio ganha grupo e papel ─────────────────────────────
alter table public.crm_campos_do_negocio add column if not exists grupo_id uuid references public.crm_grupos_de_campos(id) on delete set null;
alter table public.crm_campos_do_negocio add column if not exists papel_minimo text;
alter table public.crm_campos_do_negocio drop constraint if exists crm_campos_do_negocio_papel;
alter table public.crm_campos_do_negocio add constraint crm_campos_do_negocio_papel
  check (papel_minimo is null or papel_minimo in ('agent', 'manager', 'admin'));
create index if not exists idx_crm_campos_do_negocio_grupo on public.crm_campos_do_negocio (grupo_id);

-- ── 5. A empresa guarda valores ──────────────────────────────────────────────
alter table public.companies add column if not exists custom_fields jsonb not null default '{}'::jsonb;
alter table public.companies drop constraint if exists companies_custom_fields_object;
alter table public.companies add constraint companies_custom_fields_object
  check (jsonb_typeof(custom_fields) = 'object' and octet_length(custom_fields::text) <= 32768);

-- ── 6. Semente idempotente ───────────────────────────────────────────────────
create or replace function public.fn_escale_semear_campos_padrao(p_org uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_grupo uuid;
begin
  insert into public.crm_grupos_de_campos (organization_id, objeto, chave, nome, posicao, padrao)
  select p_org, o, 'informacoes_gerais', 'Informações Gerais', 0, true
    from unnest(array['negocio', 'contato', 'empresa']) as o
  on conflict (organization_id, objeto, chave) do nothing;

  select id into v_grupo from public.crm_grupos_de_campos
   where organization_id = p_org and objeto = 'empresa' and chave = 'informacoes_gerais';

  insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id, posicao, padrao)
  values
    (p_org, 'empresa', 'site', '{"label":"Site","type":"url"}'::jsonb, v_grupo, 0, true),
    (p_org, 'empresa', 'categoria', '{"label":"Categoria","type":"text"}'::jsonb, v_grupo, 1, true),
    (p_org, 'empresa', 'segmento', '{"label":"Segmento","type":"text"}'::jsonb, v_grupo, 2, true),
    (p_org, 'empresa', 'numero_de_funcionarios', '{"label":"Número de funcionários","type":"number"}'::jsonb, v_grupo, 3, true)
  on conflict (organization_id, objeto, chave) do nothing;

  -- Os campos do negócio sem grupo passam para o padrão.
  update public.crm_campos_do_negocio c
     set grupo_id = g.id
    from public.crm_grupos_de_campos g
   where c.organization_id = p_org and c.grupo_id is null
     and g.organization_id = p_org and g.objeto = 'negocio' and g.chave = 'informacoes_gerais';
end;
$$;
revoke all on function public.fn_escale_semear_campos_padrao(uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_semear_campos_padrao(uuid) to service_role;

-- Toda organização de hoje.
do $m$
declare r record;
begin
  for r in select id from public.organizations loop
    perform public.fn_escale_semear_campos_padrao(r.id);
  end loop;
end
$m$;

-- ── 7. Cópia das chaves do contato (Q3): mesma chave e definição do negócio ──
insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id, posicao, padrao)
select distinct on (n.organization_id, n.chave)
       n.organization_id, 'contato', n.chave, n.definicao, g.id, n.posicao, false
  from public.crm_campos_do_negocio n
  join public.crm_grupos_de_campos g
    on g.organization_id = n.organization_id and g.objeto = 'contato' and g.chave = 'informacoes_gerais'
 where n.chave not like 'link\_%'
   and exists (
     select 1 from public.contacts c
      where c.organization_id = n.organization_id
        and c.is_merged_into is null
        and c.custom_fields ? n.chave
        and nullif(btrim(c.custom_fields->>n.chave), '') is not null
   )
on conflict (organization_id, objeto, chave) do nothing;

-- ── 8. Ações do lote (2B N12): alterar e limpar campo ────────────────────────
alter table public.crm_acoes_em_massa drop constraint if exists crm_acoes_em_massa_acao_valida;
alter table public.crm_acoes_em_massa add constraint crm_acoes_em_massa_acao_valida
  check (acao in ('criar_negocios', 'incluir_tag', 'remover_tag', 'exportar', 'excluir', 'alterar_campo', 'limpar_campo'));

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
```

Confira antes de rodar: (a) o corpo atual de `fn_escale_campo_valido` na 9006 (L69–88): copie a regra exata e só acrescente `'datetime'`; (b) o nome e a forma da constraint de `acao` na 9103; (c) o gatilho `trg_escale_campos_do_negocio_reprojeta` da 9006 só recusa mudança de `chave` e `organization_id`, então `grupo_id` e `papel_minimo` passam por ele (confira que o `update` da semente não dispara reprojeção cara: ele dispara, uma vez por organização, e é aceitável).

Cole o mesmo conteúdo em `supabase/baseline.sql` logo depois do bloco da 9103 (procure `-- ---- FORK ESCALE · ações em massa das listas (migration 9103) ----` e o `notify pgrst, 'reload schema';` que fecha o bloco), precedido da linha:

```sql
-- ---- FORK ESCALE · campos por objeto (migration 9104) ----
```

- [ ] **Step 4: Os dois encaixes do `datetime`**

Em `lib/schemas/settings.ts`, no `customFieldSchema` (L157–216), o `type`:

```ts
    // FORK ESCALE · Fase 2C: "Data e Hora" da Clint.
    type: z.enum(["text", "textarea", "number", "currency", "date", "datetime", "select", "multiselect", "boolean", "email", "phone", "url"]),
```

Em `components/contacts/CustomFieldsEditor.tsx`: acrescente `| "datetime"` ao `CustomFieldType` (L31–59) e, no ponto que escolhe o controle por tipo, logo antes do ramo de `date`:

```tsx
      {/* FORK ESCALE · Fase 2C: datetime cai no controle nativo; a casca usa o SeletorDeDataEHora. */}
      {field.type === "datetime" && (
        <Input
          type="datetime-local"
          value={typeof valor === "string" ? valor.slice(0, 16) : ""}
          onChange={(e) => onChange({ ...value, [field.key]: e.target.value || null })}
          disabled={disabled}
        />
      )}
```

Confira antes de rodar: os nomes das variáveis (`valor`, `value`, `onChange`, `disabled`) no ramo de `date` existente e copie-os.

Atualize os dois testes que pinam listas: em `tests/unit/escale-campos-do-crm-migration.test.ts`, se a lista de tipos é lida do esquema zod ou do baseline, acrescente `datetime`; se é lida do texto da 9006, nada muda. Em `tests/unit/escale-acoes-em-massa-migration.test.ts`, se houver `toMatch` com os cinco valores lendo o baseline, aponte para a 9103 (que continua com cinco) ou acrescente os dois.

- [ ] **Step 5: Varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo depois da entrada de `crm_campos_do_negocio` em `PROVA_PROPRIA`:

```ts
  {
    tabela: "crm_grupos_de_campos",
    razao:
      "tests/invariants/escale-campos-por-objeto.test.ts — fork Escale (migration 9104): todo membro lê, só administrador escreve (zero para gerente, agente, viewer e vizinho); o grupo padrão não se apaga.",
  },
  {
    tabela: "crm_campos_do_crm",
    razao:
      "tests/invariants/escale-campos-por-objeto.test.ts — fork Escale (migration 9104): todo membro lê, só administrador escreve; chave única por objeto; campo padrão não se apaga nem se renomeia; definição validada por fn_escale_campo_valido.",
  },
```

- [ ] **Step 6: A prova no banco**

Create `tests/invariants/escale-campos-por-objeto.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
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
 * CAMPOS POR OBJETO (fork Escale, migration 9104) — prova contra Postgres real:
 * semente idempotente, leitura por todo membro, escrita só do administrador,
 * campo e grupo padrão protegidos, chave única por objeto, datetime válido,
 * custom_fields da empresa e as ações novas do lote. Roda via `pnpm test:db`.
 */
const ORG_B = "e5ca1e00-9104-4000-8000-0000000000b0";
const USER_B = "e5ca1e00-9104-4000-8000-0000000000b1";

const grupo = (objeto: string) =>
  `(select id from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and objeto = '${objeto}' and chave = 'informacoes_gerais')`;

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'vizinho-9104@x.test') on conflict (id) do nothing;
    insert into public.organizations (id, name, slug) values ('${ORG_B}', 'Org B 9104', 'org-b-9104') on conflict (id) do nothing;
    insert into public.user_organizations (user_id, organization_id, role) values ('${USER_B}', '${ORG_B}', 'admin') on conflict do nothing;
    delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and padrao = false;
    delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and padrao = false;
    select public.fn_escale_semear_campos_padrao('${GOV_ORG}');
    select public.fn_escale_semear_campos_padrao('${GOV_ORG}');
  `);
});

describe("semente", () => {
  it("cria Informações Gerais nos três objetos e os quatro campos da empresa, uma vez só", () => {
    expect(lastLine(sql(`select count(*) from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and padrao`))).toBe("3");
    expect(
      lastLine(sql(`select string_agg(chave, ',' order by posicao) from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa' and padrao`)),
    ).toBe("site,categoria,segmento,numero_de_funcionarios");
  });

  it("a semente é fechada ao authenticated", () => {
    expect(lastLine(sql(`select has_function_privilege('authenticated', 'public.fn_escale_semear_campos_padrao(uuid)', 'execute')`))).toBe("f");
  });
});

describe("leitura e escrita", () => {
  const q = `select count(*) from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa'`;
  it("todo membro lê; o vizinho não", () => {
    expect(countAs(GOV_VIEWER, q)).toBe(4);
    expect(countAs(GOV_AGENT_A, q)).toBe(4);
    expect(countAs(USER_B, q)).toBe(0);
  });

  const insere = (quem: string, sufixo: string) =>
    writeCountAs(
      quem,
      `insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao, grupo_id)
       values ('${GOV_ORG}', 'contato', 'cargo_${sufixo}', '{"label":"Cargo ${sufixo}","type":"text"}'::jsonb, ${grupo("contato")})`,
    );
  it("só administrador escreve", () => {
    expect(insere(GOV_VIEWER, "v")).toBe(0);
    expect(insere(GOV_AGENT_A, "a")).toBe(0);
    expect(insere(GOV_MANAGER, "m")).toBe(0);
    expect(insere(GOV_ADMIN, "adm")).toBe(1);
  });

  it("o vizinho não grava no catálogo da outra organização", () => {
    expect(
      writeCountAs(
        USER_B,
        `insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'invasao', '{"label":"Invasão","type":"text"}'::jsonb)`,
      ),
    ).toBe(0);
  });
});

describe("travas", () => {
  it("chave única por objeto, mas a mesma chave vale em objetos diferentes", () => {
    sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'segmento', '{"label":"Segmento do contato","type":"text"}'::jsonb)`);
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'segmento', '{"label":"Outro","type":"text"}'::jsonb)`),
    ).toThrow(/uq_crm_campos_do_crm_chave/);
  });

  it("chave link_* é recusada no contato", () => {
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'link_x', '{"label":"X","type":"text"}'::jsonb)`),
    ).toThrow(/crm_campos_do_crm_chave/);
  });

  it("datetime é um tipo válido; um tipo inventado não", () => {
    sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'quando', '{"label":"Quando","type":"datetime"}'::jsonb)`);
    expect(() =>
      sql(`insert into public.crm_campos_do_crm (organization_id, objeto, chave, definicao) values ('${GOV_ORG}', 'contato', 'ruim', '{"label":"Ruim","type":"rich"}'::jsonb)`),
    ).toThrow(/crm_campos_do_crm_definicao/);
  });

  it("campo padrão não se apaga nem se renomeia; grupo padrão não se apaga", () => {
    expect(() => sql(`delete from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and objeto = 'empresa' and chave = 'site'`)).toThrow(/campo_padrao_nao_se_exclui/);
    expect(() =>
      sql(`update public.crm_campos_do_crm set definicao = definicao || '{"label":"Website"}' where organization_id = '${GOV_ORG}' and objeto = 'empresa' and chave = 'site'`),
    ).toThrow(/campo_padrao_nao_se_renomeia/);
    expect(() => sql(`delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and objeto = 'empresa' and padrao`)).toThrow(/grupo_padrao_nao_se_exclui/);
  });

  it("apagar um grupo solta os campos dele (grupo_id nulo), sem apagar os campos", () => {
    sql(`insert into public.crm_grupos_de_campos (organization_id, objeto, chave, nome, posicao) values ('${GOV_ORG}', 'contato', 'kaio_ia', 'Kaio IA', 1)`);
    sql(`update public.crm_campos_do_crm set grupo_id = (select id from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and chave = 'kaio_ia') where organization_id = '${GOV_ORG}' and chave = 'quando'`);
    sql(`delete from public.crm_grupos_de_campos where organization_id = '${GOV_ORG}' and chave = 'kaio_ia'`);
    expect(lastLine(sql(`select grupo_id is null from public.crm_campos_do_crm where organization_id = '${GOV_ORG}' and chave = 'quando'`))).toBe("t");
  });

  it("o negócio ganhou grupo e papel; a empresa guarda custom_fields; papel inválido é recusado", () => {
    expect(lastLine(sql(`select count(*) from information_schema.columns where table_name = 'crm_campos_do_negocio' and column_name in ('grupo_id', 'papel_minimo')`))).toBe("2");
    expect(lastLine(sql(`select column_default from information_schema.columns where table_name = 'companies' and column_name = 'custom_fields'`))).toBe("'{}'::jsonb");
    expect(() => sql(`update public.crm_campos_do_crm set papel_minimo = 'viewer' where organization_id = '${GOV_ORG}' and chave = 'quando'`)).toThrow(/crm_campos_do_crm_papel/);
  });

  it("as ações alterar_campo e limpar_campo passam na check do lote", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao, parametros) values ('${GOV_ORG}', '${GOV_MANAGER}', 'contatos', 'alterar_campo', '{"chave":"cargo","valor":"CEO"}'::jsonb)`,
      ),
    ).toBe(1);
  });
});
```

Confira antes de rodar: as colunas que a policy de insert de `crm_acoes_em_massa` exige (9103 L115–124). Se o insert mínimo não passar, acrescente o que ela pede.

Run (Docker aberto): `corepack pnpm test:db tests/invariants/escale-campos-por-objeto.test.ts tests/invariants/escale-campos-do-crm.test.ts tests/invariants/escale-acoes-em-massa.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/rbac-config-ia-canais.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts tests/invariants/hardening-definer-varredura.test.ts`
Expected: tudo PASS.

- [ ] **Step 7: Testes de forma e gates**

```bash
corepack pnpm vitest run tests/unit/escale-campos-por-objeto-migration.test.ts tests/unit/escale-campos-do-crm-migration.test.ts tests/unit/escale-acoes-em-massa-migration.test.ts tests/unit/escale-campos-regras.test.ts tests/unit/manifest-x-migrations.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/schemas/settings.ts components/contacts/CustomFieldsEditor.tsx lib/escale/campos/regras.ts
```

Expected: PASS, sem erro.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261102120000_9104_campos_por_objeto.sql supabase/baseline.sql lib/schemas/settings.ts components/contacts/CustomFieldsEditor.tsx tests/
git commit -m "feat(escale): migration 9104 — grupos, campos do contato e da empresa, datetime e ações de campo no lote (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: O catálogo no servidor — `banco.ts` e as rotas

**Files:**
- Create: `lib/escale/campos/banco.ts`, `app/api/v1/campos-do-crm/route.ts`, `app/api/v1/campos-do-crm/[id]/route.ts`, `app/api/v1/campos-do-crm/grupos/route.ts`, `app/api/v1/campos-do-crm/grupos/[id]/route.ts`, `app/api/v1/campos-do-crm/ordem/route.ts`, `tests/unit/escale-campos-rotas.test.ts`
- Modify: `lib/audit/actions.ts` (depois de `"contacts.export_downloaded",`)

**Interfaces:**
- Consumes: `Catalogo`, `CampoDoCatalogo`, `GrupoDeCampos`, `ObjetoDeCampo`, `chaveDoNome`, `tipoDoMotor`, `catalogoVisivel`, `GRUPO_PADRAO`, `GRUPOS_MAX` (Task 1); `CAMPOS_DO_CRM_MAX` (`lib/schemas/settings.ts`); `requireRole`, `requireSupportWrite`, `podeAdministrarEmpresa`, `createClient`, `createAdminClient`, `audit`, `ok`, `fail`.
- Produces:
  - `lerCatalogo(sb, orgId, objeto): Promise<Catalogo>` (lê as duas tabelas conforme o objeto; sem filtro de papel);
  - `semearSeVazio(admin, orgId): Promise<void>` (chama `fn_escale_semear_campos_padrao` quando a organização não tem o grupo padrão);
  - `criarCampo(sb, orgId, entrada: NovoCampo): Promise<CampoDoCatalogo>`; `mudarCampo(sb, orgId, objeto, id, patch: PatchDoCampo)`; `excluirCampo(sb, orgId, objeto, id)`;
  - `criarGrupo(sb, orgId, objeto, nome)`; `renomearGrupo(sb, orgId, id, nome)`; `excluirGrupo(sb, orgId, id)` (campos do grupo voltam a `grupo_id = null`, que a tela lê como padrão);
  - `reordenar(sb, orgId, objeto, ordem: OrdemDoCatalogo)`;
  - zod: `novoCampoSchema`, `patchDoCampoSchema`, `novoGrupoSchema`, `ordemSchema`; erros tipados `ErroDoCatalogo` (`nome_repetido`, `grupo_sumiu`, `limite`, `padrao`, `nao_encontrado`).
  - Rotas: `GET /api/v1/campos-do-crm?objeto=` (viewer; devolve `catalogoVisivel` para o papel) · `POST` (admin) · `PATCH/DELETE /api/v1/campos-do-crm/[id]?objeto=` (admin) · `POST /api/v1/campos-do-crm/grupos` · `PATCH/DELETE /grupos/[id]` · `PUT /ordem` (admin).

- [ ] **Step 1: O teste das rotas (vai falhar)**

Create `tests/unit/escale-campos-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE as DELETE_CAMPO, PATCH as PATCH_CAMPO } from "@/app/api/v1/campos-do-crm/[id]/route";
import { POST as POST_GRUPO } from "@/app/api/v1/campos-do-crm/grupos/route";
import { GET, POST } from "@/app/api/v1/campos-do-crm/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Linha = Record<string, unknown>;
const GRUPO = { id: "g1", organization_id: ORG_ID, objeto: "contato", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true };

/** Banco de mentira: cada tabela tem as suas linhas; insert/update/delete gravam em `escrito`. */
function banco(tabelas: Record<string, Linha[]>, escrito: Linha[] = []) {
  const from = vi.fn((tabela: string) => {
    const linhas = tabelas[tabela] ?? [];
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit", "neq"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn().mockResolvedValue({ data: linhas[0] ?? null, error: null });
    cadeia.single = vi.fn().mockResolvedValue({ data: linhas[0] ?? null, error: null });
    cadeia.then = (ok: (r: { data: Linha[]; error: null }) => unknown) => Promise.resolve({ data: linhas, error: null }).then(ok);
    cadeia.insert = vi.fn((corpo: Linha) => {
      escrito.push({ tabela, insert: corpo });
      return cadeia;
    });
    cadeia.update = vi.fn((corpo: Linha) => {
      escrito.push({ tabela, update: corpo });
      return cadeia;
    });
    cadeia.delete = vi.fn(() => {
      escrito.push({ tabela, delete: true });
      return cadeia;
    });
    return cadeia;
  });
  const rpc = vi.fn().mockResolvedValue({ data: null, error: null });
  vi.mocked(createClient).mockResolvedValue({ from, rpc } as never);
  vi.mocked(createAdminClient).mockReturnValue({ from, rpc } as never);
  return { from, rpc, escrito };
}

const pedido = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://x"), init as never);
const json = (corpo: unknown, method = "POST") =>
  ({ method, body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }) as RequestInit;

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET /api/v1/campos-do-crm", () => {
  it("devolve só os campos que o papel enxerga", async () => {
    authOk("agent");
    banco({
      crm_grupos_de_campos: [GRUPO],
      crm_campos_do_crm: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: "g1", papel_minimo: "manager", posicao: 1, padrao: false },
      ],
    });
    const r = await GET(pedido("/api/v1/campos-do-crm?objeto=contato"));
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(data.grupos.map((g: Linha) => g.chave)).toEqual(["informacoes_gerais"]);
    expect(data.campos.map((c: Linha) => c.chave)).toEqual(["cargo"]);
  });

  it("objeto inválido é 422", async () => {
    authOk("viewer");
    banco({});
    expect((await GET(pedido("/api/v1/campos-do-crm?objeto=produto"))).status).toBe(422);
  });
});

describe("POST /api/v1/campos-do-crm", () => {
  it("gerente não cria (403); administrador cria com a chave gerada do nome", async () => {
    authOk("manager");
    const b1 = banco({ crm_grupos_de_campos: [GRUPO] });
    expect((await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "Cargo", grupo_id: "g1", tipo: "TEXT" })))).status).toBe(403);
    expect(b1.escrito).toHaveLength(0);

    authOk("admin");
    const b2 = banco({ crm_grupos_de_campos: [GRUPO], crm_campos_do_crm: [] });
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "Número de funcionários", grupo_id: "g1", tipo: "NUMBER" })));
    expect(r.status).toBe(201);
    const insert = b2.escrito.find((e) => e.insert)?.insert as Linha;
    expect(insert.chave).toBe("numero_de_funcionari");
    expect(insert.definicao).toEqual({ label: "Número de funcionários", type: "number" });
  });

  it("nome repetido no objeto é 422 com o texto da Clint", async () => {
    authOk("admin");
    banco({
      crm_grupos_de_campos: [GRUPO],
      crm_campos_do_crm: [{ id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false }],
    });
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "contato", nome: "cargo", grupo_id: "g1", tipo: "TEXT" })));
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Já existe um outro campo com o nome informado, o campo deve ser único.");
  });

  it("seleção exige ao menos uma opção; o negócio vai para crm_campos_do_negocio", async () => {
    authOk("admin");
    const b = banco({ crm_grupos_de_campos: [{ ...GRUPO, objeto: "negocio" }], crm_campos_do_negocio: [] });
    expect((await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "negocio", nome: "Origem", grupo_id: "g1", tipo: "SELECT", opcoes: [] })))).status).toBe(422);
    const r = await POST(pedido("/api/v1/campos-do-crm", json({ objeto: "negocio", nome: "Origem", grupo_id: "g1", tipo: "SELECT", opcoes: ["Orgânico", "Pago"] })));
    expect(r.status).toBe(201);
    const insert = b.escrito.find((e) => e.insert)!;
    expect(insert.tabela).toBe("crm_campos_do_negocio");
    expect((insert.insert as Linha).definicao).toEqual({ label: "Origem", type: "select", options: [{ value: "Orgânico", label: "Orgânico" }, { value: "Pago", label: "Pago" }] });
  });
});

describe("PATCH e DELETE /api/v1/campos-do-crm/[id]", () => {
  const padrao = { id: "c9", objeto: "empresa", chave: "site", definicao: { label: "Site", type: "url" }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: true };
  it("campo padrão não renomeia nem se exclui (422 com o texto da Clint); a visibilidade pode mudar", async () => {
    authOk("admin");
    banco({ crm_campos_do_crm: [padrao] });
    const ctx = { params: Promise.resolve({ id: "c9" }) };
    const r1 = await PATCH_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", json({ nome: "Website" }, "PATCH")), ctx);
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Não é possível editar um campo padrão do sistema");
    expect((await PATCH_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", json({ papel_minimo: "manager" }, "PATCH")), ctx)).status).toBe(200);
    expect((await DELETE_CAMPO(pedido("/api/v1/campos-do-crm/c9?objeto=empresa", { method: "DELETE" }), ctx)).status).toBe(422);
  });
});

describe("POST /api/v1/campos-do-crm/grupos", () => {
  it("cria com a chave do nome; nome vazio é 422 com o texto da Clint", async () => {
    authOk("admin");
    const b = banco({ crm_grupos_de_campos: [GRUPO] });
    const r = await POST_GRUPO(pedido("/api/v1/campos-do-crm/grupos", json({ objeto: "contato", nome: "Kaio IA" })));
    expect(r.status).toBe(201);
    expect((b.escrito[0].insert as Linha).chave).toBe("kaio_ia");
    const r2 = await POST_GRUPO(pedido("/api/v1/campos-do-crm/grupos", json({ objeto: "contato", nome: "  " })));
    expect(r2.status).toBe(422);
    expect((await r2.json()).error.message).toBe("O nome do grupo é obrigatório!");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-campos-rotas.test.ts`
Expected: FAIL (rotas não existem).

- [ ] **Step 2: `lib/escale/campos/banco.ts`**

```ts
/**
 * O catálogo de campos no banco (Fase 2C). O negócio mora em
 * `crm_campos_do_negocio` (gatilhos da 9006), contato e empresa em
 * `crm_campos_do_crm`; os grupos dos três em `crm_grupos_de_campos`.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { CAMPOS_DO_CRM_MAX } from "@/lib/schemas/settings";

import {
  type CampoDoCatalogo,
  type Catalogo,
  GRUPOS_MAX,
  GRUPO_PADRAO,
  type GrupoDeCampos,
  OBJETOS_DE_CAMPO,
  type ObjetoDeCampo,
  PAPEIS_DE_VISIBILIDADE,
  TIPOS_DA_CLINT,
  chaveDoNome,
  tipoDoMotor,
} from "./regras";

type SB = SupabaseClient;

export class ErroDoCatalogo extends Error {
  constructor(
    public readonly codigo: "nome_repetido" | "grupo_sumiu" | "limite" | "padrao" | "nao_encontrado" | "opcoes",
  ) {
    super(codigo);
  }
}

const tabelaDe = (objeto: ObjetoDeCampo) => (objeto === "negocio" ? "crm_campos_do_negocio" : "crm_campos_do_crm");

const COLUNAS = "id, chave, definicao, grupo_id, papel_minimo, posicao, padrao";

function linhaParaCampo(objeto: ObjetoDeCampo, l: Record<string, unknown>): CampoDoCatalogo {
  return {
    id: String(l.id),
    objeto,
    chave: String(l.chave),
    definicao: l.definicao as CampoDoCatalogo["definicao"],
    grupo_id: (l.grupo_id as string | null) ?? null,
    papel_minimo: (l.papel_minimo as CampoDoCatalogo["papel_minimo"]) ?? null,
    posicao: Number(l.posicao ?? 0),
    padrao: Boolean(l.padrao),
  };
}

export async function lerCatalogo(sb: SB, orgId: string, objeto: ObjetoDeCampo): Promise<Catalogo> {
  const grupos = await sb
    .from("crm_grupos_de_campos")
    .select("id, chave, nome, posicao, padrao")
    .eq("organization_id", orgId)
    .eq("objeto", objeto)
    .order("posicao")
    .order("nome");
  if (grupos.error) throw grupos.error;

  let consulta = sb.from(tabelaDe(objeto)).select(COLUNAS).eq("organization_id", orgId);
  if (objeto !== "negocio") consulta = consulta.eq("objeto", objeto);
  const campos = await consulta.order("posicao").order("chave");
  if (campos.error) throw campos.error;

  return {
    grupos: (grupos.data ?? []) as GrupoDeCampos[],
    campos: ((campos.data ?? []) as Record<string, unknown>[]).map((l) => linhaParaCampo(objeto, l)),
  };
}

/** Organização sem o grupo padrão (criada depois da 9104) recebe a semente. */
export async function semearSeVazio(admin: SB, orgId: string): Promise<void> {
  const { data } = await admin
    .from("crm_grupos_de_campos")
    .select("id")
    .eq("organization_id", orgId)
    .eq("chave", GRUPO_PADRAO)
    .limit(1);
  if (data && data.length > 0) return;
  const { error } = await admin.rpc("fn_escale_semear_campos_padrao", { p_org: orgId });
  if (error) throw error;
}

export const novoCampoSchema = z.object({
  objeto: z.enum(OBJETOS_DE_CAMPO),
  nome: z.string().trim().min(1).max(80),
  grupo_id: z.string().uuid(),
  tipo: z.enum(TIPOS_DA_CLINT.map((t) => t.chave) as [string, ...string[]]),
  opcoes: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
});
export type NovoCampo = z.infer<typeof novoCampoSchema>;

export const patchDoCampoSchema = z
  .object({
    nome: z.string().trim().min(1).max(80).optional(),
    grupo_id: z.string().uuid().nullable().optional(),
    papel_minimo: z.enum(PAPEIS_DE_VISIBILIDADE).nullable().optional(),
    opcoes: z.array(z.string().trim().min(1).max(80)).max(100).optional(),
  })
  .strict();
export type PatchDoCampo = z.infer<typeof patchDoCampoSchema>;

export const novoGrupoSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO), nome: z.string().trim().min(1).max(60) });
export const renomearGrupoSchema = z.object({ nome: z.string().trim().min(1).max(60) });

export const ordemSchema = z.object({
  objeto: z.enum(OBJETOS_DE_CAMPO),
  grupos: z.array(z.string().uuid()).max(GRUPOS_MAX),
  campos: z.array(z.object({ grupo_id: z.string().uuid(), ids: z.array(z.string().uuid()).max(CAMPOS_DO_CRM_MAX) })).max(GRUPOS_MAX),
});
export type OrdemDoCatalogo = z.infer<typeof ordemSchema>;

const opcoesDe = (opcoes: string[] | undefined) => {
  const unicas = [...new Set(opcoes ?? [])];
  return unicas.map((o) => ({ value: o, label: o }));
};

export async function criarCampo(sb: SB, orgId: string, entrada: NovoCampo): Promise<CampoDoCatalogo> {
  const tipo = tipoDoMotor(entrada.tipo as (typeof TIPOS_DA_CLINT)[number]["chave"]);
  const precisaDeOpcoes = tipo === "select" || tipo === "multiselect";
  if (precisaDeOpcoes && opcoesDe(entrada.opcoes).length === 0) throw new ErroDoCatalogo("opcoes");

  const atual = await lerCatalogo(sb, orgId, entrada.objeto);
  if (atual.campos.length >= CAMPOS_DO_CRM_MAX) throw new ErroDoCatalogo("limite");
  if (!atual.grupos.some((g) => g.id === entrada.grupo_id)) throw new ErroDoCatalogo("grupo_sumiu");
  const nome = entrada.nome.trim();
  if (atual.campos.some((c) => String(c.definicao.label).trim().toLowerCase() === nome.toLowerCase())) throw new ErroDoCatalogo("nome_repetido");

  const chave = chaveDoNome(nome, atual.campos.map((c) => c.chave));
  if (!chave) throw new ErroDoCatalogo("nome_repetido");
  const noGrupo = atual.campos.filter((c) => c.grupo_id === entrada.grupo_id);
  const posicao = noGrupo.length ? Math.max(...noGrupo.map((c) => c.posicao)) + 1 : 0;

  const definicao = { label: nome, type: tipo, ...(precisaDeOpcoes ? { options: opcoesDe(entrada.opcoes) } : {}) };
  const linha = {
    organization_id: orgId,
    ...(entrada.objeto === "negocio" ? {} : { objeto: entrada.objeto }),
    chave,
    definicao,
    grupo_id: entrada.grupo_id,
    posicao,
  };
  const { data, error } = await sb.from(tabelaDe(entrada.objeto)).insert(linha).select(COLUNAS).single();
  if (error) throw error;
  return linhaParaCampo(entrada.objeto, (data ?? { ...linha, id: "" }) as Record<string, unknown>);
}

async function campoPorId(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string): Promise<CampoDoCatalogo> {
  const { data, error } = await sb.from(tabelaDe(objeto)).select(COLUNAS).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroDoCatalogo("nao_encontrado");
  return linhaParaCampo(objeto, data as Record<string, unknown>);
}

export async function mudarCampo(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string, patch: PatchDoCampo): Promise<CampoDoCatalogo> {
  const campo = await campoPorId(sb, orgId, objeto, id);
  if (campo.padrao && (patch.nome !== undefined || patch.opcoes !== undefined)) throw new ErroDoCatalogo("padrao");
  const mudanca: Record<string, unknown> = {};
  if (patch.nome !== undefined || patch.opcoes !== undefined) {
    const atual = await lerCatalogo(sb, orgId, objeto);
    if (patch.nome !== undefined) {
      const nome = patch.nome.trim();
      if (atual.campos.some((c) => c.id !== id && String(c.definicao.label).trim().toLowerCase() === nome.toLowerCase())) throw new ErroDoCatalogo("nome_repetido");
    }
    const tipo = campo.definicao.type;
    if (patch.opcoes !== undefined && tipo !== "select" && tipo !== "multiselect") throw new ErroDoCatalogo("opcoes");
    if (patch.opcoes !== undefined && opcoesDe(patch.opcoes).length === 0) throw new ErroDoCatalogo("opcoes");
    mudanca.definicao = {
      ...campo.definicao,
      ...(patch.nome !== undefined ? { label: patch.nome.trim() } : {}),
      ...(patch.opcoes !== undefined ? { options: opcoesDe(patch.opcoes) } : {}),
    };
  }
  if (patch.grupo_id !== undefined) mudanca.grupo_id = patch.grupo_id;
  if (patch.papel_minimo !== undefined) mudanca.papel_minimo = patch.papel_minimo;
  const { data, error } = await sb.from(tabelaDe(objeto)).update(mudanca).eq("organization_id", orgId).eq("id", id).select(COLUNAS).single();
  if (error) throw error;
  return linhaParaCampo(objeto, (data ?? { ...campo, ...mudanca }) as Record<string, unknown>);
}

export async function excluirCampo(sb: SB, orgId: string, objeto: ObjetoDeCampo, id: string): Promise<void> {
  const campo = await campoPorId(sb, orgId, objeto, id);
  if (campo.padrao) throw new ErroDoCatalogo("padrao");
  const { error } = await sb.from(tabelaDe(objeto)).delete().eq("organization_id", orgId).eq("id", id);
  if (error) throw error;
}

export async function criarGrupo(sb: SB, orgId: string, objeto: ObjetoDeCampo, nome: string): Promise<GrupoDeCampos> {
  const atual = await lerCatalogo(sb, orgId, objeto);
  if (atual.grupos.length >= GRUPOS_MAX) throw new ErroDoCatalogo("limite");
  if (atual.grupos.some((g) => g.nome.trim().toLowerCase() === nome.trim().toLowerCase())) throw new ErroDoCatalogo("nome_repetido");
  const chave = chaveDoNome(nome, atual.grupos.map((g) => g.chave)) ?? `grupo_${atual.grupos.length + 1}`;
  const posicao = atual.grupos.length ? Math.max(...atual.grupos.map((g) => g.posicao)) + 1 : 0;
  const linha = { organization_id: orgId, objeto, chave, nome: nome.trim(), posicao };
  const { data, error } = await sb.from("crm_grupos_de_campos").insert(linha).select("id, chave, nome, posicao, padrao").single();
  if (error) throw error;
  return (data ?? { ...linha, id: "", padrao: false }) as GrupoDeCampos;
}

export async function renomearGrupo(sb: SB, orgId: string, id: string, nome: string): Promise<void> {
  const { error } = await sb.from("crm_grupos_de_campos").update({ nome: nome.trim() }).eq("organization_id", orgId).eq("id", id);
  if (error) throw error;
}

export async function excluirGrupo(sb: SB, orgId: string, id: string): Promise<void> {
  const { data, error } = await sb.from("crm_grupos_de_campos").select("id, padrao").eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) throw new ErroDoCatalogo("nao_encontrado");
  if ((data as { padrao: boolean }).padrao) throw new ErroDoCatalogo("padrao");
  const del = await sb.from("crm_grupos_de_campos").delete().eq("organization_id", orgId).eq("id", id);
  if (del.error) throw del.error;
}

/** Grava `posicao` dos grupos e dos campos (e o `grupo_id` de cada campo) na ordem recebida. */
export async function reordenar(sb: SB, orgId: string, ordem: OrdemDoCatalogo): Promise<void> {
  for (const [i, id] of ordem.grupos.entries()) {
    const { error } = await sb.from("crm_grupos_de_campos").update({ posicao: i }).eq("organization_id", orgId).eq("id", id);
    if (error) throw error;
  }
  const tabela = tabelaDe(ordem.objeto);
  for (const grupo of ordem.campos) {
    for (const [i, id] of grupo.ids.entries()) {
      const { error } = await sb.from(tabela).update({ posicao: i, grupo_id: grupo.grupo_id }).eq("organization_id", orgId).eq("id", id);
      if (error) throw error;
    }
  }
}

/** Mensagem para cada erro tipado, com os textos da Clint. */
export const TEXTO_DO_ERRO: Record<ErroDoCatalogo["codigo"], string> = {
  nome_repetido: "Já existe um outro campo com o nome informado, o campo deve ser único.",
  grupo_sumiu: "Este grupo foi removido. Atualize a página e tente novamente.",
  limite: "Limite de campos ou grupos atingido.",
  padrao: "Não é possível editar um campo padrão do sistema",
  nao_encontrado: "Campo não encontrado.",
  opcoes: "Informe ao menos uma opção de seleção.",
};
```

Confira antes de rodar: o nome real de `CAMPOS_DO_CRM_MAX` em `lib/schemas/settings.ts` (L235) e se é exportado; se o PostgREST do original não aceita `.order("chave")` em coluna que não existe no negócio (`crm_campos_do_negocio` tem `chave`: aceita).

- [ ] **Step 3: As rotas**

Create `app/api/v1/campos-do-crm/route.ts`:

```ts
import { NextRequest } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { ErroDoCatalogo, TEXTO_DO_ERRO, criarCampo, lerCatalogo, novoCampoSchema, semearSeVazio } from "@/lib/escale/campos/banco";
import { OBJETOS_DE_CAMPO, catalogoVisivel } from "@/lib/escale/campos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

export const dynamic = "force-dynamic";

const consultaSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO) });

/** Devolve o erro tipado do catálogo como 422 traduzido, ou null. */
export function respostaDoErroDoCatalogo(err: unknown, idioma: string): Response | null {
  if (!(err instanceof ErroDoCatalogo)) return null;
  const status = err.codigo === "nao_encontrado" ? 404 : 422;
  return fail(`campo_${err.codigo}`, traduzir(TEXTO_DO_ERRO[err.codigo], idioma), status);
}

export async function GET(req: NextRequest) {
  const authz = await requireRole("viewer", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return authz.response;
  const parse = consultaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!parse.success) return fail("validation_failed", traduzir("Objeto inválido.", authz.user.idioma), 422);
  try {
    await semearSeVazio(createAdminClient(), authz.org.orgId);
    const supabase = await createClient();
    const catalogo = await lerCatalogo(supabase, authz.org.orgId, parse.data.objeto);
    return ok(catalogoVisivel(catalogo, authz.org.role));
  } catch (err) {
    logger.error("campos-do-crm.get", { err });
    return fail("internal_error", traduzir("Não foi possível carregar os campos.", authz.user.idioma), 500);
  }
}

export async function POST(req: NextRequest) {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  const authz = await requireRole("manager", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return authz.response;
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return fail("forbidden_role", traduzir("Só administrador gerencia os campos.", authz.user.idioma), 403);
  }
  const parse = novoCampoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("Pedido inválido.", authz.user.idioma), 422);
  try {
    const supabase = await createClient();
    const campo = await criarCampo(supabase, authz.org.orgId, parse.data);
    await audit({
      organizationId: authz.org.orgId,
      actorUserId: authz.user.id,
      action: "crm_field.created",
      resourceType: "crm_field", resourceId: campo.id,
      metadata: { objeto: campo.objeto, chave: campo.chave, tipo: campo.definicao.type },
    });
    return ok(campo, { status: 201 });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.post", { err });
    return fail("internal_error", traduzir("Não foi possível criar o campo.", authz.user.idioma), 500);
  }
}
```

A forma é a de `app/api/v1/acoes-em-massa/route.ts`: `fail(code, message, status, { requestId })` e `ok(data, { status })` de `@/lib/api/wrappers`; `audit({ action, actorUserId, organizationId, resourceType, resourceId, requestId, metadata })`.

Create `app/api/v1/campos-do-crm/[id]/route.ts`:

```ts
import { NextRequest } from "next/server";
import { z } from "zod";

import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { podeAdministrarEmpresa } from "@/lib/auth/pode-administrar-empresa";
import { excluirCampo, mudarCampo, patchDoCampoSchema } from "@/lib/escale/campos/banco";
import { OBJETOS_DE_CAMPO } from "@/lib/escale/campos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";
import { fail, ok } from "@/lib/api/wrappers";

import { respostaDoErroDoCatalogo } from "../route";

export const dynamic = "force-dynamic";

const objetoSchema = z.object({ objeto: z.enum(OBJETOS_DE_CAMPO) });
type Ctx = { params: Promise<{ id: string }> };

async function porta(req: NextRequest) {
  const denied = await requireSupportWrite();
  if (denied) return { erro: denied } as const;
  const authz = await requireRole("manager", { resource: "crm_campos_do_crm" });
  if (!authz.ok) return { erro: authz.response } as const;
  if (!podeAdministrarEmpresa(authz.user, authz.org)) {
    return { erro: fail("forbidden_role", traduzir("Só administrador gerencia os campos.", authz.user.idioma), 403) } as const;
  }
  const objeto = objetoSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!objeto.success) return { erro: fail("validation_failed", traduzir("Objeto inválido.", authz.user.idioma), 422) } as const;
  return { authz, objeto: objeto.data.objeto } as const;
}

export async function PATCH(req: NextRequest, ctx: Ctx) {
  const p = await porta(req);
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  const parse = patchDoCampoSchema.safeParse(await req.json().catch(() => null));
  if (!parse.success) return fail("validation_failed", traduzir("Pedido inválido.", p.authz.user.idioma), 422);
  try {
    const campo = await mudarCampo(await createClient(), p.authz.org.orgId, p.objeto, id, parse.data);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field.updated", resourceType: "crm_field", resourceId: id, metadata: { objeto: p.objeto, patch: parse.data } });
    return ok(campo);
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.patch", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}

export async function DELETE(req: NextRequest, ctx: Ctx) {
  const p = await porta(req);
  if ("erro" in p) return p.erro;
  const { id } = await ctx.params;
  try {
    await excluirCampo(await createClient(), p.authz.org.orgId, p.objeto, id);
    await audit({ organizationId: p.authz.org.orgId, actorUserId: p.authz.user.id, action: "crm_field.deleted", resourceType: "crm_field", resourceId: id, metadata: { objeto: p.objeto } });
    return ok({ id });
  } catch (err) {
    const tipado = respostaDoErroDoCatalogo(err, p.authz.user.idioma);
    if (tipado) return tipado;
    logger.error("campos-do-crm.delete", { err });
    return fail("internal_error", traduzir("Ocorreu um erro ao salvar", p.authz.user.idioma), 500);
  }
}
```

Create `app/api/v1/campos-do-crm/grupos/route.ts` (POST, mesma `porta` sem `objeto` na query; o corpo é `novoGrupoSchema`; nome vazio → 422 `"O nome do grupo é obrigatório!"`; chama `criarGrupo`; audita `crm_field_group.created`), `app/api/v1/campos-do-crm/grupos/[id]/route.ts` (PATCH com `renomearGrupoSchema` → `renomearGrupo`, audita `crm_field_group.updated`; DELETE → `excluirGrupo`, audita `crm_field_group.deleted`; erro `padrao` → 422 `"Não é possível editar um campo padrão do sistema"`) e `app/api/v1/campos-do-crm/ordem/route.ts` (PUT com `ordemSchema` → `reordenar`; audita `crm_field.reordered`; devolve `ok({ objeto })`). Os três seguem a forma exata do `[id]/route.ts` acima (porta de admin, `respostaDoErroDoCatalogo`, `logger`, `fail` 500 com "Ocorreu um erro ao salvar").

Em `lib/audit/actions.ts`, logo depois de `"contacts.export_downloaded",`:

```ts
  // FORK ESCALE · Fase 2C: catálogo de campos por objeto (migration 9104).
  "crm_field.created", "crm_field.updated", "crm_field.deleted", "crm_field.reordered",
  "crm_field_group.created", "crm_field_group.updated", "crm_field_group.deleted",
```

- [ ] **Step 4: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-campos-rotas.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/campos app/api/v1/campos-do-crm lib/audit/actions.ts
```

Expected: PASS. Se o duplo de banco não suportar alguma cadeia (`.neq`, `.single`), acrescente o método ao duplo do teste em vez de mudar o `banco.ts`.

- [ ] **Step 5: Commit**

```bash
git add lib/escale/campos/banco.ts app/api/v1/campos-do-crm lib/audit/actions.ts tests/unit/escale-campos-rotas.test.ts
git commit -m "feat(escale): rotas do catálogo de campos por objeto — criar, mudar, excluir, grupos e ordem (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: O hook e a janela "Gerenciamento de campos" (lista, grupos, ⋮)

**Files:**
- Create: `hooks/escale/useCatalogoDeCampos.ts`, `components/escale/campos/JanelaDeGerenciarCampos.tsx`, `components/escale/campos/ListaDeCampos.tsx`, `components/escale/campos/IconeDoTipo.tsx`, `components/escale/campos/BalaoDeVisibilidade.tsx`, `tests/unit/escale-janela-de-gerenciar-campos.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (exportar `Type`, `Hash`, `Coins`, `AlignLeft`, `Phone`, `ListChecks`, `List`, `Calendar`, `CalendarClock`, `ToggleLeft`, `Mail`, `Link2`, `GripVertical`, `Settings2`, `Eye`, `EyeOff`, `Copy`, `Braces`, `Pencil`, `Trash2`, `Plus`, se ainda não exportados)

**Interfaces:**
- Consumes: as rotas da Task 3; `Catalogo`, `camposPorGrupo`, `ROTULO_DO_TIPO`, `ROTULO_DA_VISIBILIDADE`, `variavelDoCampo`, `ROTULO_DO_OBJETO`; `JanelaDaCasca`, `CabecaDaJanela` (`components/escale/origens/JanelaDaCasca.tsx`); `AbasDaCasca`, `BotaoDaCasca`, `PainelSuspenso`, `JanelaDeConfirmacao`, `SeletorDaCasca` (`components/escale/ui/*`); `@hello-pangea/dnd`.
- Produces:
  - `CHAVE_DO_CATALOGO = (objeto) => ["catalogo-de-campos", objeto]`;
  - `useCatalogoDeCampos(objeto, ativo = true): { catalogo: Catalogo; carregando: boolean; erro: boolean }`;
  - `useMudarCatalogo(objeto)`: `{ criarCampo, mudarCampo, excluirCampo, criarGrupo, renomearGrupo, excluirGrupo, reordenar }`, cada um uma mutation que invalida `CHAVE_DO_CATALOGO(objeto)` e, para `negocio`, também `["board"]` e `["pipelines"]`;
  - `JanelaDeGerenciarCampos({ aberta, aoFechar, objetoInicial }: { aberta: boolean; aoFechar: () => void; objetoInicial: ObjetoDeCampo })`;
  - `ListaDeCampos({ objeto, catalogo, grupoAtivo, busca, aoEditar, aoExcluir, aoRestringir, aoReordenar })`;
  - `IconeDoTipo({ tipo, tamanho? })`; `BalaoDeVisibilidade({ campo, aoMudar })`.

- [ ] **Step 1: O hook**

Create `hooks/escale/useCatalogoDeCampos.ts`:

```ts
"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { NovoCampo, OrdemDoCatalogo, PatchDoCampo } from "@/lib/escale/campos/banco";
import { CATALOGO_VAZIO, type Catalogo, type ObjetoDeCampo } from "@/lib/escale/campos/regras";

export const CHAVE_DO_CATALOGO = (objeto: ObjetoDeCampo) => ["catalogo-de-campos", objeto] as const;

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, { ...init, headers: { "content-type": "application/json", ...(init?.headers ?? {}) } });
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Ocorreu um erro ao salvar");
  return corpo.data as T;
}

export function useCatalogoDeCampos(objeto: ObjetoDeCampo, ativo = true) {
  const q = useQuery({
    queryKey: CHAVE_DO_CATALOGO(objeto),
    queryFn: () => pedir<Catalogo>(`/api/v1/campos-do-crm?objeto=${objeto}`),
    enabled: ativo,
    staleTime: 60_000,
  });
  return { catalogo: q.data ?? CATALOGO_VAZIO, carregando: q.isLoading, erro: q.isError };
}

export function useMudarCatalogo(objeto: ObjetoDeCampo) {
  const qc = useQueryClient();
  const depois = () => {
    void qc.invalidateQueries({ queryKey: CHAVE_DO_CATALOGO(objeto) });
    if (objeto === "negocio") {
      void qc.invalidateQueries({ queryKey: ["board"] });
      void qc.invalidateQueries({ queryKey: ["pipelines"] });
    }
    void qc.invalidateQueries({ queryKey: ["contact"] });
  };
  const base = `/api/v1/campos-do-crm`;
  return {
    criarCampo: useMutation({ mutationFn: (e: NovoCampo) => pedir(base, { method: "POST", body: JSON.stringify(e) }), onSuccess: depois }),
    mudarCampo: useMutation({
      mutationFn: ({ id, patch }: { id: string; patch: PatchDoCampo }) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "PATCH", body: JSON.stringify(patch) }),
      onSuccess: depois,
    }),
    excluirCampo: useMutation({ mutationFn: (id: string) => pedir(`${base}/${id}?objeto=${objeto}`, { method: "DELETE" }), onSuccess: depois }),
    criarGrupo: useMutation({ mutationFn: (nome: string) => pedir(`${base}/grupos`, { method: "POST", body: JSON.stringify({ objeto, nome }) }), onSuccess: depois }),
    renomearGrupo: useMutation({
      mutationFn: ({ id, nome }: { id: string; nome: string }) => pedir(`${base}/grupos/${id}`, { method: "PATCH", body: JSON.stringify({ nome }) }),
      onSuccess: depois,
    }),
    excluirGrupo: useMutation({ mutationFn: (id: string) => pedir(`${base}/grupos/${id}`, { method: "DELETE" }), onSuccess: depois }),
    reordenar: useMutation({ mutationFn: (ordem: OrdemDoCatalogo) => pedir(`${base}/ordem`, { method: "PUT", body: JSON.stringify(ordem) }), onSuccess: depois }),
  };
}
```

- [ ] **Step 2: O teste da janela (vai falhar)**

Create `tests/unit/escale-janela-de-gerenciar-campos.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const CATALOGO = {
  grupos: [
    { id: "g1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true },
    { id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
  ],
  campos: [
    { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false },
    { id: "c2", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: "g1", papel_minimo: "manager", posicao: 1, padrao: false },
    { id: "c3", objeto: "contato", chave: "score", definicao: { label: "Score", type: "number" }, grupo_id: "g2", papel_minimo: null, posicao: 0, padrao: false },
  ],
};

const fetchMock = vi.fn(async (url: string, init?: RequestInit) => {
  if (url.startsWith("/api/v1/campos-do-crm?objeto=contato")) return new Response(JSON.stringify({ data: CATALOGO }));
  if (url.startsWith("/api/v1/campos-do-crm?objeto=")) return new Response(JSON.stringify({ data: { grupos: [], campos: [] } }));
  return new Response(JSON.stringify({ data: { id: "novo" } }), { status: init?.method === "POST" ? 201 : 200 });
});
vi.stubGlobal("fetch", fetchMock);

const montar = () =>
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
      <JanelaDeGerenciarCampos aberta aoFechar={vi.fn()} objetoInicial="contato" />
    </QueryClientProvider>,
  );

describe("JanelaDeGerenciarCampos (FieldsConfigTab da Clint)", () => {
  it("título, subtítulo, as três abas e os botões", async () => {
    montar();
    expect(await screen.findByText("Gerenciamento de campos")).toBeInTheDocument();
    expect(screen.getByText("Campos cadastrados")).toBeInTheDocument();
    for (const aba of ["Contato", "Empresa", "Negócio"]) expect(screen.getByRole("tab", { name: aba })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar campo" })).toBeInTheDocument();
  });

  it("os grupos à esquerda; o ativo filtra a lista; a pílula de visibilidade", async () => {
    montar();
    const grupos = await screen.findByRole("navigation", { name: "Grupos de campos" });
    expect(within(grupos).getByText("Informações Gerais")).toBeInTheDocument();
    expect(screen.getByText("Cargo")).toBeInTheDocument();
    expect(screen.getByText("Renda")).toBeInTheDocument();
    expect(screen.queryByText("Score")).not.toBeInTheDocument();
    expect(screen.getByText("Restrito para A partir de gerente")).toBeInTheDocument();
    fireEvent.click(within(grupos).getByText("Kaio IA"));
    expect(screen.getByText("Score")).toBeInTheDocument();
    expect(screen.queryByText("Cargo")).not.toBeInTheDocument();
  });

  it("o ⋮ tem Editar nome, Restringir visibilidade, Usar como variável, Copiar identificador e Excluir; excluir confirma com os dois avisos", async () => {
    montar();
    await screen.findByText("Cargo");
    fireEvent.click(screen.getByRole("button", { name: "Ações de Cargo" }));
    for (const item of ["Editar nome do campo", "Restringir visibilidade", "Usar como variável", "Copiar identificador", "Excluir"]) {
      expect(screen.getByRole("menuitem", { name: item })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("A exclusão desse campo remove em toda origem. Deseja continuar?")).toBeInTheDocument();
    expect(screen.getByText("Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith("/api/v1/campos-do-crm/c1?objeto=contato", expect.objectContaining({ method: "DELETE" })));
  });

  it("um grupo vazio mostra o texto da Clint; a busca sem resultado também", async () => {
    montar();
    await screen.findByText("Cargo");
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), { target: { value: "zzz" } });
    expect(screen.getByText("Nenhum campo encontrado")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar o termo da busca ou limpar o filtro.")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-janela-de-gerenciar-campos.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Os componentes**

Create `components/escale/campos/IconeDoTipo.tsx`:

```tsx
import type { ReactNode } from "react";

import type { TipoDoMotor } from "@/lib/escale/campos/regras";
import { AlignLeft, Calendar, CalendarClock, Coins, Hash, Link2, List, ListChecks, Mail, Phone, ToggleLeft, Type } from "@/lib/ui/icons-da-casca";

const ICONES: Record<TipoDoMotor, (p: { size: number }) => ReactNode> = {
  text: (p) => <Type {...p} />,
  textarea: (p) => <AlignLeft {...p} />,
  number: (p) => <Hash {...p} />,
  currency: (p) => <Coins {...p} />,
  phone: (p) => <Phone {...p} />,
  select: (p) => <List {...p} />,
  multiselect: (p) => <ListChecks {...p} />,
  date: (p) => <Calendar {...p} />,
  datetime: (p) => <CalendarClock {...p} />,
  boolean: (p) => <ToggleLeft {...p} />,
  email: (p) => <Mail {...p} />,
  url: (p) => <Link2 {...p} />,
};

/** O ícone de cada tipo de campo (os da Clint, lucide). */
export function IconeDoTipo({ tipo, tamanho = 15 }: { tipo: TipoDoMotor; tamanho?: number }) {
  return <span className="inline-flex text-casca-marca">{ICONES[tipo]({ size: tamanho })}</span>;
}
```

Create `components/escale/campos/BalaoDeVisibilidade.tsx`:

```tsx
"use client";

import { useT } from "@/hooks/i18n/useT";
import { PAPEIS_DE_VISIBILIDADE, ROTULO_DA_VISIBILIDADE, type CampoDoCatalogo, type PapelMinimo } from "@/lib/escale/campos/regras";

/**
 * "Restringir visibilidade" (FieldsConfig da Clint). A Clint escolhe grupos de
 * permissão; aqui, o papel mínimo (Q1). Uma linha por opção, com rádio.
 */
export function BalaoDeVisibilidade({ campo, aoMudar }: { campo: CampoDoCatalogo; aoMudar: (papel: PapelMinimo | null) => void }) {
  const t = useT();
  const opcoes: Array<PapelMinimo | "todos"> = ["todos", ...PAPEIS_DE_VISIBILIDADE];
  const atual = campo.papel_minimo ?? "todos";
  return (
    <div role="radiogroup" aria-label={t("Restringir visibilidade")} className="flex w-[260px] flex-col gap-0.5 p-1">
      <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{t("Restrito para")}</p>
      {opcoes.map((o) => (
        <button
          key={o}
          type="button"
          role="radio"
          aria-checked={atual === o}
          onClick={() => aoMudar(o === "todos" ? null : o)}
          className="flex h-8 items-center gap-2 rounded-[6px] px-2 text-[13px] text-casca-texto hover:bg-casca-raia"
        >
          <span className={`inline-block size-3.5 rounded-full border ${atual === o ? "border-casca-marca bg-casca-marca shadow-[inset_0_0_0_3px_var(--escale-superficie)]" : "border-casca-borda"}`} />
          {t(ROTULO_DA_VISIBILIDADE[o])}
        </button>
      ))}
    </div>
  );
}
```

Confira antes de rodar: o nome do token de superfície da casca (`--escale-superficie` ou o que a `CaixaDaCasca` usa para o miolo do rádio); copie da `CaixaDaCasca`.

Create `components/escale/campos/ListaDeCampos.tsx`:

```tsx
"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import * as DropdownMenu from "@radix-ui/react-dropdown-menu";
import { useMemo } from "react";

import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_VISIBILIDADE, type CampoDoCatalogo, type Catalogo, type GrupoDeCampos, camposPorGrupo } from "@/lib/escale/campos/regras";
import { GripVertical, MoreVertical } from "@/lib/ui/icons-da-casca";

import { IconeDoTipo } from "./IconeDoTipo";

export interface ListaDeCamposProps {
  catalogo: Catalogo;
  grupoAtivo: GrupoDeCampos | null;
  busca: string;
  aoEditarNome: (campo: CampoDoCatalogo) => void;
  aoRestringir: (campo: CampoDoCatalogo, ancora: HTMLElement) => void;
  aoCopiarVariavel: (campo: CampoDoCatalogo) => void;
  aoCopiarIdentificador: (campo: CampoDoCatalogo) => void;
  aoExcluir: (campo: CampoDoCatalogo) => void;
  aoReordenar: (grupoId: string, ids: string[]) => void;
}

/** As linhas de campo de um grupo (FieldsConfig da Clint): alça, ícone, nome, identificador, visibilidade e ⋮. */
export function ListaDeCampos(p: ListaDeCamposProps) {
  const t = useT();
  const porGrupo = useMemo(() => camposPorGrupo(p.catalogo), [p.catalogo]);
  const termo = p.busca.trim().toLowerCase();
  const visiveis = useMemo(() => {
    const base = termo ? porGrupo.flatMap((g) => g.campos) : (porGrupo.find((g) => g.grupo.id === p.grupoAtivo?.id)?.campos ?? []);
    return termo ? base.filter((c) => String(c.definicao.label).toLowerCase().includes(termo) || c.chave.includes(termo)) : base;
  }, [porGrupo, termo, p.grupoAtivo]);

  if (termo && visiveis.length === 0) {
    return (
      <Vazio titulo={t("Nenhum campo encontrado")} texto={t("Tente ajustar o termo da busca ou limpar o filtro.")} />
    );
  }
  if (!termo && visiveis.length === 0) {
    return <Vazio titulo={t("Nenhum campo neste grupo")} texto={t("Adicione um campo para começar a coletar informações neste grupo.")} />;
  }

  const aoSoltar = (r: DropResult) => {
    if (!r.destination || termo || !p.grupoAtivo) return;
    const ids = visiveis.map((c) => c.id);
    const [movido] = ids.splice(r.source.index, 1);
    ids.splice(r.destination.index, 0, movido);
    p.aoReordenar(p.grupoAtivo.id, ids);
  };

  return (
    <DragDropContext onDragEnd={aoSoltar}>
      <Droppable droppableId="campos" isDropDisabled={Boolean(termo)}>
        {(drop) => (
          <ul ref={drop.innerRef} {...drop.droppableProps} className="flex flex-col">
            {visiveis.map((campo, i) => (
              <Draggable key={campo.id} draggableId={campo.id} index={i} isDragDisabled={Boolean(termo)}>
                {(drag) => (
                  <li ref={drag.innerRef} {...drag.draggableProps} className="flex h-12 items-center gap-3 border-b border-casca-borda px-2">
                    <span {...drag.dragHandleProps} className="text-casca-meta" aria-label={t("arraste para reordenar")}>
                      <GripVertical size={16} />
                    </span>
                    <IconeDoTipo tipo={campo.definicao.type} />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-casca-texto">{String(campo.definicao.label)}</span>
                      <span className="block font-mono text-[11px] text-casca-suave">{campo.chave}</span>
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] ${campo.papel_minimo ? "bg-casca-marca-suave text-casca-marca" : "bg-casca-raia text-casca-suave"}`}
                    >
                      {campo.papel_minimo ? `${t("Restrito para")} ${t(ROTULO_DA_VISIBILIDADE[campo.papel_minimo])}` : t("Sempre visível")}
                    </span>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button type="button" aria-label={`${t("Ações de")} ${String(campo.definicao.label)}`} className="rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia">
                          <MoreVertical size={18} />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content align="end" sideOffset={6} className="z-[70] w-[232px] rounded-[8px] border border-casca-borda bg-casca-superficie p-1 shadow-casca">
                          <Item rotulo={t("Editar nome do campo")} desabilitado={campo.padrao} dica={campo.padrao ? t("Não é possível editar um campo padrão do sistema") : undefined} onSelect={() => p.aoEditarNome(campo)} />
                          <Item rotulo={t("Restringir visibilidade")} onSelect={(e) => p.aoRestringir(campo, e.currentTarget as HTMLElement)} />
                          <Item rotulo={t("Usar como variável")} onSelect={() => p.aoCopiarVariavel(campo)} />
                          <Item rotulo={t("Copiar identificador")} onSelect={() => p.aoCopiarIdentificador(campo)} />
                          <DropdownMenu.Separator className="my-1 h-px bg-casca-borda" />
                          <Item rotulo={t("Excluir")} perigo desabilitado={campo.padrao} dica={campo.padrao ? t("Esse campo é padrão e não pode ser excluído.") : undefined} onSelect={() => p.aoExcluir(campo)} />
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                  </li>
                )}
              </Draggable>
            ))}
            {drop.placeholder}
          </ul>
        )}
      </Droppable>
    </DragDropContext>
  );
}

function Item({ rotulo, onSelect, desabilitado, dica, perigo }: { rotulo: string; onSelect: (e: Event) => void; desabilitado?: boolean; dica?: string; perigo?: boolean }) {
  return (
    <DropdownMenu.Item
      disabled={desabilitado}
      title={dica}
      onSelect={onSelect}
      className={`flex h-8 cursor-pointer items-center rounded-[6px] px-2 text-[13px] outline-hidden data-[disabled]:cursor-not-allowed data-[disabled]:opacity-50 data-[highlighted]:bg-casca-raia ${perigo ? "text-casca-alerta" : "text-casca-texto"}`}
    >
      {rotulo}
    </DropdownMenu.Item>
  );
}

function Vazio({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex flex-col items-center gap-1 py-12 text-center">
      <p className="text-[13px] font-medium text-casca-texto">{titulo}</p>
      <p className="text-[12px] text-casca-suave">{texto}</p>
    </div>
  );
}
```

Confira antes de rodar: os nomes dos tokens `bg-casca-superficie`, `shadow-casca`, `text-casca-alerta`, `outline-hidden` que o menu `MenuDaLinha.tsx` (2A) usa; copie as classes dele para o `Content` e os itens.

Create `components/escale/campos/JanelaDeGerenciarCampos.tsx`:

```tsx
"use client";

import * as Popover from "@radix-ui/react-popover";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { CabecaDaJanela, JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { useT } from "@/hooks/i18n/useT";
import { useCatalogoDeCampos, useMudarCatalogo } from "@/hooks/escale/useCatalogoDeCampos";
import { type CampoDoCatalogo, type GrupoDeCampos, OBJETOS_DE_CAMPO, type ObjetoDeCampo, ROTULO_DO_OBJETO, variavelDoCampo } from "@/lib/escale/campos/regras";
import { Search } from "@/lib/ui/icons-da-casca";

import { BalaoDeVisibilidade } from "./BalaoDeVisibilidade";
import { FormularioDeCampo } from "./FormularioDeCampo";
import { FormularioDeGrupo } from "./FormularioDeGrupo";
import { GruposDoCatalogo } from "./GruposDoCatalogo";
import { ListaDeCampos } from "./ListaDeCampos";

export interface JanelaDeGerenciarCamposProps {
  aberta: boolean;
  aoFechar: () => void;
  objetoInicial: ObjetoDeCampo;
}

/**
 * "Gerenciamento de campos" da Clint (FieldsConfigTab como modal): abas por
 * objeto, grupos à esquerda, a lista do grupo à direita, "Adicionar grupo" e
 * "Adicionar campo". Só administrador abre (quem chama já conferiu).
 */
export function JanelaDeGerenciarCampos({ aberta, aoFechar, objetoInicial }: JanelaDeGerenciarCamposProps) {
  const t = useT();
  const [objeto, setObjeto] = useState<ObjetoDeCampo>(objetoInicial);
  const [grupoAtivoId, setGrupoAtivoId] = useState<string | null>(null);
  const [busca, setBusca] = useState("");
  const [formulario, setFormulario] = useState<"campo" | "grupo" | null>(null);
  const [editando, setEditando] = useState<CampoDoCatalogo | null>(null);
  const [excluindo, setExcluindo] = useState<CampoDoCatalogo | null>(null);
  const [restringindo, setRestringindo] = useState<{ campo: CampoDoCatalogo; ancora: HTMLElement } | null>(null);
  const { catalogo, carregando, erro } = useCatalogoDeCampos(objeto, aberta);
  const mudar = useMudarCatalogo(objeto);

  useEffect(() => setObjeto(objetoInicial), [objetoInicial, aberta]);
  useEffect(() => {
    if (!catalogo.grupos.length) return;
    if (!grupoAtivoId || !catalogo.grupos.some((g) => g.id === grupoAtivoId)) setGrupoAtivoId(catalogo.grupos[0].id);
  }, [catalogo.grupos, grupoAtivoId]);

  const grupoAtivo: GrupoDeCampos | null = useMemo(() => catalogo.grupos.find((g) => g.id === grupoAtivoId) ?? null, [catalogo.grupos, grupoAtivoId]);

  const copiar = async (texto: string, aviso: string) => {
    try {
      await navigator.clipboard.writeText(texto);
      toast.success(t(aviso));
    } catch {
      toast.error(t("Ocorreu um erro ao salvar"));
    }
  };

  const abas = OBJETOS_DE_CAMPO.map((o) => ({ valor: o, rotulo: t(ROTULO_DO_OBJETO[o]) }));

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(960px,100%)] h-[min(680px,92vh)]">
      <CabecaDaJanela titulo={t("Gerenciamento de campos")} descricao={t("Campos cadastrados")} />
      <div className="flex items-center justify-between gap-3 px-6">
        <AbasDaCasca abas={abas} valor={objeto} aoMudar={(v) => { setObjeto(v); setGrupoAtivoId(null); setBusca(""); }} aria-label={t("Objeto")} />
        <div className="flex items-center gap-2">
          <BotaoDaCasca variante="novo" tamanho="sm" onClick={() => setFormulario("grupo")}>{t("Adicionar grupo")}</BotaoDaCasca>
          <BotaoDaCasca variante="marca" tamanho="sm" onClick={() => setFormulario("campo")}>{t("Adicionar campo")}</BotaoDaCasca>
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 border-t border-casca-borda">
        <GruposDoCatalogo
          grupos={catalogo.grupos}
          ativo={grupoAtivo}
          aoEscolher={(g) => { setGrupoAtivoId(g.id); setBusca(""); }}
          aoRenomear={(g, nome) => mudar.renomearGrupo.mutate({ id: g.id, nome }, { onError: (e) => toast.error(e.message) })}
          aoExcluir={(g) => mudar.excluirGrupo.mutate(g.id, { onError: (e) => toast.error(e.message) })}
          aoReordenar={(ids) => mudar.reordenar.mutate({ objeto, grupos: ids, campos: [] }, { onError: (e) => toast.error(e.message) })}
        />
        <div className="flex min-w-0 flex-1 flex-col">
          <label className="relative m-3 block w-[220px]">
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar coluna ou campo")}
              className="h-8 w-full rounded-[6px] bg-casca-busca pl-3 pr-8 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
            <Search size={15} className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-casca-meta" />
          </label>
          <div className="min-h-0 flex-1 overflow-y-auto px-3">
            {carregando && <p className="py-12 text-center text-[13px] text-casca-suave">{t("Carregando…")}</p>}
            {erro && <p className="py-12 text-center text-[13px] text-casca-suave">{t("Ocorreu um erro ao carregar os dados")}</p>}
            {!carregando && !erro && (
              <ListaDeCampos
                catalogo={catalogo}
                grupoAtivo={grupoAtivo}
                busca={busca}
                aoEditarNome={setEditando}
                aoRestringir={(campo, ancora) => setRestringindo({ campo, ancora })}
                aoCopiarVariavel={(c) => void copiar(variavelDoCampo(objeto, c.chave), "Variável copiada!")}
                aoCopiarIdentificador={(c) => void copiar(c.chave, "Identificador copiado!")}
                aoExcluir={setExcluindo}
                aoReordenar={(grupoId, ids) => mudar.reordenar.mutate({ objeto, grupos: catalogo.grupos.map((g) => g.id), campos: [{ grupo_id: grupoId, ids }] })}
              />
            )}
          </div>
        </div>
      </div>

      {formulario === "campo" && (
        <FormularioDeCampo
          objeto={objeto}
          catalogo={catalogo}
          grupoSugerido={grupoAtivo}
          aoFechar={() => setFormulario(null)}
          aoSalvar={(entrada) =>
            mudar.criarCampo.mutateAsync(entrada).then(() => { toast.success(t("As alterações foram salvas com sucesso!")); setFormulario(null); })
          }
          aoCriarGrupo={(nome) => mudar.criarGrupo.mutateAsync(nome)}
        />
      )}
      {formulario === "grupo" && (
        <FormularioDeGrupo aoFechar={() => setFormulario(null)} aoSalvar={(nome) => mudar.criarGrupo.mutateAsync(nome).then(() => setFormulario(null))} />
      )}
      {editando && (
        <FormularioDeCampo
          objeto={objeto}
          catalogo={catalogo}
          grupoSugerido={grupoAtivo}
          campo={editando}
          aoFechar={() => setEditando(null)}
          aoSalvar={(entrada) =>
            mudar.mudarCampo.mutateAsync({ id: editando.id, patch: { nome: entrada.nome, grupo_id: entrada.grupo_id, opcoes: entrada.opcoes } }).then(() => setEditando(null))
          }
          aoCriarGrupo={(nome) => mudar.criarGrupo.mutateAsync(nome)}
        />
      )}
      <JanelaDeConfirmacao
        aberta={Boolean(excluindo)}
        aoFechar={() => setExcluindo(null)}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        ocupado={mudar.excluirCampo.isPending}
        aoConfirmar={() => excluindo && mudar.excluirCampo.mutate(excluindo.id, { onSuccess: () => setExcluindo(null), onError: (e) => toast.error(e.message) })}
      >
        <p className="text-[13px] text-casca-texto">{t("A exclusão desse campo remove em toda origem. Deseja continuar?")}</p>
        <p className="mt-2 text-[12px] text-casca-suave">{t("Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.")}</p>
      </JanelaDeConfirmacao>
      {restringindo && (
        <Popover.Root open onOpenChange={(o) => !o && setRestringindo(null)}>
          <Popover.Anchor virtualRef={{ current: restringindo.ancora }} />
          <PainelSuspenso align="end">
            <BalaoDeVisibilidade
              campo={restringindo.campo}
              aoMudar={(papel) => mudar.mudarCampo.mutate({ id: restringindo.campo.id, patch: { papel_minimo: papel } }, { onSuccess: () => setRestringindo(null), onError: (e) => toast.error(e.message) })}
            />
          </PainelSuspenso>
        </Popover.Root>
      )}
    </JanelaDaCasca>
  );
}
```

Create `components/escale/campos/GruposDoCatalogo.tsx` (a coluna da esquerda, 238px, igual à `nav` da `CamposDaFicha`: `<nav aria-label={t("Grupos de campos")}>`, uma linha por grupo com o estilo do ativo; o ⋮ do grupo com "Editar nome do campo" (aqui "Renomear grupo", texto nosso) e "Excluir" (desligado no padrão); arraste vertical com `@hello-pangea/dnd` e a dica "Arraste para reordenar os grupos" no `title` da alça). Mesma estrutura da `ListaDeCampos`, com `Draggable` por grupo e `aoReordenar(ids)` no `onDragEnd`.

- [ ] **Step 4: Rodar**

A `FormularioDeCampo` e a `FormularioDeGrupo` são da Task 5; até lá, crie-as como `export function FormularioDeCampo() { return null; }` (e o mesmo para o grupo) só para o teste desta task compilar, e substitua na Task 5.

```bash
corepack pnpm vitest run tests/unit/escale-janela-de-gerenciar-campos.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/campos hooks/escale/useCatalogoDeCampos.ts lib/ui/icons-da-casca.ts
corepack pnpm vitest run tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add hooks/escale/useCatalogoDeCampos.ts components/escale/campos lib/ui/icons-da-casca.ts tests/unit/escale-janela-de-gerenciar-campos.test.tsx
git commit -m "feat(escale): janela Gerenciamento de campos — abas, grupos, lista, visibilidade e exclusão (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: O formulário "Adicionar campo" e o "Adicionar grupo" da Clint

**Files:**
- Create: `components/escale/campos/FormularioDeCampo.tsx`, `components/escale/campos/FormularioDeGrupo.tsx`, `components/escale/campos/OpcoesDeSelecao.tsx`, `tests/unit/escale-formulario-de-campo.test.tsx`

**Interfaces:**
- Consumes: `TIPOS_DA_CLINT`, `tipoDoMotor`, `chaveDoNome`, `ROTULO_DO_OBJETO`, `Catalogo`, `GrupoDeCampos`; `NovoCampo` (Task 3); `JanelaDaCasca`, `CabecaDaJanela`, `Campo`, `CampoDeTexto`, `BotaoDaJanela`, `RodapeDaJanela`; `SeletorDaCasca`; `IconeDoTipo`.
- Produces:
  - `FormularioDeCampo({ objeto, catalogo, grupoSugerido, campo?, aoFechar, aoSalvar(entrada: NovoCampo): Promise<unknown>, aoCriarGrupo(nome): Promise<GrupoDeCampos> })`: janela por cima da janela (segundo `JanelaDaCasca`), com "Estou criando um campo para:" (só ao criar, as três pílulas trocam o `objeto` do pedido), "Nome do campo", "Grupo" (+ grupo inline), "Tipo do campo" (grade de 9; desligada ao editar) e "Opções de seleção" (select/multiselect);
  - `FormularioDeGrupo({ aoFechar, aoSalvar(nome): Promise<unknown> })`;
  - `OpcoesDeSelecao({ opcoes: string[], aoMudar })` (arraste, número, texto, X, "Nova opção").

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-formulario-de-campo.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { FormularioDeCampo } from "@/components/escale/campos/FormularioDeCampo";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const CATALOGO = {
  grupos: [{ id: "g1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true }],
  campos: [{ id: "c1", objeto: "contato" as const, chave: "cargo", definicao: { label: "Cargo", type: "text" as const }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false }],
};

describe("FormularioDeCampo (AddFieldForm da Clint)", () => {
  it("pílulas de objeto, nome com o exemplo do objeto, grupo e os nove tipos; Salvar só com nome, grupo e tipo", async () => {
    const aoSalvar = vi.fn().mockResolvedValue(undefined);
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]} aoFechar={vi.fn()} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    expect(screen.getByText("Estou criando um campo para:")).toBeInTheDocument();
    for (const o of ["Contato", "Empresa", "Negócio"]) expect(screen.getByRole("radio", { name: o })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: Linkedin")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Empresa" }));
    expect(screen.getByPlaceholderText("Ex: Número de funcionários")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: "Contato" }));

    const salvar = screen.getByRole("button", { name: "Salvar" });
    expect(salvar).toBeDisabled();
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Linkedin" } });
    expect(screen.getByText("Grupo")).toBeInTheDocument();
    expect(screen.getByText("Tipo do campo")).toBeInTheDocument();
    for (const tipo of ["Texto", "Número", "Monetário", "Texto Rico", "Telefone", "Seleção", "Múltipla seleção", "Data", "Data e Hora"]) {
      expect(screen.getByRole("radio", { name: tipo })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("radio", { name: "Número" }));
    expect(salvar).toBeEnabled();
    fireEvent.click(salvar);
    await waitFor(() => expect(aoSalvar).toHaveBeenCalledWith({ objeto: "contato", nome: "Linkedin", grupo_id: "g1", tipo: "NUMBER", opcoes: undefined }));
  });

  it("nome já existente avisa com o texto da Clint e não salva", () => {
    const aoSalvar = vi.fn();
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]} aoFechar={vi.fn()} aoSalvar={aoSalvar} aoCriarGrupo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "cargo" } });
    expect(screen.getByText("Já existe um outro campo com o nome informado, o campo deve ser único.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
  });

  it("Seleção pede opções; 'Nova opção' acrescenta linha; sem opção não salva", () => {
    render(<FormularioDeCampo objeto="negocio" catalogo={{ ...CATALOGO, campos: [] }} grupoSugerido={CATALOGO.grupos[0]} aoFechar={vi.fn()} aoSalvar={vi.fn()} aoCriarGrupo={vi.fn()} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Origem" } });
    fireEvent.click(screen.getByRole("radio", { name: "Seleção" }));
    expect(screen.getByText("Opções de seleção")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Nova opção" }));
    const caixas = screen.getAllByLabelText(/Opção \d/);
    fireEvent.change(caixas[0], { target: { value: "Orgânico" } });
    expect(screen.getByRole("button", { name: "Salvar" })).toBeEnabled();
  });

  it("o grupo inline: '+' abre 'Nome do Grupo', salva e já seleciona", async () => {
    const aoCriarGrupo = vi.fn().mockResolvedValue({ id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false });
    render(<FormularioDeCampo objeto="contato" catalogo={CATALOGO} grupoSugerido={CATALOGO.grupos[0]} aoFechar={vi.fn()} aoSalvar={vi.fn()} aoCriarGrupo={aoCriarGrupo} />);
    fireEvent.change(screen.getByLabelText("Nome do campo"), { target: { value: "Score" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar um grupo" }));
    fireEvent.change(screen.getByPlaceholderText("Digite para criar um novo grupo"), { target: { value: "Kaio IA" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar grupo" }));
    await waitFor(() => expect(aoCriarGrupo).toHaveBeenCalledWith("Kaio IA"));
    expect(await screen.findByText("Kaio IA")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-formulario-de-campo.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os componentes**

Create `components/escale/campos/OpcoesDeSelecao.tsx`:

```tsx
"use client";

import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { GripVertical, Plus, X } from "@/lib/ui/icons-da-casca";

/** "Opções de seleção" do AddFieldForm: alça, número, texto, X e "Nova opção". */
export function OpcoesDeSelecao({ opcoes, aoMudar }: { opcoes: string[]; aoMudar: (opcoes: string[]) => void }) {
  const t = useT();
  const soltar = (r: DropResult) => {
    if (!r.destination) return;
    const novas = [...opcoes];
    const [m] = novas.splice(r.source.index, 1);
    novas.splice(r.destination.index, 0, m);
    aoMudar(novas);
  };
  return (
    <div>
      <p className="mb-2 text-[13px] font-medium text-casca-texto">{t("Opções de seleção")}</p>
      <DragDropContext onDragEnd={soltar}>
        <Droppable droppableId="opcoes">
          {(drop) => (
            <div ref={drop.innerRef} {...drop.droppableProps} className="flex flex-col gap-1.5">
              {opcoes.map((o, i) => (
                <Draggable key={i} draggableId={`opcao-${i}`} index={i}>
                  {(drag) => (
                    <div ref={drag.innerRef} {...drag.draggableProps} className="flex items-center gap-2">
                      <span {...drag.dragHandleProps} className="text-casca-meta"><GripVertical size={16} /></span>
                      <span className="w-5 text-center text-[12px] text-casca-suave">{i + 1}</span>
                      <CampoDeTexto aria-label={`${t("Opção")} ${i + 1}`} value={o} onChange={(e) => aoMudar(opcoes.map((x, j) => (j === i ? e.target.value : x)))} />
                      <button type="button" aria-label={t("Remover opção")} onClick={() => aoMudar(opcoes.filter((_, j) => j !== i))} className="text-casca-meta hover:text-casca-texto">
                        <X size={16} />
                      </button>
                    </div>
                  )}
                </Draggable>
              ))}
              {drop.placeholder}
            </div>
          )}
        </Droppable>
      </DragDropContext>
      <button type="button" onClick={() => aoMudar([...opcoes, ""])} className="mt-2 inline-flex items-center gap-1 text-[13px] font-medium text-casca-marca">
        {t("Nova opção")} <Plus size={14} />
      </button>
    </div>
  );
}
```

Create `components/escale/campos/FormularioDeGrupo.tsx`:

```tsx
"use client";

import { useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";

/** "Adicionar grupo" (AddFieldGroup da Clint). */
export function FormularioDeGrupo({ aoFechar, aoSalvar }: { aoFechar: () => void; aoSalvar: (nome: string) => Promise<unknown> }) {
  const t = useT();
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const salvar = async () => {
    if (!nome.trim()) return setErro(t("O nome do grupo é obrigatório!"));
    setSalvando(true);
    try {
      await aoSalvar(nome.trim());
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };
  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[min(480px,100%)]">
      <CabecaDaJanela titulo={t("Adicionar grupo")} />
      <div className="px-6 py-4">
        <Campo rotulo={t("Nome do Grupo")} obrigatorio>
          <CampoDeTexto autoFocus value={nome} onChange={(e) => { setNome(e.target.value); setErro(null); }} placeholder={t("Digite para criar um novo grupo")} />
        </Campo>
        {erro && <p className="mt-2 text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={salvando}>{t("Salvar")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Create `components/escale/campos/FormularioDeCampo.tsx`:

```tsx
"use client";

import { useMemo, useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { NovoCampo } from "@/lib/escale/campos/banco";
import {
  type CampoDoCatalogo,
  type Catalogo,
  type GrupoDeCampos,
  OBJETOS_DE_CAMPO,
  type ObjetoDeCampo,
  ROTULO_DO_OBJETO,
  TIPOS_DA_CLINT,
  type TipoDaClint,
  tipoDoMotor,
} from "@/lib/escale/campos/regras";
import { Briefcase, Building2, Plus, User } from "@/lib/ui/icons-da-casca";

import { IconeDoTipo } from "./IconeDoTipo";
import { OpcoesDeSelecao } from "./OpcoesDeSelecao";

const EXEMPLO: Record<ObjetoDeCampo, string> = { contato: "Ex: Linkedin", empresa: "Ex: Número de funcionários", negocio: "Ex: Projeto interessado" };
const ICONE_DO_OBJETO: Record<ObjetoDeCampo, typeof User> = { contato: User, empresa: Building2, negocio: Briefcase };

export interface FormularioDeCampoProps {
  objeto: ObjetoDeCampo;
  catalogo: Catalogo;
  grupoSugerido: GrupoDeCampos | null;
  /** Editando: o nome, o grupo e as opções mudam; o objeto e o tipo não. */
  campo?: CampoDoCatalogo;
  aoFechar: () => void;
  aoSalvar: (entrada: NovoCampo) => Promise<unknown>;
  aoCriarGrupo: (nome: string) => Promise<GrupoDeCampos>;
}

/** "Adicionar campo" da Clint (AddFieldForm), por cima da janela de gerenciamento. */
export function FormularioDeCampo(p: FormularioDeCampoProps) {
  const t = useT();
  const editando = Boolean(p.campo);
  const [objeto, setObjeto] = useState<ObjetoDeCampo>(p.objeto);
  const [nome, setNome] = useState(p.campo ? String(p.campo.definicao.label) : "");
  const [grupoId, setGrupoId] = useState<string | null>(p.campo?.grupo_id ?? p.grupoSugerido?.id ?? null);
  const [grupos, setGrupos] = useState<GrupoDeCampos[]>(p.catalogo.grupos);
  const [tipo, setTipo] = useState<TipoDaClint | null>(p.campo ? (TIPOS_DA_CLINT.find((x) => x.motor === p.campo!.definicao.type)?.chave ?? null) : null);
  const [opcoes, setOpcoes] = useState<string[]>(p.campo?.definicao.options?.map((o) => o.label) ?? [""]);
  const [novoGrupo, setNovoGrupo] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  const nomeRepetido = useMemo(() => {
    const n = nome.trim().toLowerCase();
    return Boolean(n) && p.catalogo.campos.some((c) => c.id !== p.campo?.id && String(c.definicao.label).trim().toLowerCase() === n);
  }, [nome, p.catalogo.campos, p.campo]);

  const precisaDeOpcoes = tipo === "SELECT" || tipo === "MULTIPLE_SELECT";
  const opcoesValidas = opcoes.map((o) => o.trim()).filter(Boolean);
  const podeSalvar = nome.trim().length > 0 && !nomeRepetido && Boolean(grupoId) && Boolean(tipo) && (!precisaDeOpcoes || opcoesValidas.length > 0) && !salvando;

  const salvar = async () => {
    if (!podeSalvar || !tipo || !grupoId) return;
    setSalvando(true);
    setErro(null);
    try {
      await p.aoSalvar({ objeto, nome: nome.trim(), grupo_id: grupoId, tipo, opcoes: precisaDeOpcoes ? opcoesValidas : undefined });
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    } finally {
      setSalvando(false);
    }
  };

  const criarGrupo = async () => {
    if (!novoGrupo?.trim()) return setErro(t("O nome do grupo é obrigatório!"));
    try {
      const g = await p.aoCriarGrupo(novoGrupo.trim());
      setGrupos((atuais) => [...atuais, g]);
      setGrupoId(g.id);
      setNovoGrupo(null);
    } catch (e) {
      setErro(e instanceof Error ? e.message : t("Ocorreu um erro ao salvar"));
    }
  };

  return (
    <JanelaDaCasca aberta onFechar={p.aoFechar} className="w-[min(640px,100%)]">
      <CabecaDaJanela titulo={editando ? t("Editar nome do campo") : t("Adicionar campo")} />
      <div className="flex flex-col gap-5 px-6 py-4">
        {!editando && (
          <div>
            <p className="mb-3 text-[13px] font-medium text-casca-texto">{t("Estou criando um campo para:")}</p>
            <div role="radiogroup" aria-label={t("Objeto")} className="flex gap-2">
              {OBJETOS_DE_CAMPO.map((o) => {
                const Icone = ICONE_DO_OBJETO[o];
                const ativo = objeto === o;
                return (
                  <button
                    key={o}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    onClick={() => setObjeto(o)}
                    className={`flex flex-1 flex-col items-center gap-1.5 rounded-[8px] border px-2 py-3 text-[12px] font-medium ${ativo ? "border-casca-marca text-casca-marca" : "border-casca-borda text-casca-texto"} bg-casca-raia`}
                  >
                    <Icone size={22} />
                    {t(ROTULO_DO_OBJETO[o])}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <Campo rotulo={t("Nome do campo")} obrigatorio>
          <CampoDeTexto id="nome-do-campo" aria-label={t("Nome do campo")} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={EXEMPLO[objeto]} />
          {nomeRepetido && <p className="mt-1.5 text-[11px] text-casca-alerta">{t("Já existe um outro campo com o nome informado, o campo deve ser único.")}</p>}
        </Campo>

        {nome.trim() && (
          <div>
            <p className="mb-1.5 text-[13px] font-medium text-casca-texto">{t("Grupo")}</p>
            {novoGrupo === null ? (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <SeletorDaCasca
                    aparencia="janela"
                    valor={grupoId}
                    opcoes={grupos.map((g) => ({ valor: g.id, rotulo: g.nome }))}
                    aoMudar={(v) => setGrupoId(v)}
                    aria-label={t("Grupo")}
                    vazio={t("Selecione um grupo")}
                  />
                </div>
                <button type="button" aria-label={t("Adicionar um grupo")} title={t("Adicionar um grupo")} onClick={() => setNovoGrupo("")} className="rounded-full border border-casca-borda p-1 text-casca-marca">
                  <Plus size={16} />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <div className="flex-1">
                  <p className="mb-1 text-[12px] text-casca-suave">{t("Nome do Grupo")}</p>
                  <CampoDeTexto autoFocus value={novoGrupo} onChange={(e) => setNovoGrupo(e.target.value)} placeholder={t("Digite para criar um novo grupo")} />
                </div>
                <BotaoDaJanela variante="salvar" onClick={criarGrupo}>{t("Criar grupo")}</BotaoDaJanela>
              </div>
            )}
          </div>
        )}

        {grupoId && (
          <div>
            <p className="mb-2 text-[13px] font-medium text-casca-texto">{t("Tipo do campo")}</p>
            <div role="radiogroup" aria-label={t("Tipo do campo")} className="grid grid-cols-3 gap-2 sm:grid-cols-5">
              {TIPOS_DA_CLINT.map((x) => {
                const ativo = tipo === x.chave;
                return (
                  <button
                    key={x.chave}
                    type="button"
                    role="radio"
                    aria-checked={ativo}
                    disabled={editando}
                    title={editando ? t("O tipo não muda depois de criado.") : undefined}
                    onClick={() => { setTipo(x.chave); if ((x.chave === "SELECT" || x.chave === "MULTIPLE_SELECT") && opcoes.length === 0) setOpcoes([""]); }}
                    className={`flex h-16 flex-col items-center justify-center gap-1 rounded-[8px] border text-[11px] font-medium disabled:opacity-60 ${ativo ? "border-casca-marca text-casca-marca" : "border-casca-borda text-casca-texto"} bg-casca-raia`}
                  >
                    <IconeDoTipo tipo={tipoDoMotor(x.chave)} tamanho={18} />
                    {t(x.rotulo)}
                  </button>
                );
              })}
            </div>
            {precisaDeOpcoes && <div className="mt-5"><OpcoesDeSelecao opcoes={opcoes} aoMudar={setOpcoes} /></div>}
          </div>
        )}
        {erro && <p className="text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={p.aoFechar}>{t("Cancelar")}</BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={salvar} disabled={!podeSalvar} title={!podeSalvar ? t("Preencha nome, grupo e tipo.") : undefined}>{t("Salvar")}</BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Confira antes de rodar: a `Campo` da `JanelaDaCasca` liga `<label>` ao filho? Se não, o `getByLabelText("Nome do campo")` do teste precisa do `aria-label` (já está). O `SeletorDaCasca` aceita `valor` nulo e `vazio`? (2A o usa assim na `JanelaNovoNegocio`; copie a forma de lá.)

- [ ] **Step 3: Rodar**

```bash
corepack pnpm vitest run tests/unit/escale-formulario-de-campo.test.tsx tests/unit/escale-janela-de-gerenciar-campos.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/campos
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/escale/campos tests/unit/escale-formulario-de-campo.test.tsx
git commit -m "feat(escale): formulário Adicionar campo e Adicionar grupo da Clint (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Espanhol, PRD e o PR A

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco novo logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`)
- Modify (fora do repositório): o PRD, linha da 2C

- [ ] **Step 1: O espanhol**

Acrescente o bloco (use o mesmo script da Task 6 da 2B, com `TITULO = "  // ─── FORK ESCALE · Fase 2C (PR A): catálogo de campos por objeto ───"`):

```js
const ES = {
  "Gerenciamento de campos": "Gestión de campos",
  "Campos cadastrados": "Campos registrados",
  "Adicionar campo": "Agregar campo",
  "Adicionar grupo": "Agregar grupo",
  "Objeto": "Objeto",
  "Contato": "Contacto",
  "Empresa": "Empresa",
  "Negócio": "Negocio",
  "Grupos de campos": "Grupos de campos",
  "Buscar coluna ou campo": "Buscar columna o campo",
  "Carregando…": "Cargando…",
  "Ocorreu um erro ao carregar os dados": "Ocurrió un error al cargar los datos",
  "Nenhum campo neste grupo": "Ningún campo en este grupo",
  "Adicione um campo para começar a coletar informações neste grupo.": "Agrega un campo para empezar a recopilar información en este grupo.",
  "Nenhum campo encontrado": "Ningún campo encontrado",
  "Tente ajustar o termo da busca ou limpar o filtro.": "Prueba ajustar el término de búsqueda o limpiar el filtro.",
  "arraste para reordenar": "arrastra para reordenar",
  "Arraste para reordenar os grupos": "Arrastra para reordenar los grupos",
  "Ações de": "Acciones de",
  "Editar nome do campo": "Editar nombre del campo",
  "Não é possível editar um campo padrão do sistema": "No es posible editar un campo estándar del sistema",
  "Restringir visibilidade": "Restringir visibilidad",
  "Restrito para": "Restringido para",
  "Sempre visível": "Siempre visible",
  "A partir de atendente": "A partir de agente",
  "A partir de gerente": "A partir de gerente",
  "Só administrador": "Solo administrador",
  "Usar como variável": "Usar como variable",
  "Variável copiada!": "¡Variable copiada!",
  "Copiar identificador": "Copiar identificador",
  "Identificador copiado!": "¡Identificador copiado!",
  "Excluir": "Eliminar",
  "Esse campo é padrão e não pode ser excluído.": "Este campo es estándar y no se puede eliminar.",
  "A exclusão desse campo remove em toda origem. Deseja continuar?": "Eliminar este campo lo quita de todos los orígenes. ¿Deseas continuar?",
  "Se este campo estiver configurado como obrigatório em alguma origem, a regra será removida.": "Si este campo está configurado como obligatorio en algún origen, se eliminará la regla.",
  "As alterações foram salvas com sucesso!": "¡Los cambios se guardaron correctamente!",
  "Ocorreu um erro ao salvar": "Ocurrió un error al guardar",
  "Renomear grupo": "Renombrar grupo",
  "Estou criando um campo para:": "Estoy creando un campo para:",
  "Nome do campo": "Nombre del campo",
  "Grupo": "Grupo",
  "Selecione um grupo": "Selecciona un grupo",
  "Adicionar um grupo": "Agregar un grupo",
  "Nome do Grupo": "Nombre del grupo",
  "Digite para criar um novo grupo": "Escribe para crear un nuevo grupo",
  "Criar grupo": "Crear grupo",
  "O nome do grupo é obrigatório!": "¡El nombre del grupo es obligatorio!",
  "Tipo do campo": "Tipo de campo",
  "O tipo não muda depois de criado.": "El tipo no cambia después de creado.",
  "Texto": "Texto",
  "Número": "Número",
  "Monetário": "Monetario",
  "Texto Rico": "Texto enriquecido",
  "Telefone": "Teléfono",
  "Seleção": "Selección",
  "Múltipla seleção": "Selección múltiple",
  "Data": "Fecha",
  "Data e Hora": "Fecha y hora",
  "Sim ou não": "Sí o no",
  "E-mail": "Correo",
  "Link": "Enlace",
  "Opções de seleção": "Opciones de selección",
  "Opção": "Opción",
  "Remover opção": "Quitar opción",
  "Nova opção": "Nueva opción",
  "Preencha nome, grupo e tipo.": "Completa nombre, grupo y tipo.",
  "Já existe um outro campo com o nome informado, o campo deve ser único.": "Ya existe otro campo con el nombre informado; el campo debe ser único.",
  "Este grupo foi removido. Atualize a página e tente novamente.": "Este grupo fue eliminado. Actualiza la página e inténtalo de nuevo.",
  "Cancelar": "Cancelar",
  "Salvar": "Guardar",
};
```

As tabelas dinâmicas `ROTULO_DO_OBJETO`, `ROTULO_DO_TIPO` e `ROTULO_DA_VISIBILIDADE` são `const` de nível de módulo em `regras.ts`: o teste da cobertura exige `es` para cada valor delas (já estão acima). Rode:

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Expected: PASS. Se faltar texto (as rotas usam `traduzir` em "Objeto inválido.", "Pedido inválido.", "Só administrador gerencia os campos.", "Não foi possível carregar os campos.", "Não foi possível criar o campo.", "Limite de campos ou grupos atingido.", "Campo não encontrado.", "Informe ao menos uma opção de seleção."), acrescente ao `ES`.

- [ ] **Step 2: Gates e o PR A**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/campos app/api/v1/campos-do-crm components/escale/campos hooks/escale/useCatalogoDeCampos.ts
corepack pnpm vitest run tests/unit/escale-campos-regras.test.ts tests/unit/escale-campos-rotas.test.ts tests/unit/escale-janela-de-gerenciar-campos.test.tsx tests/unit/escale-formulario-de-campo.test.tsx tests/unit/escale-campos-por-objeto-migration.test.ts tests/unit/navegacao-completude.test.ts tests/unit/escale-casca-v2-original-intacto.test.ts
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2c-catalogo-de-campos
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2c-catalogo-de-campos --title "Fase 2C (PR A): catálogo de campos por objeto e a janela Gerenciamento de campos" --body-file .superpowers/sdd/2c-a-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

O corpo do PR (`.superpowers/sdd/2c-a-pr.md`, fora do git) traz: a migration 9104 (tabelas, colunas novas, semente, cópia das chaves do contato, `datetime`, ações do lote), as rotas, a janela, as respostas Q1–Q3 do usuário, o que fica para o PR B, as diferenças conhecidas (sem print da janela; "Texto Rico" sem formatação; visibilidade por papel) e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto** (regra de 18/10). Nada de tag nem deploy.

- [ ] **Step 3: O PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, seção 8, linha `| 2C |`: `PR A (#…) mergeado (banco, catálogo e janela); PR B em andamento (ficha, colunas, filtros, lote, ocultos por origem)`. Na seção 9, acrescente: `| Personalizados do contato no filtro do quadro (D5) | O filtro do quadro roda no navegador sobre os negócios, sem os campos do contato; task curta depois da 2E (Q4 do plano da 2C) | 18/10 |`.

---

# PR B — Grupos na ficha, colunas, filtros, lote e campos ocultos por origem (D4, D5)

### Task 7: Branch do PR B, `ocultos.ts` e o `datetime` na ficha

**Files:**
- Create: `lib/escale/campos/ocultos.ts`, `tests/unit/escale-campos-ocultos.test.ts`
- Modify: `lib/escale/negocio/campos.ts` (`datetime` em `valorParaLeitura` e `valorParaGravar`), `components/escale/negocio/abas/EditorDeCampo.tsx` (`datetime` → `SeletorDeDataEHora`)

**Interfaces:**
- Produces:
  - `CHAVE_DOS_OCULTOS = "escale_campos_ocultos"`;
  - `CamposOcultos = { usar_do_grupo: boolean; contato: string[]; negocio: string[]; empresa: string[] }`, `OCULTOS_VAZIOS`, `camposOcultosSchema`;
  - `lerOcultos(settings: unknown): CamposOcultos`;
  - `ocultosEfetivos(daOrigem: CamposOcultos, doGrupo: CamposOcultos | null): CamposOcultos` (com `usar_do_grupo` e grupo presente, vale o do grupo);
  - `esconderOcultos<T extends { chave: string; valor: unknown }>(campos: T[], ocultas: string[]): T[]` (some só o oculto **vazio**, regra da Clint);
  - `CampoEditavel.grupo?: string` (chave do grupo) em `lib/escale/negocio/campos.ts`.

- [ ] **Step 1: Branch**

```bash
git fetch escale-crm
git switch -c feat/fase-2c-campos-na-casca escale-crm/main
git log --oneline -3 escale-crm/main
```

Expected: o merge do PR A está na `main`.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-campos-ocultos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { OCULTOS_VAZIOS, esconderOcultos, lerOcultos, ocultosEfetivos } from "@/lib/escale/campos/ocultos";

describe("campos ocultos por origem (HiddenFields da Clint)", () => {
  it("lê o settings com tolerância", () => {
    expect(lerOcultos(null)).toEqual(OCULTOS_VAZIOS);
    expect(lerOcultos({ escale_campos_ocultos: { contato: ["cargo"], negocio: 3 } })).toEqual({ ...OCULTOS_VAZIOS, contato: ["cargo"] });
  });

  it("com 'usar do grupo' e grupo presente, vale o do grupo", () => {
    const origem = { usar_do_grupo: true, contato: ["a"], negocio: [], empresa: [] };
    const grupo = { usar_do_grupo: false, contato: ["b"], negocio: ["c"], empresa: [] };
    expect(ocultosEfetivos(origem, grupo).contato).toEqual(["b"]);
    expect(ocultosEfetivos(origem, null).contato).toEqual(["a"]);
    expect(ocultosEfetivos({ ...origem, usar_do_grupo: false }, grupo).contato).toEqual(["a"]);
  });

  it("esconde só o oculto vazio: campo preenchido continua aparecendo", () => {
    const campos = [
      { chave: "cargo", valor: null },
      { chave: "renda", valor: "1.500,00" },
      { chave: "score", valor: null },
    ];
    expect(esconderOcultos(campos, ["cargo", "renda"]).map((c) => c.chave)).toEqual(["renda", "score"]);
  });
});
```

- [ ] **Step 3: `ocultos.ts`**

```ts
import { z } from "zod";

/** `settings.escale_campos_ocultos` da origem (e do grupo): os campos DESLIGADOS na Visualização de campos. */
export const CHAVE_DOS_OCULTOS = "escale_campos_ocultos";

const lista = z.array(z.string().regex(/^[a-z][a-z0-9_]{0,39}$/)).max(200).catch([]);
export const camposOcultosSchema = z.object({
  usar_do_grupo: z.boolean().catch(false),
  contato: lista,
  negocio: lista,
  empresa: lista,
});
export type CamposOcultos = z.infer<typeof camposOcultosSchema>;
export const OCULTOS_VAZIOS: CamposOcultos = { usar_do_grupo: false, contato: [], negocio: [], empresa: [] };

export function lerOcultos(settings: unknown): CamposOcultos {
  const bruto = settings && typeof settings === "object" ? (settings as Record<string, unknown>)[CHAVE_DOS_OCULTOS] : null;
  if (!bruto || typeof bruto !== "object") return OCULTOS_VAZIOS;
  const r = camposOcultosSchema.safeParse(bruto);
  return r.success ? r.data : OCULTOS_VAZIOS;
}

export function ocultosEfetivos(daOrigem: CamposOcultos, doGrupo: CamposOcultos | null): CamposOcultos {
  if (daOrigem.usar_do_grupo && doGrupo) return { ...doGrupo, usar_do_grupo: true };
  return daOrigem;
}

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);

/** "Campos preenchidos … não serão ocultos": só o oculto sem valor some. */
export function esconderOcultos<T extends { chave: string; valor: unknown }>(campos: T[], ocultas: readonly string[]): T[] {
  if (!ocultas.length) return campos;
  const set = new Set(ocultas);
  return campos.filter((c) => !(set.has(c.chave) && vazio(c.valor)));
}
```

- [ ] **Step 4: `datetime` na ficha**

Em `lib/escale/negocio/campos.ts`: acrescente `grupo?: string` à `CampoEditavel`; em `valorParaLeitura`, o ramo `datetime` formata `dd/mm/aaaa HH:mm` com `Intl.DateTimeFormat("pt-BR", { dateStyle: "short", timeStyle: "short" })` a partir de ISO; em `valorParaGravar`, `datetime` aceita ISO (do `SeletorDeDataEHora`) e devolve `{ ok: true, valor: iso }`, ou `{ ok: false, erro: "Data e hora inválidas." }`. Em `EditorDeCampo.tsx`, logo antes do ramo de `date`:

```tsx
  if (campo.tipo === "datetime") {
    return (
      <SeletorDeDataEHora
        valor={typeof campo.valor === "string" ? campo.valor : null}
        aoMudar={(iso) => void aoSalvar(iso)}
        aria-label={campo.rotulo}
      />
    );
  }
```

Confira antes de rodar: a API real do `SeletorDeDataEHora` (`components/escale/ui/SeletorDeDataEHora.tsx`, 1I): os nomes das props (`valor`/`aoMudar` ou outros) e se ele devolve ISO. Copie da `AbaAtividades` (1I) o uso dele.

- [ ] **Step 5: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-campos-ocultos.test.ts tests/unit/escale-ficha-campos.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/campos/ocultos.ts lib/escale/negocio/campos.ts components/escale/negocio/abas/EditorDeCampo.tsx tests/unit/escale-campos-ocultos.test.ts
git commit -m "feat(escale): campos ocultos por origem (regras) e datetime na ficha (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Se o teste das regras da ficha da 1H tiver outro nome, rode o que `grep -rlF "negocio/campos" tests/unit` listar.)

### Task 8: A ficha com grupos de verdade (Contato, Empresa e Negócio)

**Files:**
- Modify: `components/escale/negocio/abas/CamposDaFicha.tsx` (grupos, "Exibir grupos ocultos", a janela no "Gerenciar campos"), `components/escale/negocio/abas/AbasDeCampos.tsx` (`AbaContato` com o catálogo do contato; `AbaEmpresa` com o catálogo da empresa; `AbaNegocio` com os grupos do negócio; ocultos por origem), `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` (os `it` dos grupos e do "Gerenciar campos")
- Create: `lib/escale/campos/da-ficha.ts`, `hooks/escale/useOcultosDaOrigem.ts`, `tests/unit/escale-campos-da-ficha.test.ts`

**Interfaces:**
- Consumes: `useCatalogoDeCampos`, `camposPorGrupo`, `CAMPOS_FIXOS_DO_CONTATO`, `CAMPOS_FIXOS_DA_EMPRESA`, `esconderOcultos`, `lerOcultos`, `ocultosEfetivos`; `camposDoCrm(pipeline, valores)` (1H); `useContact`, `useGravarContato`, `patchDoContato` (1H).
- Produces:
  - `camposDoContatoComGrupos(contato: Contact, catalogo: Catalogo, t): CampoEditavel[]` em `lib/escale/campos/da-ficha.ts`: os fixos (`origem:"coluna"`: nome, telefone, email; `origem:"link"`: instagram; `documento` só leitura com `valor = contato.cpf_available ? "•••.•••.•••-••" : null`; `nascimento` `origem:"coluna"` tipo `date`) no grupo padrão, depois os do catálogo (`origem:"crm"`, `grupo` = chave do grupo), **sem** os `link_*` da 1H (os links continuam, no fim do grupo padrão, como hoje);
  - `camposDaEmpresaComGrupos(valores: Record<string, unknown> | null, catalogo: Catalogo): CampoEditavel[]` (fixos + catálogo; `travado: true` enquanto não há empresa: a 2D liga);
  - `gruposDaFicha(catalogo): Array<{ chave: string; nome: string }>`;
  - `useOcultosDaOrigem(pipeline: Pipeline): CamposOcultos` (lê `pipeline.settings` e, com `usar_do_grupo`, o grupo pela rota `GET /api/v1/pipelines/[id]/configuracoes`? Não: a página do negócio já tem o `grupo`; leia `settings` do grupo pelo `GET /api/v1/pipeline-groups/[id]` se existir (1A); se não existir, a Task confere e cai em `null`);
  - `CamposDaFicha` ganha as props `grupos?: Array<{chave; nome}>` e `aoGerenciar?: () => void` (abre a janela; substitui `gerenciarHref` quando presente).

- [ ] **Step 1: O teste puro (vai falhar)**

Create `tests/unit/escale-campos-da-ficha.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { camposDaEmpresaComGrupos, camposDoContatoComGrupos, gruposDaFicha } from "@/lib/escale/campos/da-ficha";

const t = (s: string) => s;
const CATALOGO = {
  grupos: [
    { id: "g1", chave: "informacoes_gerais", nome: "Informações Gerais", posicao: 0, padrao: true },
    { id: "g2", chave: "kaio_ia", nome: "Kaio IA", posicao: 1, padrao: false },
  ],
  campos: [
    { id: "c1", objeto: "contato" as const, chave: "cargo", definicao: { label: "Cargo", type: "text" as const }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: false },
    { id: "c2", objeto: "contato" as const, chave: "score", definicao: { label: "Score", type: "number" as const }, grupo_id: "g2", papel_minimo: null, posicao: 0, padrao: false },
  ],
};
const contato = {
  id: "x", name: "Ana", display_name: null, email: "ana@x.com", phone_number: "+5543998031566", birthdate: "1990-05-01",
  cpf_available: true, custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana", link_site: "https://ana.com" },
} as never;

describe("campos da ficha com grupos (1g-02, 1g-04)", () => {
  it("contato: fixos no grupo padrão, depois os do catálogo com o grupo de cada um; documento só leitura", () => {
    const campos = camposDoContatoComGrupos(contato, CATALOGO, t);
    expect(campos.map((c) => [c.chave, c.grupo])).toEqual([
      ["nome", "informacoes_gerais"], ["telefone", "informacoes_gerais"], ["email", "informacoes_gerais"],
      ["instagram", "informacoes_gerais"], ["documento", "informacoes_gerais"], ["nascimento", "informacoes_gerais"],
      ["cargo", "informacoes_gerais"], ["score", "kaio_ia"],
      ["link_site", "informacoes_gerais"],
    ]);
    const doc = campos.find((c) => c.chave === "documento")!;
    expect(doc.travado).toBe(true);
    expect(doc.valor).toBe("•••.•••.•••-••");
    expect(campos.find((c) => c.chave === "cargo")!.valor).toBe("CEO");
    expect(campos.find((c) => c.chave === "instagram")!.valor).toBe("https://instagram.com/ana");
  });

  it("empresa sem vínculo: os oito campos, travados e vazios", () => {
    const campos = camposDaEmpresaComGrupos(null, {
      grupos: CATALOGO.grupos.slice(0, 1),
      campos: [
        { id: "e1", objeto: "empresa", chave: "site", definicao: { label: "Site", type: "url" }, grupo_id: "g1", papel_minimo: null, posicao: 0, padrao: true },
        { id: "e2", objeto: "empresa", chave: "categoria", definicao: { label: "Categoria", type: "text" }, grupo_id: "g1", papel_minimo: null, posicao: 1, padrao: true },
        { id: "e3", objeto: "empresa", chave: "segmento", definicao: { label: "Segmento", type: "text" }, grupo_id: "g1", papel_minimo: null, posicao: 2, padrao: true },
        { id: "e4", objeto: "empresa", chave: "numero_de_funcionarios", definicao: { label: "Número de funcionários", type: "number" }, grupo_id: "g1", papel_minimo: null, posicao: 3, padrao: true },
      ],
    });
    expect(campos.map((c) => c.rotulo)).toEqual(["Nome da empresa", "Site", "Cidade", "Estado", "Categoria", "Segmento", "Número de funcionários", "CNPJ"]);
    expect(campos.every((c) => c.travado && c.valor === null)).toBe(true);
  });

  it("gruposDaFicha devolve chave e nome na ordem", () => {
    expect(gruposDaFicha(CATALOGO)).toEqual([{ chave: "informacoes_gerais", nome: "Informações Gerais" }, { chave: "kaio_ia", nome: "Kaio IA" }]);
  });
});
```

A ordem da empresa (1g-03): Nome da empresa, Site, Cidade, Estado, Categoria, Segmento, Número de funcionários, CNPJ. `camposDaEmpresaComGrupos` intercala os fixos nessa ordem fixa quando o catálogo tem só os padrões; campos criados pelo usuário entram depois do CNPJ, na ordem do grupo.

- [ ] **Step 2: `da-ficha.ts`**

```ts
import type { Contact } from "@/lib/types/contacts";
import { TIPOS_DE_LINK, chaveDoLink, lerLinks } from "@/lib/leads/links-de-contato";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";

import { CAMPOS_FIXOS_DA_EMPRESA, CAMPOS_FIXOS_DO_CONTATO, type Catalogo, GRUPO_PADRAO, camposPorGrupo } from "./regras";

const CPF_MASCARADO = "•••.•••.•••-••";

export function gruposDaFicha(catalogo: Catalogo): Array<{ chave: string; nome: string }> {
  return camposPorGrupo(catalogo).map(({ grupo }) => ({ chave: grupo.chave, nome: grupo.nome }));
}

function doCatalogo(catalogo: Catalogo, valores: Record<string, unknown>): CampoEditavel[] {
  return camposPorGrupo(catalogo).flatMap(({ grupo, campos }) =>
    campos.map((c) => ({
      chave: c.chave,
      rotulo: String(c.definicao.label),
      tipo: c.definicao.type,
      valor: valores[c.chave] ?? null,
      origem: "crm" as const,
      opcoes: c.definicao.options,
      grupo: grupo.chave,
    })),
  );
}

/** Aba Contato (1g-02): fixos, catálogo com grupos e os links da 1H (menos o Instagram, que virou fixo). */
export function camposDoContatoComGrupos(contato: Contact, catalogo: Catalogo, t: (s: string) => string): CampoEditavel[] {
  const valores = (contato.custom_fields ?? {}) as Record<string, unknown>;
  const links = lerLinks(valores);
  const fixos: CampoEditavel[] = CAMPOS_FIXOS_DO_CONTATO.map((f) => {
    const base = { chave: f.chave, rotulo: t(f.rotulo), tipo: f.tipo, grupo: GRUPO_PADRAO };
    switch (f.chave) {
      case "nome": return { ...base, origem: "coluna", valor: contato.name ?? contato.display_name ?? null };
      case "telefone": return { ...base, origem: "coluna", valor: contato.phone_number ?? null };
      case "email": return { ...base, origem: "coluna", valor: contato.email ?? null };
      case "instagram": return { ...base, chave: chaveDoLink("instagram"), origem: "link", valor: links.instagram ?? null };
      case "documento": return { ...base, origem: "coluna", valor: contato.cpf_available ? CPF_MASCARADO : null, travado: true };
      default: return { ...base, chave: "nascimento", origem: "coluna", valor: contato.birthdate ?? null };
    }
  });
  const outrosLinks: CampoEditavel[] = TIPOS_DE_LINK.filter((tipo) => tipo !== "instagram").map((tipo) => ({
    chave: chaveDoLink(tipo),
    rotulo: t(ROTULO_DO_LINK[tipo]),
    tipo: "url",
    valor: links[tipo] ?? null,
    origem: "link",
    grupo: GRUPO_PADRAO,
  }));
  return [...fixos, ...doCatalogo(catalogo, valores), ...outrosLinks];
}

/** Aba Empresa (1g-03): os oito da Clint na ordem dela; sem vínculo, tudo travado e vazio (a 2D liga). */
export function camposDaEmpresaComGrupos(valores: Record<string, unknown> | null, catalogo: Catalogo): CampoEditavel[] {
  const travado = valores === null;
  const v = valores ?? {};
  const fixo = (chave: string): CampoEditavel => {
    const f = CAMPOS_FIXOS_DA_EMPRESA.find((x) => x.chave === chave)!;
    return { chave: f.chave, rotulo: f.rotulo, tipo: f.tipo, valor: v[f.chave] ?? null, origem: "coluna", grupo: GRUPO_PADRAO, travado };
  };
  const catalogoDaEmpresa = doCatalogo(catalogo, v).map((c) => ({ ...c, travado }));
  const pegar = (chave: string) => catalogoDaEmpresa.find((c) => c.chave === chave);
  const ordenados = [fixo("nome"), pegar("site"), fixo("cidade"), fixo("estado"), pegar("categoria"), pegar("segmento"), pegar("numero_de_funcionarios"), fixo("cnpj")].filter(Boolean) as CampoEditavel[];
  const resto = catalogoDaEmpresa.filter((c) => !["site", "categoria", "segmento", "numero_de_funcionarios"].includes(c.chave));
  return [...ordenados, ...resto];
}

const ROTULO_DO_LINK: Record<string, string> = {
  site: "Site",
  google_meu_negocio: "Google Meu Negócio",
  facebook: "Facebook",
  linkedin: "LinkedIn",
  tiktok: "TikTok",
  youtube: "YouTube",
  outro: "Outro link",
};
```

Confira antes de rodar: os rótulos reais dos links na `AbaContato` da 1H (`AbasDeCampos.tsx` L51–138) e a `ROTULO_DO_LINK` que ela usa (importe de lá em vez de duplicar, se for exportada); os tipos de `lerLinks`/`TIPOS_DE_LINK` em `lib/leads/links-de-contato.ts`.

- [ ] **Step 3: `CamposDaFicha` com grupos**

Em `components/escale/negocio/abas/CamposDaFicha.tsx`:
- props novas: `grupos?: Array<{ chave: string; nome: string }>` e `aoGerenciar?: () => void`;
- estado `grupoAtivo` (chave; inicial = o primeiro); a lista mostrada = `filtrarCampos(campos.filter((c) => busca ? true : (c.grupo ?? GRUPO_PADRAO) === grupoAtivo), busca, ocultarVazios)`;
- um grupo cuja lista (com "Ocultar vazios") fica vazia é "oculto": some da `nav` e aparece, no fim da coluna, o botão "Exibir grupos ocultos" / "Esconder grupos ocultos" com o selo "Ocultos · N" (textos da Clint);
- a `nav` troca o `<span>` fixo por um botão por grupo com `aria-current={ativo}` e as classes da medida (38px, barra `casca-marca`, fundo `casca-marca-suave` no ativo);
- "Gerenciar campos": se `aoGerenciar` veio, é um `BotaoDaCasca variante="novo"` que o chama (admin); senão, o comportamento da 1H (`gerenciarHref`).

- [ ] **Step 4: As abas**

Em `AbasDeCampos.tsx`:
- `ContatoEditavel`: `const { catalogo } = useCatalogoDeCampos("contato"); const ocultos = useOcultosDaOrigem(pipeline);` e `campos = esconderOcultos(camposDoContatoComGrupos(contato, catalogo, t), ocultos.contato)`; `grupos = gruposDaFicha(catalogo)`; `aoGerenciar = podeAdministrar ? () => setJanela("contato") : undefined`; a `JanelaDeGerenciarCampos` montada uma vez no `AbasDeCampos` (estado `janela: ObjetoDeCampo | null`). O `aoSalvar` continua o `patchDoContato` (os campos `origem:"crm"` do contato gravam em `custom_fields`, como hoje; `documento` é travado e não chega lá; `nascimento` `origem:"coluna"` → `birthdate`: acrescente esse caso em `patchDoContato`).
- `AbaEmpresa()`: `useCatalogoDeCampos("empresa")`, `camposDaEmpresaComGrupos(null, catalogo)`, `grupos`, `aoGerenciar` (admin), sem `aoSalvar` (só leitura até a 2D), `dicaDoVazio = t("A empresa do contato chega na Fase 2D.")`.
- `AbaNegocio`: `useCatalogoDeCampos("negocio")` só para os grupos: cada campo de `camposDoCrm(pipeline, lead.custom_fields)` recebe `grupo` pela chave (mapa `chave → grupo.chave` do catálogo; sem mapa, `GRUPO_PADRAO`); "Valor" fica no grupo padrão; `esconderOcultos(..., ocultos.negocio)`; `aoGerenciar` (admin).
- `podeAdministrar = usePermission("settings.write")` (admin, como a 1H).

Create `hooks/escale/useOcultosDaOrigem.ts`:

```ts
"use client";

import { useQuery } from "@tanstack/react-query";

import { type CamposOcultos, OCULTOS_VAZIOS, lerOcultos, ocultosEfetivos } from "@/lib/escale/campos/ocultos";
import type { Pipeline } from "@/lib/types/pipelines";

/** Os campos ocultos da origem (e do grupo, se ela segue o grupo). */
export function useOcultosDaOrigem(pipeline: Pick<Pipeline, "id" | "settings" | "group_id">): CamposOcultos {
  const daOrigem = lerOcultos(pipeline.settings);
  const q = useQuery({
    queryKey: ["ocultos-do-grupo", pipeline.group_id],
    queryFn: async () => {
      const r = await fetch(`/api/v1/pipeline-groups/${pipeline.group_id}`);
      if (!r.ok) return null;
      const corpo = await r.json().catch(() => null);
      return corpo?.data?.settings ? lerOcultos(corpo.data.settings) : null;
    },
    enabled: daOrigem.usar_do_grupo && Boolean(pipeline.group_id),
    staleTime: 60_000,
  });
  return ocultosEfetivos(daOrigem, q.data ?? null) ?? OCULTOS_VAZIOS;
}
```

Confira antes de rodar: a rota de leitura de um grupo da 1A (`app/api/v1/pipeline-groups/[id]/route.ts`, GET) e se ela devolve `settings`. Se não devolver, acrescente `settings` ao `select` dela (encaixe do fork, já é arquivo do fork) e, se a rota não existir, leia o grupo pelo `GET /api/v1/pipelines/[id]/configuracoes` (`respostas.ts` já lê o `settings` do grupo) e exponha `ocultosDoGrupo` na resposta.

- [ ] **Step 5: Os testes da tela**

Em `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, reescreva os `it` que pinavam um grupo só e o link do "Gerenciar campos": com o `fetch` mockado devolvendo o catálogo (dois grupos), a `nav` "Grupos de campos" lista os dois; clicar em "Kaio IA" mostra só "Score"; "Gerenciar campos" para admin abre a janela (`screen.findByText("Gerenciamento de campos")`); para gerente, botão desligado com a dica da 1H; a aba Empresa lista os oito rótulos na ordem do 1g-03 e todos travados; um campo oculto por origem e vazio não aparece, o oculto preenchido aparece.

```bash
corepack pnpm vitest run tests/unit/escale-campos-da-ficha.test.ts tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/campos components/escale/negocio/abas hooks/escale/useOcultosDaOrigem.ts
```

Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/campos/da-ficha.ts hooks/escale/useOcultosDaOrigem.ts components/escale/negocio/abas tests/unit/escale-campos-da-ficha.test.ts tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx
git commit -m "feat(escale): abas Contato, Empresa e Negócio com grupos de campos, catálogos próprios e ocultos por origem (Fase 2C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Os personalizados nas colunas da lista de contatos

**Files:**
- Modify: `lib/escale/contatos/regras.ts` (`rotulosDasColunas(catalogo)`, `camposDeColuna(catalogo)`), `lib/escale/contatos/lista.ts` (`LinhaDeContato.campos`), `components/escale/contatos/PainelDeColunas.tsx` (grupo "Campos do contato" com o catálogo), `components/escale/contatos/CelulasDoContato.tsx` (`CelulaExtra` por tipo; `rotuloDoItem` com o catálogo), `components/escale/contatos/TabelaDeContatos.tsx` e `ListaDeContatos.tsx` (passam o catálogo), `tests/unit/escale-painel-de-colunas.test.tsx`, `tests/unit/escale-tabela-de-contatos.test.tsx`

**Interfaces:**
- Consumes: `useCatalogoDeCampos("contato")` (já filtrado pelo papel), `valorParaLeitura` (1H), `CAMPOS_FIXOS_DO_CONTATO`.
- Produces:
  - `LinhaDeContato.campos: Record<string, unknown>` (o `custom_fields` sem `link_*`);
  - `camposDeColuna(catalogo: Catalogo): Array<{ chave: string; rotulo: string; tipo: TipoDoMotor; opcoes? }>` = `CAMPOS_DO_CONTATO_2A` (nascimento e links) + os do catálogo, **em ordem alfabética pelo rótulo** (Clint 2b-22);
  - `rotuloDoItem(item, t, rotulos)` passa a receber o mapa `chave → rotulo` montado de `camposDeColuna`;
  - `PainelDeColunas({ itens, aoMudar, camposDoContato })`, `TabelaDeContatos` ganha `camposDoContato` e repassa à `CelulaExtra({ item, linha, campo? })`.

- [ ] **Step 1: Testes (vão falhar)**

Em `tests/unit/escale-painel-de-colunas.test.tsx`, acrescente:

```tsx
  it("o grupo Campos do contato lista o catálogo em ordem alfabética, junto com nascimento e links", () => {
    const camposDoContato = camposDeColuna({
      grupos: [],
      campos: [
        { id: "c1", objeto: "contato", chave: "cargo", definicao: { label: "Cargo", type: "text" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "score", definicao: { label: "Score", type: "number" }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} camposDoContato={camposDoContato} />);
    const grupo = screen.getByText("Campos do contato").closest("section")!;
    const rotulos = within(grupo).getAllByRole("switch").map((s) => s.getAttribute("aria-label"));
    expect(rotulos.slice(0, 3)).toEqual(["Cargo", "Data de nascimento", "Facebook"]);
    expect(rotulos).toContain("Score");
  });
```

Em `tests/unit/escale-tabela-de-contatos.test.tsx`, acrescente:

```tsx
  it("uma coluna de campo personalizado mostra o valor pelo tipo (moeda em R$, seleção pelo rótulo, data em dd/mm/aaaa)", () => {
    const camposDoContato = [
      { chave: "renda", rotulo: "Renda", tipo: "currency" as const },
      { chave: "origem", rotulo: "Origem", tipo: "select" as const, opcoes: [{ value: "org", label: "Orgânico" }] },
      { chave: "desde", rotulo: "Cliente desde", tipo: "date" as const },
    ];
    const colunas = [{ tipo: "campo" as const, chave: "renda" }, { tipo: "campo" as const, chave: "origem" }, { tipo: "campo" as const, chave: "desde" }];
    envolver(
      <TabelaDeContatos {...props} colunas={colunas} camposDoContato={camposDoContato} linhas={[linha({ campos: { renda: "1500.5", origem: "org", desde: "2026-10-01" } })]} />,
    );
    expect(screen.getByRole("columnheader", { name: "Renda" })).toBeInTheDocument();
    expect(screen.getByText("R$ 1.500,50")).toBeInTheDocument();
    expect(screen.getByText("Orgânico")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026")).toBeInTheDocument();
  });
```

(Acrescente `campos: {}` ao `linha()` do teste.)

- [ ] **Step 2: Implementar**

`lib/escale/contatos/regras.ts`:

```ts
import type { Catalogo, TipoDoMotor } from "@/lib/escale/campos/regras";

export interface CampoDeColuna {
  chave: string;
  rotulo: string;
  tipo: TipoDoMotor;
  opcoes?: Array<{ value: string; label: string }>;
}

/** Os campos que podem virar coluna: nascimento, links (2A) e o catálogo do contato, em ordem alfabética (Clint). */
export function camposDeColuna(catalogo: Catalogo): CampoDeColuna[] {
  const da2a: CampoDeColuna[] = CAMPOS_DO_CONTATO_2A.map((c) => ({
    chave: c.chave,
    rotulo: c.rotulo,
    tipo: c.chave === "nascimento" ? "date" : "url",
  }));
  const doCatalogo: CampoDeColuna[] = catalogo.campos.map((c) => ({
    chave: c.chave,
    rotulo: String(c.definicao.label),
    tipo: c.definicao.type,
    opcoes: c.definicao.options,
  }));
  return [...da2a, ...doCatalogo].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
```

`lib/escale/contatos/lista.ts`: `LinhaDeContato` ganha `campos: Record<string, unknown>`; em `listarContatos`, depois de ler `custom_fields`, `campos = Object.fromEntries(Object.entries(custom_fields ?? {}).filter(([k]) => !k.startsWith("link_")))`.

`PainelDeColunas.tsx`: prop `camposDoContato: CampoDeColuna[]`; `camposFora` passa a vir dela (L55–60); o rótulo de cada item sai de `camposDoContato`.

`CelulasDoContato.tsx`: `CelulaExtra({ item, linha, campo })`: se `item.chave === "nascimento"` ou `link_*`, como hoje; senão `valorParaLeitura(campo?.tipo ?? "text", campo?.opcoes, linha.campos[item.chave], t)` (a função da 1H já formata moeda, data, seleção e sim/não). `rotuloDoItem(item, t, rotulos)` recebe `rotulos = Object.fromEntries(camposDoContato.map((c) => [c.chave, c.rotulo]))`.

`TabelaDeContatos.tsx` e `ListaDeContatos.tsx`: `const { catalogo } = useCatalogoDeCampos("contato"); const camposDoContato = useMemo(() => camposDeColuna(catalogo), [catalogo]);` passado ao painel e à tabela. A `COLUNAS_PADRAO` não muda.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-colunas.test.tsx tests/unit/escale-tabela-de-contatos.test.tsx tests/unit/escale-lista-de-contatos-rotas.test.ts tests/unit/escale-lista-de-contatos-pagina.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/contatos components/escale/contatos tests/unit/escale-painel-de-colunas.test.tsx tests/unit/escale-tabela-de-contatos.test.tsx
git commit -m "feat(escale): campos personalizados do contato nas colunas da lista (Fase 2C, D5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: Os personalizados no painel de Filtros

**Files:**
- Modify: `lib/escale/contatos/filtros.ts` (`camposDoContatoDoFiltro(catalogo)`), `lib/escale/contatos/opcoes-do-filtro.ts` (`OpcoesDoFiltro.camposDoContato`), `lib/escale/contatos/origens-da-pagina.ts` (lê o catálogo do contato com a sessão e já filtrado pelo papel), `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx` (o grupo Contato com fixos + catálogo em ordem alfabética), `tests/unit/escale-filtros-de-contatos.test.ts`, `tests/unit/escale-painel-de-filtros.test.tsx`

**Interfaces:**
- Consumes: `TipoDeCampo` do filtro (`texto | opcao | opcoes | booleano | numero | data`), `CampoDoFiltro`, `CAMPOS_DO_CONTATO_DO_FILTRO`; `lerCatalogo` + `catalogoVisivel` (servidor).
- Produces:
  - `tipoDoFiltro(tipo: TipoDoMotor): TipoDeCampo` (text/textarea/email/phone/url → `texto`; number/currency → `numero`; select → `opcao`; multiselect → `opcoes`; boolean → `booleano`; date/datetime → `data`);
  - `camposDoContatoDoFiltro(catalogo): CampoDoFiltro[]` = `CAMPOS_DO_CONTATO_DO_FILTRO` + catálogo (`alvo: "contato"`), ordenado pelo rótulo;
  - `OpcoesDoFiltro.camposDoContato: CampoDoFiltro[]` (vem do servidor); `SecaoCamposDoFiltro({ filtros, aoMudar, camposDoNegocio, camposDoContato })`.

- [ ] **Step 1: Testes (vão falhar)**

Em `tests/unit/escale-filtros-de-contatos.test.ts`:

```ts
describe("camposDoContatoDoFiltro (2C)", () => {
  it("junta os fixos com o catálogo, em ordem alfabética, com o tipo do filtro", () => {
    const campos = camposDoContatoDoFiltro({
      grupos: [],
      campos: [
        { id: "c1", objeto: "contato", chave: "renda", definicao: { label: "Renda", type: "currency" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: false },
        { id: "c2", objeto: "contato", chave: "origem", definicao: { label: "Canal", type: "select", options: [{ value: "a", label: "A" }] }, grupo_id: null, papel_minimo: null, posicao: 1, padrao: false },
      ],
    });
    expect(campos.map((c) => c.rotulo).slice(0, 3)).toEqual(["Canal", "Data de nascimento", "Email"]);
    expect(campos.find((c) => c.chave === "renda")).toMatchObject({ alvo: "contato", tipo: "numero" });
    expect(campos.find((c) => c.chave === "origem")).toMatchObject({ tipo: "opcao", opcoes: [{ value: "a", label: "A" }] });
  });
});
```

Em `tests/unit/escale-painel-de-filtros.test.tsx`: o grupo "Contato" do seletor de campo lista "Renda" quando `opcoesDoFiltro.camposDoContato` o traz, e escolher "Renda" oferece os operadores de número ("Igual", "Maior que", "Menor que", "Vazio", "Preenchido").

- [ ] **Step 2: Implementar**

`lib/escale/contatos/filtros.ts`:

```ts
import type { Catalogo, TipoDoMotor } from "@/lib/escale/campos/regras";

export function tipoDoFiltro(tipo: TipoDoMotor): TipoDeCampo {
  switch (tipo) {
    case "number":
    case "currency":
      return "numero";
    case "select":
      return "opcao";
    case "multiselect":
      return "opcoes";
    case "boolean":
      return "booleano";
    case "date":
    case "datetime":
      return "data";
    default:
      return "texto";
  }
}

/** Os campos do contato no seletor do filtro: fixos (2A/2B) + catálogo (2C), em ordem alfabética (2b-22). */
export function camposDoContatoDoFiltro(catalogo: Catalogo): CampoDoFiltro[] {
  const doCatalogo: CampoDoFiltro[] = catalogo.campos.map((c) => ({
    alvo: "contato",
    chave: c.chave,
    rotulo: String(c.definicao.label),
    tipo: tipoDoFiltro(c.definicao.type),
    opcoes: c.definicao.options,
  }));
  return [...CAMPOS_DO_CONTATO_DO_FILTRO, ...doCatalogo].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
```

`opcoes-do-filtro.ts`: `camposDoContato: CampoDoFiltro[]` em `OpcoesDoFiltro` e `OPCOES_VAZIAS`. `origens-da-pagina.ts`: `const catalogo = catalogoVisivel(await lerCatalogo(supabase, orgId, "contato"), papel)` e `opcoesDoFiltro.camposDoContato = camposDoContatoDoFiltro(catalogo)` (a `semearSeVazio` roda antes, com o admin client, como no `GET`). `SecaoCamposDoFiltro.tsx`: `todos = [...camposDoContato, ...camposDoNegocio]` e o grupo Contato do `SeletorDeCampo` lê `camposDoContato` (o "Empresa" continua "Em breve" até a 2D). `PainelDeFiltros` repassa `opcoesDoFiltro.camposDoContato`.

O servidor não muda: `fn_escale_contato_passa` já cai em `custom_fields -> chave` (9102 L180). A `condicaoSchema.chave` (`/^[A-Za-z][A-Za-z0-9_]{0,39}$/`) já aceita as chaves do catálogo.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-de-contatos.test.ts tests/unit/escale-painel-de-filtros.test.tsx tests/unit/escale-lista-de-contatos-pagina.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/contatos components/escale/contatos/filtros tests/unit
git commit -m "feat(escale): campos personalizados do contato no painel de Filtros (Fase 2C, D5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: A subaba "Visualização de campos" da origem (D4)

**Files:**
- Create: `components/escale/configuracoes/SecaoCamposVisiveis.tsx`, `tests/unit/escale-secao-campos-visiveis.test.tsx`
- Modify: `lib/escale/configuracoes/gravar.ts` (seção `campos_visiveis`, admin), `lib/escale/configuracoes/tipos.ts` (`ConfiguracoesDoFork.camposOcultos`), `lib/escale/configuracoes/montar.ts` (`ocultosDoGrupo`), `lib/escale/configuracoes/rascunho.ts` (`rascunho.camposOcultos`), `components/escale/configuracoes/JanelaDaOrigem.tsx` (a subaba deixa de ser "Em breve"), `app/api/v1/pipelines/[id]/configuracoes/route.ts` (audita a seção), `tests/unit/escale-configuracoes-gravar.test.ts`

**Interfaces:**
- Consumes: `CHAVE_DOS_OCULTOS`, `camposOcultosSchema`, `lerOcultos` (Task 7); `useCatalogoDeCampos` para os três objetos; `InterruptorDaCasca`, `CaixaDaCasca`, `AjudaDaCasca`, `AbasDaCasca`, `CabecaDaSecao`, `PropsDaSecao`.
- Produces:
  - `patchDasConfiguracoesSchema.campos_visiveis = camposOcultosSchema` (seção nova; entra em `SECOES_DO_ADMINISTRADOR`);
  - `aplicarConfiguracoes` grava `settings.escale_campos_ocultos` (apaga a chave quando tudo vazio e `usar_do_grupo` falso);
  - `ConfiguracoesDaOrigem.ocultosDoGrupo: CamposOcultos | null` (de `settings` do grupo que `lerOrigemDaConfiguracao` já lê);
  - `SecaoCamposVisiveis(props: PropsDaSecao)`: cabeçalho ("Configure aqui a sua visualização de campos."), a caixinha "Utilizar a mesma configuração do grupo" com a ajuda da Clint, as abas Contato / Negócio / Empresa (ordem da Clint) e, por grupo do catálogo, uma linha por campo com `InterruptorDaCasca` (ligado = visível); com "usar do grupo", os interruptores ficam desligados e mostram a configuração do grupo; o aviso "Campos preenchidos não serão ocultos." no rodapé da lista.

- [ ] **Step 1: Teste da gravação (vai falhar)**

Em `tests/unit/escale-configuracoes-gravar.test.ts`:

```ts
  it("campos_visiveis grava escale_campos_ocultos e apaga a chave quando tudo é vazio", () => {
    const v1 = aplicarConfiguracoes({}, { campos_visiveis: { usar_do_grupo: false, contato: ["cargo"], negocio: [], empresa: [] } }, CONTEXTO);
    expect(v1.ok && v1.settings.escale_campos_ocultos).toEqual({ usar_do_grupo: false, contato: ["cargo"], negocio: [], empresa: [] });
    const v2 = aplicarConfiguracoes(v1.ok ? v1.settings : {}, { campos_visiveis: { usar_do_grupo: false, contato: [], negocio: [], empresa: [] } }, CONTEXTO);
    expect(v2.ok && "escale_campos_ocultos" in v2.settings).toBe(false);
  });
  it("campos_visiveis é seção de administrador", () => {
    expect(SECOES_DO_ADMINISTRADOR).toContain("campos_visiveis");
  });
```

(Use o `CONTEXTO` e a forma de `aplicarConfiguracoes` que o teste já tem; o veredito pode se chamar `VereditoDaGravacao` com `settings` dentro: confira.)

- [ ] **Step 2: A gravação**

`gravar.ts`: `campos_visiveis: camposOcultosSchema.optional()` no `patchDasConfiguracoesSchema`; `SecaoDasConfiguracoes` ganha `"campos_visiveis"`; `SECOES_DO_ADMINISTRADOR = ["motivos", "campos", "campos_visiveis"]`; em `aplicarConfiguracoes`, `if (patch.campos_visiveis) { const o = patch.campos_visiveis; const vazio = !o.usar_do_grupo && !o.contato.length && !o.negocio.length && !o.empresa.length; settings = comChave(settings, CHAVE_DOS_OCULTOS, vazio ? null : o); }`. `tipos.ts`: `camposOcultos: CamposOcultos` em `ConfiguracoesDoFork`, lido por `lerOcultos(settings)`. `montar.ts`: `ocultosDoGrupo = grupoSettings ? lerOcultos(grupoSettings) : null`. `rascunho.ts`: `camposOcultos` no rascunho, no `algoMudou` e no `pedidoDoSalvar` (`patch.campos_visiveis = rascunho.camposOcultos` quando mudou). A rota: nada além de aceitar a seção (o `secoesDoPatch` já lista as chaves do patch; a trava de admin lê `SECOES_DO_ADMINISTRADOR`).

- [ ] **Step 3: A subaba**

Create `components/escale/configuracoes/SecaoCamposVisiveis.tsx`:

```tsx
"use client";

import { useState } from "react";

import { AbasDaCasca } from "@/components/escale/ui/AbasDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { type ObjetoDeCampo, camposPorGrupo } from "@/lib/escale/campos/regras";
import { EyeOff } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

/** Ordem das abas na Clint (HiddenFields `Zg`): Contato, Negócio, Empresa. */
const OBJETOS: ObjetoDeCampo[] = ["contato", "negocio", "empresa"];
const ROTULO: Record<ObjetoDeCampo, string> = { contato: "Contato", negocio: "Negócio", empresa: "Empresa" };

/** Subaba "Visualização de campos" (HiddenFields da Clint): um interruptor por campo; desligado = oculto na origem. */
export function SecaoCamposVisiveis({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const [objeto, setObjeto] = useState<ObjetoDeCampo>("contato");
  const { catalogo, carregando, erro } = useCatalogoDeCampos(objeto);
  const ocultos = rascunho.camposOcultos;
  const segueOGrupo = ocultos.usar_do_grupo;
  const doGrupo = config.ocultosDoGrupo;
  const listaAtiva = segueOGrupo && doGrupo ? doGrupo[objeto] : ocultos[objeto];
  const temGrupo = Boolean(config.pipeline.group_id);

  const alternar = (chave: string, visivel: boolean) => {
    const atual = new Set(ocultos[objeto]);
    if (visivel) atual.delete(chave);
    else atual.add(chave);
    mudar({ camposOcultos: { ...ocultos, [objeto]: [...atual] } });
  };

  return (
    <div className="flex flex-col gap-5">
      <CabecaDaSecao icone={<EyeOff size={16} />} titulo={t("Visualização de campos")} descricao={t("Configure aqui a sua visualização de campos.")} />
      <div className="flex items-center gap-2">
        <CaixaDaCasca
          marcada={segueOGrupo}
          desabilitada={!temGrupo || !doGrupo}
          aoMudar={(v) => mudar({ camposOcultos: { ...ocultos, usar_do_grupo: v } })}
          rotulo={t("Utilizar a mesma configuração do grupo")}
        />
        <AjudaDaCasca texto={t("Se marcada essa opção, a configuração no grupo desta origem será priorizada")} />
      </div>
      <AbasDaCasca abas={OBJETOS.map((o) => ({ valor: o, rotulo: t(ROTULO[o]) }))} valor={objeto} aoMudar={setObjeto} aria-label={t("Objeto")} />
      <p className="text-[12px] text-casca-suave">{t("Os campos desativados ficarão ocultos na origem.")}</p>
      {carregando && <p className="text-[13px] text-casca-suave">{t("Carregando…")}</p>}
      {erro && <p className="text-[13px] text-casca-suave">{t("Ocorreu um erro ao carregar os dados")}</p>}
      {!carregando && !erro && (
        <div className="flex flex-col gap-4">
          {camposPorGrupo(catalogo).map(({ grupo, campos }) => (
            <section key={grupo.id} aria-label={grupo.nome}>
              <p className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{grupo.nome}</p>
              <ul className="flex flex-col">
                {campos.map((c) => (
                  <li key={c.id} className="flex h-10 items-center justify-between border-b border-casca-borda">
                    <span className="text-[13px] text-casca-texto">{String(c.definicao.label)}</span>
                    <InterruptorDaCasca
                      ligado={!listaAtiva.includes(c.chave)}
                      desabilitado={segueOGrupo}
                      aoMudar={(v) => alternar(c.chave, v)}
                      aria-label={String(c.definicao.label)}
                    />
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
      <p className="text-[12px] text-casca-suave">{t("Campos preenchidos não serão ocultos.")}</p>
    </div>
  );
}
```

Confira antes de rodar: a API do `InterruptorDaCasca` (`ligado`/`aoMudar`/`desabilitado` ou outros nomes: copie da `SecaoGerais`); as props da `CabecaDaSecao` (1F); se a janela do **grupo** (1J, "lista de pessoas do grupo") existe como janela com seções (`grep -rl "pessoasDoGrupo\|JanelaDoGrupo" components/escale`): se existir, monte a mesma `SecaoCamposVisiveis` nela com `config.ocultosDoGrupo = null` e gravação em `crm_pipeline_groups.settings` pela rota do grupo; se não existir, a caixinha fica desligada com `title={t("Em breve")}` quando `!doGrupo` (Q5).

Em `JanelaDaOrigem.tsx`: a subaba `campos_visiveis` sai da lista `emBreve` e renderiza `<SecaoCamposVisiveis {...props} />` (só aparece para quem `config.podeAdministrar`, como "Campos obrigatórios"). Em `tests/unit/escale-secao-campos-visiveis.test.tsx`: com `fetch` mockado devolvendo um catálogo, a aba Contato lista os campos com interruptores ligados; desligar "Cargo" chama `mudar` com `contato: ["cargo"]`; marcar "Utilizar a mesma configuração do grupo" desliga os interruptores e mostra a lista do grupo.

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-configuracoes-gravar.test.ts tests/unit/escale-secao-campos-visiveis.test.tsx tests/unit/escale-janela-da-origem.test.tsx tests/unit/escale-configuracoes-rota.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/configuracoes components/escale/configuracoes app/api/v1/pipelines tests/unit
git commit -m "feat(escale): subaba Visualização de campos — campos ocultos por origem e pelo grupo (Fase 2C, D4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Os nomes dos testes da 1F podem diferir: rode o que `grep -rlF "configuracoes/gravar\|JanelaDaOrigem" tests/unit` listar.)

### Task 12: O "Campos" da barra de lote, espanhol e o PR B

**Files:**
- Create: `components/escale/contatos/massa/PainelDeCampos.tsx`
- Modify: `lib/escale/massa/tipos.ts` (`alterar_campo` e `limpar_campo` no `pedidoDeAcaoSchema`), `lib/escale/massa/executar.ts` (os dois casos em `emLotes`), `components/escale/contatos/massa/BarraDeLote.tsx` (liga "Campos"), `components/escale/contatos/massa/AcoesEmMassa.tsx` (monta o painel), `components/escale/contatos/massa/textosDasAcoes.ts` (avisos), `tests/unit/escale-acoes-em-massa-executar.test.ts`, `tests/unit/escale-barra-e-acoes-em-massa.test.tsx`, `lib/i18n/dicionario.ts`, `lib/audit/actions.ts` (nada novo: `contacts.bulk_requested` cobre)

**Interfaces:**
- Produces:
  - `pedidoDeAcaoSchema` ganha `{ acao: "alterar_campo", parametros: { chave, valor: unknown } }` e `{ acao: "limpar_campo", parametros: { chave } }` (chave `/^[a-z][a-z0-9_]{0,39}$/`, não `link_*`);
  - no executor: `alterar_campo` lê o contato (`custom_fields`), mescla `{ [chave]: valor }` e chama `deps.mudarContato(ctx, id, { custom_fields: mesclado })`; `limpar_campo` remove a chave; contato sem `custom_fields` legível conta como falha com motivo "contato não encontrado";
  - `PainelDeCampos({ alvo, camposDoContato: CampoDeColuna[], aoPedir })` (FieldsBulkPopover, 2b-32/33): seletor do campo (`SeletorDaCasca` com busca), modo "Alterar campo" / "Limpar campo", o valor pelo tipo (`EditorDeCampo` reaproveitado em modo controlado ou os controles simples: texto, número, data, seleção "Selecione uma opção"), botão "Aplicar".

- [ ] **Step 1: Testes (vão falhar)**

Em `tests/unit/escale-acoes-em-massa-executar.test.ts`:

```ts
  it("alterar_campo mescla o custom_fields do contato; limpar_campo tira a chave", async () => {
    const mudarContato = vi.fn().mockResolvedValue({});
    const db = bancoComAcao({ acao: "alterar_campo", parametros: { chave: "cargo", valor: "CEO" }, status: "na_fila" }, { itens: ["c1"], contatos: { c1: { custom_fields: { renda: "10" } } } });
    await processarAcaoEmMassa(linhaDoEvento("a1"), { ...deps, db, mudarContato });
    expect(mudarContato).toHaveBeenCalledWith(expect.anything(), "c1", { custom_fields: { renda: "10", cargo: "CEO" } });

    const db2 = bancoComAcao({ acao: "limpar_campo", parametros: { chave: "renda" }, status: "na_fila" }, { itens: ["c1"], contatos: { c1: { custom_fields: { renda: "10", cargo: "CEO" } } } });
    mudarContato.mockClear();
    await processarAcaoEmMassa(linhaDoEvento("a1"), { ...deps, db: db2, mudarContato });
    expect(mudarContato).toHaveBeenCalledWith(expect.anything(), "c1", { custom_fields: { cargo: "CEO" } });
  });
```

(Use os duplos `bancoComAcao`, `linhaDoEvento` e `deps` que o teste da 2B já tem; se o duplo não lê `contacts`, ensine-o a devolver `contatos[id]` no `from("contacts").select(...).eq("id", id).maybeSingle()`.)

Em `tests/unit/escale-barra-e-acoes-em-massa.test.tsx`: "Campos" ligado; clicar abre o painel com o seletor; escolher "Cargo", digitar "CEO" e "Aplicar" chama `aoPedir` com `{ acao: "alterar_campo", parametros: { chave: "cargo", valor: "CEO" } }`; o modo "Limpar campo" manda `limpar_campo`.

- [ ] **Step 2: Implementar**

`tipos.ts`: os dois membros novos na união discriminada; `ACOES_EM_MASSA` ganha os dois. `executar.ts`, em `emLotes`, ao lado de `incluir_tag`:

```ts
      case "alterar_campo":
      case "limpar_campo": {
        const { data: contato } = await deps.db.from("contacts").select("custom_fields").eq("id", id).eq("organization_id", acao.organization_id).maybeSingle();
        if (!contato) throw new Error("contato não encontrado");
        const atual = { ...((contato.custom_fields as Record<string, unknown> | null) ?? {}) };
        if (acao.acao === "alterar_campo") atual[acao.parametros.chave] = acao.parametros.valor;
        else delete atual[acao.parametros.chave];
        await deps.mudarContato(ctx, id, { custom_fields: atual });
        break;
      }
```

`PainelDeCampos.tsx`: `PainelSuspenso` com cabeçalho "Campos", `SeletorDaCasca` ("Selecione uma opção" como vazio) com `camposDoContato` (só os do catálogo e `nascimento`; links ficam de fora), a alternância "Alterar campo" / "Limpar campo" (`AlternanciaDaCasca`), o valor: `select` → `SeletorDaCasca` com as opções; `multiselect` → `SeletorMultiploDaCasca`; `date` → `SeletorDeDataEHora` só data; `boolean` → sim/não; `number`/`currency` → texto `inputMode="decimal"` convertido por `valorParaGravar`; resto → `CampoDeTexto` "Digite o valor"; "Aplicar" desligado sem campo (ou sem valor no modo alterar). `BarraDeLote.tsx`: o botão "Campos" (L53) perde o `disabled`/"Em breve" e abre o painel. `AcoesEmMassa.tsx` recebe `camposDoContato` da `ListaDeContatos` (Task 9) e monta o painel; `textosDasAcoes.ts`: `rodando.alterar_campo = "Alterando o campo…"`, `terminou.alterar_campo = "O campo foi alterado nos contatos."`, `rodando.limpar_campo`, `terminou.limpar_campo = "O campo foi limpo nos contatos."`, `avisoNaFila` para os dois: "Contatos com o campo alterado estão na fila de atualização. O processo pode levar alguns segundos." (tom da Clint, texto nosso).

- [ ] **Step 3: O espanhol do PR B**

Bloco `  // ─── FORK ESCALE · Fase 2C (PR B): grupos na ficha, colunas, filtros, lote e ocultos ───` (antes do da 1G):

```js
const ES = {
  "Exibir grupos ocultos": "Mostrar grupos ocultos",
  "Esconder grupos ocultos": "Ocultar grupos ocultos",
  "Ocultos": "Ocultos",
  "A empresa do contato chega na Fase 2D.": "La empresa del contacto llega en la Fase 2D.",
  "Documento": "Documento",
  "Data de nascimento": "Fecha de nacimiento",
  "Instagram": "Instagram",
  "Data e hora inválidas.": "Fecha y hora inválidas.",
  "Visualização de campos": "Visualización de campos",
  "Configure aqui a sua visualização de campos.": "Configura aquí tu visualización de campos.",
  "Os campos desativados ficarão ocultos na origem.": "Los campos desactivados quedarán ocultos en el origen.",
  "Campos preenchidos não serão ocultos.": "Los campos completados no se ocultarán.",
  "Utilizar a mesma configuração do grupo": "Usar la misma configuración del grupo",
  "Se marcada essa opção, a configuração no grupo desta origem será priorizada": "Si se marca esta opción, la configuración del grupo de este origen tendrá prioridad",
  "Em breve": "Próximamente",
  "Campos": "Campos",
  "Alterar campo": "Cambiar campo",
  "Limpar campo": "Limpiar campo",
  "Selecione uma opção": "Selecciona una opción",
  "Digite o valor": "Escribe el valor",
  "Aplicar": "Aplicar",
  "Sim": "Sí",
  "Não": "No",
  "Alterando o campo…": "Cambiando el campo…",
  "Limpando o campo…": "Limpiando el campo…",
  "O campo foi alterado nos contatos.": "El campo fue cambiado en los contactos.",
  "O campo foi limpo nos contatos.": "El campo fue limpiado en los contactos.",
  "Contatos com o campo alterado estão na fila de atualização. O processo pode levar alguns segundos.": "Los contactos con el campo cambiado están en la cola de actualización. El proceso puede tardar unos segundos.",
};
```

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Acrescente ao `ES` o que o teste apontar.

- [ ] **Step 4: Gates, PR B e PRD**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale components/escale hooks/escale app/api/v1
corepack pnpm vitest run tests/unit/escale-acoes-em-massa-executar.test.ts tests/unit/escale-barra-e-acoes-em-massa.test.tsx tests/unit/escale-acoes-em-massa-rotas.test.ts tests/unit/dispatcher-org-parada.test.ts tests/unit/evento-comando-tem-consumidor.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/navegacao-completude.test.ts
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2c-campos-na-casca
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2c-campos-na-casca --title "Fase 2C (PR B): grupos na ficha, campos nas colunas, filtros e lote, campos ocultos por origem" --body-file .superpowers/sdd/2c-b-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

O corpo do PR B traz: a ficha com grupos (1g-02/03/04), a aba Empresa ainda só leitura (2D), colunas e filtros com o catálogo (2b-22), o "Campos" do lote (2b-32/33), a subaba "Visualização de campos" (Q5), as diferenças conhecidas (sem print da subaba; "Campos preenchidos não serão ocultos." sem "Checkout"; o quadro fica para depois da 2E, Q4) e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto.**

No PRD, seção 8, linha `| 2C |`: `✅ executada: PR A (#…) e PR B (#…) mergeados na main; testes pesados e publicação ficam para a bateria única da Frente B (depois da 2F); quadro (D5) fica para depois da 2E (Q4)`. Na seção 4, tabela D, linha `| D5 |`: acrescente "lista de contatos e lote na 2C; lista de empresas na 2D; quadro depois da 2E".

**PARE aqui.** A próxima fase da Frente B é a 2D (`docs/superpowers/plans/2026-10-18-fase-2d-empresas.md`). Nenhuma tag, release ou deploy no meio da frente.

---

## Self-review (feito ao escrever, 18/10)

- **Cobertura do PRD:** D1 → Tasks 1, 2, 3, 4, 5, 8 (catálogo do contato em grupos, tipos da Clint, chave ≤ 20, nome único, grupo obrigatório; migração das chaves de hoje, Q3; fixos CPF/nascimento/Instagram); D2 → Tasks 2, 8 (os oito campos da empresa: quatro colunas + quatro semeados; `companies.custom_fields` pronto para a 2D); D3 → Tasks 3, 4, 5 (uma janela para os três objetos; restringir visibilidade por papel, Q1; "Usar como variável", "Copiar identificador"); D4 → Tasks 7, 8, 11 (`escale_campos_ocultos`, subaba, efeito na ficha com "preenchido não some", "usar do grupo", Q5); D5 → Tasks 9, 10, 12 (colunas, filtros e lote da lista de contatos; a lista de empresas é da 2D; o quadro fica para depois da 2E, Q4). Permissões da §5: gerenciar campos = admin (RLS + rota + `usePermission("settings.write")`).
- **"Em breve" que esta fase fecha:** grupo único da ficha (1H N3) → Task 8; "Visualização de campos" (1F) → Task 11; "Campos do contato" só com os da 2A (2A N6) → Task 9; personalizados do contato no filtro (2B) → Task 10; "Campos" da barra de lote (2B N12) → Task 12. **Continuam "Em breve":** "Empresa" no seletor do filtro e a aba Empresa editável (2D); os personalizados do contato no quadro (Q4).
- **Placeholders:** nenhum "TBD"; onde o código depende de um nome do original que o levantamento leu mas pode ter mudado, há um "Confira antes de rodar" com o arquivo e a linha.
- **Nomes que atravessam tasks:** `OBJETOS_DE_CAMPO`, `ObjetoDeCampo`, `TIPOS_DA_CLINT`/`TipoDaClint`/`tipoDoMotor`/`TipoDoMotor`, `ROTULO_DO_TIPO`, `ROTULO_DO_OBJETO`, `chaveDoNome`, `GRUPO_PADRAO`, `PAPEIS_DE_VISIBILIDADE`/`PapelMinimo`/`ROTULO_DA_VISIBILIDADE`/`visivelPara`, `CAMPOS_FIXOS_DO_CONTATO`/`CAMPOS_FIXOS_DA_EMPRESA`, `Catalogo`/`CampoDoCatalogo`/`GrupoDeCampos`/`CATALOGO_VAZIO`, `camposPorGrupo`, `catalogoVisivel`, `variavelDoCampo` (Task 1) → usados nas Tasks 3, 4, 5, 8, 9, 10, 11; `lerCatalogo`, `semearSeVazio`, `criarCampo`, `mudarCampo`, `excluirCampo`, `criarGrupo`, `renomearGrupo`, `excluirGrupo`, `reordenar`, `novoCampoSchema`/`NovoCampo`, `patchDoCampoSchema`/`PatchDoCampo`, `ordemSchema`/`OrdemDoCatalogo`, `ErroDoCatalogo`, `TEXTO_DO_ERRO` (Task 3) → Tasks 4, 5, 10; `CHAVE_DO_CATALOGO`, `useCatalogoDeCampos`, `useMudarCatalogo` (Task 4) → Tasks 5, 8, 9, 10, 11, 12; `CHAVE_DOS_OCULTOS`, `CamposOcultos`, `OCULTOS_VAZIOS`, `camposOcultosSchema`, `lerOcultos`, `ocultosEfetivos`, `esconderOcultos` (Task 7) → Tasks 8, 11; `camposDoContatoComGrupos`, `camposDaEmpresaComGrupos`, `gruposDaFicha`, `useOcultosDaOrigem` (Task 8); `CampoDeColuna`, `camposDeColuna` (Task 9) → Task 12; `tipoDoFiltro`, `camposDoContatoDoFiltro` (Task 10).
- **Numeração:** Tasks 1–12 contíguas (PR A 1–6, PR B 7–12); migrations 9104 (esta), 9105 (2D), 9106 (2E), 9107 (2F).
- **Pontos de atenção do executor:** a `fn_escale_campo_valido` deve ser copiada da 9006 e não reescrita; a constraint de `acao` da 9103 pelo nome real; a API do `SeletorDeDataEHora`, do `InterruptorDaCasca` e da `CaixaDaCasca`; a rota do grupo para "usar do grupo"; os nomes dos testes da 1F e da 1H que mudam de propósito.
