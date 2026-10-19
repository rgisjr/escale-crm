# Fase 2D — Empresas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** E1 a E8 de `docs/modulos/2-contatos-e-empresas.md` (seção 4, tabela E), mais o que ficou "Em breve" para cá: a empresa na busca e na linha da lista de contatos (A3, 2A), o grupo "Empresa" do seletor de campos do filtro (2B), a aba Empresa da ficha do negócio (C12 e C13 do PRD de Negócios; moldura da 1G, catálogo da 2C) e o "Personalizar colunas" de empresas (D5). **Frente B**, worktree `wt-frente-b`, migration **9105**. **Dois PRs:** **A** = banco, rotas e a empresa na lista de contatos (Tasks 1–6); **B** = telas: lista de empresas, "Nova empresa", ficha da empresa e aba Empresa do negócio (Tasks 7–12).
> **Pré-requisito:** a 2C mergeada (migration 9104: `companies.custom_fields`, o catálogo da empresa, `camposDaEmpresaComGrupos`, `useCatalogoDeCampos`). A Task 1 prova.

## Decisões delegadas (18/10: o usuário mandou o Claude decidir)

| # | Pergunta | Decisão |
|---|---|---|
| Q1 | **Empresas no menu (E1).** O PRD diz "no menu, sempre ligado"; a decisão de 16/10 (menu da Clint v1) pôs Empresas no "Mais", porque a v1 não a tem no topo | **Fica no "Mais"**, sempre ligada (a 9105 liga o módulo `crm_b2b` na instalação). O "Novo +" ganha "Empresa". O menu do topo não muda (N1) |
| Q2 | **Remover o último contato da empresa.** A Clint avisa "Este é o último contato da empresa. Ao removê-lo, a empresa será excluída." | **Igual à Clint:** a empresa é excluída junto, com o aviso (N7) |
| Q3 | **Valor em aberto.** A Clint soma os negócios abertos em BRL | **Soma os negócios abertos** dos contatos da empresa, de origens não arquivadas, que quem olha enxerga, **na moeda da organização** (negócio em outra moeda fica fora da soma) (N6) |
| Q4 | **Logo pelo site** (Clint usa um serviço externo) | **Sem logo** (resposta 4 do PRD): monograma com as iniciais. A consulta de CNPJ do original fica na aba Dados (N11) |
| Q5 | **Mais de uma empresa por contato** (a importação B2B do original permite) | **A casca mostra uma só**, a do vínculo principal (ou o mais antigo). Vincular a outra empresa pela casca tira os outros vínculos do contato (caminho A do PRD) (N4) |
| Q6 | **Quem faz o quê** | Ver: todos. Criar empresa, editar dados, vincular, remover da empresa e trocar o principal: **atendente** ou acima. Excluir empresa: **gerente** ou acima (PRD §5) |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código e os textos da Clint, citados abaixo):
1. ❌ "Nova empresa" nos dois passos.
2. ❌ A ficha da empresa nas abas Contatos, Negócios e Dados.
3. ❌ "Personalizar colunas" de empresas (há o v2-14 com os campos da empresa num painel de interruptores).
4. ❌ A aba Empresa do negócio **com** empresa vinculada, e a janela "Nova empresa" de trocar a empresa (Manter / Limpar).

**Goal:** Com a casca ligada, Empresas vira a tela da Clint (04-001): lista com busca, escopo "Com nome", filtros por campo, contagem, "Personalizar colunas", colunas Nome, Contato principal, Segmento, Contatos, Valor em aberto e Negócios, e a lixeira; "Nova empresa" em dois passos (Empresa → Contato); a ficha da empresa com o resumo e as abas Contatos, Negócios e Dados; e a aba Empresa da ficha do negócio mostra e vincula a empresa do contato. A lista de contatos passa a buscar e filtrar pela empresa e mostra o nome dela na linha. Sem a casca, o módulo B2B do original segue como está (agora ligado).

**Architecture:**
- **Banco (9105):** liga `MODULO_CRM_B2B`; um principal por empresa (índice parcial único em `company_people`); funções **definer fechadas ao `service_role`** que mexem em `people`/`company_people` (a RLS do original exige gerente para inserir lá, e o PRD dá ao atendente o vincular): `fn_escale_criar_empresa`, `fn_escale_vincular_contato_a_empresa`, `fn_escale_desvincular_contato_da_empresa`, `fn_escale_tornar_principal`, `fn_escale_excluir_empresa`; função **invoker** `fn_escale_lista_de_empresas` (página, total, contatos, negócios e valor em aberto com a RLS de quem olha); peças do filtro `fn_escale_empresa_passa` e `fn_escale_grupo_da_empresa_passa`; e as duas da 9102 recriadas com a empresa (`fn_escale_contato_passa` ganha o alvo `empresa`, `fn_escale_contatos_do_filtro` busca pelo nome da empresa).
- **Servidor:** `lib/escale/empresas/{regras,banco}.ts` e rotas do fork em `/api/v1/empresas/**` e `/api/v1/contatos/[id]/empresa`. Toda rota confere o papel com `requireRole` e chama as funções definer com `createAdminClient()`; as leituras usam a sessão (RLS).
- **Telas:** encaixes em `app/app/companies/page.tsx` e `app/app/companies/[id]/page.tsx` (com a casca, as telas do fork); `ListaDeEmpresas`, `TabelaDeEmpresas`, `JanelaNovaEmpresa`, `FichaDaEmpresa`; a aba Empresa da ficha do negócio ganha o vínculo; o "Personalizar colunas" fica genérico por lista.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix, `@hello-pangea/dnd`, zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (RLS, funções invoker e definer fechadas).

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 04-001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\04-empresas\imagens\04-001-lista-empresas.png | a lista: cabeçalho, barra, tabela, linha, rodapé | 8 |
| 03-001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\03-contatos\imagens\03-001-lista-contatos.png | a mesma régua de medidas da lista de contatos (barra, linha de 64px, paginação) | 8 |
| 1g-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-03-aba-empresa.jpg | a aba Empresa do negócio (moldura, os oito campos) e a aba Dados da ficha da empresa | 10, 11 |
| v2-14 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-14-personalizar-empresa.png | o grupo EMPRESA de um painel de colunas com ícone de prédio e selo de contagem | 7 |

### Medidas (04-001 está em 1:1, CSS px)

| Peça | Medida |
|---|---|
| Cabeçalho | 58px; "Empresas" 20px/500 `casca-texto` a 30px da borda; "Nova empresa" `BotaoDaCasca variante="marca"` à direita (sem "+", como no print) |
| Barra | 40px de altura a 16px do cabeçalho; busca 300×40 `bg-casca-busca`, lupa à direita, "Buscar por empresa ou CNPJ"; seletor "Com nome" 166×40 com ícone de prédio; "Filtros" + ⇕ 156×40; à direita "{n} empresas" (número 15px/600 + palavra 15px `casca-suave`), atualizar 17px e o botão de colunas com o selo "5" |
| Cabeçalho da tabela | 50px; rótulos 11px/600 maiúsculos, espaçamento 0,08em |
| Linha | 80px no print (é o mesmo 64px CSS da lista de contatos em zoom; use 64px, como a 2A) |
| Nome | monograma 44×44, canto 6px, fundo `casca-marca-suave`, iniciais 13px `casca-marca`; nome 15px/500 `casca-texto` |
| Contato principal | foto 40px redonda; ★ 11px `casca-marca` + nome 14px/500; telefone 14px `casca-suave` com ícone 11px, e no hover ligar e conversa na cor da marca |
| Segmento | 14px `casca-suave`, "—" quando vazio |
| "Ver 1 contato" / "Ver 1 negócio" | 134×40 no print → 24px de altura CSS como o "Ver N negócio" da 2A, contorno `casca-borda`, texto 13px/500 `casca-texto` |
| Valor em aberto | 14px/600 `casca-texto`, "R$ 0,00" |
| Lixeira | `Trash2` 17px `casca-meta`, ponta direita; dica "Excluir empresa" |
| Rodapé | "10 por página" e a paginação da `PaginacaoDaCasca` (2A) |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (L6920, 11198–11330) e dos bundles `raw-v2\js\index-CoMFia_3.js.txt` (lista e "Nova empresa"), `index-BYxUbJr8.js.txt` (ficha), `index-BhVJ8kAx.js.txt` (trocar a empresa) e `suggestLogo-Bwo3gFoP.js.txt` (modelo de dados):

- **Lista:** "Empresas"; "Nova empresa"; "Buscar por empresa ou CNPJ"; "Todas as empresas"; "Com nome"; "Sem nome"; "Filtros"; "Campos"; "{count} campo" / "{count} campos"; "empresa" / "empresas"; "Atualizar"; "Refine a busca para ver além das primeiras {max}."; "Personalizar colunas"; "Na tabela · {count}"; "arraste para reordenar"; "Colunas"; "Campos da empresa"; "Buscar coluna ou campo"; "Redefinir"; "Nada encontrado."; "Fechar"; "Nome"; "Contato principal"; "Segmento"; "Contatos"; "Valor em aberto"; "Negócios"; "Ações"; "Ver {n} contato" / "Ver {n} contatos"; "Ver {n} negócio" / "Ver {n} negócios"; "Excluir empresa"; "Organize seus contatos por empresa"; "Agrupe contatos em empresas e veja negócios e atividades de toda a conta em um só lugar."; "Nenhuma empresa encontrada para \"{search}\"."; "Limpar busca"; "Tem certeza que deseja excluir \"{name}\"? Os contatos serão mantidos."; "Empresa \"{name}\" removida."; "Não foi possível excluir a empresa. Tente novamente.".
- **Nova empresa:** "Nova empresa"; "Dados da empresa — no próximo passo você vincula um contato."; "Contato da empresa"; "Empresa"; "Contato"; "Nome da empresa"; "Ex.: Atlas Distribuidora"; "CNPJ"; "Opcional. Ajuda a identificar duplicidades automaticamente."; "Site"; "empresa.com.br"; "Cancelar"; "Continuar"; "Voltar"; "Criar empresa"; "Criando…"; "Vincular existente"; "Criar novo"; "Buscar contato por nome, telefone ou e-mail"; "Contatos recentes"; "Nenhum contato encontrado."; "Nenhum contato cadastrado ainda."; "Nome do contato"; "Digite o nome do contato"; "Informe o nome do contato."; "Telefone"; "Telefone inválido."; "E-mail inválido."; "Telefone já cadastrado."; "E-mail já cadastrado."; "Será definido como contato principal da empresa e aparecerá em destaque na listagem."; "Falha ao criar o contato."; "Empresa \"{name}\" criada e vinculada a {contact}."; "o contato"; "Não foi possível criar a empresa. Tente novamente.".
- **Ficha:** "Contato principal"; "Valor em aberto"; "Criada em"; "Contatos"; "Negócios"; "Dados"; "Sem dados adicionais"; "Excluir empresa"; "Empresa não encontrada"; "Ela pode ter sido excluída ou você não tem acesso a ela."; aba Contatos: "Nome"; "Contato"; "Tags"; "Ações"; "Nenhum contato nesta empresa"; "Os contatos vinculados a esta empresa aparecerão aqui."; "Vincular existente"; "Novo contato"; "Tornar contato principal"; "Contato principal · clique para remover"; "Remover da empresa"; "Contato definido como principal."; "Contato removido como principal."; "Contato removido da empresa."; "Não foi possível atualizar o contato principal."; "Não foi possível remover o contato da empresa."; "Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo."; "Selecione o novo contato principal"; "Selecione o novo contato principal."; "Definir e remover"; "Este é o último contato da empresa. Ao removê-lo, a empresa será excluída."; "Empresa removida."; "Adicionar negócio"; "Ver {n} negócio" / "Ver {n} negócios"; "Vincular contato existente"; "Vincular contato"; "Adicionar contato"; "Salvando…"; "Contato {name} adicionado à empresa."; "Não foi possível adicionar o contato. Tente novamente."; aba Negócios: "Negócio"; "Origem"; "Etapa"; "Status"; "Valor"; "Buscar negócios"; "Nenhum negócio nesta empresa"; "Os negócios desta empresa aparecerão aqui.".
- **Trocar a empresa do contato:** "Nova empresa"; "Selecione o que deseja fazer com os campos da nova empresa:"; "Manter informações dos campos"; "Mantenha os campos atuais, como Site, CNPJ, Estado, Cidade e todos os demais campos de empresa, sem alterações."; "Limpar informações dos campos"; "Apague todos os campos preenchidos para essa empresa."; "Ver dados da empresa {companyName}".
- **Textos nossos** (a Clint não tem): "CNPJ já cadastrado em outra empresa."; "CNPJ inválido."; "Você não tem permissão para excluir a empresa." (é da Clint, `deleteNotAllowed`); "Escolha a empresa ou digite um nome novo"; "Criar a empresa \"{nome}\"".

### Comportamento da Clint conferido no código

- **Lista** (`index-CoMFia_3`): colunas padrão `primaryContact, segment, contacts, openValue, deals`, todas na tabela; a preferência das colunas fica no servidor (`organizations_table_columns`) com espelho no navegador; "Campos da empresa" no painel lista os campos do catálogo da empresa, **menos** nome e segmento (`ea`); clicar na linha abre a empresa; "Ver N contato" abre a ficha na aba Contatos, "Ver N negócio" na aba Negócios (`h("contacts")`, `h("deals")`); a lixeira só com `ORGANIZATION_DELETE`; escopo padrão "Com nome" (`named`); a paginação guarda `offset/limit` no navegador (`organizations-list:pagination`) e volta à página 1 quando busca, escopo ou filtro mudam; a contagem passa de 10.000 com a dica "Refine a busca…"; o filtro tem só a seção "Campos" (`FieldFilterBuilder` com os campos de CONTACT, DEAL e ORGANIZATION); vazio sem busca: ilustração, "Organize seus contatos por empresa", texto e botão "Nova empresa"; vazio com busca: "Nenhuma empresa encontrada para \"{search}\"." e "Limpar busca"; excluir: confirmação "Tem certeza que deseja excluir \"{name}\"? Os contatos serão mantidos." e o toast "Empresa \"{name}\" removida.".
- **Nova empresa** (`la`): passo "Empresa" com Nome* (obrigatório para continuar), CNPJ com máscara `00.000.000/0000-00` e Site; passo "Contato" com "Vincular existente" ou "Criar novo" (o contato vira o principal); o rodapé do passo 1 mostra os passos "1 Empresa › 2 Contato" à esquerda e "Cancelar" / "Continuar" à direita; o do passo 2, "Voltar" à esquerda e "Criar empresa" à direita; ao criar: cria a empresa, vincula o contato, torna-o principal, mostra "Empresa \"{name}\" criada e vinculada a {contact}." e abre a ficha da empresa.
- **Modelo** (`suggestLogo`): `organization.fields` guarda nome, `url` (site), `cnpj`, `segment`; o contato tem `organization_id`; trocar a empresa de um contato que era principal na antiga tira o principal de lá (`A`); remover o contato da empresa cria para ele uma empresa vazia (`I`) — aqui, não (PRD caminho A): ele fica sem empresa.
- **Ficha** (`index-BYxUbJr8`): resumo com "Valor em aberto" (grande), "Contato principal" e "Criada em" (dd/mm/aaaa); aba Contatos com a estrela que alterna o principal ("Contato principal · clique para remover"), "Tornar contato principal", "Remover da empresa" (com a escolha do novo principal quando ele era o principal, e o aviso do último contato), "Vincular existente" e "Novo contato"; aba Negócios com busca e as colunas Negócio, Origem, Etapa, Status e Valor; aba Dados com os campos da empresa.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Menu (Q1):** Empresas no "Mais" (o catálogo do original já a declara com `modulo: "crm_b2b"`; ligado o módulo, ela aparece); `ACOES_DE_CRIAR` ganha `{ id: "empresa", rotulo: "Empresa", href: "/app/companies?nova=1" }` | menu da v1 (16/10) |
| N2 | **Módulo ligado:** a 9105 grava `platform_config (MODULO_CRM_B2B, 'ligado')` com `on conflict do update`. Pessoas e Importações B2B aparecem no "Mais" (PRD: ficam lá, como no original) | E1; PRD caminho A |
| N3 | **Encaixes:** `app/app/companies/page.tsx` e `app/app/companies/[id]/page.tsx` com a casca (`lerPreferenciaDeMenu(cookie) === "topo"`) renderizam `ListaDeEmpresas` e `FichaDaEmpresa`; sem a casca, os clientes do original. Nenhuma `page.tsx` nova | regra 7 do roteiro; `navegacao-completude` |
| N4 | **Uma empresa por contato na casca (Q5):** `empresaDoContato` lê o vínculo `is_primary` da pessoa do contato, senão o mais antigo. Vincular pela casca apaga os outros vínculos da pessoa; se ela era principal na empresa antiga, a antiga fica sem principal (Clint `A`) | caminho A |
| N5 | **Escrita por funções definer fechadas** (`revoke … from public, anon, authenticated; grant … to service_role`), com `p_org` e o ator; revalidam que contato e empresa são da organização. As rotas conferem o papel antes e chamam com o service role. Leituras pela sessão | a RLS do original pede gerente para `people`/`company_people`; PRD §5 dá ao atendente; cerca `definer-nova-nasce-exposta` |
| N6 | **Contagens e valor (Q3):** contatos = vínculos da empresa com contato vivo (`is_merged_into is null`); negócios = negócios desses contatos em origens não arquivadas que a RLS deixa ver; valor em aberto = soma de `value_cents` dos negócios `open` com `coalesce(currency, organizations.currency) = organizations.currency` | Clint `openValue`; 1F (moeda por origem) |
| N7 | **Remover da empresa (Q2):** se o contato era o principal e há outros, a tela exige o novo principal ("Definir e remover"); se era o último, avisa e a empresa é excluída. A função devolve `removido` ou `empresa_excluida` | Clint `OrgContactsTab` |
| N8 | **Excluir empresa** mantém os contatos e as pessoas: apaga a empresa (os vínculos caem por cascata). A rota do fork; o `DELETE /api/v1/companies/[id]` do original (que recusa com pessoas) não muda | E6 |
| N9 | **Campos da empresa:** fixos `nome` (`trade_name`), `cidade` (`city`), `estado` (`state`), `cnpj` (`cnpj` formatado + `normalized_cnpj`); os do catálogo em `companies.custom_fields` (2C). "Segmento" da lista é o campo `segmento` do catálogo (semeado pela 9104) | 2C N3 |
| N10 | **Busca da lista de empresas:** nome (`trade_name` e `legal_name`) pelo padrão regex do original e CNPJ pelos dígitos. **Escopo:** "com nome" = `coalesce(trade_name, legal_name)` não vazio; "sem nome" = vazio; "todas". Ordem: `updated_at desc, id desc`. Página por `offset/limit` como a 2A, 10/25/50/100 por página, `escale:empresas:por-pagina` no navegador; busca, escopo, página e filtro na URL (`q`, `e`, `p`, `f`) | Clint; 2A N5 |
| N11 | **CNPJ:** máscara na janela; validação com `isValidCnpj` (`lib/cobranca/documento.ts`) e normalização com `normalizeCnpj`/`formatCnpj` (`lib/crm-b2b/normalize.ts`); repetido → 409 "CNPJ já cadastrado em outra empresa." (índice único do original). A consulta à BrasilAPI do original vira o botão "Consultar CNPJ" da aba Dados (gerente ou acima, como a rota `/api/v1/companies/lookup`), que preenche Cidade e Estado | resposta 4 do PRD |
| N12 | **Lista de contatos (A3 e 2B):** a busca acha pelo nome da empresa; a linha mostra o nome da empresa em 11px `casca-meta` acima do nome do contato (Clint `contact-row-v2`); o filtro ganha o alvo `empresa` (fixos + catálogo da empresa) e o grupo "Empresa" do seletor liga | 2A, 2B |
| N13 | **Aba Empresa do negócio (E8):** sem empresa, a linha "Nome da empresa" é um seletor com busca ("Escolha a empresa ou digite um nome novo") que vincula uma empresa existente ou cria uma nova, e as outras linhas ficam travadas; com empresa, todas editáveis (atendente ou acima), o nome com o atalho "Ver dados da empresa {nome}" e a troca de empresa. Trocar quando o contato já tem empresa e o nome é novo abre a janela "Nova empresa" da Clint (Manter / Limpar): "Manter" copia cidade, estado e os campos do catálogo para a nova (o CNPJ não, porque é único) | Clint `OrganizationChangeModal` |
| N14 | **Colunas genéricas:** `lib/escale/colunas/` ganha o validador por lista (`lerColunasDaLista`); `PainelDeColunas` recebe as nativas e os campos por props. A lista `empresas` já é aceita pela tabela `crm_colunas_das_listas` e por `LISTAS_COM_COLUNAS` | 2A; Clint `ta` |
| N15 | **Filtros da lista de empresas:** só a seção "Campos" (como a Clint), com os campos da empresa (fixos + catálogo). Sem filtro salvo (a Clint não tem para empresas) | Clint |
| N16 | **Fora desta fase:** "Nome da empresa" na capa do card do quadro (`JanelaPersonalizarCards`, 1E) e o "Sem empresa" da seção Recentes: dependem de ler a empresa de cada negócio do quadro; ficam para a task curta do quadro depois da 2E (junto da Q4 da 2C) | custo; mesmo motivo da 2C Q4 |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo` (**da Frente A**: não troque de branch nele, não faça stash, não mexa nos arquivos). **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. Todo comando roda dentro dela.
- **Branches:** PR A `feat/fase-2d-empresas-banco`; PR B `feat/fase-2d-empresas-telas`. Cada uma de `escale-crm/main` (Tasks 1 e 7 provam).
- **Base:** `escale-crm/main` com a 2C inteira mergeada (a última migration da Frente B é a 9104).
- **Migration:** **9105**, `supabase/migrations/20261105120000_9105_empresas.sql`. Antes de criar: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se 9105 já existir em outra branch, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`. **Merge direto na `main` ao terminar cada PR** (regra de 18/10).
- **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção no meio da frente.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só na Task 2 (precisa do Docker Desktop; se `docker info` falhar, PARE e peça ao usuário).

### Forma das rotas (copie de `app/api/v1/acoes-em-massa/route.ts`)

```ts
const requestId = randomUUID();
const supportDenied = await requireSupportWrite();          // só nas escritas
if (supportDenied) return supportDenied;
const authz = await requireRole("agent", { requestId, resource: "companies" });
if (!authz.ok) return authz.response;
const t = (texto: string) => traduzir(texto, authz.user.idioma);
// erro de validação:   return fail("unprocessable_entity", t("..."), 422, { requestId });
// sucesso:             return ok(dados);   ou   return ok(dados, { status: 201 });
// auditoria:           void audit({ action, actorUserId: authz.user.id, organizationId, resourceType, resourceId, requestId, metadata });
// erro inesperado:     return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "..." }, t, requestId);
```

`fail(code, message, status, { requestId })` e `ok(data, { status?, meta? })` vêm de `@/lib/api/wrappers`; `lerJson(req)` de `@/lib/escale/origens/respostas`; `falhaInesperadaDoQuadro` de `@/lib/escale/capa/banco`.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2D`. Sem a casca, nenhum muda o comportamento (a não ser o módulo B2B ligado, N2).

| Arquivo | Mudança | PR |
|---|---|---|
| `supabase/baseline.sql` | bloco da 9105 logo depois do bloco da 9104 | A |
| `app/app/companies/page.tsx` | com a casca, `ListaDeEmpresas` | B |
| `app/app/companies/[id]/page.tsx` | com a casca, `FichaDaEmpresa` | B |
| `lib/i18n/dicionario.ts` | blocos novos logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` | A, B |
| `lib/audit/actions.ts` | ações novas logo depois das da 2C (`"crm_field_group.deleted",`) | A |

