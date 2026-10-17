# PRD — Módulo Contatos e Empresas (Fase 2)

> Nível 2 do [roteiro](../roteiro.md): o que a Clint faz em Contatos e Empresas, o que o Escale já tem, o que falta e em que fase entra.
> **Aprovado em 17/10/2026.** Anda em paralelo com a Fase 1 (Frente B, decisão 9 do roteiro). As perguntas 2 a 5 da seção 10 foram respondidas no mesmo dia; a 1 continua em aberto, como no PRD de Negócios.
> Este documento fala do **quê** e do **porquê**. O **como** (arquivos, tabelas, migrations, testes) fica no plano de cada fase, em `docs/superpowers/plans/`.

## 1. Objetivo

Contatos e Empresas são as duas listas de cadastro do CRM. Na Escale, elas têm de fazer o que a Clint faz:

- **o vendedor** acha um contato ou uma empresa pela busca, vê de relance os canais, as tags e os negócios de cada um, e abre o negócio ou a conversa num clique;
- **o gestor** filtra a base por qualquer campo (do contato, do negócio ou da empresa), salva o filtro, age em massa (tag, campo, criar negócio, exportar, excluir) e mantém a base limpa com as sugestões de mescla;
- **a empresa** junta os contatos de uma conta, com um contato principal, e mostra os negócios e o valor em aberto da conta toda.

### Problema

Hoje o Escale tem o motor de contatos do original (identidade, WhatsApp, LGPD, mescla, carteira) e um módulo de empresas desligado, mas não o jeito de trabalhar da Clint:

- a lista de contatos não mostra os negócios, não tem colunas configuráveis, não pagina por número, não tem filtro por campo nem por negócio, não tem filtro salvo, não seleciona e não age em massa, e não exporta;
- os campos personalizados do contato dependem do **funil padrão**, que a decisão de 16/10 manda tirar; a empresa não tem campo personalizado nenhum;
- Empresas e Pessoas são um módulo opcional (`crm_b2b`), **desligado por padrão**, fora do menu do topo, com lista sem paginação e sem negócios.

### Evidências

- **Descrição do usuário** (transcrições de 05/10, `Escale IA OS/modulo contato/modulo contatos.txt` e `modulo empresa/modulo de empresas.txt`):
  - "os filtros a gente pode filtrar por qualquer campo. Seja esse campo contato, negócio ou empresa";
  - sobre a seleção: "ao clicar aqui na caixinha deveria marcar só os 10, mas ele marca todos… a gente precisa de uma solução para isso aí";
  - sobre empresas: "é bem simples… nome, contato principal, segmento, contatos vinculados, valor em aberto, negócios".
- **3 fichas da Clint** (03-001, 03-002, 04-001) e os prints das abas Contato e Empresa da ficha do negócio (`docs/clint/prints-1g/02` e `03`, de 17/10).
- **Engenharia reversa** da Clint (seção 2), que cobre o que as capturas não mostram: filtros, ações em massa, novo contato, mescla, criação e ficha da empresa.

### Hipótese

Acreditamos que levar as duas listas e os campos ao nível da Clint vai permitir que a equipe trabalhe a base de contatos no Escale (segmentar, limpar, exportar, criar negócios em massa) sem voltar à Clint.

Saberemos que deu certo quando **TBD — validar com o usuário** (mesma pergunta 1 do PRD de Negócios).

### Métricas de sucesso

| Métrica | Meta | Como medir |
|---|---|---|
| Itens "adotar" ou "adaptar" da seção 4 entregues | 100% (é o critério de pronto do módulo) | Coluna "Fase" da seção 4 contra o LOG.md |
| Uso real do módulo | TBD — validar com o usuário | TBD |

## 2. Fontes

| Fonte | O que cobre |
|---|---|
| Fichas da Clint (`clint-documentacao/modulos/03-contatos/` e `04-empresas/`) | Lista de contatos (03-001), Personalizar colunas (03-002), lista de empresas (04-001). As três são da Clint com menu lateral, a mesma dos prints de 17/10 |
| Prints de 17/10 (`docs/clint/prints-1g/02` e `03`) | Abas Contato e Empresa da ficha do negócio: "Campos de contato" / "Campos de empresa", grupos à esquerda, "Ocultar vazios", "Gerenciar campos", os oito campos padrão da empresa |
| Transcrições do usuário (05/10) | Como ele usa as duas listas e o defeito da seleção |
| Engenharia reversa (`C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\`) | Rotas, textos de interface, modelo de dados, endpoints, permissões, importação e mescla. Arquivos principais: `catalog-v2/actions__2-contatos.txt`, `raw-v2/js/index-C8mLn7Gp` (contatos), `index-CoMFia_3` (empresas), `index-BYxUbJr8` (ficha da empresa), `index-nevret7g` (novo contato), `AddFieldForm-QPytJAXT` (campos), `DuplicateContactsV2-D1Gt1EQS` (mescla). Confiança marcada como observado ou inferido |
| Código do Escale | Levantamento somente leitura de 17/10. O resumo está na seção 3 |

**Sobre os textos:** o `INSTRUCOES-DO-AGENTE.md` da engenharia reversa diz para não copiar textos. Essa regra é anterior à de 16/10 ("tudo idêntico à Clint", princípio 1 do roteiro), que vale. Os textos de interface citados aqui são os da Clint, e o plano de cada fase os usa como estão.

**Achado de caminho:** a pasta citada no `CLAUDE.md` (`reverse engenering\clint-model\`) não existe; o material está em `reverse engenering - Copia\clint-model\`.

## 3. O que o Escale já tem

### Lista de contatos (`/app/contacts`)

- **Colunas fixas:** Nome, Email, Telefone, Tags, Última atividade, Status (Anonimizado, Bloqueado, Pessoal, Cliente, Ativo) e Ações. Ordena clicando no cabeçalho.
- **Paginação por cursor** com "Carregar mais", 25/50/100 por página, rodapé "N contatos carregados".
- **Busca** por nome, e-mail ou telefone (com variantes do telefone).
- **Filtros:** tag (E/OU, opções só das páginas carregadas), origem do contato (`manual`, `whatsapp`, `site`, `nuvemshop`, `import_csv`, `meta_ads`, `google_ads`), botão "Pessoais".
- **Cabeçalho:** "Duplicados" (`MergeDialog`, agrupa por telefone, e-mail ou telefone em conflito; o principal é escolhido; confirmação nomeada), "Importar CSV" (até 500 linhas, pula duplicados), "Novo contato" (Nome, Email, Telefone, CPF, Tags; exige e-mail ou telefone).
- **Por linha:** abrir ou iniciar conversa (com seletor de canal), editar, excluir (avisa se há compromisso na Agenda).
- **Não existe:** seleção, ações em massa, exportação, filtros salvos, negócios na lista, colunas configuráveis.

### Ficha do contato (`/app/contacts/[id]`)

- Página inteira com cabeçalho (nome, canais, tags, selos), ações (desbloquear, pessoal, sempre humano, ligar, editar), a conversa mais recente e as propostas de dado da IA.
- Abas "Visão geral" (só leitura, com origem do anúncio e "Cliente desde"), "Timeline" e "LGPD" (só admin).
- **Não existe:** lista de negócios, empresa, dono (carteira) visível, campos em grupos.

### Empresas, Pessoas e Importações (módulo `crm_b2b`, desligado por padrão)

- **Desligado, as rotas dão 404.** Empresas não está no menu do topo; cai no "Mais" só com o módulo ligado.
- **Lista de empresas:** Nome fantasia, Razão social, CNPJ, Cidade/UF, Situação, Atualizado. Busca por nome ou CNPJ, sem filtros, sem ordenação, só as 50 primeiras.
- **Nova empresa:** 12 campos (razão social, fantasia, CNPJ, e-mail, telefone, endereço) e "Consultar CNPJ" (BrasilAPI).
- **Ficha da empresa:** dados cadastrais, pessoas/decisores, telefones das pessoas; enriquecer CNPJ, editar, excluir (bloqueado se houver pessoas). Sem negócios, conversas ou histórico.
- **Pessoas:** a "pessoa B2B" (decisor), sem telefone próprio; os telefones dela são os contatos que apontam para ela.
- **Importações:** CSV/XLSX de empresas, pessoas e telefones, com histórico de lotes.

### Modelo de dados

- **`contacts`:** identidade operacional (telefone E.164, e-mail, CPF cifrado, nascimento, tags `text[]`, `custom_fields jsonb`, `social_identity`, avatar, carteira, `person_id`, `kind`, `is_personal`, `ai_opt_out`, mescla por lápide `is_merged_into`).
  - Únicos por organização: telefone, e-mail e CPF (fora as lápides).
  - Exclusão física, com histórico apagado na mesma transação; bloqueada se houver compromisso na Agenda.
  - **RLS só por organização:** todo membro vê todos os contatos. Os papéis valem nas rotas.
- **Campos personalizados do contato:** o valor fica no contato, mas a **definição vem do funil padrão** (`crm_pipelines.settings.fields[]`). Desde a 1F-a, os campos do **negócio** são da organização (`crm_campos_do_negocio`, migration 9006).
- **Contato ↔ empresa:** indireto e N:N: `contacts.person_id` → `people` → `company_people` (cargo, decisor, `is_primary`) → `companies`. Não existe `contacts.company_id`.
- **Tags:** só de contato, sem tabela própria; cores na organização; gestão em `/app/settings/tags`.

### Ferramentas MCP

- `crm_search_contacts`, `crm_get_contact`, `crm_propose_contact_field`, `crm_manage_tags`, `crm_list_tags`. **Nenhuma para empresas.**

### Do fork

- Menu do topo: Contatos aponta para `/app/contacts`; Empresas não está lá. O "Novo +" tem "Contato".
- Ficha do negócio (1G): a aba Contato mostra nome, telefone e e-mail; **a aba Empresa é moldura** (os oito campos da Clint, vazios). O ⋮ "Visualizar contato" leva à página do contato do original.
- Filtros do quadro (1D): do contato, só nome, e-mail e telefone; o código já anota que os campos personalizados do contato "chegam com os grupos de campos (Fase 2)".

### O que o original tem e a Clint não tem (não pode quebrar)

- LGPD (anonimizar, consentimento), bloqueio, "pessoal", "sempre atendimento humano", carteira do cliente.
- Propostas de dado da IA (a IA ouve um dado e o humano confirma).
- Origem do anúncio (campanha, conjunto, anúncio) e "Cliente desde".
- CPF e nascimento como dados nativos.
- Consulta e enriquecimento de CNPJ pela BrasilAPI.
- Importação B2B de empresas, pessoas e telefones.

## 4. Quadro Clint × Escale

**Legenda:**
- **Hoje:** ✅ tem · ◐ parcial · ✗ falta.
- **Decisão:** adotar (fazer como a Clint) · adaptar (fazer do nosso jeito, mantendo o motor do original) · ignorar.

### A. Lista de contatos

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| A1 | Cabeçalho "Contatos" e botão "Novo contato +", com o menu "Importar contatos" | 03-001, `index-C8mLn7Gp` | ◐ três botões soltos | adotar | 2A |
| A2 | Selo "{n} sugestões de mescla", que abre a tela de duplicados | 03-001 | ◐ botão "Duplicados" | adotar o selo com o contador do agrupamento do original; a tela de mescla nova é a C2 | 2A |
| A3 | Busca "Buscar por contato ou Empresa" (nome, e-mail, telefone, empresa, Instagram) | 03-001, `index-BH0q213O` | ◐ sem empresa e Instagram | adotar (a empresa entra na 2D) | 2A |
| A4 | Visões prontas "Todos os contatos", "Com negócio", "Sem negócio" | 03-001, `ContactFilterPresets` | ✗ | adotar | 2A |
| A5 | "{n} contatos" e botão Atualizar | 03-001 | ◐ "N carregados" | adotar | 2A |
| A6 | Colunas Nome (foto), Contato (telefone com ligar/WhatsApp/conversa, e-mail, Instagram), Tags, Negócios ("Ver {n} negócio"/"Adicionar negócio") e ⋮ | 03-001 | ◐ colunas diferentes, sem negócios | adotar | 2A |
| A7 | Paginação numerada (Anterior, páginas, Próximo), "10 por página" lembrado no navegador | 03-001 | ◐ cursor e "Carregar mais" | adotar | 2A |
| A8 | "Personalizar colunas": busca, "Na tabela · {n}" com arraste, "Colunas", "Campos do contato", "Redefinir"; preferência por pessoa | 03-002 | ✗ | adotar (os campos personalizados entram sozinhos quando a 2C chegar) | 2A |
| A9 | ⋮ da linha: editar e excluir, com "Tem certeza que deseja excluir o contato selecionado?" | `index-C8mLn7Gp` | ◐ botões soltos | adotar | 2A |
| A10 | Estados vazio ("Não foram encontrados contatos.") e de erro ("Não foi possível carregar os contatos.") | `index-C8mLn7Gp` | ◐ textos do original | adotar | 2A |
| A11 | Ordenar a lista | — | ✅ pelo cabeçalho | ignorar: a Clint não ordena. A lista da casca sai pela atividade mais recente, como hoje | — |

### B. Filtros, seleção e ações em massa

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| B1 | Filtros com seções Contato, Negócio, Tags e Campos: data de criação; telefone (com, sem, inválido, internacional); com ou sem negócio; origem, etapa, status, dono do negócio, motivo de perda; tags (contém, não contém, qualquer, sem); campos com operadores e grupos E/OU | `index-A38akjUb` | ◐ tag, origem do contato, pessoais | adotar, reaproveitando o motor de filtros da 1D | 2B |
| B2 | Filtros salvos: "Criar filtro", "Padrão", "Meus filtros", renomear, excluir | 03-001, transcrição | ✗ | adotar (a mesma regra da 1D: pessoal ou compartilhado) | 2B |
| B3 | Seleção (caixinha do cabeçalho com setinha) | 03-001, transcrição | ✗ | **adaptar, a pedido do usuário (decidido em 17/10, ver abaixo da tabela)** | 2B |
| B4 | Ações em massa: criar negócios, alterar ou limpar campo, incluir ou remover tag, exportar, excluir; lotes grandes em segundo plano, com aviso | `index-B5tmttGQ`, `FieldsBulkPopover` | ✗ | adotar | 2B |
| B5 | Exportar CSV (direto ou em fila) | `exporter_export` | ✗ | adotar | 2B |
| B6 | Importar contatos com assistente (Arquivo → Mapear → Decisões → Revisar), duplicados resolvidos por linha | `index-UPYK_E9J`, `csv-import-CVAAfpnm` | ◐ CSV simples, 500 linhas | adaptar: reaproveitar o assistente de importação da 1E | 2B |

**B3, seleção (decisão do usuário, 17/10).** Na Clint, a caixinha do cabeçalho marca a base inteira (64 mil contatos); o usuário considera isso um defeito. Na Escale, marcar a página e marcar tudo são ações separadas:

1. **A caixinha marca só a página** (os 10, 25 ou 50 visíveis). Clicar de novo desmarca.
2. **A setinha ao lado da caixinha** (já existe na Clint) abre um menu com três opções: "Selecionar esta página ({n})", "Selecionar todos os {total} contatos" e "Selecionar quantidade…" (o campo da Clint que marca os primeiros N).
3. **Uma faixa acima da tabela** aparece quando a página é marcada: "Os {n} contatos desta página estão selecionados. Selecionar todos os {total} contatos · Limpar seleção". Depois de marcar tudo, ela muda para "Todos os {total} contatos estão selecionados. · Limpar seleção".
4. **"Todos" quer dizer todos os resultados do filtro e da busca ativos** (opção A do usuário). Sem filtro, é o CRM inteiro. O total da faixa e do menu é sempre o do filtro.
5. **A barra de ações em massa mostra o total marcado** ("{n} selecionados"). Ações sobre "todos" vão ao servidor como o filtro, nunca como lista de ids; as grandes (excluir, exportar) pedem confirmação com o número escrito e rodam em segundo plano.

Os textos da faixa e do menu não existem na Clint; o plano da 2B os escreve no tom dela, e o visual segue os componentes dela.

### C. Novo contato, mescla e ficha do contato

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| C1 | "Informações do contato": Nome*, Email, Telefone (DDI, Brasil por padrão), Instagram; caixa "Desejo criar uma oportunidade de negócio" que pede Origem* e Etapa*; avisos de e-mail, telefone ou Instagram já cadastrado; "Telefone inválido. Criar mesmo assim?" | `index-nevret7g` | ◐ sem Instagram e sem oportunidade; tem CPF | adotar. CPF e nascimento saem da janela e ficam como campos do contato (D1) | 2A |
| C2 | Tela de mescla: abas Telefone, Instagram, ID WhatsApp e Sugestões (confiança alta, média, baixa); escolher o valor de cada campo; mesclar em massa | `DuplicateContactsV2` | ◐ agrupa por telefone e e-mail, escolhe o principal | adaptar: a tela da Clint sobre o motor `fn_mesclar_contatos` | 2E |
| C3 | O contato abre **por cima da lista** (`/contacts/:id`), com seções Contato, Empresa, Negócio, Atividades, Notas, Anexos, Histórico e Conversas, que a pessoa reorganiza | `index-BhVJ8kAx` | ◐ página inteira com três abas | adaptar: a gaveta da Clint reaproveitando as abas da ficha do negócio (1G/1H). **Precisa de prints** | 2E |
| C4 | Conversas do contato em três modos: por canal, padrão chat, timeline unificada | `ContactConversations` | ◐ só a mais recente | adotar | 2E |

### D. Campos do contato e da empresa

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| D1 | Campos do contato da organização, em grupos ("Informações Gerais", …). Tipos: texto, número, moeda, texto rico, telefone, seleção, seleção múltipla, data, data e hora. Chave sem acento até 20 caracteres, nome único, grupo obrigatório | `AddFieldForm`, prints 1g-02 | ◐ definição presa ao funil padrão | adotar. É o C11 do PRD de Negócios | 2C |
| D2 | Campos da empresa em grupos; padrão: Nome da empresa, Site, Cidade, Estado, Categoria, Segmento, Número de funcionários, CNPJ | prints 1g-03, `fields-BMMAGjVh` | ✗ | adotar. É o C13 do PRD de Negócios | 2C |
| D3 | "Gerenciar campos" por objeto (Negócio, Contato, Empresa): restringir a visibilidade por grupo de usuários, "Usar como variável", "Copiar identificador" | `FieldsConfig` | ◐ só os campos do negócio (1F-a) | adaptar: uma tela para os três objetos, sobre o catálogo da 1F-a | 2C |
| D4 | Campos ocultos por origem | `HiddenFields` | ✗ | adotar. É o D16 do PRD de Negócios | 2C |
| D5 | Campos personalizados nos filtros e nas colunas (lista de contatos, lista de empresas e quadro) | `index-A38akjUb` | ✗ | adotar | 2C |

### E. Empresas

| # | Comportamento da Clint | Fonte | Hoje | Decisão | Fase |
|---|---|---|---|---|---|
| E1 | Empresas no menu, sempre ligado | menu da Clint | ✗ módulo desligado, fora do topo | adotar | 2D |
| E2 | Lista: "Nova empresa", "Buscar por empresa ou CNPJ", escopo "Todas as empresas / Com nome / Sem nome" (padrão "Com nome"), Filtros por campos, "{n} empresas" e Atualizar, Personalizar colunas | 04-001, `index-CoMFia_3` | ◐ lista simples, sem paginação | adotar | 2D |
| E3 | Colunas Nome (monograma), Contato principal (estrela, telefone, atalhos), Segmento, Contatos ("Ver {n} contato"), Valor em aberto (R$), Negócios ("Ver {n} negócio") e lixeira | 04-001 | ✗ | adotar | 2D |
| E4 | Nova empresa em dois passos: **Empresa** (Nome*, CNPJ com máscara, Site com sugestão de logo) e **Contato** (vincular existente ou criar, que vira o principal) | `suggestLogo-Bwo3gFoP` | ◐ uma janela com 12 campos e consulta de CNPJ | adotar os dois passos (pergunta 4 sobre o logo e o CNPJ) | 2D |
| E5 | Ficha da empresa com abas Contatos, Negócios e Dados; resumo com contato principal, valor em aberto e criada em; "Tornar contato principal", "Remover da empresa", "Vincular existente", "Novo contato" | `index-BYxUbJr8` | ◐ cards, sem negócios | adotar. **Precisa de prints** | 2D |
| E6 | Excluir empresa mantendo os contatos ("Os contatos serão mantidos.") | `index-CoMFia_3` | ◐ bloqueia se houver pessoas | adotar | 2D |
| E7 | Trocar a empresa de um contato, escolhendo "Manter" ou "Limpar informações dos campos" | `OrganizationChangeModal` | ✗ | adotar | 2D |
| E8 | Aba Empresa da ficha do negócio: ver e vincular a empresa | 01-006, prints 1g-03 | ◐ moldura vazia (1G) | adaptar. Hoje é o C12 da 1H; **proposta: passar para a 2D**, porque depende do vínculo contato ↔ empresa (pergunta 2) | 2D |

**Fora do módulo:** Tags (`/app/settings/tags`) já existe no original e fica como está. Histórico de mesclas, ações em segundo plano e importação/exportação nas Configurações ficam para a fase de Configurações.

## 5. Permissões

O original decide por papel (viewer, agent, manager, admin, em `ACTION_MIN_ROLE`). A Clint tem uma chave por ação e grupos de permissão. Até a pergunta 3 ser respondida, cada ação nova ganha a sua chave, com um papel mínimo:

| Ação | Chave da Clint | Papel mínimo proposto |
|---|---|---|
| Ver contatos | `CONTACT` | viewer (como hoje) |
| Criar e editar contato | — | agent (como hoje) |
| Excluir contato | `CONTACT_DELETE` | manager (como hoje) |
| Selecionar e agir em massa | `CONTACT_BULK_ACTIONS` | manager |
| Exportar | `CONTACT_EXPORT` | manager, com confirmação (a Clint pede verificação extra) |
| Importar | `OWNER_IMPORT_CONFIG` | manager |
| Mesclar | — | manager (como hoje) |
| Criar empresa | `ORGANIZATION_CREATE` | agent |
| Excluir empresa | `ORGANIZATION_DELETE` | manager |
| Desvincular contato, trocar o principal | `ORGANIZATION_UNLINK_CONTACT`, `ORGANIZATION_SET_PRIMARY_CONTACT` | agent |
| Gerenciar campos | `ORIGIN_FIELDS_CONFIG`, `OWNER_DEAL_CONFIG` | admin (o original reserva campos ao admin) |
| Filtro salvo | — | quem criou; compartilhado, todos veem (regra da 1D) |
| Colunas da tabela | — | cada pessoa as suas |

- **Quem vê contatos e empresas:** todos da organização, como hoje e como parece ser na Clint (o filtro "Dono" é o dono do negócio, não do contato). O que restringe é o acesso aos **negócios** (1J); a coluna Negócios e o "Valor em aberto" contam só o que a pessoa enxerga, lendo com a sessão dela.
- Toda escrita continua passando por `requireSupportWrite()`, e o banco continua barrando outra organização.

## 6. Filtros e ordenação

- **Lista de contatos (2A, 2B):** visões prontas, busca, e o painel de filtros da B1, com filtros salvos. Sem ordenação pelo usuário (A11).
- **Lista de empresas (2D):** escopo (todas, com nome, sem nome), busca por nome ou CNPJ e filtros por campos da empresa.
- **Campos personalizados (2C):** entram nos filtros e nas colunas das duas listas e no quadro de Negócios (fecha o que a 1D deixou anotado).
- Todo filtro novo reaproveita o motor de filtros da 1D (princípio 4 do roteiro), e não uma versão própria.

## 7. O que precisa ser guardado

O desenho das tabelas e o número da migration ficam no plano de cada fase. **A Frente B reserva a faixa 9100–9199**, para não colidir com as migrations da Frente A.

- **Colunas da tabela por pessoa** (ordem e visibilidade), para contatos e para empresas. A 1E já guarda preferência de tela por pessoa; o plano da 2A vê se dá para reaproveitar.
- **Filtro salvo de contatos:** nome, dono, critérios e se é compartilhado. Hoje o filtro salvo da 1D é da origem; o plano da 2B decide se generaliza a tabela ou cria outra.
- **Catálogo de campos por objeto** (negócio, contato, empresa), com grupos e ordem, e quem vê cada grupo. O da 1F-a já existe para o negócio.
- **Valores dos campos da empresa** (o contato já tem `custom_fields`).
- **Vínculo contato ↔ empresa e o contato principal** (conforme a pergunta 2).
- **Exportação em segundo plano:** quem pediu, o filtro, o arquivo e quando expira.

## 8. Fases

Ordem recomendada: primeiro a lista que o vendedor usa todo dia, depois o que o gestor faz na base, depois os campos (que alimentam as colunas e os filtros), por fim empresas e a ficha.

| Fase | Escopo (itens da seção 4) | Pronto quando | Estado |
|---|---|---|---|
| 2A | **Lista de contatos como na Clint:** A1–A10, C1 | A lista tem as colunas, a busca, as visões prontas, a contagem, a paginação numerada e o "Personalizar colunas" da Clint; o selo de mescla mostra o contador; o "Novo contato" é a janela da Clint e cria negócio quando marcado; igual às imagens 03-001 e 03-002 | plano escrito (`docs/superpowers/plans/2026-10-17-fase-2a-lista-de-contatos.md`), aguarda o "pode fazer" |
| 2B | **Filtros, seleção e ações em massa:** B1–B6 | Cada filtro da B1 restringe a lista; dá para salvar e reaplicar; a caixinha marca só a página, e a setinha e a faixa marcam todos os resultados do filtro (o CRM inteiro, sem filtro), com o total sempre visível; tag, campo, criar negócios, exportar e excluir funcionam em massa, os grandes em segundo plano; a importação usa o assistente | proposta |
| 2C | **Campos do contato e da empresa:** D1–D5 | O contato tem campos próprios em grupos, sem depender do funil padrão (os que existem migram sem perda); a empresa tem os oito campos padrão; "Gerenciar campos" cuida dos três objetos; os campos aparecem nas colunas, nos filtros e nas abas Contato e Empresa da ficha do negócio; a origem esconde campos | proposta |
| 2D | **Empresas:** E1–E8 | Empresas está no menu, sempre ligada; lista, nova empresa em dois passos e ficha com Contatos, Negócios e Dados iguais à Clint; contato principal, vincular e remover funcionam; a aba Empresa do negócio mostra e vincula | proposta |
| 2E | **Ficha do contato e mescla:** C2–C4 | O contato abre por cima da lista com as seções da Clint; a tela de mescla tem as abas e as sugestões; igual aos prints que faltam | proposta (depende dos prints) |

**Dependências:**
- dentro do módulo: a 2B usa a lista da 2A; a 2D usa os campos da 2C (o Segmento é um campo); a 2E usa a 2C e a 2D;
- **com a Frente A:** a 2B reaproveita o motor de filtros da 1D e o assistente de importação da 1E (já entregues); a 2C mexe no catálogo da 1F-a (precisa do merge dele); a 2E reaproveita as abas da 1G/1H; a E8 tira o C12 da 1H (pergunta 2).

## 9. Fora do escopo e decisões

| Item | Por quê | Data |
|---|---|---|
| Ordenação da lista pelo usuário (A11) | A Clint não tem | 17/10 |
| Tags como tela própria | Já existe em `/app/settings/tags`, no original | 17/10 |
| Histórico de mesclas, ações em segundo plano, Importação/Exportação nas Configurações | São telas de Configurações, não das listas | 17/10 |
| Pessoas (`/app/people`) e Importações B2B na casca | Não têm par na Clint; continuam no "Mais" (conforme a pergunta 2) | 17/10 |
| Ferramentas MCP de empresas | Não é tela; entra se Agentes IA pedir | 17/10 |

## 10. Perguntas em aberto

1. **Quem vai usar e qual é a meta?** A mesma pergunta 1 do PRD de Negócios.
2. ~~Como a empresa se liga ao contato (2D)?~~ **Respondida em 17/10: caminho A.** Na tela, tudo como na Clint (o contato tem uma empresa; a empresa tem um contato principal e os outros contatos; o negócio mostra a empresa do contato, porque na Clint o negócio só tem `contact_id`). Por baixo, as tabelas do original (`people`, `company_people`, `companies`), com o `crm_b2b` ligado para todos; a casca cria a pessoa do contato sem mostrá-la. Diferenças aceitas: um contato que a importação B2B ligou a duas empresas aparece com a principal; remover um contato da empresa o deixa sem empresa, em vez de criar uma empresa vazia como a Clint faz. **Ainda em aberto:** se a aba Empresa do negócio (C12) passa da 1H para a 2D.
   - Registro da análise:
   - **Na Clint:** cada contato tem no máximo uma empresa (`contact.organization_id`), e a empresa tem um contato principal. Tirar um contato da empresa cria para ele uma empresa vazia, e por isso existe o escopo "Sem nome".
   - **No original:** o contato aponta para uma pessoa, e a pessoa se liga a várias empresas (`people` → `company_people` → `companies`), tudo no módulo `crm_b2b`, desligado.
   - **Caminho A (recomendado):** usar as tabelas do original e ligar o módulo para todos. Ao vincular, a casca cria a pessoa do contato sem mostrá-la, e mostra só uma empresa por contato, como a Clint. Mantém o motor do Rafael (regra 4 do roteiro) e não duplica cadastro. Custo: o caminho até a empresa passa pela pessoa, e o contato principal precisa de um campo.
   - **Caminho B:** coluna nova `company_id` no contato, como na Clint. Mais simples de ler, mas cria um segundo jeito de ligar contato e empresa ao lado do original.
   - Junto: a aba Empresa do negócio (C12) passa para a 2D?
3. **Respondida em 17/10: sim.** Permissões configuráveis: a Clint tem uma chave por ação e grupos de permissão. Nesta fase, cada ação ganha a sua chave com papel mínimo fixo (seção 5). Os grupos de permissão configuráveis viram uma trilha à parte, para todos os módulos?
4. **Respondida em 17/10: sim.** Nova empresa (2D): a Clint sugere o logo pelo site, e o original consulta o CNPJ na BrasilAPI. Proposta: a janela fica igual à da Clint, sem o logo (precisa de serviço externo), e a consulta de CNPJ do original continua na aba Dados da empresa. Está bem?
5. **Respondida em 17/10: sim.** Campos do contato que existem hoje no funil padrão (2C): migram para o catálogo do contato com o mesmo identificador, para não perder valor. CPF, nascimento e Instagram viram campos fixos do grupo "Informações Gerais". Confirma?

## 11. Prints que faltam

Os da 2A a 2D podem ser pedidos aos poucos, antes do plano de cada fase. Sem eles, o plano usa o que a engenharia reversa mostra e marca o ponto como provisório.

| Fase | Print |
|---|---|
| 2A | Menu do botão "Novo contato" aberto; janela "Novo contato", vazia e com "Desejo criar uma oportunidade" marcado; seletor "Todos os contatos" aberto; ⋮ da linha aberto; lista vazia (busca sem resultado) |
| 2B | Painel de Filtros aberto, cada seção (Contato, Negócio, Tags, Campos); filtro salvo (criar e lista "Meus filtros"); linhas selecionadas com a barra de ações; cada ação em massa aberta; janela de exportar; importar contatos (passos) |
| 2C | "Gerenciar campos" (lista de campos, criar campo, grupos, restringir visibilidade) |
| 2D | "Nova empresa" nos dois passos; ficha da empresa nas abas Contatos, Negócios e Dados; "Ver contato" e "Ver negócio" clicados na lista; "Personalizar colunas" de empresas; aba Empresa do negócio **com** empresa vinculada; trocar a empresa de um contato |
| 2E | Contato aberto por cima da lista (todas as seções); tela de mescla (cada aba e uma sugestão aberta) |

## 12. Riscos

| Risco | Chance | Impacto | Mitigação |
|---|---|---|---|
| Lista com dezenas de milhares de contatos (a Clint do usuário tem 64 mil): contagem, "Selecionar todos" e filtros por negócio ficam lentos | Média | Alto | Paginar e contar no servidor; ações em massa por filtro, em segundo plano, nunca com a lista de ids no navegador; medir em produção no plano da 2A |
| Duas frentes mexem nos mesmos arquivos (filtros da 1D, ficha da 1G/1H, catálogo da 1F-a, dicionário) | Alta | Médio | Worktree por frente, faixa de migration reservada, atualizar com a main antes de cada merge |
| Ligar o `crm_b2b` para todos muda o "Mais" e as rotas de Pessoas e Importações | Média | Médio | Decidir na pergunta 2; se o caminho A for o escolhido, conferir as telas do original que passam a aparecer |
| Mover os campos do contato do funil padrão para um catálogo próprio perde valor ou quebra o editor do original | Média | Alto | Migração com prova no banco (antes e depois) e o editor do original lendo do catálogo novo |
| A seleção diferente da Clint (B3) confunde quem vem dela | Baixa | Baixo | É pedido do usuário; o texto do botão deixa claro o que vai ser marcado |