Os do fork que mudam: `lib/escale/menu-do-topo.ts`, `lib/escale/contatos/{lista,filtros,compilar-filtros,opcoes-do-filtro,origens-da-pagina}.ts`, `components/escale/contatos/{TabelaDeContatos,PainelDeColunas}.tsx`, `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx`, `lib/escale/colunas/banco.ts`, `app/api/v1/colunas-das-listas/route.ts`, `hooks/escale/useColunasDaLista.ts`, `components/escale/negocio/abas/AbasDeCampos.tsx`, `lib/escale/campos/da-ficha.ts` (2C), `lib/ui/icons-da-casca.ts`.

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-menu-do-topo.test.ts` (L101–116) | as ações do "Novo +" (contato, campanha, proposta) | ganha "Empresa" (Task 9) |
| `tests/unit/escale-painel-de-colunas.test.tsx` | o painel preso às colunas dos contatos | o painel recebe as nativas por prop (Task 7) |
| `tests/unit/escale-painel-de-filtros.test.tsx` | o grupo "Empresa" desligado "Em breve" | liga (Task 5) |
| `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` | a aba Empresa só leitura e travada | vincula e edita (Task 11) |
| `tests/unit/escale-lista-de-contatos-migration.test.ts` / `escale-filtros-de-contatos-migration.test.ts` | o corpo de `fn_escale_contato_passa` e `fn_escale_contatos_do_filtro` no baseline | a 9105 recria as duas: o teste da 9102 continua lendo o arquivo da 9102; se ele exigir que o baseline contenha o bloco da 9102 inteiro, continua verdade (a 9105 vem depois) |

**O menu do topo não muda** (Q1): `escale-menu-do-topo.test.ts` L24–48 e `escale-menu-do-topo-tela.test.tsx` continuam verdes.

### Cercas que precisam ficar verdes

`controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`, `evidencia-citada`, `escale-casca-v2-original-intacto` (as telas do original não importam `@/components/escale/`; o encaixe na `page.tsx` é permitido como na 2A), `navegacao-completude`, `i18n-espanhol-cobre-a-tela` (Tasks 6 e 12), `rls-completude-varredura` (nenhuma tabela nova), `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura` (as cinco definer fechadas), `manifest-x-migrations`, `navegacao-registry` e `porta-do-modulo-ligado` (o portão continua; só o valor muda), `audit-lista-do-painel-e-derivada`.

### Verificação (regra de 18/10: executa tudo, testa tudo, publica tudo)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, typecheck e eslint dos arquivos alterados.
2. **`test:db`:** só na Task 2.
3. **Nenhuma rodada cheia e nenhum revisor por PR.** A bateria e a revisão (Opus 5.5) ficam para o fim da Frente B.
4. Comandos longos em segundo plano.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas, números e moeda no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/empresas/regras.ts` | novo | A | escopos, consulta, CNPJ, colunas nativas, nova empresa, desfecho da remoção, campos fixos ↔ colunas |
| `supabase/migrations/20261105120000_9105_empresas.sql`, `supabase/baseline.sql` | novo / bloco | A | módulo, principal único, funções definer, lista invoker, filtro da empresa, 9102 recriadas |
| `lib/escale/empresas/banco.ts` | novo | A | ler a lista, a ficha, os contatos, os negócios e a empresa do contato; chamar as funções |
| `app/api/v1/empresas/route.ts`, `[id]/route.ts`, `[id]/contatos/route.ts`, `[id]/contatos/[contatoId]/route.ts`, `[id]/principal/route.ts`, `[id]/negocios/route.ts`, `app/api/v1/contatos/[id]/empresa/route.ts` | novos | A | rotas |
| `lib/escale/contatos/{lista,filtros,compilar-filtros,opcoes-do-filtro,origens-da-pagina}.ts`, `components/escale/contatos/TabelaDeContatos.tsx`, `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx` | alterados | A | empresa na linha, na busca e no filtro |
| `lib/escale/colunas/banco.ts`, `app/api/v1/colunas-das-listas/route.ts`, `components/escale/contatos/PainelDeColunas.tsx`, `hooks/escale/useColunasDaLista.ts` | alterados | B | colunas por lista |
| `hooks/escale/{useListaDeEmpresas,useEmpresa,useEmpresaDoContato}.ts` | novos | B | leitura e escrita |
| `components/escale/empresas/{ListaDeEmpresas,TabelaDeEmpresas,CelulasDaEmpresa,JanelaNovaEmpresa,PassoContatoDaEmpresa,FichaDaEmpresa,AbaContatosDaEmpresa,AbaNegociosDaEmpresa,AbaDadosDaEmpresa,JanelaRemoverDaEmpresa,JanelaVincularContato,SeletorDeEmpresa,JanelaTrocarEmpresa,Monograma}.tsx` | novos | B | telas |
| `app/app/companies/page.tsx`, `app/app/companies/[id]/page.tsx` | encaixes | B | a casca |
| `lib/escale/menu-do-topo.ts` | alterado | B | "Novo +" Empresa |
| `components/escale/negocio/abas/AbasDeCampos.tsx`, `lib/escale/campos/da-ficha.ts` | alterados | B | aba Empresa do negócio |
| `lib/audit/actions.ts`, `lib/i18n/dicionario.ts` | alterados | A, B | ações, espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` | alterado (fora do repositório) | A, B | linha da 2D |

---

# PR A — Banco, rotas e a empresa na lista de contatos (E1, E6, E7, A3)

### Task 1: Worktree, base e as regras puras das empresas

**Files:**
- Create: `lib/escale/empresas/regras.ts`, `tests/unit/escale-empresas-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-18-fase-2d-empresas.md`

**Interfaces:**
- Produces: `ESCOPOS_DE_EMPRESAS`, `EscopoDeEmpresas`, `ESCOPO_PADRAO`, `ROTULO_DO_ESCOPO`, `consultaDaListaDeEmpresasSchema`, `ConsultaDaListaDeEmpresas`, `mascaraDeCnpj(texto)`, `lerCnpj(texto): { ok: true; normalizado: string | null; formatado: string | null } | { ok: false }`, `COLUNAS_NATIVAS_DE_EMPRESAS`, `ColunaNativaDeEmpresa`, `ROTULO_DA_COLUNA_DE_EMPRESA`, `COLUNAS_PADRAO_DE_EMPRESAS`, `novaEmpresaSchema`, `NovaEmpresa`, `desfechoDaRemocao(contatos, contatoId)`, `DesfechoDaRemocao`, `COLUNA_DO_CAMPO_FIXO`, `iniciaisDaEmpresa(nome)`, `CONTAGEM_MAXIMA = 10_000`.

- [ ] **Step 1: Worktree e base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm
git switch -c feat/fase-2d-empresas-banco escale-crm/main
ls supabase/migrations | grep -E "_910[0-9]_"
ls lib/escale/campos
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: 9101 a 9104 na lista, **nenhuma 9105**; `lib/escale/campos` tem `regras.ts`, `banco.ts`, `ocultos.ts` e `da-ficha.ts` (2C). Sem a 2C, PARE. Copie este plano para `docs/superpowers/plans/`.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-empresas-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO_DE_EMPRESAS,
  ESCOPO_PADRAO,
  consultaDaListaDeEmpresasSchema,
  desfechoDaRemocao,
  iniciaisDaEmpresa,
  lerCnpj,
  mascaraDeCnpj,
  novaEmpresaSchema,
} from "@/lib/escale/empresas/regras";

describe("regras das empresas (Fase 2D)", () => {
  it("consulta: escopo padrão 'com nome', página 1, 10 por página", () => {
    expect(ESCOPO_PADRAO).toBe("com_nome");
    expect(consultaDaListaDeEmpresasSchema.parse({})).toEqual({ e: "com_nome", p: 1, n: 10 });
    expect(consultaDaListaDeEmpresasSchema.safeParse({ e: "outra" }).success).toBe(false);
  });

  it("máscara do CNPJ enquanto digita", () => {
    expect(mascaraDeCnpj("1")).toBe("1");
    expect(mascaraDeCnpj("11222")).toBe("11.222");
    expect(mascaraDeCnpj("11222333")).toBe("11.222.333");
    expect(mascaraDeCnpj("112223330001")).toBe("11.222.333/0001");
    expect(mascaraDeCnpj("11222333000181")).toBe("11.222.333/0001-81");
    expect(mascaraDeCnpj("11.222.333/0001-8199")).toBe("11.222.333/0001-81");
  });

  it("CNPJ: vazio é opcional; válido normaliza e formata; inválido recusa", () => {
    expect(lerCnpj("")).toEqual({ ok: true, normalizado: null, formatado: null });
    expect(lerCnpj("11.222.333/0001-81")).toEqual({ ok: true, normalizado: "11222333000181", formatado: "11.222.333/0001-81" });
    expect(lerCnpj("11.222.333/0001-80")).toEqual({ ok: false });
    expect(lerCnpj("11111111111111")).toEqual({ ok: false });
  });

  it("nova empresa: nome obrigatório; contato existente ou novo", () => {
    expect(novaEmpresaSchema.safeParse({ nome: " ", contato_id: "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b" }).success).toBe(false);
    expect(
      novaEmpresaSchema.parse({ nome: "Atlas", cnpj: "", site: "atlas.com.br", contato_id: "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b" }),
    ).toMatchObject({ nome: "Atlas", site: "atlas.com.br" });
  });

  it("remover da empresa: simples, escolher o principal ou último contato", () => {
    const a = { id: "a", principal: true };
    const b = { id: "b", principal: false };
    expect(desfechoDaRemocao([a, b], "b")).toBe("simples");
    expect(desfechoDaRemocao([a, b], "a")).toBe("escolher_principal");
    expect(desfechoDaRemocao([a], "a")).toBe("ultimo");
    expect(desfechoDaRemocao([{ id: "c", principal: false }], "c")).toBe("ultimo");
  });

  it("colunas padrão da Clint e as iniciais do monograma", () => {
    expect(COLUNAS_PADRAO_DE_EMPRESAS.map((c) => c.chave)).toEqual(["contato_principal", "segmento", "contatos", "valor_aberto", "negocios"]);
    expect(iniciaisDaEmpresa("Daiane Feijó Barreto Incorporação Ltda")).toBe("DL");
    expect(iniciaisDaEmpresa("naiara")).toBe("N");
    expect(iniciaisDaEmpresa("")).toBe("?");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-empresas-regras.test.ts`
Expected: FAIL (módulo não existe).

As iniciais seguem o print 04-001: "Daiane Feijó Barreto Incorporação Ltda" vira "DL" (primeira letra da primeira e da última palavra), "Guilherme Oliveira" vira "GO", "naiara" vira "N".

- [ ] **Step 3: As regras**

Create `lib/escale/empresas/regras.ts`:

```ts
/**
 * Regras puras das empresas da casca (Fase 2D): escopo, consulta, CNPJ,
 * colunas, nova empresa e o desfecho de remover um contato.
 */
import { z } from "zod";

import { isValidCnpj } from "@/lib/cobranca/documento";
import { formatCnpj, normalizeCnpj } from "@/lib/crm-b2b/normalize";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";

export const ESCOPOS_DE_EMPRESAS = ["todas", "com_nome", "sem_nome"] as const;
export type EscopoDeEmpresas = (typeof ESCOPOS_DE_EMPRESAS)[number];
export const ESCOPO_PADRAO: EscopoDeEmpresas = "com_nome";
export const ROTULO_DO_ESCOPO: Record<EscopoDeEmpresas, string> = {
  todas: "Todas as empresas",
  com_nome: "Com nome",
  sem_nome: "Sem nome",
};

/** Acima disso a Clint mostra "Refine a busca…". */
export const CONTAGEM_MAXIMA = 10_000;

export const consultaDaListaDeEmpresasSchema = z.object({
  q: z.string().trim().max(200).optional(),
  e: z.enum(ESCOPOS_DE_EMPRESAS).default(ESCOPO_PADRAO),
  p: z.coerce.number().int().min(1).max(1_000_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  f: z.string().max(16384).optional(),
});
export type ConsultaDaListaDeEmpresas = z.infer<typeof consultaDaListaDeEmpresasSchema>;

/** `00.000.000/0000-00` enquanto digita (a máscara da Clint). */
export function mascaraDeCnpj(texto: string): string {
  const d = texto.replace(/\D/g, "").slice(0, 14);
  const partes = [d.slice(0, 2), d.slice(2, 5), d.slice(5, 8), d.slice(8, 12), d.slice(12, 14)];
  let saida = partes[0];
  if (partes[1]) saida += `.${partes[1]}`;
  if (partes[2]) saida += `.${partes[2]}`;
  if (partes[3]) saida += `/${partes[3]}`;
  if (partes[4]) saida += `-${partes[4]}`;
  return saida;
}

export function lerCnpj(texto: string | null | undefined): { ok: true; normalizado: string | null; formatado: string | null } | { ok: false } {
  const bruto = (texto ?? "").trim();
  if (!bruto) return { ok: true, normalizado: null, formatado: null };
  const normalizado = normalizeCnpj(bruto);
  if (!normalizado || !isValidCnpj(normalizado)) return { ok: false };
  return { ok: true, normalizado, formatado: formatCnpj(normalizado) };
}

export const COLUNAS_NATIVAS_DE_EMPRESAS = ["contato_principal", "segmento", "contatos", "valor_aberto", "negocios"] as const;
export type ColunaNativaDeEmpresa = (typeof COLUNAS_NATIVAS_DE_EMPRESAS)[number];
export const ROTULO_DA_COLUNA_DE_EMPRESA: Record<ColunaNativaDeEmpresa, string> = {
  contato_principal: "Contato principal",
  segmento: "Segmento",
  contatos: "Contatos",
  valor_aberto: "Valor em aberto",
  negocios: "Negócios",
};
/** As cinco nativas na tabela, como a Clint (`U`). */
export const COLUNAS_PADRAO_DE_EMPRESAS = COLUNAS_NATIVAS_DE_EMPRESAS.map((chave) => ({ tipo: "nativa" as const, chave }));
/** Campos do catálogo que já são colunas nativas e não aparecem em "Campos da empresa" (Clint `ea`). */
export const CAMPOS_QUE_SAO_COLUNAS = new Set(["nome", "segmento"]);

export const novaEmpresaSchema = z.object({
  nome: z.string().trim().min(1).max(200),
  cnpj: z.string().trim().max(32).optional(),
  site: z.string().trim().max(300).optional(),
  contato_id: z.string().uuid(),
});
export type NovaEmpresa = z.infer<typeof novaEmpresaSchema>;

export type DesfechoDaRemocao = "simples" | "escolher_principal" | "ultimo";

export function desfechoDaRemocao(contatos: ReadonlyArray<{ id: string; principal: boolean }>, contatoId: string): DesfechoDaRemocao {
  const outros = contatos.filter((c) => c.id !== contatoId);
  if (outros.length === 0) return "ultimo";
  const alvo = contatos.find((c) => c.id === contatoId);
  return alvo?.principal ? "escolher_principal" : "simples";
}

/** Campo fixo da empresa → coluna de `companies`. */
export const COLUNA_DO_CAMPO_FIXO: Record<string, "trade_name" | "city" | "state" | "cnpj"> = {
  nome: "trade_name",
  cidade: "city",
  estado: "state",
  cnpj: "cnpj",
};

export function iniciaisDaEmpresa(nome: string): string {
  const palavras = nome.trim().split(/\s+/).filter(Boolean);
  if (palavras.length === 0) return "?";
  const primeira = palavras[0][0] ?? "";
  const ultima = palavras.length > 1 ? (palavras[palavras.length - 1][0] ?? "") : "";
  return `${primeira}${ultima}`.toUpperCase();
}
```

Confira antes de rodar: `POR_PAGINA` e `POR_PAGINA_PADRAO` são exportados de `lib/escale/contatos/regras.ts` (2A); o `isValidCnpj` recusa CNPJ de dígitos repetidos (se aceitar, o teste do `"11111111111111"` pega pelo `normalizeCnpj`, que já recusa repetidos).

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-empresas-regras.test.ts
git add lib/escale/empresas/regras.ts tests/unit/escale-empresas-regras.test.ts docs/superpowers/plans/2026-10-18-fase-2d-empresas.md
git commit -m "feat(escale): regras puras das empresas — escopo, CNPJ, colunas e remoção (Fase 2D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 2: Migration 9105 — módulo ligado, principal único, funções e a lista

**Files:**
- Create: `supabase/migrations/20261105120000_9105_empresas.sql`, `tests/unit/escale-empresas-migration.test.ts`, `tests/invariants/escale-empresas.test.ts`
- Modify: `supabase/baseline.sql` (bloco depois do da 9104)

**Interfaces:**
- Produces (todas `security definer`, fechadas a `public, anon, authenticated`, abertas ao `service_role`):
  - `fn_escale_pessoa_do_contato(p_org uuid, p_contato uuid) returns uuid` (cria a pessoa se faltar);
  - `fn_escale_criar_empresa(p_org uuid, p_autor uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text, p_site text, p_contato uuid) returns uuid`;
  - `fn_escale_vincular_contato_a_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_principal boolean) returns void`;
  - `fn_escale_desvincular_contato_da_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_novo_principal uuid) returns text` (`removido` | `empresa_excluida`; `raise 'escolha_o_principal'` se faltar);
  - `fn_escale_tornar_principal(p_org uuid, p_empresa uuid, p_contato uuid) returns void` (`p_contato` nulo tira o principal);
  - `fn_escale_excluir_empresa(p_org uuid, p_empresa uuid) returns void`.
- Produces (invoker, `authenticated` e `service_role`):
  - `fn_escale_empresa_passa(p_empresa public.companies, p_cond jsonb) returns boolean`;
  - `fn_escale_grupo_da_empresa_passa(p_empresa public.companies, p_grupo jsonb) returns boolean`;
  - `fn_escale_lista_de_empresas(p_org uuid, p_escopo text, p_padrao text, p_digitos text, p_filtros jsonb, p_limite integer, p_deslocamento integer) returns table (company_id uuid, total bigint, contatos integer, negocios integer, negocio_unico uuid, valor_aberto_cents bigint, principal uuid)`;
  - `fn_escale_contato_passa` e `fn_escale_contatos_do_filtro` (mesma assinatura da 9102) recriadas com a empresa.
- Índice `uq_company_people_um_principal` em `company_people (company_id) where is_primary`.

- [ ] **Step 1: O teste de forma (vai falhar)**

Create `tests/unit/escale-empresas-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261105120000_9105_empresas.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

const DEFINER = [
  "fn_escale_pessoa_do_contato(uuid, uuid)",
  "fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid)",
  "fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean)",
  "fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid)",
  "fn_escale_tornar_principal(uuid, uuid, uuid)",
  "fn_escale_excluir_empresa(uuid, uuid)",
];
const INVOKER = [
  "fn_escale_empresa_passa(public.companies, jsonb)",
  "fn_escale_grupo_da_empresa_passa(public.companies, jsonb)",
  "fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer)",
];

describe("migration 9105 (empresas)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("liga o módulo e garante um principal por empresa", () => {
    expect(MIGRATION).toContain("'MODULO_CRM_B2B', 'ligado'");
    expect(MIGRATION).toContain("create unique index if not exists uq_company_people_um_principal");
  });

  it("as definer ficam fechadas ao authenticated e abertas ao service_role", () => {
    for (const f of DEFINER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security definer`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon, authenticated;`);
      expect(MIGRATION).toContain(`grant execute on function public.${f} to service_role;`);
    }
  });

  it("as invoker ficam fechadas ao anon", () => {
    for (const f of INVOKER) {
      const nome = f.split("(")[0];
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toContain(`revoke all on function public.${f} from public, anon;`);
    }
  });

  it("recria as duas funções da 9102 com a empresa", () => {
    expect(MIGRATION).toMatch(/create or replace function public\.fn_escale_contato_passa[\s\S]*?when 'empresa'/);
    expect(MIGRATION).toMatch(/create or replace function public\.fn_escale_contatos_do_filtro[\s\S]*?co\.trade_name ~\* p_padrao/);
  });

  it("o baseline traz o mesmo bloco, depois do da 9104 e antes da 0323", () => {
    const i9104 = BASELINE.indexOf("FORK ESCALE · campos por objeto (migration 9104)");
    const i9105 = BASELINE.indexOf("FORK ESCALE · empresas da casca (migration 9105)");
    const i0323 = BASELINE.indexOf("-- ---- marcadores do contato no filtro de conversas (migration 0323) ----");
    expect(i9104).toBeGreaterThan(-1);
    expect(i9105).toBeGreaterThan(i9104);
    expect(i0323).toBeGreaterThan(i9105);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-empresas-migration.test.ts`
Expected: FAIL.

- [ ] **Step 2: A migration**

Create `supabase/migrations/20261105120000_9105_empresas.sql` (a primeira linha é uma só):

```sql
-- manifest: **Empresas da casca (fork Escale, Fase 2D).** Liga o módulo `crm_b2b` na instalação (`platform_config MODULO_CRM_B2B = ligado`), um contato principal por empresa (`uq_company_people_um_principal`), as escritas da casca em `people`/`company_people`/`companies` por funções definer fechadas ao `service_role` (`fn_escale_pessoa_do_contato`, `fn_escale_criar_empresa`, `fn_escale_vincular_contato_a_empresa`, `fn_escale_desvincular_contato_da_empresa`, `fn_escale_tornar_principal`, `fn_escale_excluir_empresa`), a lista invoker `fn_escale_lista_de_empresas` (página, total, contatos, negócios e valor em aberto com a RLS de quem olha), o filtro por campos da empresa (`fn_escale_empresa_passa`, `fn_escale_grupo_da_empresa_passa`) e as funções da 9102 `fn_escale_contato_passa` (alvo `empresa`) e `fn_escale_contatos_do_filtro` (busca pelo nome da empresa) recriadas.
-- 9105: empresas da casca (fork Escale, Frente B).

-- ── 1. O módulo B2B ligado para todos (E1) ───────────────────────────────────
insert into public.platform_config (chave, valor, eh_segredo, semeado_do_env)
values ('MODULO_CRM_B2B', 'ligado', false, false)
on conflict (chave) do update set valor = 'ligado';

-- ── 2. Um contato principal por empresa ──────────────────────────────────────
-- Antes do índice, deixa só o vínculo principal mais antigo de cada empresa.
update public.company_people cp
   set is_primary = false
 where cp.is_primary
   and exists (
     select 1 from public.company_people o
      where o.company_id = cp.company_id and o.is_primary
        and (o.created_at, o.id) < (cp.created_at, cp.id));
create unique index if not exists uq_company_people_um_principal
  on public.company_people (company_id) where is_primary;

-- ── 3. A pessoa do contato (a casca não a mostra) ────────────────────────────
create or replace function public.fn_escale_pessoa_do_contato(p_org uuid, p_contato uuid)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_nome text;
begin
  select c.person_id, coalesce(nullif(btrim(c.name), ''), nullif(btrim(c.display_name), ''), c.phone_number, c.email, 'Contato')
    into v_pessoa, v_nome
    from public.contacts c
   where c.id = p_contato and c.organization_id = p_org and c.is_merged_into is null
   for update;
  if not found then
    raise exception 'contato_nao_encontrado' using errcode = 'P0002';
  end if;
  if v_pessoa is not null then
    return v_pessoa;
  end if;
  insert into public.people (organization_id, full_name)
  values (p_org, v_nome)
  returning id into v_pessoa;
  update public.contacts set person_id = v_pessoa where id = p_contato and organization_id = p_org;
  return v_pessoa;
end;
$$;

-- ── 4. Vincular (uma empresa por contato na casca, N4) ───────────────────────
create or replace function public.fn_escale_vincular_contato_a_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_principal boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_tem_principal boolean;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  v_pessoa := public.fn_escale_pessoa_do_contato(p_org, p_contato);

  -- Sai das outras empresas (a casca mostra uma só).
  delete from public.company_people
   where organization_id = p_org and person_id = v_pessoa and company_id <> p_empresa;

  insert into public.company_people (organization_id, company_id, person_id, is_primary)
  values (p_org, p_empresa, v_pessoa, false)
  on conflict (company_id, person_id) do nothing;

  select exists (select 1 from public.company_people where company_id = p_empresa and is_primary)
    into v_tem_principal;
  if p_principal or not v_tem_principal then
    update public.company_people set is_primary = false where company_id = p_empresa and is_primary and person_id <> v_pessoa;
    update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_pessoa;
  end if;
  update public.companies set updated_at = now() where id = p_empresa;
end;
$$;

-- ── 5. Criar (passo Empresa + passo Contato) ─────────────────────────────────
create or replace function public.fn_escale_criar_empresa(
  p_org uuid, p_autor uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text, p_site text, p_contato uuid
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_id uuid;
begin
  if nullif(btrim(p_nome), '') is null then
    raise exception 'nome_obrigatorio' using errcode = '22023';
  end if;
  insert into public.companies (organization_id, trade_name, cnpj, normalized_cnpj, created_by, custom_fields)
  values (
    p_org, btrim(p_nome), nullif(p_cnpj, ''), nullif(p_cnpj_normalizado, ''), p_autor,
    case when nullif(btrim(p_site), '') is null then '{}'::jsonb else jsonb_build_object('site', btrim(p_site)) end
  )
  returning id into v_id;
  perform public.fn_escale_vincular_contato_a_empresa(p_org, p_contato, v_id, true);
  return v_id;
end;
$$;

-- ── 6. Remover da empresa (N7) ───────────────────────────────────────────────
create or replace function public.fn_escale_desvincular_contato_da_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_novo_principal uuid)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
  v_era_principal boolean;
  v_restam integer;
  v_novo_pessoa uuid;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  select c.person_id into v_pessoa from public.contacts c where c.id = p_contato and c.organization_id = p_org;
  select cp.is_primary into v_era_principal
    from public.company_people cp where cp.company_id = p_empresa and cp.person_id = v_pessoa;
  if not found then
    raise exception 'contato_fora_da_empresa' using errcode = 'P0002';
  end if;

  select count(*) into v_restam from public.company_people where company_id = p_empresa and person_id <> v_pessoa;
  if v_restam = 0 then
    delete from public.companies where id = p_empresa and organization_id = p_org;
    return 'empresa_excluida';
  end if;

  if v_era_principal then
    select c.person_id into v_novo_pessoa
      from public.contacts c
      join public.company_people cp on cp.person_id = c.person_id and cp.company_id = p_empresa
     where c.id = p_novo_principal and c.organization_id = p_org and c.person_id <> v_pessoa;
    if v_novo_pessoa is null then
      raise exception 'escolha_o_principal' using errcode = '22023';
    end if;
  end if;

  delete from public.company_people where company_id = p_empresa and person_id = v_pessoa;
  if v_era_principal then
    update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_novo_pessoa;
  end if;
  update public.companies set updated_at = now() where id = p_empresa;
  return 'removido';
end;
$$;

-- ── 7. Trocar ou tirar o principal ───────────────────────────────────────────
create or replace function public.fn_escale_tornar_principal(p_org uuid, p_empresa uuid, p_contato uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_pessoa uuid;
begin
  perform 1 from public.companies where id = p_empresa and organization_id = p_org for update;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
  update public.company_people set is_primary = false where company_id = p_empresa and is_primary;
  if p_contato is null then
    return;
  end if;
  select c.person_id into v_pessoa from public.contacts c where c.id = p_contato and c.organization_id = p_org;
  update public.company_people set is_primary = true where company_id = p_empresa and person_id = v_pessoa;
  if not found then
    raise exception 'contato_fora_da_empresa' using errcode = 'P0002';
  end if;
end;
$$;

-- ── 8. Excluir mantendo os contatos (E6, N8) ─────────────────────────────────
create or replace function public.fn_escale_excluir_empresa(p_org uuid, p_empresa uuid)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  delete from public.companies where id = p_empresa and organization_id = p_org;
  if not found then
    raise exception 'empresa_nao_encontrada' using errcode = 'P0002';
  end if;
end;
$$;

revoke all on function public.fn_escale_pessoa_do_contato(uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean) from public, anon, authenticated;
revoke all on function public.fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_tornar_principal(uuid, uuid, uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_excluir_empresa(uuid, uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_pessoa_do_contato(uuid, uuid) to service_role;
grant execute on function public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid) to service_role;
grant execute on function public.fn_escale_vincular_contato_a_empresa(uuid, uuid, uuid, boolean) to service_role;
grant execute on function public.fn_escale_desvincular_contato_da_empresa(uuid, uuid, uuid, uuid) to service_role;
grant execute on function public.fn_escale_tornar_principal(uuid, uuid, uuid) to service_role;
grant execute on function public.fn_escale_excluir_empresa(uuid, uuid) to service_role;

-- ── 9. O filtro por campos da empresa ────────────────────────────────────────
create or replace function public.fn_escale_empresa_passa(p_empresa public.companies, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.fn_escale_passa_condicao(
    case p_cond ->> 'chave'
      when 'nome' then to_jsonb(coalesce(nullif(btrim((p_empresa).trade_name), ''), (p_empresa).legal_name))
      when 'cidade' then to_jsonb((p_empresa).city)
      when 'estado' then to_jsonb((p_empresa).state)
      when 'cnpj' then to_jsonb((p_empresa).cnpj)
      else (p_empresa).custom_fields -> (p_cond ->> 'chave')
    end,
    p_cond)
$$;

create or replace function public.fn_escale_grupo_da_empresa_passa(p_empresa public.companies, p_grupo jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when coalesce(p_grupo ->> 'modo', 'e') = 'ou'
    then exists (select 1 from jsonb_array_elements(p_grupo -> 'condicoes') c where public.fn_escale_empresa_passa(p_empresa, c))
    else not exists (select 1 from jsonb_array_elements(p_grupo -> 'condicoes') c where not public.fn_escale_empresa_passa(p_empresa, c))
  end
$$;

-- ── 10. A lista de empresas (invoker) ────────────────────────────────────────
create or replace function public.fn_escale_lista_de_empresas(
  p_org uuid,
  p_escopo text,
  p_padrao text,
  p_digitos text,
  p_filtros jsonb,
  p_limite integer,
  p_deslocamento integer
)
returns table (company_id uuid, total bigint, contatos integer, negocios integer, negocio_unico uuid, valor_aberto_cents bigint, principal uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with moeda as (select currency from public.organizations where id = p_org),
  filtradas as (
    select co.id, co.updated_at
      from public.companies co
     where co.organization_id = p_org
       and (case p_escopo
              when 'com_nome' then coalesce(nullif(btrim(co.trade_name), ''), nullif(btrim(co.legal_name), '')) is not null
              when 'sem_nome' then coalesce(nullif(btrim(co.trade_name), ''), nullif(btrim(co.legal_name), '')) is null
              else true end)
       and ((p_padrao is null and p_digitos is null)
            or (p_padrao is not null and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao))
            or (p_digitos is not null and co.normalized_cnpj like '%' || p_digitos || '%'))
       and (p_filtros -> 'campos' is null or (
              case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
                then exists (select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g where public.fn_escale_grupo_da_empresa_passa(co, g))
                else not exists (select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g where not public.fn_escale_grupo_da_empresa_passa(co, g))
              end))
  ),
  pagina as (
    select f.id, f.updated_at, count(*) over () as total
      from filtradas f
     order by f.updated_at desc, f.id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
         pg.total,
         coalesce(k.contatos, 0),
         coalesce(n.negocios, 0),
         case when n.negocios = 1 then n.unico end,
         coalesce(n.valor, 0),
         k.principal
    from pagina pg
    left join lateral (
      select count(*)::integer as contatos,
             (array_agg(c.id order by cp.is_primary desc, cp.created_at) filter (where cp.is_primary))[1] as principal
        from public.company_people cp
        join public.contacts c on c.person_id = cp.person_id and c.organization_id = p_org and c.is_merged_into is null
       where cp.company_id = pg.id
    ) k on true
    left join lateral (
      select count(*)::integer as negocios,
             min(l.id::text)::uuid as unico,
             sum(l.value_cents) filter (where l.status = 'open' and coalesce(l.currency, (select currency from moeda)) = (select currency from moeda))::bigint as valor
        from public.company_people cp
        join public.contacts c on c.person_id = cp.person_id and c.organization_id = p_org and c.is_merged_into is null
        join public.crm_leads l on l.contact_id = c.id and l.organization_id = p_org
        join public.crm_pipelines p on p.id = l.pipeline_id and not p.is_archived
       where cp.company_id = pg.id
    ) n on true
   order by pg.updated_at desc, pg.id desc
$$;

-- ── 11. As duas da 9102, agora com a empresa ─────────────────────────────────
create or replace function public.fn_escale_contato_passa(p_contato public.contacts, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case p_cond ->> 'alvo'
    when 'contato' then
      public.fn_escale_passa_condicao(
        case p_cond ->> 'chave'
          when 'nome' then to_jsonb(coalesce((p_contato).name, (p_contato).display_name))
          when 'email' then to_jsonb((p_contato).email)
          when 'telefone' then to_jsonb((p_contato).phone_number)
          when 'nascimento' then to_jsonb((p_contato).birthdate::text)
          else (p_contato).custom_fields -> (p_cond ->> 'chave')
        end,
        p_cond)
    when 'empresa' then
      case when p_cond ->> 'op' = 'vazio' then
        not exists (
          select 1 from public.company_people cp
            join public.companies co on co.id = cp.company_id
           where cp.person_id = (p_contato).person_id and cp.organization_id = (p_contato).organization_id
             and not public.fn_escale_empresa_passa(co, p_cond))
      else exists (
          select 1 from public.company_people cp
            join public.companies co on co.id = cp.company_id
           where cp.person_id = (p_contato).person_id and cp.organization_id = (p_contato).organization_id
             and public.fn_escale_empresa_passa(co, p_cond))
      end
    else exists (
      select 1
        from public.crm_leads l
        join public.crm_pipelines p on p.id = l.pipeline_id
       where l.contact_id = (p_contato).id
         and l.organization_id = (p_contato).organization_id
         and not p.is_archived
         and public.fn_escale_passa_condicao(
               case when p_cond ->> 'chave' = 'valor'
                 then to_jsonb(l.value_cents / 100.0)
                 else l.custom_fields -> (p_cond ->> 'chave') end,
               p_cond))
  end
$$;

create or replace function public.fn_escale_contatos_do_filtro(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb
)
returns table (contact_id uuid, last_activity_at timestamptz)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select c.id, c.last_activity_at
    from public.contacts c
   where c.organization_id = p_org
     and c.kind = 'person'
     and c.is_merged_into is null
     and c.is_personal = (p_visao = 'pessoais')
     -- a busca: a mesma da 9101, mais o nome da empresa (2D)
     and (
       (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
       or (p_padrao is not null and (
            c.name ~* p_padrao
            or c.display_name ~* p_padrao
            or c.email ~* p_padrao
            or c.phone_number ~* p_padrao
            or (c.custom_fields ->> 'link_instagram') ~* p_padrao
            or (c.person_id is not null and exists (
                 select 1 from public.company_people cp
                   join public.companies co on co.id = cp.company_id
                  where cp.person_id = c.person_id and cp.organization_id = c.organization_id
                    and (co.trade_name ~* p_padrao or co.legal_name ~* p_padrao)))))
       or exists (
            select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
             where c.phone_number like '%' || d || '%')
       or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
     )
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
       or (p_visao = 'sem_negocio' and not exists (
            select 1
              from public.crm_leads l
              join public.crm_pipelines p on p.id = l.pipeline_id
             where l.contact_id = c.id
               and l.organization_id = c.organization_id
               and not p.is_archived))
     )
     -- Contato › Data de criação (no fuso da organização)
     and (p_filtros ->> 'criado_de' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date >= (p_filtros ->> 'criado_de')::date)
     and (p_filtros ->> 'criado_ate' is null
          or (c.created_at at time zone (p_filtros ->> 'fuso'))::date <= (p_filtros ->> 'criado_ate')::date)
     -- Contato › Telefone
     and (case p_filtros ->> 'telefone'
            when 'com' then c.phone_number is not null
            when 'sem' then c.phone_number is null
            when 'internacional' then c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55'
            when 'invalido' then c.phone_number is not null
              and c.phone_number !~ '^\+55[1-9][0-9](9[0-9]{8}|[2-8][0-9]{7})$'
              and not (c.phone_number ~ '^\+[1-9][0-9]{7,14}$' and c.phone_number !~ '^\+55')
            else true
          end)
     -- Negócio
     and (p_filtros -> 'negocio' is null or public.fn_escale_negocio_passa(c, p_filtros -> 'negocio'))
     -- Tags: grupos E/OU, sem caixa (5b)
     and (p_filtros -> 'tags' is null or public.fn_escale_tags_passam(c.tags, p_filtros -> 'tags'))
     -- Campos: grupos combinados por E ou OU
     and (p_filtros -> 'campos' is null or (
            case when coalesce(p_filtros #>> '{campos,combinar}', 'ou') = 'ou'
              then exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where public.fn_escale_grupo_passa(c, g))
              else not exists (
                select 1 from jsonb_array_elements(p_filtros #> '{campos,grupos}') g
                 where not public.fn_escale_grupo_passa(c, g))
            end))
$$;

revoke all on function public.fn_escale_empresa_passa(public.companies, jsonb) from public, anon;
revoke all on function public.fn_escale_grupo_da_empresa_passa(public.companies, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) from public, anon;
grant execute on function public.fn_escale_empresa_passa(public.companies, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_grupo_da_empresa_passa(public.companies, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) to authenticated, service_role;

comment on function public.fn_escale_lista_de_empresas(uuid, text, text, text, jsonb, integer, integer) is
  'Fork Escale (9105): uma página da lista de empresas da casca, com o total, os contatos, os negócios e o valor em aberto que quem olha enxerga. Invoker.';

do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;
notify pgrst, 'reload schema';
```

Confira antes de rodar: (a) compare o corpo da `fn_escale_contatos_do_filtro` acima com o da 9102 (L317–400) linha a linha: a única diferença permitida é o `or (c.person_id is not null and exists (...))` da busca; se a 9102 na `main` tiver mudado depois deste plano (outra fase), parta do corpo da `main` e acrescente só esse trecho; (b) a `fn_escale_contato_passa` idem, com o ramo `when 'empresa'` a mais; (c) se `company_people` não tiver `created_at` (a 0448 tem), troque a ordem por `id`; (d) a coluna `crm_leads.status` usa `'open'` para aberto (confira em `lib/types/leads.ts`).

Cole o mesmo conteúdo em `supabase/baseline.sql` logo depois do bloco da 9104, precedido de:

```sql
-- ---- FORK ESCALE · empresas da casca (migration 9105) ----
```

- [ ] **Step 3: A prova no banco**

Create `tests/invariants/escale-empresas.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_AGENT_B, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, lastLine, seedGov, sql } from "./gov-helpers";

/**
 * EMPRESAS DA CASCA (fork Escale, migration 9105) — prova contra Postgres real:
 * módulo ligado, um principal por empresa, as definer fechadas e o que fazem
 * (criar, vincular tirando das outras, remover com o novo principal, último
 * contato exclui a empresa, excluir mantém os contatos), a lista com contatos,
 * negócios e valor em aberto pela RLS de quem olha, e a empresa na busca e no
 * filtro da lista de contatos. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9105-4000-8000-0000000000a1";
const S = "e5ca1e00-9105-4000-8000-0000000000a2";
const C1 = "e5ca1e00-9105-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9105-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9105-4000-8000-0000000000c3";

const svc = (q: string) => lastLine(sql(`set role service_role; ${q}`));
const empresaDe = (contato: string) =>
  lastLine(sql(`select cp.company_id from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${contato}'`));

let E1 = "";

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where id::text like 'e5ca1e00-9105-%';
    delete from public.companies where organization_id = '${GOV_ORG}' and trade_name like 'Atlas%';
    delete from public.contacts where id::text like 'e5ca1e00-9105-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9105-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9105-%';
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${P}', '${GOV_ORG}', 'Empresas 2D', 'escale-empresas-2d');
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values ('${S}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0);
    insert into public.contacts (id, organization_id, name, phone_number) values
      ('${C1}', '${GOV_ORG}', 'Alex Atlas', '+5553999998393'),
      ('${C2}', '${GOV_ORG}', 'Celise Atlas', '+5516992998777'),
      ('${C3}', '${GOV_ORG}', 'Davi Fora', '+5511987654321');
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id, value_cents, status) values
      ('e5ca1e00-9105-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S}', 'Do Alex', '${C1}', '${GOV_AGENT_A}', 150000, 'open'),
      ('e5ca1e00-9105-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S}', 'Da Celise', '${C2}', '${GOV_AGENT_B}', 50000, 'open');
  `);
  E1 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Distribuidora', '11.222.333/0001-81', '11222333000181', 'atlas.com.br', '${C1}')`);
  svc(`select public.fn_escale_vincular_contato_a_empresa('${GOV_ORG}', '${C2}', '${E1}', false)`);
});

describe("módulo e travas", () => {
  it("MODULO_CRM_B2B ligado", () => {
    expect(lastLine(sql(`select valor from public.platform_config where chave = 'MODULO_CRM_B2B'`))).toBe("ligado");
  });

  it("as definer não abrem para o authenticated", () => {
    expect(lastLine(sql(`select has_function_privilege('authenticated', 'public.fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid)', 'execute')`))).toBe("f");
  });

  it("um principal por empresa", () => {
    expect(() => sql(`update public.company_people set is_primary = true where company_id = '${E1}'`)).toThrow(/uq_company_people_um_principal/);
  });
});

describe("criar e vincular", () => {
  it("cria com o site no custom_fields, o CNPJ formatado e o contato principal", () => {
    expect(lastLine(sql(`select custom_fields->>'site' || '|' || cnpj || '|' || normalized_cnpj from public.companies where id = '${E1}'`))).toBe(
      "atlas.com.br|11.222.333/0001-81|11222333000181",
    );
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C1}'`))).toBe("t");
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C2}'`))).toBe("f");
  });

  it("vincular a outra empresa tira da primeira", () => {
    const E2 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Filial', '', '', '', '${C3}')`);
    svc(`select public.fn_escale_vincular_contato_a_empresa('${GOV_ORG}', '${C3}', '${E1}', false)`);
    expect(empresaDe(C3)).toBe(E1);
    expect(lastLine(sql(`select count(*) from public.companies where id = '${E2}'`))).toBe("1");
  });
});

describe("a lista com a RLS de quem olha", () => {
  const lista = `select contatos || '|' || negocios || '|' || valor_aberto_cents from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'com_nome', 'Atlas Distribuidora', null, '{}'::jsonb, 10, 0)`;
  it("gerente vê os 3 contatos, os 2 negócios e R$ 2.000,00", () => {
    expect(lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_MANAGER}"}', false); ${lista}`))).toBe("3|2|200000");
  });
  it("o agente A só soma o negócio que enxerga", () => {
    expect(lastLine(sql(`set role authenticated; select set_config('request.jwt.claims', '{"sub":"${GOV_AGENT_A}"}', false); ${lista}`))).toBe("3|1|150000");
  });
  it("busca pelo CNPJ e escopo sem nome", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'todas', null, '222333', '{}'::jsonb, 10, 0)`)).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'sem_nome', 'Atlas', null, '{}'::jsonb, 10, 0)`)).toBe(0);
  });
  it("filtro por campo da empresa", () => {
    const f = `'{"campos":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"alvo":"empresa","chave":"site","tipo":"texto","op":"contem","valor":"atlas","padrao":"atlas"}]}]}}'::jsonb`;
    expect(countAs(GOV_VIEWER, `select count(*) from public.fn_escale_lista_de_empresas('${GOV_ORG}', 'todas', null, null, ${f}, 10, 0)`)).toBe(1);
  });
});

describe("a empresa na lista de contatos", () => {
  it("a busca pelo nome da empresa acha os contatos dela", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', 'distribuidora', null, null, '{}'::jsonb)`)).toBe(3);
  });
  it("o filtro com alvo empresa", () => {
    const f = `'{"fuso":"America/Sao_Paulo","campos":{"combinar":"ou","grupos":[{"modo":"e","condicoes":[{"alvo":"empresa","chave":"nome","tipo":"texto","op":"contem","valor":"Atlas","padrao":"atlas"}]}]}}'::jsonb`;
    expect(countAs(GOV_MANAGER, `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', null, null, null, ${f}) where contact_id::text like 'e5ca1e00-9105-%'`)).toBe(3);
  });
});

describe("remover e excluir", () => {
  it("remover o principal exige o novo; com ele, troca", () => {
    expect(() => svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E1}', null)`)).toThrow(/escolha_o_principal/);
    expect(svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E1}', '${C2}')`)).toBe("removido");
    expect(lastLine(sql(`select cp.is_primary from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C2}'`))).toBe("t");
  });

  it("excluir mantém os contatos e as pessoas", () => {
    svc(`select public.fn_escale_excluir_empresa('${GOV_ORG}', '${E1}')`);
    expect(lastLine(sql(`select count(*) from public.contacts where id in ('${C2}', '${C3}')`))).toBe("2");
    expect(lastLine(sql(`select count(*) from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id in ('${C2}', '${C3}')`))).toBe("0");
  });

  it("remover o último contato exclui a empresa", () => {
    const E3 = svc(`select public.fn_escale_criar_empresa('${GOV_ORG}', '${GOV_MANAGER}', 'Atlas Sozinha', '', '', '', '${C1}')`);
    expect(svc(`select public.fn_escale_desvincular_contato_da_empresa('${GOV_ORG}', '${C1}', '${E3}', null)`)).toBe("empresa_excluida");
    expect(lastLine(sql(`select count(*) from public.companies where id = '${E3}'`))).toBe("0");
  });
});
```

Confira antes de rodar: `GOV_AGENT_A` enxerga negócio de outro dono? A RLS do original para agente é "os seus e os sem dono" (2A Q2): o negócio da Celise é do agente B, então o A vê 1. Se a regra de visualização da organização na base de teste for "todos", ajuste o esperado para `3|2|200000` e troque a prova do agente A por uma origem com `escale_visualizacao = 'proprios'` (1J).

Run (Docker aberto): `corepack pnpm test:db tests/invariants/escale-empresas.test.ts tests/invariants/escale-filtros-de-contatos.test.ts tests/invariants/escale-lista-de-contatos.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts tests/invariants/hardening-definer-varredura.test.ts tests/invariants/rls-completude-varredura.test.ts`
Expected: tudo PASS (os testes da 9102 continuam verdes com as funções recriadas).

- [ ] **Step 4: Forma e commit**

```bash
corepack pnpm vitest run tests/unit/escale-empresas-migration.test.ts tests/unit/escale-filtros-de-contatos-migration.test.ts tests/unit/manifest-x-migrations.test.ts
git add supabase/migrations/20261105120000_9105_empresas.sql supabase/baseline.sql tests/unit/escale-empresas-migration.test.ts tests/invariants/escale-empresas.test.ts
git commit -m "feat(escale): migration 9105 — módulo de empresas ligado, vínculo pela casca, lista de empresas e a empresa no filtro de contatos (Fase 2D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: `banco.ts`, a lista e o "Nova empresa" no servidor

**Files:**
- Create: `lib/escale/empresas/banco.ts`, `app/api/v1/empresas/route.ts`, `tests/unit/escale-empresas-rotas.test.ts`
- Modify: `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `consultaDaListaDeEmpresasSchema`, `novaEmpresaSchema`, `lerCnpj`, `COLUNA_DO_CAMPO_FIXO` (Task 1); `padraoRegexDeBusca` (`lib/contacts/busca-regex.ts`), `filtrosDaConsulta` e `fusoDaOrganizacao` (`lib/escale/contatos/lista.ts`), `compilarFiltros` (`lib/escale/contatos/compilar-filtros.ts`).
- Produces (`lib/escale/empresas/banco.ts`):
  - `interface PrincipalDaEmpresa { id: string; nome: string; telefone: string | null; tem_foto: boolean; conversa_id: string | null }`;
  - `interface LinhaDeEmpresa { id: string; nome: string; cnpj: string | null; campos: Record<string, unknown>; contatos: number; negocios: number; negocio_unico: string | null; valor_aberto: number; principal: PrincipalDaEmpresa | null }`;
  - `interface PaginaDeEmpresas { linhas: LinhaDeEmpresa[]; total: number; pagina: number; porPagina: number; moeda: string }`;
  - `listarEmpresas(sb, orgId, consulta: ConsultaDaListaDeEmpresas): Promise<PaginaDeEmpresas>`;
  - `moedaDaOrganizacaoDe(sb, orgId): Promise<string>`;
  - `criarEmpresa(admin, orgId, autor, entrada: NovaEmpresa): Promise<string>` (lança `ErroDaEmpresa("cnpj_invalido" | "cnpj_repetido" | "contato_nao_encontrado")`);
  - `class ErroDaEmpresa extends Error { codigo }` e `TEXTO_DO_ERRO_DA_EMPRESA`.
- Rotas: `GET /api/v1/empresas?q&e&p&n&f` (viewer) → `PaginaDeEmpresas`; `POST /api/v1/empresas` (agent) → `201 { id }`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-empresas-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET, POST } from "@/app/api/v1/empresas/route";
import { requireRole } from "@/lib/auth/require-role";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { ORG_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };

function banco(opts: { rpc?: Record<string, Resposta>; tabelas?: Record<string, Resposta> }) {
  const rpc = vi.fn((nome: string) => Promise.resolve(opts.rpc?.[nome] ?? { data: [], error: null }));
  const from = vi.fn((tabela: string) => {
    const r = opts.tabelas?.[tabela] ?? { data: [], error: null };
    const c: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit"]) c[m] = vi.fn(() => c);
    c.maybeSingle = vi.fn().mockResolvedValue(r);
    c.then = (ok: (x: Resposta) => unknown) => Promise.resolve(r).then(ok);
    return c;
  });
  const db = { rpc, from };
  vi.mocked(createClient).mockResolvedValue(db as never);
  vi.mocked(createAdminClient).mockReturnValue(db as never);
  return db;
}

const pedido = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://x"), init as never);
const json = (corpo: unknown) => ({ method: "POST", body: JSON.stringify(corpo), headers: { "content-type": "application/json" } }) as RequestInit;
const CONTATO = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
});

describe("GET /api/v1/empresas", () => {
  it("chama a função com escopo, busca, dígitos do CNPJ e a página; devolve as linhas com o principal", async () => {
    authOk("viewer");
    const db = banco({
      rpc: {
        fn_escale_lista_de_empresas: {
          data: [{ company_id: "e1", total: 3, contatos: 1, negocios: 1, negocio_unico: "l1", valor_aberto_cents: 150050, principal: "c1" }],
          error: null,
        },
      },
      tabelas: {
        organizations: { data: { currency: "BRL" }, error: null },
        companies: { data: [{ id: "e1", trade_name: "Atlas", legal_name: null, cnpj: null, custom_fields: { segmento: "Varejo" } }], error: null },
        contacts: { data: [{ id: "c1", name: "Alex", display_name: null, phone_number: "+5553999998393", avatar_path: null }], error: null },
        conversations: { data: [], error: null },
      },
    });
    const r = await GET(pedido("/api/v1/empresas?q=11.222&e=todas&p=2&n=25"));
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_lista_de_empresas", expect.objectContaining({
      p_org: ORG_ID, p_escopo: "todas", p_digitos: "11222", p_limite: 25, p_deslocamento: 25,
    }));
    const { data } = await r.json();
    expect(data.total).toBe(3);
    expect(data.moeda).toBe("BRL");
    expect(data.linhas[0]).toMatchObject({ id: "e1", nome: "Atlas", valor_aberto: 1500.5, contatos: 1, negocio_unico: "l1", campos: { segmento: "Varejo" } });
    expect(data.linhas[0].principal).toMatchObject({ id: "c1", nome: "Alex", telefone: "+5553999998393" });
  });

  it("escopo inválido é 422", async () => {
    authOk("viewer");
    banco({});
    expect((await GET(pedido("/api/v1/empresas?e=xyz"))).status).toBe(422);
  });
});

describe("POST /api/v1/empresas", () => {
  it("viewer não cria; atendente cria pela função definer com o CNPJ normalizado", async () => {
    authOk("viewer");
    banco({});
    expect((await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", contato_id: CONTATO })))).status).toBe(403);

    authOk("agent");
    const db = banco({ rpc: { fn_escale_criar_empresa: { data: "e9", error: null } } });
    const r = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-81", site: "atlas.com.br", contato_id: CONTATO })));
    expect(r.status).toBe(201);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_criar_empresa", expect.objectContaining({
      p_nome: "Atlas", p_cnpj: "11.222.333/0001-81", p_cnpj_normalizado: "11222333000181", p_site: "atlas.com.br", p_contato: CONTATO,
    }));
    expect((await r.json()).data).toEqual({ id: "e9" });
  });

  it("CNPJ inválido é 422; repetido é 409 com o texto", async () => {
    authOk("agent");
    banco({});
    const r1 = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-80", contato_id: CONTATO })));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("CNPJ inválido.");
    banco({ rpc: { fn_escale_criar_empresa: { data: null, error: { code: "23505", message: "companies_org_normalized_cnpj_uidx" } } } });
    const r2 = await POST(pedido("/api/v1/empresas", json({ nome: "Atlas", cnpj: "11.222.333/0001-81", contato_id: CONTATO })));
    expect(r2.status).toBe(409);
    expect((await r2.json()).error.message).toBe("CNPJ já cadastrado em outra empresa.");
  });
});
```

Confira antes de rodar: o caminho do `createAdminClient` (`@/lib/supabase/admin`, como o layout de `companies`), o nome da coluna da foto do contato (a 2A usa algo para `tem_foto`: veja `COLUNAS` em `lib/escale/contatos/lista.ts` L138 e use a mesma) e o `authOk` (`tests/helpers/stages-db-double`) para viewer recusado: o duplo do `requireRole` devolve 403 quando o papel pedido é maior? Se não, o teste do viewer usa `vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never)`.

Run: `corepack pnpm vitest run tests/unit/escale-empresas-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 2: `lib/escale/empresas/banco.ts`**

```ts
/**
 * As empresas da casca no banco (Fase 2D). Leituras pela sessão (RLS);
 * escritas pelas funções definer da 9105, chamadas com o service role depois
 * de a rota conferir o papel.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { filtrosDaConsulta, fusoDaOrganizacao } from "@/lib/escale/contatos/lista";

import { type ConsultaDaListaDeEmpresas, type NovaEmpresa, lerCnpj } from "./regras";

type SB = SupabaseClient;

export class ErroDaEmpresa extends Error {
  constructor(
    public readonly codigo:
      | "cnpj_invalido"
      | "cnpj_repetido"
      | "contato_nao_encontrado"
      | "empresa_nao_encontrada"
      | "contato_fora_da_empresa"
      | "escolha_o_principal",
  ) {
    super(codigo);
  }
}

export const TEXTO_DO_ERRO_DA_EMPRESA: Record<ErroDaEmpresa["codigo"], string> = {
  cnpj_invalido: "CNPJ inválido.",
  cnpj_repetido: "CNPJ já cadastrado em outra empresa.",
  contato_nao_encontrado: "Contato não encontrado.",
  empresa_nao_encontrada: "Empresa não encontrada",
  contato_fora_da_empresa: "Este contato não está nesta empresa.",
  escolha_o_principal: "Selecione o novo contato principal.",
};

export const STATUS_DO_ERRO_DA_EMPRESA: Record<ErroDaEmpresa["codigo"], number> = {
  cnpj_invalido: 422,
  cnpj_repetido: 409,
  contato_nao_encontrado: 404,
  empresa_nao_encontrada: 404,
  contato_fora_da_empresa: 422,
  escolha_o_principal: 422,
};

/** Traduz o erro do Postgres (mensagem da 9105 ou 23505) num erro tipado. */
export function erroDaEmpresaDoBanco(error: { code?: string; message: string }): ErroDaEmpresa | null {
  if (error.code === "23505") return new ErroDaEmpresa("cnpj_repetido");
  for (const codigo of ["contato_nao_encontrado", "empresa_nao_encontrada", "contato_fora_da_empresa", "escolha_o_principal"] as const) {
    if (error.message.includes(codigo)) return new ErroDaEmpresa(codigo);
  }
  return null;
}

export interface PrincipalDaEmpresa {
  id: string;
  nome: string;
  telefone: string | null;
  tem_foto: boolean;
  conversa_id: string | null;
}

export interface LinhaDeEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  campos: Record<string, unknown>;
  contatos: number;
  negocios: number;
  negocio_unico: string | null;
  valor_aberto: number;
  principal: PrincipalDaEmpresa | null;
}

export interface PaginaDeEmpresas {
  linhas: LinhaDeEmpresa[];
  total: number;
  pagina: number;
  porPagina: number;
  moeda: string;
}

export const nomeDaEmpresa = (e: { trade_name: string | null; legal_name: string | null }) =>
  (e.trade_name?.trim() || e.legal_name?.trim() || "").trim();

export async function moedaDaOrganizacaoDe(sb: SB, orgId: string): Promise<string> {
  const { data } = await sb.from("organizations").select("currency").eq("id", orgId).maybeSingle();
  return ((data as { currency?: string } | null)?.currency ?? "BRL").toUpperCase();
}

/** Busca: dígitos (≥ 3) procuram no CNPJ; o resto, no nome, pelo padrão do original. */
export function parametrosDaBuscaDeEmpresas(q: string | undefined): { padrao: string | null; digitos: string | null } {
  const termo = (q ?? "").trim();
  if (termo.length < 2) return { padrao: null, digitos: null };
  const digitos = termo.replace(/\D/g, "");
  const soCnpj = /^[\d./-\s]+$/.test(termo);
  return {
    padrao: soCnpj ? null : padraoRegexDeBusca(termo.replace(/[()]/g, "")),
    digitos: digitos.length >= 3 ? digitos : null,
  };
}

interface LinhaDaFuncao {
  company_id: string;
  total: number;
  contatos: number;
  negocios: number;
  negocio_unico: string | null;
  valor_aberto_cents: number;
  principal: string | null;
}

export async function listarEmpresas(sb: SB, orgId: string, consulta: ConsultaDaListaDeEmpresas): Promise<PaginaDeEmpresas> {
  const { padrao, digitos } = parametrosDaBuscaDeEmpresas(consulta.q);
  const filtro = filtrosDaConsulta({ f: consulta.f });
  const fuso = filtro ? await fusoDaOrganizacao(sb, orgId) : "America/Sao_Paulo";
  const moeda = await moedaDaOrganizacaoDe(sb, orgId);
  const { data, error } = await sb.rpc("fn_escale_lista_de_empresas", {
    p_org: orgId,
    p_escopo: consulta.e,
    p_padrao: padrao,
    p_digitos: digitos,
    p_filtros: filtro ? compilarFiltros(filtro, fuso) : {},
    p_limite: consulta.n,
    p_deslocamento: (consulta.p - 1) * consulta.n,
  });
  if (error) throw error;
  const pagina = (data ?? []) as LinhaDaFuncao[];
  if (pagina.length === 0) return { linhas: [], total: 0, pagina: consulta.p, porPagina: consulta.n, moeda };

  const ids = pagina.map((l) => l.company_id);
  const principais = pagina.map((l) => l.principal).filter((x): x is string => Boolean(x));
  const [empresas, contatos, conversas] = await Promise.all([
    sb.from("companies").select("id, trade_name, legal_name, cnpj, custom_fields").eq("organization_id", orgId).in("id", ids),
    principais.length
      ? sb.from("contacts").select("id, name, display_name, phone_number, avatar_path").eq("organization_id", orgId).in("id", principais)
      : Promise.resolve({ data: [], error: null }),
    principais.length
      ? sb.from("conversations").select("id, contact_id, last_message_at").eq("organization_id", orgId).in("contact_id", principais).order("last_message_at", { ascending: false })
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (empresas.error) throw empresas.error;
  const porId = new Map(((empresas.data ?? []) as Array<Record<string, unknown>>).map((e) => [String(e.id), e]));
  const contatoPorId = new Map(((contatos.data ?? []) as Array<Record<string, unknown>>).map((c) => [String(c.id), c]));
  const conversaPorContato = new Map<string, string>();
  for (const c of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaPorContato.has(c.contact_id)) conversaPorContato.set(c.contact_id, c.id);
  }

  const linhas = pagina.map((l): LinhaDeEmpresa => {
    const e = porId.get(l.company_id) ?? {};
    const p = l.principal ? contatoPorId.get(l.principal) : undefined;
    return {
      id: l.company_id,
      nome: nomeDaEmpresa(e as { trade_name: string | null; legal_name: string | null }),
      cnpj: (e.cnpj as string | null) ?? null,
      campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
      contatos: l.contatos,
      negocios: l.negocios,
      negocio_unico: l.negocio_unico,
      valor_aberto: Number(l.valor_aberto_cents ?? 0) / 100,
      principal: p
        ? {
            id: String(p.id),
            nome: String(p.name ?? p.display_name ?? p.phone_number ?? ""),
            telefone: (p.phone_number as string | null) ?? null,
            tem_foto: Boolean(p.avatar_path),
            conversa_id: conversaPorContato.get(String(p.id)) ?? null,
          }
        : null,
    };
  });
  return { linhas, total: Number(pagina[0].total), pagina: consulta.p, porPagina: consulta.n, moeda };
}

export async function criarEmpresa(admin: SB, orgId: string, autor: string, entrada: NovaEmpresa): Promise<string> {
  const cnpj = lerCnpj(entrada.cnpj);
  if (!cnpj.ok) throw new ErroDaEmpresa("cnpj_invalido");
  const { data, error } = await admin.rpc("fn_escale_criar_empresa", {
    p_org: orgId,
    p_autor: autor,
    p_nome: entrada.nome.trim(),
    p_cnpj: cnpj.formatado ?? "",
    p_cnpj_normalizado: cnpj.normalizado ?? "",
    p_site: entrada.site?.trim() ?? "",
    p_contato: entrada.contato_id,
  });
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
  return String(data);
}
```

Confira antes de rodar: a coluna da foto (`avatar_path` ou outra) e o select de conversas da 2A (`listarContatos`, L149–224): copie a forma de lá (inclusive se a 2A filtra conversas por `status`).

- [ ] **Step 3: A rota**

Create `app/api/v1/empresas/route.ts`:

```ts
/**
 * GET/POST /api/v1/empresas — a lista de empresas da casca e o "Nova empresa"
 * (fork Escale, Fase 2D; migration 9105). Ver: todo papel. Criar: atendente ou
 * acima (PRD §5), pela função definer com o service role.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaEmpresa, STATUS_DO_ERRO_DA_EMPRESA, TEXTO_DO_ERRO_DA_EMPRESA, criarEmpresa, listarEmpresas } from "@/lib/escale/empresas/banco";
import { consultaDaListaDeEmpresasSchema, novaEmpresaSchema } from "@/lib/escale/empresas/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas";

/** O erro tipado vira a resposta com o texto da Clint; outro erro, null. */
export function respostaDoErroDaEmpresa(err: unknown, t: (s: string) => string, requestId: string): Response | null {
  if (!(err instanceof ErroDaEmpresa)) return null;
  return fail(err.codigo, t(TEXTO_DO_ERRO_DA_EMPRESA[err.codigo]), STATUS_DO_ERRO_DA_EMPRESA[err.codigo], { requestId });
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const consulta = consultaDaListaDeEmpresasSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!consulta.success) return fail("unprocessable_entity", t("Consulta inválida."), 422, { requestId });
  try {
    const pagina = await listarEmpresas(await createClient(), authz.org.orgId, consulta.data);
    return ok(pagina);
  } catch (err) {
    return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "listar" }, t, requestId);
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = novaEmpresaSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Informe o nome da empresa e o contato."), 422, { requestId });
  try {
    const id = await criarEmpresa(createAdminClient(), authz.org.orgId, authz.user.id, lido.data);
    void audit({
      action: "companies.created_by_escale",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "companies",
      resourceId: id,
      requestId,
      metadata: { contato_id: lido.data.contato_id, com_cnpj: Boolean(lido.data.cnpj) },
    });
    return ok({ id }, { status: 201 });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "criar" }, t, requestId);
  }
}
```

Em `lib/audit/actions.ts`, logo depois de `"crm_field_group.deleted",` (2C):

```ts
  // FORK ESCALE · Fase 2D: empresas da casca (migration 9105).
  "companies.created_by_escale", "companies.updated_by_escale", "companies.deleted_by_escale",
  "companies.contact_linked", "companies.contact_unlinked", "companies.primary_changed",
```

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-empresas-rotas.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/empresas app/api/v1/empresas lib/audit/actions.ts
git add lib/escale/empresas/banco.ts app/api/v1/empresas/route.ts lib/audit/actions.ts tests/unit/escale-empresas-rotas.test.ts
git commit -m "feat(escale): rotas da lista de empresas e do Nova empresa (Fase 2D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: A ficha, os contatos, os negócios e a empresa do contato no servidor

**Files:**
- Modify: `lib/escale/empresas/banco.ts` (leituras e escritas da ficha)
- Create: `app/api/v1/empresas/[id]/route.ts`, `app/api/v1/empresas/[id]/contatos/route.ts`, `app/api/v1/empresas/[id]/contatos/[contatoId]/route.ts`, `app/api/v1/empresas/[id]/principal/route.ts`, `app/api/v1/empresas/[id]/negocios/route.ts`, `app/api/v1/contatos/[id]/empresa/route.ts`, `tests/unit/escale-empresa-ficha-rotas.test.ts`

**Interfaces:**
- Produces (`banco.ts`):
  - `interface FichaDaEmpresa { id; nome; cnpj: string | null; cidade: string | null; estado: string | null; campos: Record<string, unknown>; criada_em: string; valor_aberto: number; moeda: string; principal: PrincipalDaEmpresa | null; contatos: number; negocios: number }`;
  - `interface ContatoDaEmpresa { id; nome; telefone: string | null; email: string | null; tags: string[]; tem_foto: boolean; conversa_id: string | null; principal: boolean; negocios: number; negocio_unico: string | null }`;
  - `interface NegocioDaEmpresa { id; titulo; origem: string; etapa: string; status: "open" | "won" | "lost"; valor: number | null; moeda: string | null; contato: string }`;
  - `interface EmpresaDoContato { id; nome; cidade: string | null; estado: string | null; cnpj: string | null; campos: Record<string, unknown>; principal: boolean }`;
  - `lerFichaDaEmpresa(sb, orgId, id)`, `contatosDaEmpresa(sb, orgId, id)`, `negociosDaEmpresa(sb, orgId, id)`, `empresaDoContato(sb, orgId, contatoId)`;
  - `patchDaEmpresaSchema = z.object({ chave: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), valor: z.unknown() })`; `mudarCampoDaEmpresa(sb, orgId, id, patch)` (fixos nas colunas; `cnpj` pelo `lerCnpj`; o resto mescla em `custom_fields`);
  - `vincularContato(admin, orgId, empresaId, contatoId, principal)`, `desvincularContato(admin, orgId, empresaId, contatoId, novoPrincipal): Promise<"removido" | "empresa_excluida">`, `tornarPrincipal(admin, orgId, empresaId, contatoId | null)`, `excluirEmpresa(admin, orgId, empresaId)`;
  - `trocarEmpresaDoContatoSchema`: `{ empresa_id: uuid } | { nova: { nome: string; campos: "manter" | "limpar" } } | { empresa_id: null }`; `trocarEmpresaDoContato(sb, admin, orgId, autor, contatoId, pedido): Promise<EmpresaDoContato | null>`.
- Rotas (todas com `requireRole`; escritas com `requireSupportWrite` e o service role):

| Rota | Método | Papel | Faz |
|---|---|---|---|
| `/api/v1/empresas/[id]` | GET | viewer | `FichaDaEmpresa` (404 "Empresa não encontrada") |
| | PATCH `{chave, valor}` | agent | `mudarCampoDaEmpresa` (sessão; a RLS do original deixa agente atualizar) |
| | DELETE | manager | `excluirEmpresa`; audita `companies.deleted_by_escale` |
| `/api/v1/empresas/[id]/contatos` | GET | viewer | `ContatoDaEmpresa[]` |
| | POST `{contato_id}` | agent | `vincularContato(…, false)`; audita `companies.contact_linked` |
| `/api/v1/empresas/[id]/contatos/[contatoId]` | DELETE `?novo_principal=` | agent | `desvincularContato`; devolve `{ desfecho }`; audita `companies.contact_unlinked` |
| `/api/v1/empresas/[id]/principal` | PUT `{contato_id: uuid \| null}` | agent | `tornarPrincipal`; audita `companies.primary_changed` |
| `/api/v1/empresas/[id]/negocios` | GET | viewer | `NegocioDaEmpresa[]` (RLS) |
| `/api/v1/contatos/[id]/empresa` | GET | viewer | `EmpresaDoContato \| null` |
| | PUT | agent | `trocarEmpresaDoContato`; devolve a empresa nova |

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-empresa-ficha-rotas.test.ts` com o mesmo duplo `banco()` da Task 3 (copie a função), e estes casos:

```ts
import { DELETE as DELETE_EMPRESA, GET as GET_EMPRESA, PATCH as PATCH_EMPRESA } from "@/app/api/v1/empresas/[id]/route";
import { DELETE as REMOVER } from "@/app/api/v1/empresas/[id]/contatos/[contatoId]/route";
import { PUT as PRINCIPAL } from "@/app/api/v1/empresas/[id]/principal/route";
import { PUT as TROCAR } from "@/app/api/v1/contatos/[id]/empresa/route";

const E = "6a1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const C = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const ctx = (p: Record<string, string>) => ({ params: Promise.resolve(p) });
const corpo = (method: string, c: unknown) => ({ method, body: JSON.stringify(c), headers: { "content-type": "application/json" } }) as RequestInit;

describe("ficha da empresa", () => {
  it("GET 404 com o texto da Clint quando a empresa não existe", async () => {
    authOk("viewer");
    banco({ tabelas: { companies: { data: null, error: null } } });
    const r = await GET_EMPRESA(pedido(`/api/v1/empresas/${E}`), ctx({ id: E }));
    expect(r.status).toBe(404);
    expect((await r.json()).error.message).toBe("Empresa não encontrada");
  });

  it("PATCH de campo fixo vai para a coluna; do catálogo, mescla no custom_fields; CNPJ inválido é 422", async () => {
    authOk("agent");
    const atualizacoes: unknown[] = [];
    const db = banco({ tabelas: { companies: { data: { id: E, custom_fields: { site: "a.com" } }, error: null } } });
    db.from.mockImplementation(((t: string) => {
      const c: Record<string, unknown> = {};
      for (const m of ["select", "eq", "in"]) c[m] = vi.fn(() => c);
      c.maybeSingle = vi.fn().mockResolvedValue({ data: { id: E, custom_fields: { site: "a.com" } }, error: null });
      c.update = vi.fn((x: unknown) => { atualizacoes.push({ t, x }); return c; });
      c.then = (ok: (x: unknown) => unknown) => Promise.resolve({ data: null, error: null }).then(ok);
      return c;
    }) as never);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "cidade", valor: "Pelotas" })), ctx({ id: E }))).status).toBe(200);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "segmento", valor: "Varejo" })), ctx({ id: E }))).status).toBe(200);
    expect(atualizacoes).toEqual([
      { t: "companies", x: { city: "Pelotas" } },
      { t: "companies", x: { custom_fields: { site: "a.com", segmento: "Varejo" } } },
    ]);
    expect((await PATCH_EMPRESA(pedido(`/api/v1/empresas/${E}`, corpo("PATCH", { chave: "cnpj", valor: "123" })), ctx({ id: E }))).status).toBe(422);
  });

  it("DELETE só gerente ou acima", async () => {
    vi.mocked(requireRole).mockResolvedValueOnce({ ok: false, response: new Response(null, { status: 403 }) } as never);
    banco({});
    expect((await DELETE_EMPRESA(pedido(`/api/v1/empresas/${E}`, { method: "DELETE" }), ctx({ id: E }))).status).toBe(403);
    expect(vi.mocked(requireRole)).toHaveBeenCalledWith("manager", expect.anything());
  });
});

describe("vínculos", () => {
  it("remover o principal sem o novo é 422 'Selecione o novo contato principal.'; o último devolve empresa_excluida", async () => {
    authOk("agent");
    banco({ rpc: { fn_escale_desvincular_contato_da_empresa: { data: null, error: { message: "escolha_o_principal" } } } });
    const r1 = await REMOVER(pedido(`/api/v1/empresas/${E}/contatos/${C}`, { method: "DELETE" }), ctx({ id: E, contatoId: C }));
    expect(r1.status).toBe(422);
    expect((await r1.json()).error.message).toBe("Selecione o novo contato principal.");
    banco({ rpc: { fn_escale_desvincular_contato_da_empresa: { data: "empresa_excluida", error: null } } });
    const r2 = await REMOVER(pedido(`/api/v1/empresas/${E}/contatos/${C}`, { method: "DELETE" }), ctx({ id: E, contatoId: C }));
    expect((await r2.json()).data).toEqual({ desfecho: "empresa_excluida" });
  });

  it("principal aceita nulo (tirar)", async () => {
    authOk("agent");
    const db = banco({ rpc: { fn_escale_tornar_principal: { data: null, error: null } } });
    expect((await PRINCIPAL(pedido(`/api/v1/empresas/${E}/principal`, corpo("PUT", { contato_id: null })), ctx({ id: E }))).status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_tornar_principal", { p_org: ORG_ID, p_empresa: E, p_contato: null });
  });

  it("trocar a empresa do contato por uma nova, 'limpar', cria vazia e vincula; corpo inválido é 422", async () => {
    authOk("agent");
    const db = banco({
      rpc: { fn_escale_criar_empresa: { data: E, error: null } },
      tabelas: { company_people: { data: [], error: null }, companies: { data: { id: E, trade_name: "Nova", legal_name: null, city: null, state: null, cnpj: null, custom_fields: {} }, error: null } },
    });
    const r = await TROCAR(pedido(`/api/v1/contatos/${C}/empresa`, corpo("PUT", { nova: { nome: "Nova", campos: "limpar" } })), ctx({ id: C }));
    expect(r.status).toBe(200);
    expect(db.rpc).toHaveBeenCalledWith("fn_escale_criar_empresa", expect.objectContaining({ p_nome: "Nova", p_contato: C, p_site: "" }));
    expect((await TROCAR(pedido(`/api/v1/contatos/${C}/empresa`, corpo("PUT", { qualquer: 1 })), ctx({ id: C }))).status).toBe(422);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-empresa-ficha-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 2: As leituras e escritas em `banco.ts`**

Acrescente a `lib/escale/empresas/banco.ts`:

```ts
import { z } from "zod";

import { COLUNA_DO_CAMPO_FIXO } from "./regras";

export interface FichaDaEmpresa {
  id: string;
  nome: string;
  cnpj: string | null;
  cidade: string | null;
  estado: string | null;
  campos: Record<string, unknown>;
  criada_em: string;
  valor_aberto: number;
  moeda: string;
  principal: PrincipalDaEmpresa | null;
  contatos: number;
  negocios: number;
}

export interface ContatoDaEmpresa {
  id: string;
  nome: string;
  telefone: string | null;
  email: string | null;
  tags: string[];
  tem_foto: boolean;
  conversa_id: string | null;
  principal: boolean;
  negocios: number;
  negocio_unico: string | null;
}

export interface NegocioDaEmpresa {
  id: string;
  titulo: string;
  origem: string;
  etapa: string;
  status: "open" | "won" | "lost";
  valor: number | null;
  moeda: string | null;
  contato: string;
}

export interface EmpresaDoContato {
  id: string;
  nome: string;
  cidade: string | null;
  estado: string | null;
  cnpj: string | null;
  campos: Record<string, unknown>;
  principal: boolean;
}

const COLUNAS_DA_EMPRESA = "id, trade_name, legal_name, cnpj, city, state, custom_fields, created_at";

/** Soma dos negócios abertos dos contatos da empresa, na moeda da organização (N6), pela RLS de quem olha. */
async function valorEmAbertoDaEmpresa(sb: SB, orgId: string, contatoIds: string[], moeda: string): Promise<number> {
  if (!contatoIds.length) return 0;
  const leads = await sb
    .from("crm_leads")
    .select("value_cents, currency, crm_pipelines!inner(is_archived)")
    .eq("organization_id", orgId)
    .eq("status", "open")
    .eq("crm_pipelines.is_archived", false)
    .in("contact_id", contatoIds);
  if (leads.error) throw leads.error;
  return (
    ((leads.data ?? []) as Array<{ value_cents: number | null; currency: string | null }>)
      .filter((l) => (l.currency ?? moeda).toUpperCase() === moeda)
      .reduce((s, l) => s + (l.value_cents ?? 0), 0) / 100
  );
}

export async function lerFichaDaEmpresa(sb: SB, orgId: string, id: string): Promise<FichaDaEmpresa> {
  const { data: e, error } = await sb.from("companies").select(COLUNAS_DA_EMPRESA).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!e) throw new ErroDaEmpresa("empresa_nao_encontrada");
  const [moeda, contatos] = await Promise.all([moedaDaOrganizacaoDe(sb, orgId), contatosDaEmpresa(sb, orgId, id)]);
  const p = contatos.find((c) => c.principal);
  return {
    id,
    nome: nomeDaEmpresa(e as never),
    cnpj: (e.cnpj as string | null) ?? null,
    cidade: (e.city as string | null) ?? null,
    estado: (e.state as string | null) ?? null,
    campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
    criada_em: String(e.created_at),
    valor_aberto: await valorEmAbertoDaEmpresa(sb, orgId, contatos.map((c) => c.id), moeda),
    moeda,
    principal: p ? { id: p.id, nome: p.nome, telefone: p.telefone, tem_foto: p.tem_foto, conversa_id: p.conversa_id } : null,
    contatos: contatos.length,
    negocios: contatos.reduce((s, c) => s + c.negocios, 0),
  };
}
```

Confira antes de rodar: o nome da FK embutida `crm_pipelines!inner` (a 2A ou a 2B leem leads com o pipeline embutido; copie a forma de lá).

```ts
export async function contatosDaEmpresa(sb: SB, orgId: string, id: string): Promise<ContatoDaEmpresa[]> {
  const vinculos = await sb.from("company_people").select("person_id, is_primary, created_at").eq("organization_id", orgId).eq("company_id", id).order("created_at");
  if (vinculos.error) throw vinculos.error;
  const principalPorPessoa = new Map(((vinculos.data ?? []) as Array<{ person_id: string; is_primary: boolean }>).map((v) => [v.person_id, v.is_primary]));
  if (!principalPorPessoa.size) return [];
  const contatos = await sb
    .from("contacts")
    .select("id, name, display_name, phone_number, email, tags, avatar_path, person_id")
    .eq("organization_id", orgId)
    .in("person_id", [...principalPorPessoa.keys()])
    .is("is_merged_into", null);
  if (contatos.error) throw contatos.error;
  const lista = (contatos.data ?? []) as Array<Record<string, unknown>>;
  const ids = lista.map((c) => String(c.id));
  const [leads, conversas] = await Promise.all([
    sb.from("crm_leads").select("id, contact_id, crm_pipelines!inner(is_archived)").eq("organization_id", orgId).eq("crm_pipelines.is_archived", false).in("contact_id", ids),
    sb.from("conversations").select("id, contact_id, last_message_at").eq("organization_id", orgId).in("contact_id", ids).order("last_message_at", { ascending: false }),
  ]);
  const negociosPorContato = new Map<string, string[]>();
  for (const l of (leads.data ?? []) as Array<{ id: string; contact_id: string }>) {
    negociosPorContato.set(l.contact_id, [...(negociosPorContato.get(l.contact_id) ?? []), l.id]);
  }
  const conversaPorContato = new Map<string, string>();
  for (const c of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaPorContato.has(c.contact_id)) conversaPorContato.set(c.contact_id, c.id);
  }
  return lista
    .map((c): ContatoDaEmpresa => {
      const negocios = negociosPorContato.get(String(c.id)) ?? [];
      return {
        id: String(c.id),
        nome: String(c.name ?? c.display_name ?? c.phone_number ?? ""),
        telefone: (c.phone_number as string | null) ?? null,
        email: (c.email as string | null) ?? null,
        tags: (c.tags as string[] | null) ?? [],
        tem_foto: Boolean(c.avatar_path),
        conversa_id: conversaPorContato.get(String(c.id)) ?? null,
        principal: Boolean(principalPorPessoa.get(String(c.person_id))),
        negocios: negocios.length,
        negocio_unico: negocios.length === 1 ? negocios[0] : null,
      };
    })
    .sort((a, b) => Number(b.principal) - Number(a.principal) || a.nome.localeCompare(b.nome, "pt-BR"));
}

export async function negociosDaEmpresa(sb: SB, orgId: string, id: string): Promise<NegocioDaEmpresa[]> {
  const contatos = await contatosDaEmpresa(sb, orgId, id);
  if (!contatos.length) return [];
  const nomePorContato = new Map(contatos.map((c) => [c.id, c.nome]));
  const { data, error } = await sb
    .from("crm_leads")
    .select("id, title, status, value_cents, currency, contact_id, crm_pipelines!inner(name, is_archived), crm_stages(name)")
    .eq("organization_id", orgId)
    .eq("crm_pipelines.is_archived", false)
    .in("contact_id", [...nomePorContato.keys()])
    .order("updated_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  return ((data ?? []) as Array<Record<string, unknown>>).map((l) => ({
    id: String(l.id),
    titulo: String(l.title ?? ""),
    origem: String((l.crm_pipelines as { name?: string } | null)?.name ?? ""),
    etapa: String((l.crm_stages as { name?: string } | null)?.name ?? ""),
    status: l.status as NegocioDaEmpresa["status"],
    valor: l.value_cents == null ? null : Number(l.value_cents) / 100,
    moeda: (l.currency as string | null) ?? null,
    contato: nomePorContato.get(String(l.contact_id)) ?? "",
  }));
}

export async function empresaDoContato(sb: SB, orgId: string, contatoId: string): Promise<EmpresaDoContato | null> {
  const { data: c } = await sb.from("contacts").select("person_id").eq("organization_id", orgId).eq("id", contatoId).maybeSingle();
  const pessoa = (c as { person_id: string | null } | null)?.person_id;
  if (!pessoa) return null;
  const { data: vinculos } = await sb
    .from("company_people")
    .select("company_id, is_primary, created_at")
    .eq("organization_id", orgId)
    .eq("person_id", pessoa)
    .order("is_primary", { ascending: false })
    .order("created_at")
    .limit(1);
  const v = ((vinculos ?? []) as Array<{ company_id: string; is_primary: boolean }>)[0];
  if (!v) return null;
  const { data: e } = await sb.from("companies").select(COLUNAS_DA_EMPRESA).eq("organization_id", orgId).eq("id", v.company_id).maybeSingle();
  if (!e) return null;
  return {
    id: String(e.id),
    nome: nomeDaEmpresa(e as never),
    cidade: (e.city as string | null) ?? null,
    estado: (e.state as string | null) ?? null,
    cnpj: (e.cnpj as string | null) ?? null,
    campos: (e.custom_fields as Record<string, unknown> | null) ?? {},
    principal: v.is_primary,
  };
}

export const patchDaEmpresaSchema = z.object({ chave: z.string().regex(/^[a-z][a-z0-9_]{0,39}$/), valor: z.unknown() });
export type PatchDaEmpresa = z.infer<typeof patchDaEmpresaSchema>;

export async function mudarCampoDaEmpresa(sb: SB, orgId: string, id: string, patch: PatchDaEmpresa): Promise<void> {
  const coluna = COLUNA_DO_CAMPO_FIXO[patch.chave];
  let mudanca: Record<string, unknown>;
  if (coluna === "cnpj") {
    const cnpj = lerCnpj(typeof patch.valor === "string" ? patch.valor : "");
    if (!cnpj.ok) throw new ErroDaEmpresa("cnpj_invalido");
    mudanca = { cnpj: cnpj.formatado, normalized_cnpj: cnpj.normalizado };
  } else if (coluna) {
    const texto = typeof patch.valor === "string" ? patch.valor.trim() : "";
    mudanca = { [coluna]: coluna === "state" ? texto.toUpperCase().slice(0, 2) || null : texto || null };
  } else {
    const { data, error } = await sb.from("companies").select("id, custom_fields").eq("organization_id", orgId).eq("id", id).maybeSingle();
    if (error) throw error;
    if (!data) throw new ErroDaEmpresa("empresa_nao_encontrada");
    const atual = { ...((data.custom_fields as Record<string, unknown> | null) ?? {}) };
    const vazio = patch.valor === null || patch.valor === "" || (Array.isArray(patch.valor) && patch.valor.length === 0);
    if (vazio) delete atual[patch.chave];
    else atual[patch.chave] = patch.valor;
    mudanca = { custom_fields: atual };
  }
  const { error } = await sb.from("companies").update(mudanca).eq("organization_id", orgId).eq("id", id);
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
}

async function rpcDaEmpresa(admin: SB, nome: string, args: Record<string, unknown>): Promise<unknown> {
  const { data, error } = await admin.rpc(nome, args);
  if (error) throw erroDaEmpresaDoBanco(error) ?? error;
  return data;
}

export const vincularContato = (admin: SB, orgId: string, empresaId: string, contatoId: string, principal: boolean) =>
  rpcDaEmpresa(admin, "fn_escale_vincular_contato_a_empresa", { p_org: orgId, p_contato: contatoId, p_empresa: empresaId, p_principal: principal });

export const desvincularContato = async (admin: SB, orgId: string, empresaId: string, contatoId: string, novoPrincipal: string | null) =>
  (await rpcDaEmpresa(admin, "fn_escale_desvincular_contato_da_empresa", {
    p_org: orgId, p_contato: contatoId, p_empresa: empresaId, p_novo_principal: novoPrincipal,
  })) as "removido" | "empresa_excluida";

export const tornarPrincipal = (admin: SB, orgId: string, empresaId: string, contatoId: string | null) =>
  rpcDaEmpresa(admin, "fn_escale_tornar_principal", { p_org: orgId, p_empresa: empresaId, p_contato: contatoId });

export const excluirEmpresa = (admin: SB, orgId: string, empresaId: string) =>
  rpcDaEmpresa(admin, "fn_escale_excluir_empresa", { p_org: orgId, p_empresa: empresaId });

export const trocarEmpresaDoContatoSchema = z.union([
  z.object({ empresa_id: z.string().uuid() }).strict(),
  z.object({ empresa_id: z.null() }).strict(),
  z.object({ nova: z.object({ nome: z.string().trim().min(1).max(200), campos: z.enum(["manter", "limpar"]) }) }).strict(),
]);
export type TrocaDaEmpresa = z.infer<typeof trocarEmpresaDoContatoSchema>;

/**
 * Aba Empresa do negócio (N13): vincular a uma existente, tirar da atual ou
 * criar uma nova ("Manter" copia cidade, estado e o catálogo da atual; o CNPJ não).
 */
export async function trocarEmpresaDoContato(sb: SB, admin: SB, orgId: string, autor: string, contatoId: string, pedido: TrocaDaEmpresa): Promise<EmpresaDoContato | null> {
  const atual = await empresaDoContato(sb, orgId, contatoId);
  if ("nova" in pedido) {
    const id = String(await rpcDaEmpresa(admin, "fn_escale_criar_empresa", {
      p_org: orgId, p_autor: autor, p_nome: pedido.nova.nome, p_cnpj: "", p_cnpj_normalizado: "", p_site: "", p_contato: contatoId,
    }));
    if (pedido.nova.campos === "manter" && atual) {
      const { error } = await admin
        .from("companies")
        .update({ city: atual.cidade, state: atual.estado, custom_fields: atual.campos })
        .eq("organization_id", orgId)
        .eq("id", id);
      if (error) throw error;
    }
  } else if (pedido.empresa_id === null) {
    if (atual) await desvincularContato(admin, orgId, atual.id, contatoId, null).catch(async (err) => {
      // Era o principal e há outros: passa o principal ao primeiro dos outros (a aba do negócio não pergunta).
      if (!(err instanceof ErroDaEmpresa) || err.codigo !== "escolha_o_principal") throw err;
      const outros = (await contatosDaEmpresa(sb, orgId, atual.id)).filter((c) => c.id !== contatoId);
      await desvincularContato(admin, orgId, atual.id, contatoId, outros[0]?.id ?? null);
    });
  } else {
    await vincularContato(admin, orgId, pedido.empresa_id, contatoId, false);
  }
  return empresaDoContato(sb, orgId, contatoId);
}
```

(Junte o `import { z }` e o `import { COLUNA_DO_CAMPO_FIXO }` aos imports do topo do arquivo.)

- [ ] **Step 3: As rotas**

Create `app/api/v1/empresas/[id]/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { excluirEmpresa, lerFichaDaEmpresa, mudarCampoDaEmpresa, patchDaEmpresaSchema } from "@/lib/escale/empresas/banco";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

import { respostaDoErroDaEmpresa } from "../route";

export const dynamic = "force-dynamic";
const ROTA = "/api/v1/empresas/[id]";
type Ctx = { params: Promise<{ id: string }> };
const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  if (!UUID.test(id)) return fail("not_found", t("Empresa não encontrada"), 404, { requestId });
  try {
    return ok(await lerFichaDaEmpresa(await createClient(), authz.org.orgId, id));
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "ler" }, t, requestId);
  }
}

export async function PATCH(req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("agent", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = patchDaEmpresaSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Campo inválido."), 422, { requestId });
  try {
    await mudarCampoDaEmpresa(await createClient(), authz.org.orgId, id, lido.data);
    void audit({ action: "companies.updated_by_escale", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "companies", resourceId: id, requestId, metadata: { chave: lido.data.chave } });
    return ok({ id });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "mudar" }, t, requestId);
  }
}

export async function DELETE(_req: NextRequest, ctx: Ctx): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "companies" });
  if (!authz.ok) return authz.response;
  const t = (s: string) => traduzir(s, authz.user.idioma);
  const { id } = await ctx.params;
  try {
    await excluirEmpresa(createAdminClient(), authz.org.orgId, id);
    void audit({ action: "companies.deleted_by_escale", actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType: "companies", resourceId: id, requestId, metadata: {} });
    return ok({ id });
  } catch (err) {
    return respostaDoErroDaEmpresa(err, t, requestId) ?? falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "excluir" }, t, requestId);
  }
}
```

Crie as outras quatro rotas com a mesma porta (`requestId`, `requireSupportWrite` nas escritas, `requireRole` do papel da tabela acima, `t`, `respostaDoErroDaEmpresa ?? falhaInesperadaDoQuadro`), cada uma chamando a sua função:

- `app/api/v1/empresas/[id]/contatos/route.ts`: `GET` → `ok(await contatosDaEmpresa(await createClient(), orgId, id))`; `POST` lê `z.object({ contato_id: z.string().uuid() })` ("Selecione um contato." no 422) → `vincularContato(createAdminClient(), orgId, id, contato_id, false)`, audita `companies.contact_linked` com `{ contato_id }`, `ok({ id })`.
- `app/api/v1/empresas/[id]/contatos/[contatoId]/route.ts`: `DELETE` lê `novo_principal` da query (uuid ou nulo; inválido → 422) → `const desfecho = await desvincularContato(createAdminClient(), orgId, id, contatoId, novo)`, audita `companies.contact_unlinked` com `{ contato_id, desfecho }`, `ok({ desfecho })`.
- `app/api/v1/empresas/[id]/principal/route.ts`: `PUT` lê `z.object({ contato_id: z.string().uuid().nullable() })` → `tornarPrincipal(createAdminClient(), orgId, id, contato_id)`, audita `companies.primary_changed`, `ok({ id })`.
- `app/api/v1/empresas/[id]/negocios/route.ts`: `GET` → `ok(await negociosDaEmpresa(await createClient(), orgId, id))`.
- `app/api/v1/contatos/[id]/empresa/route.ts`: `GET` → `ok(await empresaDoContato(await createClient(), orgId, id))`; `PUT` lê `trocarEmpresaDoContatoSchema` ("Escolha a empresa ou digite um nome novo" no 422) → `ok(await trocarEmpresaDoContato(await createClient(), createAdminClient(), orgId, authz.user.id, id, lido.data))`, audita `companies.contact_linked` com `{ contato_id: id, modo }`.

Confira antes de rodar: o `navegacao-completude` e o `tabelas-do-motor-nao-se-leem-pelo-login` aceitam rota nova em `app/api/v1/contatos/` (pasta nova): `app/api/` é ignorado pelo primeiro; o segundo lista tabelas do motor (não `companies`).

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-empresa-ficha-rotas.test.ts tests/unit/escale-empresas-rotas.test.ts tests/unit/tabelas-do-motor-nao-se-leem-pelo-login.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/empresas app/api/v1/empresas app/api/v1/contatos
git add lib/escale/empresas/banco.ts app/api/v1/empresas app/api/v1/contatos tests/unit/escale-empresa-ficha-rotas.test.ts
git commit -m "feat(escale): rotas da ficha da empresa, dos vínculos e da empresa do contato (Fase 2D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: A empresa na lista de contatos — linha, busca e filtro

**Files:**
- Modify: `lib/escale/contatos/lista.ts` (`LinhaDeContato.empresa`), `components/escale/contatos/TabelaDeContatos.tsx` (o nome da empresa acima do nome), `lib/escale/contatos/filtros.ts` (alvo `empresa`, `camposDaEmpresaDoFiltro`), `lib/escale/contatos/compilar-filtros.ts` (aceita o alvo), `lib/escale/contatos/opcoes-do-filtro.ts` e `origens-da-pagina.ts` (`camposDaEmpresa`), `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx` (o grupo "Empresa" liga), `tests/unit/escale-tabela-de-contatos.test.tsx`, `tests/unit/escale-filtros-de-contatos.test.ts`, `tests/unit/escale-painel-de-filtros.test.tsx`, `tests/unit/escale-lista-de-contatos-rotas.test.ts`

**Interfaces:**
- Consumes: `tipoDoFiltro`, `camposDoContatoDoFiltro` (2C), `CAMPOS_FIXOS_DA_EMPRESA`, `lerCatalogo`, `catalogoVisivel` (2C).
- Produces:
  - `LinhaDeContato.empresa: { id: string; nome: string } | null`;
  - `condicaoSchema.alvo: "contato" | "negocio" | "empresa"`; `CampoDoFiltro.alvo` idem;
  - `camposDaEmpresaDoFiltro(catalogo: Catalogo): CampoDoFiltro[]` (fixos + catálogo, em ordem alfabética);
  - `OpcoesDoFiltro.camposDaEmpresa: CampoDoFiltro[]`;
  - `SecaoCamposDoFiltro({ …, camposDaEmpresa, grupos? })` (`grupos` padrão `["contato","negocio","empresa"]`; a lista de empresas passa `["empresa"]` na Task 8).

- [ ] **Step 1: Testes (vão falhar)**

Em `tests/unit/escale-filtros-de-contatos.test.ts`:

```ts
describe("o alvo empresa no filtro (2D)", () => {
  it("a condição aceita alvo empresa", () => {
    expect(condicaoSchema.safeParse({ alvo: "empresa", chave: "segmento", tipo: "texto", op: "contem", valor: "Var" }).success).toBe(true);
  });
  it("campos da empresa: fixos + catálogo, em ordem alfabética", () => {
    const campos = camposDaEmpresaDoFiltro({
      grupos: [],
      campos: [{ id: "e1", objeto: "empresa", chave: "segmento", definicao: { label: "Segmento", type: "text" }, grupo_id: null, papel_minimo: null, posicao: 0, padrao: true }],
    });
    expect(campos.map((c) => c.rotulo)).toEqual(["CNPJ", "Cidade", "Estado", "Nome da empresa", "Segmento"]);
    expect(campos.every((c) => c.alvo === "empresa")).toBe(true);
  });
});
```

Em `tests/unit/escale-tabela-de-contatos.test.tsx`:

```tsx
  it("o nome da empresa aparece acima do nome do contato (contact-row-v2)", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({ empresa: { id: "e1", nome: "Atlas Distribuidora" } })]} />);
    const celula = screen.getByText("Karoll").closest("td")!;
    expect(within(celula).getByText("Atlas Distribuidora")).toBeInTheDocument();
  });
```

(Acrescente `empresa: null` ao `linha()` do teste.)

Em `tests/unit/escale-painel-de-filtros.test.tsx`: o grupo "Empresa" do seletor de campo não tem mais "Em breve", abre e lista "Nome da empresa" e "Segmento" quando `opcoesDoFiltro.camposDaEmpresa` os traz.

Em `tests/unit/escale-lista-de-contatos-rotas.test.ts`: com o duplo devolvendo `contacts.person_id = "p1"`, `company_people` `[{ person_id: "p1", company_id: "e1", is_primary: true }]` e `companies` `[{ id: "e1", trade_name: "Atlas", legal_name: null }]`, a linha sai com `empresa: { id: "e1", nome: "Atlas" }`.

- [ ] **Step 2: Implementar**

`lib/escale/contatos/lista.ts`: acrescente `person_id` às `COLUNAS` lidas dos contatos (L138); depois de ler os contatos da página, leia os vínculos e as empresas:

```ts
  // FORK ESCALE · Fase 2D: a empresa do contato (o vínculo principal, senão o mais antigo).
  const pessoas = [...new Set(contatos.map((c) => c.person_id).filter((x): x is string => Boolean(x)))];
  const empresaPorPessoa = new Map<string, { id: string; nome: string }>();
  if (pessoas.length) {
    const vinculos = await supabase
      .from("company_people")
      .select("person_id, company_id, is_primary, created_at")
      .eq("organization_id", orgId)
      .in("person_id", pessoas)
      .order("is_primary", { ascending: false })
      .order("created_at");
    const escolhido = new Map<string, string>();
    for (const v of (vinculos.data ?? []) as Array<{ person_id: string; company_id: string }>) {
      if (!escolhido.has(v.person_id)) escolhido.set(v.person_id, v.company_id);
    }
    if (escolhido.size) {
      const empresas = await supabase.from("companies").select("id, trade_name, legal_name").eq("organization_id", orgId).in("id", [...new Set(escolhido.values())]);
      const nomePorEmpresa = new Map(((empresas.data ?? []) as Array<{ id: string; trade_name: string | null; legal_name: string | null }>).map((e) => [e.id, nomeDaEmpresa(e)]));
      for (const [pessoa, empresa] of escolhido) {
        const nome = nomePorEmpresa.get(empresa);
        if (nome !== undefined) empresaPorPessoa.set(pessoa, { id: empresa, nome });
      }
    }
  }
```

e no mapeamento de cada linha: `empresa: c.person_id ? (empresaPorPessoa.get(c.person_id) ?? null) : null`. Importe `nomeDaEmpresa` de `@/lib/escale/empresas/banco`.

`TabelaDeContatos.tsx`, na célula do nome (L138–143), antes do `<Link>` do nome:

```tsx
                    {linha.empresa?.nome && (
                      <span className="block truncate text-[11px] leading-tight text-casca-meta">{linha.empresa.nome}</span>
                    )}
```

`lib/escale/contatos/filtros.ts`: `alvo: z.enum(["contato", "negocio", "empresa"])` na `condicaoSchema`; `CampoDoFiltro.alvo` com `"empresa"`; e

```ts
import { CAMPOS_FIXOS_DA_EMPRESA, type Catalogo } from "@/lib/escale/campos/regras";

/** Os campos da empresa no seletor do filtro: fixos + catálogo, em ordem alfabética. */
export function camposDaEmpresaDoFiltro(catalogo: Catalogo): CampoDoFiltro[] {
  const fixos: CampoDoFiltro[] = CAMPOS_FIXOS_DA_EMPRESA.map((f) => ({ alvo: "empresa", chave: f.chave, rotulo: f.rotulo, tipo: "texto" }));
  const doCatalogo: CampoDoFiltro[] = catalogo.campos.map((c) => ({
    alvo: "empresa",
    chave: c.chave,
    rotulo: String(c.definicao.label),
    tipo: tipoDoFiltro(c.definicao.type),
    opcoes: c.definicao.options,
  }));
  return [...fixos, ...doCatalogo].sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));
}
```

`compilar-filtros.ts`: o `alvo` passa direto (o SQL da 9105 entende `empresa`); confira se há um `switch`/`if` em `alvo` que precise do terceiro caso.

`opcoes-do-filtro.ts`: `camposDaEmpresa: CampoDoFiltro[]` em `OpcoesDoFiltro` e `[]` em `OPCOES_VAZIAS`. `origens-da-pagina.ts`: `camposDaEmpresa: camposDaEmpresaDoFiltro(catalogoVisivel(await lerCatalogo(supabase, orgId, "empresa"), papel))` ao lado do `camposDoContato` da 2C.

`SecaoCamposDoFiltro.tsx`: a prop `camposDaEmpresa` entra em `todos`; o grupo `empresa` do `SeletorDeCampo` (L104–114, L181–190) deixa de ser `emBreve` e lista `camposDaEmpresa`; prop opcional `grupos?: readonly GrupoDoSeletor[]` (padrão os três) filtra os grupos mostrados. `PainelDeFiltros` repassa `opcoesDoFiltro.camposDaEmpresa`.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-de-contatos.test.ts tests/unit/escale-tabela-de-contatos.test.tsx tests/unit/escale-painel-de-filtros.test.tsx tests/unit/escale-lista-de-contatos-rotas.test.ts tests/unit/escale-lista-de-contatos-pagina.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/contatos components/escale/contatos tests/unit
git commit -m "feat(escale): a empresa na lista de contatos — nome na linha, busca e filtro por campos da empresa (Fase 2D, A3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Espanhol, PRD e o PR A

- [ ] **Step 1: O espanhol**

Bloco `  // ─── FORK ESCALE · Fase 2D (PR A): empresas (rotas e lista de contatos) ───` (antes do da 1G; mesmo script da 2B):

```js
const ES = {
  "Consulta inválida.": "Consulta inválida.",
  "Informe o nome da empresa e o contato.": "Informa el nombre de la empresa y el contacto.",
  "CNPJ inválido.": "CNPJ inválido.",
  "CNPJ já cadastrado em outra empresa.": "CNPJ ya registrado en otra empresa.",
  "Contato não encontrado.": "Contacto no encontrado.",
  "Empresa não encontrada": "Empresa no encontrada",
  "Este contato não está nesta empresa.": "Este contacto no está en esta empresa.",
  "Selecione o novo contato principal.": "Selecciona el nuevo contacto principal.",
  "Campo inválido.": "Campo inválido.",
  "Selecione um contato.": "Selecciona un contacto.",
  "Escolha a empresa ou digite um nome novo": "Elige la empresa o escribe un nombre nuevo",
  "Nome da empresa": "Nombre de la empresa",
  "Cidade": "Ciudad",
  "Estado": "Estado",
  "CNPJ": "CNPJ",
};
```

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Expected: PASS (acrescente o que faltar). As chaves que a 2C já traduziu não se repetem (o teste de duplicadas do dicionário reprova).

- [ ] **Step 2: Gates e o PR A**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale app/api/v1/empresas app/api/v1/contatos components/escale/contatos
corepack pnpm vitest run tests/unit/escale-empresas-regras.test.ts tests/unit/escale-empresas-rotas.test.ts tests/unit/escale-empresa-ficha-rotas.test.ts tests/unit/escale-empresas-migration.test.ts tests/unit/navegacao-completude.test.ts tests/unit/navegacao-registry.test.ts tests/unit/porta-do-modulo-ligado.test.tsx
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2d-empresas-banco
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2d-empresas-banco --title "Fase 2D (PR A): empresas no banco, rotas e a empresa na lista de contatos" --body-file .superpowers/sdd/2d-a-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

O corpo (`.superpowers/sdd/2d-a-pr.md`, fora do git) traz: a 9105 (módulo ligado, principal único, as cinco definer fechadas, a lista invoker, o filtro da empresa, as duas da 9102 recriadas), as rotas e os papéis, a empresa na lista de contatos, as decisões Q1–Q6, o que fica para o PR B, e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto.**

- [ ] **Step 3: O PRD**

Seção 8, linha `| 2D |`: `PR A (#…) mergeado (banco, rotas, empresa na lista de contatos); PR B em andamento (telas)`. Seção 10, pergunta 2: troque "**Ainda em aberto:** se a aba Empresa do negócio (C12) passa da 1H para a 2D." por "A aba Empresa do negócio (C12) é da 2D (plano da 2D, N13)."

---

# PR B — Telas: lista, "Nova empresa", ficha da empresa e aba Empresa do negócio (E2–E5, E7, E8)

### Task 7: Colunas por lista e o "Personalizar colunas" genérico

**Files:**
- Modify: `lib/escale/colunas/banco.ts` (`lerColunasDaLista`), `app/api/v1/colunas-das-listas/route.ts` (valida por lista), `hooks/escale/useColunasDaLista.ts` (padrão por lista), `components/escale/contatos/PainelDeColunas.tsx` (nativas e campos por props), `components/escale/contatos/ListaDeContatos.tsx` (passa as nativas dos contatos), `tests/unit/escale-painel-de-colunas.test.tsx`, `tests/unit/escale-lista-de-contatos-rotas.test.ts`

**Interfaces:**
- Consumes: `COLUNAS_NATIVAS` (contatos, 2A), `COLUNAS_NATIVAS_DE_EMPRESAS`, `COLUNAS_PADRAO_DE_EMPRESAS` (Task 1), `CampoDeColuna` (2C).
- Produces:
  - `NATIVAS_POR_LISTA: Record<ListaComColunas, readonly string[]>` e `PADRAO_POR_LISTA: Record<ListaComColunas, ItemDeColuna[]>` em `lib/escale/colunas/banco.ts`;
  - `lerColunasDaLista(lista, bruto): ItemDeColuna[]` (descarta nativa que não é da lista; campo pela regex da 2A);
  - `useColunasDaLista(lista)` cai em `PADRAO_POR_LISTA[lista]`;
  - `PainelDeColunas({ itens, aoMudar, nativas: Array<{ chave: string; rotulo: string; icone?: ReactNode }>, campos: CampoDeColuna[], tituloDosCampos: string, padrao: ItemDeColuna[] })`.

- [ ] **Step 1: Testes (vão falhar)**

Em `tests/unit/escale-painel-de-colunas.test.tsx`, reescreva o `render` para passar `nativas`, `campos`, `tituloDosCampos="Campos do contato"` e `padrao={COLUNAS_PADRAO}`; e acrescente:

```tsx
  it("empresas: as cinco nativas na tabela, 'Campos da empresa' sem nome e segmento, e Redefinir volta ao padrão da Clint", () => {
    const aoMudar = vi.fn();
    const nativas = COLUNAS_NATIVAS_DE_EMPRESAS.map((c) => ({ chave: c, rotulo: ROTULO_DA_COLUNA_DE_EMPRESA[c] }));
    render(
      <PainelDeColunas
        itens={[{ tipo: "nativa", chave: "contato_principal" }]}
        aoMudar={aoMudar}
        nativas={nativas}
        campos={[{ chave: "site", rotulo: "Site", tipo: "url" }]}
        tituloDosCampos="Campos da empresa"
        padrao={COLUNAS_PADRAO_DE_EMPRESAS}
      />,
    );
    expect(screen.getByText("Na tabela · 1")).toBeInTheDocument();
    expect(screen.getByText("Campos da empresa")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Redefinir" }));
    expect(aoMudar).toHaveBeenCalledWith(COLUNAS_PADRAO_DE_EMPRESAS);
  });
```

Em `tests/unit/escale-lista-de-contatos-rotas.test.ts`, no `PUT /api/v1/colunas-das-listas`: `{ lista: "empresas", itens: [{ tipo: "nativa", chave: "valor_aberto" }] }` grava; `{ lista: "empresas", itens: [{ tipo: "nativa", chave: "tags" }] }` grava sem o item (nativa de outra lista).

- [ ] **Step 2: Implementar**

`lib/escale/colunas/banco.ts`:

```ts
import { COLUNAS_NATIVAS, COLUNAS_PADRAO, type ItemDeColuna, lerColunas } from "@/lib/escale/contatos/regras";
import { COLUNAS_NATIVAS_DE_EMPRESAS, COLUNAS_PADRAO_DE_EMPRESAS } from "@/lib/escale/empresas/regras";

export const NATIVAS_POR_LISTA: Record<ListaComColunas, readonly string[]> = {
  contatos: COLUNAS_NATIVAS,
  empresas: COLUNAS_NATIVAS_DE_EMPRESAS,
};
export const PADRAO_POR_LISTA: Record<ListaComColunas, readonly ItemDeColuna[]> = {
  contatos: COLUNAS_PADRAO,
  empresas: COLUNAS_PADRAO_DE_EMPRESAS as unknown as ItemDeColuna[],
};

/** As colunas gravadas, só com as nativas daquela lista e os campos válidos. */
export function lerColunasDaLista(lista: ListaComColunas, bruto: unknown): ItemDeColuna[] {
  const nativas = new Set(NATIVAS_POR_LISTA[lista]);
  const itens = lerColunas(bruto, { aceitarNativas: [...nativas] });
  return itens ?? [...PADRAO_POR_LISTA[lista]];
}
```

Confira antes de rodar: a assinatura real de `lerColunas` (2A, `lib/escale/contatos/regras.ts`) e do `ItemDeColuna` (a nativa é tipada como `ColunaNativa` dos contatos). Generalize: `ItemDeColuna = { tipo: "nativa"; chave: string } | { tipo: "campo"; chave: string }` e `lerColunas(bruto, opcoes?: { aceitarNativas?: readonly string[] })`, com o padrão `COLUNAS_NATIVAS` (a 2A continua igual). Ajuste os tipos que dependiam de `ColunaNativa` no `CelulaExtra` e no `rotuloDoItem` com um `as ColunaNativa` só onde a lista é a de contatos.

`app/api/v1/colunas-das-listas/route.ts`: o PUT valida com `lerColunasDaLista(lista, itens)`; o GET devolve `lerColunasDaLista(lista, gravado)`. `useColunasDaLista(lista)`: o padrão local é `PADRAO_POR_LISTA[lista]`.

`PainelDeColunas.tsx`: troque as constantes dos contatos pelas props `nativas`, `campos`, `tituloDosCampos` e `padrao`; "Redefinir" aparece quando `!mesmasColunas(itens, padrao)` e chama `aoMudar([...padrao])`. `ListaDeContatos.tsx` passa `nativas = COLUNAS_NATIVAS.map((c) => ({ chave: c, rotulo: ROTULO_DA_COLUNA[c] }))`, `campos = camposDoContato` (2C), `tituloDosCampos = t("Campos do contato")` e `padrao = COLUNAS_PADRAO`.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-colunas.test.tsx tests/unit/escale-lista-de-contatos-rotas.test.ts tests/unit/escale-tabela-de-contatos.test.tsx
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add lib/escale/colunas lib/escale/contatos/regras.ts app/api/v1/colunas-das-listas hooks/escale/useColunasDaLista.ts components/escale/contatos tests/unit
git commit -m "refactor(escale): Personalizar colunas por lista — contatos e empresas (Fase 2D)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 8: A lista de empresas (04-001)

**Files:**
- Create: `hooks/escale/useListaDeEmpresas.ts`, `components/escale/empresas/Monograma.tsx`, `components/escale/empresas/CelulasDaEmpresa.tsx`, `components/escale/empresas/TabelaDeEmpresas.tsx`, `components/escale/empresas/ListaDeEmpresas.tsx`, `lib/escale/empresas/pagina.ts`, `tests/unit/escale-lista-de-empresas.test.tsx`
- Modify: `app/app/companies/page.tsx` (encaixe)

**Interfaces:**
- Consumes: `GET /api/v1/empresas`, `DELETE /api/v1/empresas/[id]` (Tasks 3, 4); `PaginaDeEmpresas`, `LinhaDeEmpresa` (Task 3); `PainelDeColunas` (Task 7); `PaginacaoDaCasca`, `SeletorDaCasca`, `BotaoDaCasca`, `PainelSuspenso`, `JanelaDeConfirmacao`, `GatilhoDeFiltro` (casca); `FotoDaLinha` (2A); `useCatalogoDeCampos("empresa")` (2C); `SecaoCamposDoFiltro` com `grupos={["empresa"]}` (Task 5); `filtrosDaUrl`/`filtrosParaUrl`/`contarCondicoes` (2B).
- Produces:
  - `useListaDeEmpresas(consulta: { q?: string; e: EscopoDeEmpresas; p: number; n: number; f?: string })` (chave `["companies", "lista-da-casca", consulta]`, `keepPreviousData`, 15 s);
  - `useExcluirEmpresa()` (DELETE; invalida `["companies"]`);
  - `ListaDeEmpresas({ papel, moedaPadrao }: { papel: Role; moedaPadrao: string })`;
  - `TabelaDeEmpresas({ linhas, colunas, camposDaEmpresa, moeda, carregando, erro, busca, podeExcluir, aoTentarDeNovo, aoLimparBusca, aoNovaEmpresa, aoExcluir })`;
  - `Monograma({ nome, tamanho? })`;
  - `dadosDaPaginaDeEmpresas(): Promise<{ papel: Role; moedaPadrao: string }>` em `lib/escale/empresas/pagina.ts` (servidor).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-lista-de-empresas.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { TabelaDeEmpresas } from "@/components/escale/empresas/TabelaDeEmpresas";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { COLUNAS_PADRAO_DE_EMPRESAS } from "@/lib/escale/empresas/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));

const linha = (extra: Partial<LinhaDeEmpresa> = {}): LinhaDeEmpresa => ({
  id: "e1",
  nome: "Daiane Feijó Barreto Incorporação Ltda",
  cnpj: null,
  campos: {},
  contatos: 1,
  negocios: 0,
  negocio_unico: null,
  valor_aberto: 0,
  principal: { id: "c1", nome: "Alex", telefone: "+5553999998393", tem_foto: false, conversa_id: "v1" },
  ...extra,
});

const props = {
  colunas: [...COLUNAS_PADRAO_DE_EMPRESAS],
  camposDaEmpresa: [],
  moeda: "BRL",
  carregando: false,
  erro: false,
  busca: "",
  podeExcluir: true,
  aoTentarDeNovo: vi.fn(),
  aoLimparBusca: vi.fn(),
  aoNovaEmpresa: vi.fn(),
  aoExcluir: vi.fn(),
};
const envolver = (ui: React.ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("TabelaDeEmpresas (04-001)", () => {
  it("cabeçalho NOME, CONTATO PRINCIPAL, SEGMENTO, CONTATOS, VALOR EM ABERTO, NEGÓCIOS", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha()]} />);
    for (const r of ["Nome", "Contato principal", "Segmento", "Contatos", "Valor em aberto", "Negócios"]) {
      expect(screen.getByRole("columnheader", { name: r })).toBeInTheDocument();
    }
  });

  it("a linha: monograma DL, ★ Alex, (53) 99999-8393, —, Ver 1 contato, R$ 0,00 e — nos negócios", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha()]} />);
    const tr = screen.getByText("Daiane Feijó Barreto Incorporação Ltda").closest("tr")!;
    expect(within(tr).getByText("DL")).toBeInTheDocument();
    expect(within(tr).getByText("Alex")).toBeInTheDocument();
    expect(within(tr).getByText("(53) 99999-8393")).toBeInTheDocument();
    expect(within(tr).getByRole("button", { name: "Ver 1 contato" })).toBeInTheDocument();
    expect(within(tr).getByText("R$ 0,00")).toBeInTheDocument();
    expect(within(tr).getAllByText("—")).toHaveLength(2);
  });

  it("'Ver 1 negócio' abre a ficha na aba Negócios; clicar na linha abre a empresa", () => {
    envolver(<TabelaDeEmpresas {...props} linhas={[linha({ negocios: 1, negocio_unico: "l1", valor_aberto: 1500.5 })]} />);
    expect(screen.getByText("R$ 1.500,50")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ver 1 negócio" }));
    expect(push).toHaveBeenLastCalledWith("/app/companies/e1?aba=negocios");
    fireEvent.click(screen.getByText("Daiane Feijó Barreto Incorporação Ltda"));
    expect(push).toHaveBeenLastCalledWith("/app/companies/e1");
  });

  it("a lixeira pede a confirmação da Clint; sem permissão não aparece", async () => {
    const aoExcluir = vi.fn();
    const { unmount } = envolver(<TabelaDeEmpresas {...props} aoExcluir={aoExcluir} linhas={[linha()]} />);
    fireEvent.click(screen.getByRole("button", { name: "Excluir empresa" }));
    expect(await screen.findByText('Tem certeza que deseja excluir "Daiane Feijó Barreto Incorporação Ltda"? Os contatos serão mantidos.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(aoExcluir).toHaveBeenCalledWith(expect.objectContaining({ id: "e1" })));
    unmount();
    envolver(<TabelaDeEmpresas {...props} podeExcluir={false} linhas={[linha()]} />);
    expect(screen.queryByRole("button", { name: "Excluir empresa" })).not.toBeInTheDocument();
  });

  it("vazio sem busca e com busca", () => {
    const { unmount } = envolver(<TabelaDeEmpresas {...props} linhas={[]} />);
    expect(screen.getByText("Organize seus contatos por empresa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Nova empresa" })).toBeInTheDocument();
    unmount();
    envolver(<TabelaDeEmpresas {...props} busca="xyz" linhas={[]} />);
    expect(screen.getByText('Nenhuma empresa encontrada para "xyz".')).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Limpar busca" })).toBeInTheDocument();
  });

  it("uma coluna de campo da empresa mostra o valor pelo tipo", () => {
    envolver(
      <TabelaDeEmpresas
        {...props}
        colunas={[{ tipo: "campo", chave: "numero_de_funcionarios" }]}
        camposDaEmpresa={[{ chave: "numero_de_funcionarios", rotulo: "Número de funcionários", tipo: "number" }]}
        linhas={[linha({ campos: { numero_de_funcionarios: 1200 } })]}
      />,
    );
    expect(screen.getByRole("columnheader", { name: "Número de funcionários" })).toBeInTheDocument();
    expect(screen.getByText("1.200")).toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-empresas.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os componentes**

Create `components/escale/empresas/Monograma.tsx`:

```tsx
import { iniciaisDaEmpresa } from "@/lib/escale/empresas/regras";

/** O quadrado com as iniciais da empresa (04-001): 44px, canto 6, fundo lilás claro. */
export function Monograma({ nome, tamanho = 44 }: { nome: string; tamanho?: number }) {
  return (
    <span
      aria-hidden
      style={{ width: tamanho, height: tamanho }}
      className="inline-flex shrink-0 items-center justify-center rounded-[6px] bg-casca-marca-suave text-[13px] font-medium text-casca-marca"
    >
      {iniciaisDaEmpresa(nome)}
    </span>
  );
}
```

Create `components/escale/empresas/CelulasDaEmpresa.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { useT } from "@/hooks/i18n/useT";
import type { CampoDeColuna } from "@/lib/escale/contatos/regras";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { valorParaLeitura } from "@/lib/escale/negocio/campos";
import { MessageCircle, Phone, Star } from "@/lib/ui/icons-da-casca";

const formatoDaMoeda = (moeda: string) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: moeda });

export function CelulaPrincipal({ linha }: { linha: LinhaDeEmpresa }) {
  const t = useT();
  const p = linha.principal;
  if (!p) return <span className="text-[12px] text-casca-meta">—</span>;
  return (
    <div className="flex items-center gap-2">
      <FotoDaLinha id={p.id} nome={p.nome} temFoto={p.tem_foto} />
      <div className="min-w-0">
        <p className="flex items-center gap-1 text-[14px] font-medium text-casca-texto">
          <Star size={11} className="fill-current text-casca-marca" aria-label={t("Contato principal")} />
          <span className="truncate">{p.nome}</span>
        </p>
        {p.telefone && (
          <p className="flex items-center gap-1 text-[13px] text-casca-suave">
            <Phone size={11} />
            {formatarTelefone(p.telefone)}
            <span className="ml-1 flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
              <a href={`tel:${p.telefone}`} onClick={(e) => e.stopPropagation()} title={t("Chamar")} className="text-casca-marca"><Phone size={14} /></a>
              {p.conversa_id && (
                <a href={`/app/inbox?id=${p.conversa_id}`} onClick={(e) => e.stopPropagation()} title={t("Abrir em Conversas")} className="text-casca-marca"><MessageCircle size={14} /></a>
              )}
            </span>
          </p>
        )}
      </div>
    </div>
  );
}

export function BotaoVer({ rotulo, href }: { rotulo: string; href: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      onClick={(e) => { e.stopPropagation(); router.push(href); }}
      className="h-6 rounded-[6px] border border-casca-borda px-2.5 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
    >
      {rotulo}
    </button>
  );
}

export function CelulaValor({ valor, moeda }: { valor: number; moeda: string }) {
  return <span className="text-[14px] font-semibold text-casca-texto">{formatoDaMoeda(moeda).format(valor)}</span>;
}

export function CelulaCampoDaEmpresa({ campo, linha }: { campo: CampoDeColuna | undefined; linha: LinhaDeEmpresa }) {
  const t = useT();
  const bruto = campo ? linha.campos[campo.chave] : undefined;
  const texto = campo ? valorParaLeitura(campo.tipo, campo.opcoes, bruto, t) : "";
  return texto ? <span className="truncate text-[14px] text-casca-suave">{texto}</span> : <span className="text-[12px] text-casca-meta">—</span>;
}
```

Confira antes de rodar: `formatarTelefone` (2A) devolve "(53) 99999-8393" para `+5553999998393`; `valorParaLeitura` (1H) formata número com milhar ("1.200"); se não formatar, use `new Intl.NumberFormat("pt-BR").format(Number(bruto))` para `number`.

Create `components/escale/empresas/TabelaDeEmpresas.tsx`:

```tsx
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { ItemDeColuna } from "@/lib/escale/contatos/regras";
import type { CampoDeColuna } from "@/lib/escale/contatos/regras";
import type { LinhaDeEmpresa } from "@/lib/escale/empresas/banco";
import { type ColunaNativaDeEmpresa, ROTULO_DA_COLUNA_DE_EMPRESA } from "@/lib/escale/empresas/regras";
import { Building2, Trash2 } from "@/lib/ui/icons-da-casca";

import { BotaoVer, CelulaCampoDaEmpresa, CelulaPrincipal, CelulaValor } from "./CelulasDaEmpresa";
import { Monograma } from "./Monograma";

export interface TabelaDeEmpresasProps {
  linhas: LinhaDeEmpresa[];
  colunas: ItemDeColuna[];
  camposDaEmpresa: CampoDeColuna[];
  moeda: string;
  carregando: boolean;
  erro: boolean;
  busca: string;
  podeExcluir: boolean;
  aoTentarDeNovo: () => void;
  aoLimparBusca: () => void;
  aoNovaEmpresa: () => void;
  aoExcluir: (linha: LinhaDeEmpresa) => Promise<void> | void;
}

const plural = (n: number, um: string, varios: string) => (n === 1 ? um : varios).replace("{n}", String(n));

/** A tabela de empresas da Clint (04-001, `ga`/`Fe`). */
export function TabelaDeEmpresas(p: TabelaDeEmpresasProps) {
  const t = useT();
  const router = useRouter();
  const [excluindo, setExcluindo] = useState<LinhaDeEmpresa | null>(null);
  const abrir = (id: string, aba?: "contatos" | "negocios") => router.push(`/app/companies/${id}${aba ? `?aba=${aba}` : ""}`);
  const rotulo = (c: ItemDeColuna) =>
    c.tipo === "nativa" ? t(ROTULO_DA_COLUNA_DE_EMPRESA[c.chave as ColunaNativaDeEmpresa]) : (p.camposDaEmpresa.find((x) => x.chave === c.chave)?.rotulo ?? c.chave);

  const celula = (c: ItemDeColuna, l: LinhaDeEmpresa) => {
    if (c.tipo === "campo") return <CelulaCampoDaEmpresa campo={p.camposDaEmpresa.find((x) => x.chave === c.chave)} linha={l} />;
    switch (c.chave as ColunaNativaDeEmpresa) {
      case "contato_principal":
        return <CelulaPrincipal linha={l} />;
      case "segmento":
        return <CelulaCampoDaEmpresa campo={{ chave: "segmento", rotulo: "Segmento", tipo: "text" }} linha={l} />;
      case "contatos":
        return <BotaoVer rotulo={plural(l.contatos, t("Ver {n} contato"), t("Ver {n} contatos"))} href={`/app/companies/${l.id}?aba=contatos`} />;
      case "valor_aberto":
        return <CelulaValor valor={l.valor_aberto} moeda={p.moeda} />;
      default:
        return l.negocios > 0
          ? <BotaoVer rotulo={plural(l.negocios, t("Ver {n} negócio"), t("Ver {n} negócios"))} href={`/app/companies/${l.id}?aba=negocios`} />
          : <span className="text-[12px] text-casca-meta">—</span>;
    }
  };

  const vazio = !p.carregando && !p.erro && p.linhas.length === 0;
  return (
    <div className="min-h-0 flex-1 overflow-auto">
      <table className="w-full border-collapse">
        <thead className="sticky top-0 z-10 bg-casca-fundo">
          <tr className="h-[52px] border-b border-casca-borda">
            <th scope="col" className="px-6 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto">{t("Nome")}</th>
            {p.colunas.map((c) => (
              <th key={`${c.tipo}:${c.chave}`} scope="col" className="px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto">{rotulo(c)}</th>
            ))}
            <th scope="col" aria-label={t("Ações")} className="w-14" />
          </tr>
        </thead>
        <tbody>
          {p.carregando &&
            Array.from({ length: 8 }).map((_, i) => (
              <tr key={i} className="h-16 border-b border-casca-borda">
                <td className="px-6"><span className="block h-9 w-[220px] animate-pulse rounded-[6px] bg-casca-raia" /></td>
                {p.colunas.map((c) => <td key={`${c.tipo}:${c.chave}`} className="px-3"><span className="block h-3.5 w-24 animate-pulse rounded bg-casca-raia" /></td>)}
                <td />
              </tr>
            ))}
          {!p.carregando && p.erro && (
            <tr><td colSpan={p.colunas.length + 2} className="py-16 text-center">
              <p className="text-[14px] font-medium text-casca-texto">{t("Não foi possível carregar as empresas.")}</p>
              <button type="button" onClick={p.aoTentarDeNovo} className="mt-2 text-[13px] text-casca-marca">{t("Tentar de novo")}</button>
            </td></tr>
          )}
          {vazio && (
            <tr><td colSpan={p.colunas.length + 2} className="py-16">
              {p.busca.trim() ? (
                <div className="flex flex-col items-center gap-2">
                  <p className="text-[13px] text-casca-suave">{t('Nenhuma empresa encontrada para "{search}".').replace("{search}", p.busca.trim())}</p>
                  <button type="button" onClick={p.aoLimparBusca} className="text-[13px] font-medium text-casca-marca">{t("Limpar busca")}</button>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-3 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-casca-marca-suave text-casca-marca"><Building2 size={22} /></span>
                  <p className="text-[15px] font-medium text-casca-texto">{t("Organize seus contatos por empresa")}</p>
                  <p className="max-w-[420px] text-[13px] text-casca-suave">{t("Agrupe contatos em empresas e veja negócios e atividades de toda a conta em um só lugar.")}</p>
                  <BotaoDaCasca variante="marca" onClick={p.aoNovaEmpresa}>{t("Nova empresa")}</BotaoDaCasca>
                </div>
              )}
            </td></tr>
          )}
          {!p.carregando && !p.erro && p.linhas.map((l) => (
            <tr key={l.id} onClick={() => abrir(l.id)} className="group h-16 cursor-pointer border-b border-casca-borda hover:bg-casca-raia">
              <td className="px-6">
                <span className="flex items-center gap-3">
                  <Monograma nome={l.nome} />
                  <span title={l.nome} className="truncate text-[14px] font-semibold text-casca-texto">{l.nome || t("Sem nome")}</span>
                </span>
              </td>
              {p.colunas.map((c) => <td key={`${c.tipo}:${c.chave}`} className="px-3">{celula(c, l)}</td>)}
              <td className="pr-4 text-right">
                {p.podeExcluir && (
                  <button
                    type="button"
                    aria-label={t("Excluir empresa")}
                    title={t("Excluir empresa")}
                    onClick={(e) => { e.stopPropagation(); setExcluindo(l); }}
                    className="rounded-[6px] p-1 text-casca-meta hover:bg-casca-raia hover:text-casca-texto"
                  >
                    <Trash2 size={17} />
                  </button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      <JanelaDeConfirmacao
        aberta={Boolean(excluindo)}
        aoFechar={() => setExcluindo(null)}
        rotuloDoConfirmar={t("Excluir")}
        perigo
        aoConfirmar={async () => { if (excluindo) { await p.aoExcluir(excluindo); setExcluindo(null); } }}
      >
        <p className="text-[13px] text-casca-texto">
          {t('Tem certeza que deseja excluir "{name}"? Os contatos serão mantidos.').replace("{name}", excluindo?.nome ?? "")}
        </p>
      </JanelaDeConfirmacao>
    </div>
  );
}
```

Confira antes de rodar: o token do fundo do cabeçalho da tabela da 2A (`bg-casca-fundo` ou outro); copie da `TabelaDeContatos`.

Create `hooks/escale/useListaDeEmpresas.ts`:

```ts
"use client";

import { keepPreviousData, useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import type { PaginaDeEmpresas } from "@/lib/escale/empresas/banco";
import type { EscopoDeEmpresas } from "@/lib/escale/empresas/regras";

export interface ConsultaDaTelaDeEmpresas { q?: string; e: EscopoDeEmpresas; p: number; n: number; f?: string }

async function pedir<T>(url: string, init?: RequestInit): Promise<T> {
  const r = await fetch(url, init);
  const corpo = await r.json().catch(() => null);
  if (!r.ok) throw new Error(corpo?.error?.message ?? "Não foi possível completar a ação.");
  return corpo.data as T;
}

export function useListaDeEmpresas(consulta: ConsultaDaTelaDeEmpresas) {
  const qs = new URLSearchParams(Object.entries(consulta).filter(([, v]) => v !== undefined && v !== "").map(([k, v]) => [k, String(v)]));
  return useQuery({
    queryKey: ["companies", "lista-da-casca", consulta],
    queryFn: () => pedir<PaginaDeEmpresas>(`/api/v1/empresas?${qs}`),
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}

export function useExcluirEmpresa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => pedir(`/api/v1/empresas/${id}`, { method: "DELETE" }),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["companies"] }),
  });
}
```

Create `components/escale/empresas/ListaDeEmpresas.tsx`: a página da Clint. Monte com as peças que a `ListaDeContatos` (2A/2B) já usa, nesta ordem:
1. **Cabeçalho** (58px): `<h1>` "Empresas" 20px/500 e, à direita, `BotaoDaCasca variante="marca"` "Nova empresa" (só `ROLE_RANK[papel] >= ROLE_RANK.agent`), que abre a `JanelaNovaEmpresa` (Task 9). Com `?nova=1` na URL (o "Novo +" do topo), ela abre ao montar e o parâmetro sai da URL com `router.replace`.
2. **Barra:** busca (`bg-casca-busca`, 300px, "Buscar por empresa ou CNPJ", 300 ms de espera, `q` na URL); `SeletorDaCasca aparencia="filtro"` do escopo com o ícone `Building2` e as três opções de `ROTULO_DO_ESCOPO` (`e` na URL, padrão "com_nome"); `GatilhoDeFiltro` "Filtros" com o selo da contagem (`contarCondicoes`) que abre um `PainelSuspenso` com `SecaoCamposDoFiltro grupos={["empresa"]} camposDaEmpresa={...}` (`f` na URL por `filtrosParaUrl`); à direita a contagem (`{n}` 15px/600 + `t(n === 1 ? "empresa" : "empresas")`), a dica `t("Refine a busca para ver além das primeiras {max}.")` com `CONTAGEM_MAXIMA` formatado `10.000` quando `total > CONTAGEM_MAXIMA`, o botão Atualizar (`refetch`, dica "Atualizar") e o `PainelDeColunas` com `nativas` das empresas, `campos = camposDeColuna({...catalogo, campos: catalogo.campos.filter((c) => !CAMPOS_QUE_SAO_COLUNAS.has(c.chave))})`, `tituloDosCampos = t("Campos da empresa")`, `padrao = COLUNAS_PADRAO_DE_EMPRESAS`, gravando com `useSalvarColunasDaLista("empresas")`.
3. **`TabelaDeEmpresas`** com `podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager`; `aoExcluir` chama `useExcluirEmpresa`, toast `t('Empresa "{name}" removida.')` ou `t("Não foi possível excluir a empresa. Tente novamente.")`.
4. **Rodapé:** `PaginacaoDaCasca` com `total = Math.min(total, CONTAGEM_MAXIMA)`, `porPagina` lembrado em `escale:empresas:por-pagina` (com `try/catch`), página `p` na URL; mudar busca, escopo ou filtro volta à página 1; página vazia além da 1 volta à 1.

Use o hook `useEstadoDaListaDeContatos` (2B) como molde do estado na URL: copie-o para `hooks/escale/useEstadoDaListaDeEmpresas.ts` com as chaves `q`, `e`, `p`, `f` (sem `v` e sem `fs`).

Create `lib/escale/empresas/pagina.ts`:

```ts
import { requireAuth } from "@/lib/auth/require-auth";
import { resolveActiveOrg } from "@/lib/auth/active-org";
import type { Role } from "@/lib/auth/types";
import { moedaDaOrganizacaoDe } from "@/lib/escale/empresas/banco";
import { createClient } from "@/lib/supabase/server";

/** O que a página de empresas da casca lê no servidor: o papel e a moeda da organização. */
export async function dadosDaPaginaDeEmpresas(): Promise<{ papel: Role; moedaPadrao: string }> {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  const moedaPadrao = await moedaDaOrganizacaoDe(await createClient(), org.orgId);
  return { papel: org.role, moedaPadrao };
}
```

Confira antes de rodar: os nomes e caminhos de `requireAuth`/`resolveActiveOrg` usados por `origensDaPagina()` (2A, `lib/escale/contatos/origens-da-pagina.ts`); copie a forma de lá.

`app/app/companies/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { CompaniesListClient } from "./_client";
// ── FORK ESCALE · Fase 2D: com a casca, a lista de empresas da Clint ──
import { ListaDeEmpresas } from "@/components/escale/empresas/ListaDeEmpresas";
import { dadosDaPaginaDeEmpresas } from "@/lib/escale/empresas/pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  // ── FORK ESCALE · Fase 2D ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    return <ListaDeEmpresas {...await dadosDaPaginaDeEmpresas()} />;
  }
  // ── fim FORK ESCALE ──
  return <CompaniesListClient />;
}
```

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-lista-de-empresas.test.tsx tests/unit/escale-casca-v2-original-intacto.test.ts tests/unit/navegacao-completude.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/empresas hooks/escale lib/escale/empresas app/app/companies
git add components/escale/empresas hooks/escale lib/escale/empresas app/app/companies/page.tsx tests/unit/escale-lista-de-empresas.test.tsx
git commit -m "feat(escale): lista de empresas igual à Clint — busca, escopo, filtros, colunas e lixeira (Fase 2D, E2, E3, E6)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: "Nova empresa" em dois passos e o "Novo +" do topo

**Files:**
- Create: `components/escale/empresas/JanelaNovaEmpresa.tsx`, `components/escale/empresas/PassoContatoDaEmpresa.tsx`, `tests/unit/escale-janela-nova-empresa.test.tsx`
- Modify: `lib/escale/menu-do-topo.ts` (`ACOES_DE_CRIAR`), `tests/unit/escale-menu-do-topo.test.ts` (L101–116)

**Interfaces:**
- Consumes: `POST /api/v1/empresas` (Task 3); `POST /api/v1/contacts` e `GET /api/v1/lista-de-contatos?q=&n=10` (original e 2A); `mascaraDeCnpj`, `lerCnpj` (Task 1); `telefoneE164`, `PAISES_DO_TELEFONE` (2A); `JanelaDaCasca`, `CabecaDaJanela`, `Campo`, `CampoDeTexto`, `BotaoDaJanela`, `RodapeDaJanela`; `AlternanciaDaCasca`.
- Produces:
  - `JanelaNovaEmpresa({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void })`: ao criar, toast `Empresa "{name}" criada e vinculada a {contact}.`, invalida `["companies"]` e `["contacts"]` e abre `/app/companies/{id}`;
  - `PassoContatoDaEmpresa({ valor, aoMudar }: { valor: EscolhaDoContato; aoMudar })` com `type EscolhaDoContato = { modo: "existente"; contato: { id: string; nome: string } | null } | { modo: "novo"; nome: string; ddi: string; telefone: string; email: string }`;
  - `ACOES_DE_CRIAR` ganha `{ id: "empresa", rotulo: "Empresa", href: "/app/companies?nova=1", destino: "/app/companies" }`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-janela-nova-empresa.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { JanelaNovaEmpresa } from "@/components/escale/empresas/JanelaNovaEmpresa";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }) }));
const sucesso = vi.fn();
vi.mock("sonner", () => ({ toast: { success: (...a: unknown[]) => sucesso(...a), error: vi.fn() } }));

const chamadas: Array<{ url: string; corpo?: unknown }> = [];
vi.stubGlobal("fetch", vi.fn(async (url: string, init?: RequestInit) => {
  chamadas.push({ url, corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
  if (url.startsWith("/api/v1/lista-de-contatos")) {
    return new Response(JSON.stringify({ data: { linhas: [{ id: "c1", nome: "Alex", telefone: "+5553999998393", email: null }], total: 1 } }));
  }
  if (url === "/api/v1/contacts") return new Response(JSON.stringify({ data: { contact: { id: "c9", name: "Bia" } } }), { status: 201 });
  if (url === "/api/v1/empresas") return new Response(JSON.stringify({ data: { id: "e1" } }), { status: 201 });
  return new Response("{}", { status: 404 });
}));

const montar = () => render(<QueryClientProvider client={new QueryClient()}><JanelaNovaEmpresa aberta aoFechar={vi.fn()} /></QueryClientProvider>);

describe("JanelaNovaEmpresa (OrganizationCreateWizard da Clint)", () => {
  it("passo Empresa: título, subtítulo, CNPJ com máscara, Continuar só com o nome", () => {
    montar();
    expect(screen.getByText("Nova empresa")).toBeInTheDocument();
    expect(screen.getByText("Dados da empresa — no próximo passo você vincula um contato.")).toBeInTheDocument();
    const continuar = screen.getByRole("button", { name: "Continuar" });
    expect(continuar).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11222333000181" } });
    expect(screen.getByDisplayValue("11.222.333/0001-81")).toBeInTheDocument();
    expect(continuar).toBeEnabled();
  });

  it("CNPJ inválido segura o Continuar com o aviso", () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.change(screen.getByPlaceholderText("00.000.000/0000-00"), { target: { value: "11222333000180" } });
    expect(screen.getByText("CNPJ inválido.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Continuar" })).toBeDisabled();
  });

  it("passo Contato: vincular existente cria a empresa com ele e abre a ficha", async () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    expect(screen.getByText("Contato da empresa")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar contato por nome, telefone ou e-mail"), { target: { value: "Ale" } });
    fireEvent.click(await screen.findByRole("option", { name: /Alex/ }));
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    await waitFor(() => expect(push).toHaveBeenCalledWith("/app/companies/e1"));
    expect(chamadas.find((c) => c.url === "/api/v1/empresas")?.corpo).toEqual({ nome: "Atlas", cnpj: "", site: "", contato_id: "c1" });
    expect(sucesso).toHaveBeenCalledWith('Empresa "Atlas" criada e vinculada a Alex.');
  });

  it("criar novo: cria o contato primeiro e depois a empresa; Voltar mantém o passo 1", async () => {
    montar();
    fireEvent.change(screen.getByPlaceholderText("Ex.: Atlas Distribuidora"), { target: { value: "Atlas" } });
    fireEvent.click(screen.getByRole("button", { name: "Continuar" }));
    fireEvent.click(screen.getByRole("radio", { name: "Criar novo" }));
    expect(screen.getByText("Será definido como contato principal da empresa e aparecerá em destaque na listagem.")).toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Bia" } });
    fireEvent.click(screen.getByRole("button", { name: "Criar empresa" }));
    await waitFor(() => expect(chamadas.find((c) => c.url === "/api/v1/empresas")?.corpo).toMatchObject({ contato_id: "c9" }));
    expect(chamadas.find((c) => c.url === "/api/v1/contacts")?.corpo).toMatchObject({ name: "Bia", source: "manual" });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-janela-nova-empresa.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os componentes**

Create `components/escale/empresas/PassoContatoDaEmpresa.tsx`:

```tsx
"use client";

import { useEffect, useState } from "react";

import { CampoDeTexto, Campo } from "@/components/escale/origens/JanelaDaCasca";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { Search, Star } from "@/lib/ui/icons-da-casca";

export type EscolhaDoContato =
  | { modo: "existente"; contato: { id: string; nome: string } | null }
  | { modo: "novo"; nome: string; ddi: string; telefone: string; email: string };

interface Achado { id: string; nome: string; telefone: string | null; email: string | null }

/** O passo "Contato" da "Nova empresa": vincular existente ou criar novo (vira o principal). */
export function PassoContatoDaEmpresa({ valor, aoMudar }: { valor: EscolhaDoContato; aoMudar: (v: EscolhaDoContato) => void }) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [achados, setAchados] = useState<Achado[] | null>(null);

  useEffect(() => {
    if (valor.modo !== "existente") return;
    const termo = busca.trim();
    const timer = setTimeout(async () => {
      const r = await fetch(`/api/v1/lista-de-contatos?n=10${termo.length >= 2 ? `&q=${encodeURIComponent(termo)}` : ""}`);
      const corpo = await r.json().catch(() => null);
      setAchados(((corpo?.data?.linhas ?? []) as Achado[]).map((l) => ({ id: l.id, nome: l.nome, telefone: l.telefone, email: l.email })));
    }, 300);
    return () => clearTimeout(timer);
  }, [busca, valor.modo]);

  return (
    <div className="flex flex-col gap-4">
      <AlternanciaDaCasca
        aria-label={t("Contato")}
        valor={valor.modo}
        opcoes={[{ valor: "existente", rotulo: t("Vincular existente") }, { valor: "novo", rotulo: t("Criar novo") }]}
        aoMudar={(m) => aoMudar(m === "novo" ? { modo: "novo", nome: "", ddi: "55", telefone: "", email: "" } : { modo: "existente", contato: null })}
      />
      {valor.modo === "existente" ? (
        <div className="flex flex-col gap-2">
          <label className="relative block">
            <CampoDeTexto value={busca} onChange={(e) => setBusca(e.target.value)} placeholder={t("Buscar contato por nome, telefone ou e-mail")} />
            <Search size={15} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-casca-meta" />
          </label>
          {!busca.trim() && <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-meta">{t("Contatos recentes")}</p>}
          <ul role="listbox" aria-label={t("Contatos")} className="max-h-[260px] overflow-y-auto">
            {achados?.length === 0 && (
              <li className="py-6 text-center text-[13px] text-casca-suave">{busca.trim() ? t("Nenhum contato encontrado.") : t("Nenhum contato cadastrado ainda.")}</li>
            )}
            {achados?.map((c) => {
              const escolhido = valor.contato?.id === c.id;
              return (
                <li
                  key={c.id}
                  role="option"
                  aria-selected={escolhido}
                  onClick={() => aoMudar({ modo: "existente", contato: { id: c.id, nome: c.nome } })}
                  className={`flex cursor-pointer items-center justify-between rounded-[6px] px-3 py-2 ${escolhido ? "bg-casca-marca-suave" : "hover:bg-casca-raia"}`}
                >
                  <span>
                    <span className="block text-[13px] font-medium text-casca-texto">{c.nome}</span>
                    <span className="block text-[12px] text-casca-suave">{c.telefone ? formatarTelefone(c.telefone) : (c.email ?? "")}</span>
                  </span>
                  {escolhido && <Star size={14} className="fill-current text-casca-marca" />}
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <Campo rotulo={t("Nome do contato")} obrigatorio>
            <CampoDeTexto autoFocus value={valor.nome} onChange={(e) => aoMudar({ ...valor, nome: e.target.value })} placeholder={t("Digite o nome do contato")} />
          </Campo>
          <Campo rotulo={t("Telefone")}>
            <CampoDeTexto inputMode="tel" value={valor.telefone} onChange={(e) => aoMudar({ ...valor, telefone: e.target.value })} placeholder="(11) 99999-9999" />
          </Campo>
          <Campo rotulo={t("Email")}>
            <CampoDeTexto type="email" value={valor.email} onChange={(e) => aoMudar({ ...valor, email: e.target.value })} />
          </Campo>
          <p className="rounded-[6px] bg-casca-marca-suave px-3 py-2 text-[12px] text-casca-texto">
            {t("Será definido como contato principal da empresa e aparecerá em destaque na listagem.")}
          </p>
        </div>
      )}
    </div>
  );
}
```

Confira antes de rodar: a API da `AlternanciaDaCasca` (2B: `valor`, `opcoes`, `aoMudar` e `role="radio"` nos itens? O teste clica `getByRole("radio", { name: "Criar novo" })`; se ela usar `tab`, ajuste o teste para o papel real).

Create `components/escale/empresas/JanelaNovaEmpresa.tsx`:

```tsx
"use client";

import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, CabecaDaJanela, Campo, CampoDeTexto, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { telefoneE164 } from "@/lib/escale/contatos/regras";
import { lerCnpj, mascaraDeCnpj } from "@/lib/escale/empresas/regras";
import { ArrowLeft, ChevronRight } from "@/lib/ui/icons-da-casca";

import { type EscolhaDoContato, PassoContatoDaEmpresa } from "./PassoContatoDaEmpresa";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function Passos({ atual }: { atual: "empresa" | "contato" }) {
  const t = useT();
  const passos: Array<["empresa" | "contato", number, string]> = [["empresa", 1, t("Empresa")], ["contato", 2, t("Contato")]];
  return (
    <span className="flex items-center gap-2">
      {passos.map(([chave, n, rotulo], i) => (
        <span key={chave} className="flex items-center gap-2">
          {i > 0 && <span className="text-casca-meta">›</span>}
          <span className={`flex size-[18px] items-center justify-center rounded-full text-[10px] font-semibold ${atual === chave ? "bg-casca-marca text-white" : "bg-casca-raia text-casca-suave"}`}>{n}</span>
          <span className={`text-[12px] ${atual === chave ? "text-casca-texto" : "text-casca-suave"}`}>{rotulo}</span>
        </span>
      ))}
    </span>
  );
}

/** "Nova empresa" da Clint (OrganizationCreateWizard): Empresa → Contato. */
export function JanelaNovaEmpresa({ aberta, aoFechar }: { aberta: boolean; aoFechar: () => void }) {
  const t = useT();
  const router = useRouter();
  const qc = useQueryClient();
  const [passo, setPasso] = useState<"empresa" | "contato">("empresa");
  const [nome, setNome] = useState("");
  const [cnpj, setCnpj] = useState("");
  const [site, setSite] = useState("");
  const [contato, setContato] = useState<EscolhaDoContato>({ modo: "existente", contato: null });
  const [criando, setCriando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!aberta) return;
    setPasso("empresa"); setNome(""); setCnpj(""); setSite(""); setErro(null);
    setContato({ modo: "existente", contato: null });
  }, [aberta]);

  const cnpjLido = lerCnpj(cnpj);
  const podeContinuar = nome.trim().length > 0 && cnpjLido.ok;
  const contatoPronto =
    contato.modo === "existente"
      ? Boolean(contato.contato)
      : contato.nome.trim().length > 0 && (!contato.email.trim() || EMAIL.test(contato.email.trim())) && (!contato.telefone.trim() || Boolean(telefoneE164(contato.ddi, contato.telefone)));

  const resolverContato = async (): Promise<{ id: string; nome: string } | null> => {
    if (contato.modo === "existente") return contato.contato;
    const telefone = contato.telefone.trim() ? telefoneE164(contato.ddi, contato.telefone) : null;
    const r = await fetch("/api/v1/contacts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ source: "manual", name: contato.nome.trim(), ...(telefone ? { phone_number: telefone } : {}), ...(contato.email.trim() ? { email: contato.email.trim() } : {}) }),
    });
    const corpo = await r.json().catch(() => null);
    if (!r.ok) {
      setErro(corpo?.error?.code === "contact_exists" ? t("Telefone já cadastrado.") : t("Falha ao criar o contato."));
      return null;
    }
    return { id: String(corpo.data.contact.id), nome: String(corpo.data.contact.name ?? contato.nome.trim()) };
  };

  const criar = async () => {
    if (criando || !contatoPronto) return;
    setCriando(true);
    setErro(null);
    try {
      const escolhido = await resolverContato();
      if (!escolhido) return;
      const r = await fetch("/api/v1/empresas", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ nome: nome.trim(), cnpj: cnpj.trim(), site: site.trim(), contato_id: escolhido.id }),
      });
      const corpo = await r.json().catch(() => null);
      if (!r.ok) {
        setErro(corpo?.error?.message ?? t("Não foi possível criar a empresa. Tente novamente."));
        return;
      }
      toast.success(t('Empresa "{name}" criada e vinculada a {contact}.').replace("{name}", nome.trim()).replace("{contact}", escolhido.nome || t("o contato")));
      void qc.invalidateQueries({ queryKey: ["companies"] });
      void qc.invalidateQueries({ queryKey: ["contacts"] });
      aoFechar();
      router.push(`/app/companies/${corpo.data.id}`);
    } finally {
      setCriando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(640px,100%)]">
      <div className="flex items-center gap-3 pr-6">
        {passo === "contato" && (
          <button type="button" aria-label={t("Voltar")} onClick={() => setPasso("empresa")} className="ml-6 rounded-[6px] p-1 text-casca-suave hover:bg-casca-raia"><ArrowLeft size={16} /></button>
        )}
        <CabecaDaJanela
          titulo={passo === "empresa" ? t("Nova empresa") : t("Contato da empresa")}
          descricao={passo === "empresa" ? t("Dados da empresa — no próximo passo você vincula um contato.") : undefined}
        />
      </div>
      <div className="flex flex-col gap-3 px-6 py-4">
        {passo === "empresa" ? (
          <>
            <Campo rotulo={t("Nome da empresa")} obrigatorio>
              <CampoDeTexto autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("Ex.: Atlas Distribuidora")} />
            </Campo>
            <Campo rotulo={t("CNPJ")}>
              <CampoDeTexto inputMode="numeric" value={cnpj} onChange={(e) => setCnpj(mascaraDeCnpj(e.target.value))} placeholder="00.000.000/0000-00" />
              {cnpjLido.ok ? (
                <p className="mt-1 text-[11px] text-casca-meta">{t("Opcional. Ajuda a identificar duplicidades automaticamente.")}</p>
              ) : (
                <p className="mt-1 text-[11px] text-casca-alerta">{t("CNPJ inválido.")}</p>
              )}
            </Campo>
            <Campo rotulo={t("Site")}>
              <CampoDeTexto value={site} onChange={(e) => setSite(e.target.value)} placeholder="empresa.com.br" />
            </Campo>
          </>
        ) : (
          <PassoContatoDaEmpresa valor={contato} aoMudar={setContato} />
        )}
        {erro && <p className="text-[12px] text-casca-alerta">{erro}</p>}
      </div>
      <RodapeDaJanela>
        {passo === "empresa" ? (
          <div className="flex w-full items-center justify-between gap-3">
            <Passos atual="empresa" />
            <span className="flex gap-2.5">
              <BotaoDaJanela variante="cancelar" onClick={aoFechar}>{t("Cancelar")}</BotaoDaJanela>
              <BotaoDaJanela variante="salvar" disabled={!podeContinuar} title={!podeContinuar ? t("Informe o nome da empresa.") : undefined} onClick={() => setPasso("contato")}>
                {t("Continuar")} <ChevronRight size={14} />
              </BotaoDaJanela>
            </span>
          </div>
        ) : (
          <div className="flex w-full items-center justify-between gap-3">
            <BotaoDaJanela variante="cancelar" onClick={() => setPasso("empresa")} disabled={criando}>
              <ArrowLeft size={14} /> {t("Voltar")}
            </BotaoDaJanela>
            <BotaoDaJanela variante="salvar" onClick={criar} disabled={!contatoPronto || criando} title={!contatoPronto ? t("Escolha ou crie o contato.") : undefined}>
              {criando ? t("Criando…") : t("Criar empresa")}
            </BotaoDaJanela>
          </div>
        )}
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Em `lib/escale/menu-do-topo.ts`: o `id` de `AcaoDeCriar` aceita `"empresa"` e `ACOES_DE_CRIAR` ganha, logo depois de "contato", `{ id: "empresa", rotulo: "Empresa", href: "/app/companies?nova=1", destino: "/app/companies" }` (o `acoesDeCriar` só oferece a ação quando `/app/companies` está visível e o papel é atendente ou acima: confira a regra de papel das outras ações e use a mesma). Em `tests/unit/escale-menu-do-topo.test.ts` (L101–116), a lista esperada das ações ganha "Empresa" depois de "Contato".

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-janela-nova-empresa.test.tsx tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/controle-decorativo.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add components/escale/empresas lib/escale/menu-do-topo.ts tests/unit
git commit -m "feat(escale): Nova empresa em dois passos e o atalho no Novo + (Fase 2D, E4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 10: A ficha da empresa — resumo e abas Contatos, Negócios e Dados

**Files:**
- Create: `hooks/escale/useEmpresa.ts`, `components/escale/empresas/FichaDaEmpresa.tsx`, `components/escale/empresas/AbaContatosDaEmpresa.tsx`, `components/escale/empresas/AbaNegociosDaEmpresa.tsx`, `components/escale/empresas/AbaDadosDaEmpresa.tsx`, `components/escale/empresas/JanelaRemoverDaEmpresa.tsx`, `components/escale/empresas/JanelaVincularContato.tsx`, `tests/unit/escale-ficha-da-empresa.test.tsx`
- Modify: `app/app/companies/[id]/page.tsx` (encaixe)

**Interfaces:**
- Consumes: as rotas da Task 4; `camposDaEmpresaComGrupos`, `gruposDaFicha` (2C), `useCatalogoDeCampos("empresa")`, `CamposDaFicha`, `JanelaDeGerenciarCampos` (2C); `desfechoDaRemocao` (Task 1); `Monograma`; `JanelaNovoContato` (2A, para "Novo contato"); `JanelaNovoNegocio` (2A, para "Adicionar negócio").
- Produces:
  - `useEmpresa(id)`, `useContatosDaEmpresa(id)`, `useNegociosDaEmpresa(id)` (chaves `["companies", id]`, `["companies", id, "contatos"]`, `["companies", id, "negocios"]`); `useMudarEmpresa(id)` com `mudarCampo({chave, valor})`, `vincular(contatoId)`, `remover({contatoId, novoPrincipal})`, `tornarPrincipal(contatoId | null)`, `excluir()` — cada um invalida `["companies"]` e `["contacts"]`;
  - `FichaDaEmpresa({ id, papel, podeAdministrar }: { id: string; papel: Role; podeAdministrar: boolean })`: aba na URL `?aba=contatos|negocios|dados` (padrão `contatos`), trocada com `history.replaceState` como a ficha do negócio (1G);
  - `AbaContatosDaEmpresa({ empresa, contatos, podeEditar })`, `AbaNegociosDaEmpresa({ negocios, moeda })`, `AbaDadosDaEmpresa({ empresa, podeEditar, podeAdministrar, podeConsultarCnpj })`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-da-empresa.test.tsx` com `fetch` mockado por URL (`/api/v1/empresas/e1` → a ficha; `/contatos` → dois contatos, Alex principal com 1 negócio e Bia; `/negocios` → um negócio; `/api/v1/campos-do-crm?objeto=empresa` → o catálogo com os quatro padrão), e os casos:

```tsx
  it("o resumo: Valor em aberto R$ 1.500,50, Contato principal Alex, Criada em 01/10/2026; as três abas", async () => {
    montar();
    expect(await screen.findByText("Atlas Distribuidora")).toBeInTheDocument();
    expect(screen.getByText("R$ 1.500,50")).toBeInTheDocument();
    expect(within(screen.getByTestId("resumo-da-empresa")).getByText("Alex")).toBeInTheDocument();
    expect(screen.getByText("01/10/2026")).toBeInTheDocument();
    for (const aba of ["Contatos", "Negócios", "Dados"]) expect(screen.getByRole("tab", { name: aba })).toBeInTheDocument();
  });

  it("Contatos: a estrela do principal, 'Tornar contato principal' na Bia, e remover o principal pede o novo", async () => {
    montar();
    await screen.findByText("Bia");
    expect(screen.getByRole("button", { name: "Contato principal · clique para remover" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Ações de Bia" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Tornar contato principal" }));
    await waitFor(() => expect(chamadas).toContainEqual({ url: "/api/v1/empresas/e1/principal", metodo: "PUT", corpo: { contato_id: "c2" } }));
    fireEvent.click(screen.getByRole("button", { name: "Ações de Alex" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Remover da empresa" }));
    expect(await screen.findByText("Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Definir e remover" })).toBeDisabled();
  });

  it("Negócios: busca e as colunas Negócio, Origem, Etapa, Status, Valor", async () => {
    montar("negocios");
    expect(await screen.findByPlaceholderText("Buscar negócios")).toBeInTheDocument();
    for (const c of ["Negócio", "Origem", "Etapa", "Status", "Valor"]) expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
  });

  it("Dados: os oito campos da Clint, editáveis para atendente; Excluir empresa só para gerente", async () => {
    montar("dados", "agent");
    for (const r of ["Nome da empresa", "Site", "Cidade", "Estado", "Categoria", "Segmento", "Número de funcionários", "CNPJ"]) {
      expect(await screen.findByText(r)).toBeInTheDocument();
    }
    expect(screen.queryByRole("menuitem", { name: "Excluir empresa" })).not.toBeInTheDocument();
  });
```

(`montar(aba = "contatos", papel = "manager")` monta `FichaDaEmpresa` com `window.history.replaceState(null, "", "?aba=" + aba)` antes; `chamadas` guarda `{ url, metodo, corpo }`.)

Run: `corepack pnpm vitest run tests/unit/escale-ficha-da-empresa.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os componentes**

`hooks/escale/useEmpresa.ts`: três `useQuery` (`pedir` como na Task 8) e `useMudarEmpresa(id)` com as cinco `useMutation` (rotas da tabela da Task 4).

`FichaDaEmpresa.tsx`, de cima para baixo:
1. **Topo** (58px): `← Empresas` (link para `/app/companies`, ícone `ArrowLeft`), o `Monograma` 36px, o nome 18px/500 e, à direita, o ⋮ com "Excluir empresa" (só `ROLE_RANK[papel] >= ROLE_RANK.manager`; para os outros o item não aparece) que abre a confirmação da lista (`Tem certeza que deseja excluir "{name}"? Os contatos serão mantidos.`) e, ao confirmar, toast `Empresa removida.` e `router.push("/app/companies")`.
2. **Resumo** (`data-testid="resumo-da-empresa"`), três blocos lado a lado com rótulo 11px/600 maiúsculo `casca-meta` e valor: "Valor em aberto" (24px/600, `Intl.NumberFormat("pt-BR", { style: "currency", currency: empresa.moeda })`), "Contato principal" (foto 24px + nome 14px/500, "—" sem principal) e "Criada em" (`dd/mm/aaaa` com `Intl.DateTimeFormat("pt-BR")`).
3. **Abas** `AbasDaCasca` Contatos / Negócios / Dados; a aba em `?aba=`.
4. **Estados:** carregando (esqueleto do resumo e de 5 linhas), 404 (`Empresa não encontrada` + `Ela pode ter sido excluída ou você não tem acesso a ela.` + link "Empresas"), erro (`Não foi possível carregar a empresa.` + "Tentar de novo").

`AbaContatosDaEmpresa.tsx`: barra com "Vincular existente" (`BotaoDaCasca variante="novo"`, abre a `JanelaVincularContato`) e "Novo contato" (`variante="marca"`, abre a `JanelaNovoContato` da 2A e, no `aoCriar(contato)`, chama `vincular(contato.id)`; se a `JanelaNovoContato` não expõe o contato criado, acrescente a prop `aoCriar?: (c: { id: string; nome: string }) => void` a ela); tabela Nome (foto + nome; a estrela `Star` cheia antes do nome do principal é um botão com `aria-label` "Contato principal · clique para remover" que chama `tornarPrincipal(null)`), Contato (telefone formatado e e-mail), Tags (os chips da 2A), Negócios ("Ver {n} negócio" → `/app/negocios/{negocio_unico}` com um, `/app/contacts/{id}` com mais; "Adicionar negócio" sem) e ⋮ (`aria-label` "Ações de {nome}") com "Tornar contato principal" (só quem não é) e "Remover da empresa". Só `ROLE_RANK[papel] >= ROLE_RANK.agent` vê os botões e o ⋮. Toasts: "Contato definido como principal.", "Contato removido como principal.", "Contato removido da empresa.", "Não foi possível atualizar o contato principal.", "Não foi possível remover o contato da empresa.". Vazio: "Nenhum contato nesta empresa" + "Os contatos vinculados a esta empresa aparecerão aqui.".

`JanelaRemoverDaEmpresa.tsx`: recebe `contatos` e o `alvo`; usa `desfechoDaRemocao`:
- `simples` → `JanelaDeConfirmacao` "Remover da empresa" com o nome;
- `escolher_principal` → o texto "Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo.", um `SeletorDaCasca aparencia="janela"` ("Selecione o novo contato principal") com os outros e o botão "Definir e remover" desligado sem escolha;
- `ultimo` → o aviso "Este é o último contato da empresa. Ao removê-lo, a empresa será excluída." com o botão em perigo; com o desfecho `empresa_excluida`, toast "Empresa removida." e volta para `/app/companies`.

`JanelaVincularContato.tsx`: título "Vincular contato existente", o mesmo `PassoContatoDaEmpresa` travado no modo "existente" (prop `soExistente`), botão "Vincular contato" ("Salvando…" enquanto grava), toast `Contato {name} adicionado à empresa.` ou "Não foi possível adicionar o contato. Tente novamente.". Vincular um contato que já tem outra empresa tira ele de lá (N4): a janela mostra o aviso nosso "Este contato sai da empresa atual." quando a linha da busca traz `empresa` (Task 5).

`AbaNegociosDaEmpresa.tsx`: busca local "Buscar negócios" (filtra pelo título e pelo contato), tabela Negócio (título 14px/500 + contato 12px `casca-suave`; clique → `/app/negocios/{id}`), Origem, Etapa, Status (a pílula da 1G: Aberto / Ganho `#15803D` / Perdido `#B91C1C` pelos tokens que a `StatusDaFicha` usa) e Valor (na moeda do negócio, "—" sem valor). Vazio: "Nenhum negócio nesta empresa" + "Os negócios desta empresa aparecerão aqui.".

`AbaDadosDaEmpresa.tsx`: a `CamposDaFicha` da 2C com `icone={<Building2 size={16} />}`, `titulo={t("Campos de empresa")}`, `tipo="empresa"`, `campos = camposDaEmpresaComGrupos({ nome: empresa.nome, cidade: empresa.cidade, estado: empresa.estado, cnpj: empresa.cnpj, ...empresa.campos }, catalogo)`, `grupos = gruposDaFicha(catalogo)`, `aoSalvar = podeEditar ? (campo, valor) => mudarCampo.mutateAsync({ chave: campo.chave, valor }) : undefined`, `aoGerenciar = podeAdministrar ? () => setJanela(true) : undefined` (a `JanelaDeGerenciarCampos` com `objetoInicial="empresa"`). Abaixo, para gerente ou acima e com CNPJ, o botão "Consultar CNPJ" (`BotaoDaCasca variante="novo"`) que chama `GET /api/v1/companies/lookup?cnpj=` do original e grava Cidade e Estado vindos de `fields.city`/`fields.state` pelo `mudarCampo` (toast "Dados do CNPJ aplicados." ou a mensagem da rota). Sem dados: "Sem dados adicionais".

`app/app/companies/[id]/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { CompanyDetailClient } from "./_client";
// ── FORK ESCALE · Fase 2D: com a casca, a ficha da empresa da Clint ──
import { FichaDaEmpresa } from "@/components/escale/empresas/FichaDaEmpresa";
import { dadosDaPaginaDeEmpresas } from "@/lib/escale/empresas/pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 2D ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const { papel } = await dadosDaPaginaDeEmpresas();
    return <FichaDaEmpresa id={id} papel={papel} podeAdministrar={papel === "admin"} />;
  }
  // ── fim FORK ESCALE ──
  return <CompanyDetailClient id={id} />;
}
```

(O `podeAdministrar` segue o `podeAdministrarEmpresa` da 1F-a: se a página tiver o usuário à mão, use `podeAdministrarEmpresa(user, org)`, que também cobre o administrador da plataforma.)

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-ficha-da-empresa.test.tsx tests/unit/escale-casca-v2-original-intacto.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/empresas hooks/escale/useEmpresa.ts app/app/companies
git add components/escale/empresas hooks/escale/useEmpresa.ts app/app/companies/[id]/page.tsx components/escale/contatos/JanelaNovoContato.tsx tests/unit/escale-ficha-da-empresa.test.tsx
git commit -m "feat(escale): ficha da empresa — resumo, Contatos com o principal, Negócios e Dados (Fase 2D, E5)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 11: A aba Empresa da ficha do negócio — ver, vincular e trocar (E7, E8)

**Files:**
- Create: `hooks/escale/useEmpresaDoContato.ts`, `components/escale/empresas/SeletorDeEmpresa.tsx`, `components/escale/empresas/JanelaTrocarEmpresa.tsx`, `tests/unit/escale-aba-empresa-do-negocio.test.tsx`
- Modify: `components/escale/negocio/abas/AbasDeCampos.tsx` (`AbaEmpresa`), `components/escale/negocio/ConteudoDaAba.tsx` (passa `lead`), `lib/escale/campos/da-ficha.ts` (a linha "Nome da empresa" com `origem: "empresa"`), `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`

**Interfaces:**
- Consumes: `GET/PUT /api/v1/contatos/[id]/empresa`, `PATCH /api/v1/empresas/[id]` (Task 4); `GET /api/v1/empresas?q=&e=com_nome&n=10` (Task 3).
- Produces:
  - `useEmpresaDoContato(contatoId | null)` (chave `["empresa-do-contato", contatoId]`) e `useTrocarEmpresa(contatoId)` (PUT; invalida a chave e `["companies"]`);
  - `SeletorDeEmpresa({ atual, aoEscolher }: { atual: { id; nome } | null; aoEscolher: (e: { id: string; nome: string } | { nova: string }) => void })`: busca as empresas com nome, a última opção é `Criar a empresa "{nome}"`;
  - `JanelaTrocarEmpresa({ aberta, nome, aoFechar, aoConfirmar(campos: "manter" | "limpar") })`;
  - `CampoEditavel.origem` aceita `"empresa"` (a linha do nome, desenhada pelo `SeletorDeEmpresa`).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-aba-empresa-do-negocio.test.tsx` com `fetch` mockado (`GET /api/v1/contatos/c1/empresa` → `null` no primeiro caso e a empresa Atlas nos outros; `GET /api/v1/empresas?…` → Atlas e Beta; `PUT` → a nova empresa; `GET /api/v1/campos-do-crm?objeto=empresa` → os quatro padrão), montando `<AbaEmpresa lead={{ id: "l1", contact_id: "c1" } as never} />`:

```tsx
  it("sem empresa: só 'Nome da empresa' editável, com a busca que vincula", async () => {
    montar(null);
    const seletor = await screen.findByRole("combobox", { name: "Nome da empresa" });
    fireEvent.click(seletor);
    fireEvent.click(await screen.findByRole("option", { name: "Beta" }));
    await waitFor(() => expect(chamadas).toContainEqual({ url: "/api/v1/contatos/c1/empresa", metodo: "PUT", corpo: { empresa_id: "e2" } }));
  });

  it("com empresa: os campos editáveis e o atalho 'Ver dados da empresa Atlas'", async () => {
    montar(ATLAS);
    expect(await screen.findByRole("link", { name: "Ver dados da empresa Atlas" })).toHaveAttribute("href", "/app/companies/e1?aba=dados");
    fireEvent.change(screen.getByLabelText("Cidade"), { target: { value: "Pelotas" } });
    fireEvent.keyDown(screen.getByLabelText("Cidade"), { key: "Enter" });
    await waitFor(() => expect(chamadas).toContainEqual({ url: "/api/v1/empresas/e1", metodo: "PATCH", corpo: { chave: "cidade", valor: "Pelotas" } }));
  });

  it("digitar um nome novo com empresa atual abre 'Nova empresa' (Manter / Limpar)", async () => {
    montar(ATLAS);
    fireEvent.click(await screen.findByRole("combobox", { name: "Nome da empresa" }));
    fireEvent.change(screen.getByPlaceholderText("Escolha a empresa ou digite um nome novo"), { target: { value: "Gama" } });
    fireEvent.click(await screen.findByRole("option", { name: 'Criar a empresa "Gama"' }));
    expect(screen.getByText("Selecione o que deseja fazer com os campos da nova empresa:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("radio", { name: /Manter informações dos campos/ }));
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() => expect(chamadas).toContainEqual({ url: "/api/v1/contatos/c1/empresa", metodo: "PUT", corpo: { nova: { nome: "Gama", campos: "manter" } } }));
  });
```

Run: `corepack pnpm vitest run tests/unit/escale-aba-empresa-do-negocio.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Implementar**

`ConteudoDaAba.tsx`: `case "empresa": return <AbaEmpresa lead={ficha.lead} />;`.

`AbaEmpresa({ lead })` em `AbasDeCampos.tsx`:

```tsx
export function AbaEmpresa({ lead }: { lead: Lead }) {
  const t = useT();
  const podeEditar = usePermission("contact.create"); // atendente ou acima (PRD §5)
  const podeAdministrar = usePermission("settings.write");
  const { catalogo } = useCatalogoDeCampos("empresa");
  const { data: empresa, isLoading } = useEmpresaDoContato(lead.contact_id ?? null);
  const trocar = useTrocarEmpresa(lead.contact_id ?? null);
  const mudar = useMudarEmpresa(empresa?.id ?? null);
  const [janela, setJanela] = useState<"gerenciar" | { nova: string } | null>(null);

  if (!lead.contact_id) {
    return <CamposDaFicha icone={<Building2 size={16} />} titulo={t("Campos de empresa")} tipo="empresa" campos={[]} dicaDoVazio={t("Este negócio não tem contato.")} />;
  }
  const valores = empresa ? { nome: empresa.nome, cidade: empresa.cidade, estado: empresa.estado, cnpj: empresa.cnpj, ...empresa.campos } : null;
  const campos = camposDaEmpresaComGrupos(valores, catalogo).map((c) =>
    c.chave === "nome" ? { ...c, origem: "empresa" as const, travado: !podeEditar } : { ...c, travado: c.travado || !podeEditar },
  );
  const escolher = (e: { id: string; nome: string } | { nova: string }) => {
    if ("id" in e) return trocar.mutate({ empresa_id: e.id });
    if (empresa) return setJanela({ nova: e.nova });
    trocar.mutate({ nova: { nome: e.nova, campos: "limpar" } });
  };
  return (
    <>
      <CamposDaFicha
        icone={<Building2 size={16} />}
        titulo={t("Campos de empresa")}
        tipo="empresa"
        campos={isLoading ? [] : campos}
        grupos={gruposDaFicha(catalogo)}
        aoSalvar={empresa && podeEditar ? (campo, valor) => mudar.mudarCampo.mutateAsync({ chave: campo.chave, valor }) : undefined}
        aoGerenciar={podeAdministrar ? () => setJanela("gerenciar") : undefined}
        linhaEspecial={(campo) =>
          campo.origem === "empresa" ? (
            <div className="flex items-center gap-2">
              <SeletorDeEmpresa atual={empresa ? { id: empresa.id, nome: empresa.nome } : null} aoEscolher={escolher} desabilitado={!podeEditar} />
              {empresa && (
                <Link href={`/app/companies/${empresa.id}?aba=dados`} aria-label={t("Ver dados da empresa {companyName}").replace("{companyName}", empresa.nome)} className="text-casca-marca">
                  <ExternalLink size={14} />
                </Link>
              )}
            </div>
          ) : null
        }
      />
      {janela === "gerenciar" && <JanelaDeGerenciarCampos aberta aoFechar={() => setJanela(null)} objetoInicial="empresa" />}
      {janela && janela !== "gerenciar" && (
        <JanelaTrocarEmpresa
          aberta
          nome={janela.nova}
          aoFechar={() => setJanela(null)}
          aoConfirmar={(modo) => trocar.mutate({ nova: { nome: janela.nova, campos: modo } }, { onSuccess: () => setJanela(null) })}
        />
      )}
    </>
  );
}
```

Na `CamposDaFicha` (2C), acrescente a prop `linhaEspecial?: (campo: CampoEditavel) => ReactNode | null`: quando devolve algo, a linha mostra o rótulo e esse conteúdo no lugar do editor. `useMudarEmpresa(null)` precisa aceitar `null` (as mutações ficam desligadas). Em `lib/escale/negocio/campos.ts`, `OrigemDoCampo` ganha `"empresa"`.

`SeletorDeEmpresa.tsx`: um `Popover` com o gatilho `role="combobox"` e `aria-label={t("Nome da empresa")}` mostrando `atual?.nome` ou "Clique aqui para adicionar" (`casca-meta`), no visual da caixa de campo da 1H (fundo `casca-busca`, 32px, canto 6px); dentro, `CampoDeTexto` "Escolha a empresa ou digite um nome novo" (300 ms) que busca `GET /api/v1/empresas?q=…&e=com_nome&n=10` e lista `role="option"` com o `Monograma` 24px e o nome; quando o texto não bate exatamente com nenhum resultado, a última opção é `t('Criar a empresa "{nome}"')`.

`JanelaTrocarEmpresa.tsx`: `JanelaDaCasca` de 640px com o cabeçalho "Nova empresa", o texto 13px/500 "Selecione o que deseja fazer com os campos da nova empresa:" e dois cartões `role="radio"` (borda `casca-marca` no escolhido): "Manter informações dos campos" + "Mantenha os campos atuais, como Site, CNPJ, Estado, Cidade e todos os demais campos de empresa, sem alterações." e "Limpar informações dos campos" + "Apague todos os campos preenchidos para essa empresa."; rodapé "Cancelar" / "Salvar" (desligado sem escolha). O CNPJ não é copiado ao "Manter" (é único): a ajuda da Clint cita o CNPJ, então acrescente abaixo dos cartões, em 11px `casca-meta`, o texto nosso "O CNPJ não é copiado: cada empresa tem o seu.".

Em `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, reescreva o `it` que pinava a aba Empresa travada: com `fetch` devolvendo `null` para a empresa, só "Nome da empresa" é um `combobox`; as outras linhas seguem travadas.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-aba-empresa-do-negocio.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-campos-da-ficha.test.ts
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
git add hooks/escale/useEmpresaDoContato.ts components/escale/empresas components/escale/negocio lib/escale/negocio/campos.ts lib/escale/campos/da-ficha.ts tests/unit
git commit -m "feat(escale): aba Empresa do negócio — vincular, criar, trocar (Manter/Limpar) e editar a empresa do contato (Fase 2D, E7, E8)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: Espanhol, PR B e o PRD

- [ ] **Step 1: O espanhol do PR B**

Bloco `  // ─── FORK ESCALE · Fase 2D (PR B): telas de empresas ───` (antes do da 1G):

```js
const ES = {
  "Empresas": "Empresas",
  "Nova empresa": "Nueva empresa",
  "Buscar por empresa ou CNPJ": "Buscar por empresa o CNPJ",
  "Todas as empresas": "Todas las empresas",
  "Com nome": "Con nombre",
  "Sem nome": "Sin nombre",
  "empresa": "empresa",
  "empresas": "empresas",
  "Refine a busca para ver além das primeiras {max}.": "Refina la búsqueda para ver más allá de las primeras {max}.",
  "Campos da empresa": "Campos de la empresa",
  "Contato principal": "Contacto principal",
  "Segmento": "Segmento",
  "Contatos": "Contactos",
  "Valor em aberto": "Valor abierto",
  "Ver {n} contato": "Ver {n} contacto",
  "Ver {n} contatos": "Ver {n} contactos",
  "Ver {n} negócio": "Ver {n} negocio",
  "Ver {n} negócios": "Ver {n} negocios",
  "Excluir empresa": "Eliminar empresa",
  "Organize seus contatos por empresa": "Organiza tus contactos por empresa",
  "Agrupe contatos em empresas e veja negócios e atividades de toda a conta em um só lugar.": "Agrupa contactos en empresas y ve negocios y actividades de toda la cuenta en un solo lugar.",
  "Nenhuma empresa encontrada para \"{search}\".": "Ninguna empresa encontrada para \"{search}\".",
  "Limpar busca": "Limpiar búsqueda",
  "Tem certeza que deseja excluir \"{name}\"? Os contatos serão mantidos.": "¿Seguro que quieres eliminar \"{name}\"? Los contactos se mantendrán.",
  "Empresa \"{name}\" removida.": "Empresa \"{name}\" eliminada.",
  "Não foi possível excluir a empresa. Tente novamente.": "No fue posible eliminar la empresa. Inténtalo de nuevo.",
  "Não foi possível carregar as empresas.": "No fue posible cargar las empresas.",
  "Não foi possível carregar a empresa.": "No fue posible cargar la empresa.",
  "Tentar de novo": "Intentar de nuevo",
  "Dados da empresa — no próximo passo você vincula um contato.": "Datos de la empresa: en el próximo paso vinculas un contacto.",
  "Contato da empresa": "Contacto de la empresa",
  "Ex.: Atlas Distribuidora": "Ej.: Atlas Distribuidora",
  "Opcional. Ajuda a identificar duplicidades automaticamente.": "Opcional. Ayuda a identificar duplicados automáticamente.",
  "Site": "Sitio",
  "Continuar": "Continuar",
  "Voltar": "Volver",
  "Criar empresa": "Crear empresa",
  "Criando…": "Creando…",
  "Informe o nome da empresa.": "Informa el nombre de la empresa.",
  "Escolha ou crie o contato.": "Elige o crea el contacto.",
  "Vincular existente": "Vincular existente",
  "Criar novo": "Crear nuevo",
  "Buscar contato por nome, telefone ou e-mail": "Buscar contacto por nombre, teléfono o correo",
  "Contatos recentes": "Contactos recientes",
  "Nenhum contato encontrado.": "Ningún contacto encontrado.",
  "Nenhum contato cadastrado ainda.": "Ningún contacto registrado aún.",
  "Nome do contato": "Nombre del contacto",
  "Digite o nome do contato": "Escribe el nombre del contacto",
  "Telefone já cadastrado.": "Teléfono ya registrado.",
  "Falha ao criar o contato.": "Error al crear el contacto.",
  "Será definido como contato principal da empresa e aparecerá em destaque na listagem.": "Será definido como contacto principal de la empresa y aparecerá destacado en el listado.",
  "Empresa \"{name}\" criada e vinculada a {contact}.": "Empresa \"{name}\" creada y vinculada a {contact}.",
  "o contato": "el contacto",
  "Não foi possível criar a empresa. Tente novamente.": "No fue posible crear la empresa. Inténtalo de nuevo.",
  "Criada em": "Creada el",
  "Dados": "Datos",
  "Sem dados adicionais": "Sin datos adicionales",
  "Ela pode ter sido excluída ou você não tem acesso a ela.": "Puede haber sido eliminada o no tienes acceso a ella.",
  "Nenhum contato nesta empresa": "Ningún contacto en esta empresa",
  "Os contatos vinculados a esta empresa aparecerão aqui.": "Los contactos vinculados a esta empresa aparecerán aquí.",
  "Tornar contato principal": "Hacer contacto principal",
  "Contato principal · clique para remover": "Contacto principal · haz clic para quitar",
  "Remover da empresa": "Quitar de la empresa",
  "Contato definido como principal.": "Contacto definido como principal.",
  "Contato removido como principal.": "Contacto quitado como principal.",
  "Contato removido da empresa.": "Contacto quitado de la empresa.",
  "Não foi possível atualizar o contato principal.": "No fue posible actualizar el contacto principal.",
  "Não foi possível remover o contato da empresa.": "No fue posible quitar el contacto de la empresa.",
  "Este é o contato principal da empresa. Escolha quem será o novo contato principal antes de removê-lo.": "Este es el contacto principal de la empresa. Elige quién será el nuevo contacto principal antes de quitarlo.",
  "Selecione o novo contato principal": "Selecciona el nuevo contacto principal",
  "Definir e remover": "Definir y quitar",
  "Este é o último contato da empresa. Ao removê-lo, a empresa será excluída.": "Este es el último contacto de la empresa. Al quitarlo, la empresa será eliminada.",
  "Empresa removida.": "Empresa eliminada.",
  "Vincular contato existente": "Vincular contacto existente",
  "Vincular contato": "Vincular contacto",
  "Salvando…": "Guardando…",
  "Contato {name} adicionado à empresa.": "Contacto {name} agregado a la empresa.",
  "Não foi possível adicionar o contato. Tente novamente.": "No fue posible agregar el contacto. Inténtalo de nuevo.",
  "Este contato sai da empresa atual.": "Este contacto sale de la empresa actual.",
  "Buscar negócios": "Buscar negocios",
  "Etapa": "Etapa",
  "Status": "Estado",
  "Valor": "Valor",
  "Nenhum negócio nesta empresa": "Ningún negocio en esta empresa",
  "Os negócios desta empresa aparecerão aqui.": "Los negocios de esta empresa aparecerán aquí.",
  "Consultar CNPJ": "Consultar CNPJ",
  "Dados do CNPJ aplicados.": "Datos del CNPJ aplicados.",
  "Campos de empresa": "Campos de empresa",
  "Ver dados da empresa {companyName}": "Ver datos de la empresa {companyName}",
  "Criar a empresa \"{nome}\"": "Crear la empresa \"{nome}\"",
  "Selecione o que deseja fazer com os campos da nova empresa:": "Selecciona qué deseas hacer con los campos de la nueva empresa:",
  "Manter informações dos campos": "Mantener la información de los campos",
  "Mantenha os campos atuais, como Site, CNPJ, Estado, Cidade e todos os demais campos de empresa, sem alterações.": "Mantén los campos actuales, como Sitio, CNPJ, Estado, Ciudad y todos los demás campos de empresa, sin cambios.",
  "Limpar informações dos campos": "Limpiar la información de los campos",
  "Apague todos os campos preenchidos para essa empresa.": "Borra todos los campos completados para esa empresa.",
  "O CNPJ não é copiado: cada empresa tem o seu.": "El CNPJ no se copia: cada empresa tiene el suyo.",
  "Empresa": "Empresa",
};
```

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Expected: PASS. Tire do `ES` as chaves que já existirem no dicionário (o teste de chaves repetidas reprova); acrescente o que o teste apontar.

- [ ] **Step 2: Gates e o PR B**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale hooks/escale lib/escale app/app/companies app/api/v1
corepack pnpm vitest run tests/unit/escale-lista-de-empresas.test.tsx tests/unit/escale-janela-nova-empresa.test.tsx tests/unit/escale-ficha-da-empresa.test.tsx tests/unit/escale-aba-empresa-do-negocio.test.tsx tests/unit/escale-painel-de-colunas.test.tsx tests/unit/escale-menu-do-topo.test.ts tests/unit/escale-menu-do-topo-tela.test.tsx tests/unit/navegacao-completude.test.ts tests/unit/escale-casca-v2-original-intacto.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/vocabulario-do-funil.test.ts
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2d-empresas-telas
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2d-empresas-telas --title "Fase 2D (PR B): lista de empresas, Nova empresa, ficha da empresa e aba Empresa do negócio" --body-file .superpowers/sdd/2d-b-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

O corpo traz: as telas (04-001), "Nova empresa" em dois passos, a ficha (resumo, Contatos, Negócios, Dados com "Consultar CNPJ"), a aba Empresa do negócio (vincular, criar, trocar com Manter/Limpar), o "Novo +", as colunas por lista, as decisões Q1–Q6 e N16, as diferenças conhecidas (sem os prints 1–4; sem logo; a capa do card e o "Sem empresa" dos Recentes ficam para depois da 2E; a casca mostra uma empresa por contato) e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto.**

- [ ] **Step 3: O PRD**

Seção 8, linha `| 2D |`: `✅ executada: PR A (#…) e PR B (#…) mergeados na main; testes pesados e publicação ficam para a bateria única da Frente B (depois da 2F)`. Seção 4, tabela E: na linha `| E1 |`, acrescente "no 'Mais' (menu da v1, plano da 2D Q1)"; na `| E8 |`, troque "proposta: passar para a 2D" por "entregue na 2D". No PRD de Negócios (`docs/modulos/1-negocios.md`), tabela C, linhas `| C12 |` e `| C13 |`: "✅ 2D".

**PARE aqui.** A próxima fase da Frente B é a 2E (`docs/superpowers/plans/2026-10-18-fase-2e-ficha-do-contato-e-mescla.md`). Nenhuma tag, release ou deploy no meio da frente.

---

## Self-review (feito ao escrever, 18/10)

- **Cobertura do PRD:** E1 → Tasks 2 (módulo ligado), 9 ("Novo +"; menu no "Mais", Q1); E2 → Tasks 2, 3, 7, 8 (busca, escopo "Com nome", filtros por campo, contagem com o teto, colunas); E3 → Tasks 2, 3, 8 (Nome com monograma, Contato principal com ★ e atalhos, Segmento, Contatos, Valor em aberto, Negócios, lixeira); E4 → Tasks 2, 3, 9 (dois passos, CNPJ com máscara e validação, sem logo, Q4); E5 → Tasks 4, 10 (resumo, Contatos com o principal, vincular e novo, Negócios, Dados com "Consultar CNPJ"); E6 → Tasks 2, 4, 8, 10 (excluir mantém os contatos, gerente); E7 → Tasks 4, 11 (trocar com Manter/Limpar); E8 → Tasks 4, 11 (aba Empresa do negócio). A3 (empresa na busca de contatos) → Tasks 2, 5. D5 da lista de empresas → Tasks 7, 8. Permissões da §5 → Q6, nas rotas (Tasks 3, 4) e nas telas (Tasks 8, 10, 11).
- **"Em breve" que esta fase fecha:** grupo "Empresa" do seletor do filtro (2B) → Task 5; aba Empresa do negócio (1G/2C) → Task 11; a empresa na linha e na busca dos contatos (2A) → Task 5; "Personalizar colunas" de empresas → Task 7. **Continuam:** "Nome da empresa" na capa do card e o "Sem empresa" dos Recentes (N16).
- **Placeholders:** sem "TBD". Os "Confira antes de rodar" apontam o arquivo do nome que pode ter mudado (coluna da foto, `AlternanciaDaCasca`, `lerColunas`, FK embutida do pipeline, `requireAuth`/`resolveActiveOrg`).
- **Nomes que atravessam tasks:** `ESCOPOS_DE_EMPRESAS`, `ESCOPO_PADRAO`, `ROTULO_DO_ESCOPO`, `consultaDaListaDeEmpresasSchema`, `mascaraDeCnpj`, `lerCnpj`, `COLUNAS_NATIVAS_DE_EMPRESAS`, `ROTULO_DA_COLUNA_DE_EMPRESA`, `COLUNAS_PADRAO_DE_EMPRESAS`, `CAMPOS_QUE_SAO_COLUNAS`, `novaEmpresaSchema`, `desfechoDaRemocao`, `COLUNA_DO_CAMPO_FIXO`, `iniciaisDaEmpresa`, `CONTAGEM_MAXIMA` (Task 1); `ErroDaEmpresa`, `TEXTO_DO_ERRO_DA_EMPRESA`, `STATUS_DO_ERRO_DA_EMPRESA`, `erroDaEmpresaDoBanco`, `nomeDaEmpresa`, `moedaDaOrganizacaoDe`, `parametrosDaBuscaDeEmpresas`, `listarEmpresas`, `criarEmpresa`, `LinhaDeEmpresa`, `PaginaDeEmpresas`, `PrincipalDaEmpresa` (Task 3); `lerFichaDaEmpresa`, `contatosDaEmpresa`, `negociosDaEmpresa`, `empresaDoContato`, `patchDaEmpresaSchema`, `mudarCampoDaEmpresa`, `vincularContato`, `desvincularContato`, `tornarPrincipal`, `excluirEmpresa`, `trocarEmpresaDoContatoSchema`, `trocarEmpresaDoContato`, `FichaDaEmpresa`, `ContatoDaEmpresa`, `NegocioDaEmpresa`, `EmpresaDoContato`, `respostaDoErroDaEmpresa` (Tasks 3, 4) → Tasks 5, 8, 10, 11; `camposDaEmpresaDoFiltro` (Task 5) → Task 8; `NATIVAS_POR_LISTA`, `PADRAO_POR_LISTA`, `lerColunasDaLista` (Task 7) → Task 8; `useListaDeEmpresas`, `useExcluirEmpresa`, `Monograma`, `TabelaDeEmpresas`, `ListaDeEmpresas`, `dadosDaPaginaDeEmpresas` (Task 8) → Tasks 9, 10; `JanelaNovaEmpresa`, `PassoContatoDaEmpresa`, `EscolhaDoContato` (Task 9) → Tasks 8, 10; `useEmpresa`, `useMudarEmpresa` (Task 10) → Task 11; `useEmpresaDoContato`, `useTrocarEmpresa`, `SeletorDeEmpresa`, `JanelaTrocarEmpresa` (Task 11). Da 2C: `Catalogo`, `CAMPOS_FIXOS_DA_EMPRESA`, `lerCatalogo`, `catalogoVisivel`, `useCatalogoDeCampos`, `camposDaEmpresaComGrupos`, `gruposDaFicha`, `CampoDeColuna`, `camposDeColuna`, `tipoDoFiltro`, `CamposDaFicha` (`grupos`, `aoGerenciar`; esta fase acrescenta `linhaEspecial`), `JanelaDeGerenciarCampos`.
- **Numeração:** Tasks 1–12 contíguas (PR A 1–6, PR B 7–12); migrations 9105 (esta), 9106 (2E), 9107 (2F).
- **Pontos de atenção do executor:** o corpo das duas funções da 9102 recriadas tem de bater com a `main` (só o trecho da empresa a mais); o `podeAdministrar` da página da empresa pelo `podeAdministrarEmpresa`; a `JanelaNovoContato` pode precisar do `aoCriar`; os testes de menu continuam verdes porque o topo não muda.
