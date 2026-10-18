# Fase 2B — Filtros, seleção, ações em massa e exportar contatos (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** B1 a B5 de `docs/modulos/2-contatos-e-empresas.md` (seção 4, tabela B), com a decisão B3 do usuário (seleção por página, setinha e faixa). **B6 (importar contatos) saiu desta fase** (resposta Q7 de 17/10: vira fase própria depois da 2D). **Frente B** (decisão 9 do roteiro): worktree própria, migrations na faixa **9100–9199** (esta fase usa **9102** e **9103**).
> **Dois PRs** (N1): **A** = filtros e filtros salvos (B1, B2; Tasks 1–6; migration 9102); **B** = seleção, ações em massa, exportar com aprovação e excluir com os negócios (B3, B4, B5; Tasks 7–13; migration 9103). O PR B nasce da `escale-crm/main` depois do merge do PR A.

## Respostas do usuário (17/10)

| # | Pergunta | Resposta | Onde vale |
|---|---|---|---|
| Q1 | PRs separados, cada um com a sua rodada cheia | Sim, mas agora **dois** PRs (a importação saiu, Q7) | N1 |
| Q2 | Filtro salvo compartilhado ("Compartilhar com a equipe" e o grupo "Compartilhados") | Sim | N5 |
| Q3 | "Campos" na barra de lote desligado ("Em breve") até a 2C | Sim | N12 |
| Q4 | Verificação extra da exportação | **Exportar precisa da aprovação de um administrador.** Gerente ou acima pede; o pedido fica "Aguardando aprovação" por até 7 dias; outro admin aprova ou recusa; se quem pede é admin e é o único admin ativo da organização, não precisa de aprovação. O arquivo gerado continua valendo 24 h | N14 |
| Q5 | Frase e regra da exclusão | **Excluir o contato exclui também os negócios dele**, com a confirmação da Clint ("Os negócios associados aos contatos serão excluídos"). Vale para a exclusão em massa e para o "Excluir" do ⋮ da linha. A trava da Agenda do original continua | N15 |
| Q6 | Tudo em massa vai para a fila (`event_log`), aviso de fim só na lista, arquivo por 24 h | Sim | N11, N13 |
| Q7 | Importar contatos nesta fase | **Não.** Importar contatos vira fase própria depois da 2D. Até lá, "Importar contatos" continua abrindo o importador do original (como na 2A) | N17 |
| Q8 | Negócios criados em massa com `via_planilha: true` (não entram no follow-up "Lead criado") | Sim. O usuário preferiu **não mexer no motor de automações** | N16 |
| Q9 | Sem "Não informar" no motivo de perda; "Todos os donos" = com dono | Sim | N4 |
| Q10 | Condição em campo do negócio vale se **algum** negócio visível a cumpre | Sim | N3 |
| Q11 | Seleção só para gerente ou acima ("conforme Clint"; permissões configuráveis são outra frente) | Sim | N10 |
| Q12 | "Pessoais" como 4ª visão pronta no "Padrão" | Sim | N6 |
| Q13 | Tag em massa dispara as automações ("Quando um contato ganhar uma tag") | Sim | N12 |

**Perguntas em aberto:** nenhuma. (A contagem de admins para a regra do "único admin" não precisa de função `security definer`: a policy `user_orgs_select` da migration 0044 já deixa gerente e admin lerem o quadro de membros da organização, então a função nova `fn_escale_admin_unico` é invoker. Ver N14.)

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio e a conferência visual marca o ponto):
1. ❌ O fluxo de exportar da Clint: clicar "Exportar" na barra manda um código de verificação por e-mail ou WhatsApp, então a confirmação e o aviso de arquivo pronto não foram capturados. O plano segue a "Confirme sua ação" do v2-03 e os textos do código.
2. ❌ A aprovação da exportação por um administrador: **não existe na Clint** (é nossa, Q4). O painel "Exportações" segue o tom dos menus suspensos da Clint (prints 02 e 34).
3. ❌ O passo "← Remover Tag" (só o "← Incluir Tag" foi capturado, prints 35 e 36). O plano usa o mesmo desenho.
4. ❌ A faixa com mais de 6 chips ("+N"). O plano segue o código da Clint (`useCollapsibleFilters`).

**Goal:** Com a casca ligada, a lista de contatos ganha o que a Clint tem acima e em volta da tabela:
- **Filtros** (PR A): o botão "Filtros" abre o painel com as seções Contato (data de criação, telefone), Negócio (com ou sem, origens, etapa, status, dono, motivo de perda), Tags (condições em grupos E/OU: possui, não possui, qualquer tag, sem tag) e Campos (condições em grupos E/OU sobre campos do contato e do negócio); o ⇕ mostra a faixa de chips (e esconde o "Filtros"); o seletor "Todos os contatos" vira o de filtros prontos e salvos ("Padrão", "Meus filtros", "Compartilhados", "Criar filtro", renomear na própria linha, excluir). Tudo filtra no banco, com a RLS de quem olha.
- **Seleção e ações em massa** (PR B): a caixinha marca a página; a setinha marca a página, todos os resultados do filtro ou os N primeiros; a faixa avisa e oferece "Selecionar todos"; a barra roxa embaixo cria negócios, inclui ou remove tag, exporta (com a aprovação de um admin) e exclui (com os negócios), sempre em segundo plano, com o aviso quando termina. O "Excluir" do ⋮ da linha também leva os negócios. No cabeçalho, o botão "Exportações" mostra as minhas exportações e, para o admin, os pedidos para aprovar.
Sem a casca, nada muda.

**Architecture:**
- **Filtros no banco (PR A):** o filtro da tela (`FiltrosDeContatos`, zod) vai na URL (`f`, JSON). A rota da lista valida, **compila** (`compilarFiltros`: tags normalizadas, "contém" vira o padrão regex sem acento do original, donos separados, fuso da organização) e passa como `p_filtros jsonb` à função da lista. A migration 9102 cria `fn_escale_contatos_do_filtro` (invoker: os contatos de uma busca + visão + filtro, na ordem da lista), as peças `fn_escale_passa_condicao`, `fn_escale_contato_passa`, `fn_escale_grupo_passa`, `fn_escale_negocio_passa` e `fn_escale_tags_passam` (os grupos de tags, sem caixa), e recria `fn_escale_lista_de_contatos` com o 8º parâmetro (`p_filtros`, padrão `{}`), que passa a ler dela.
- **Filtros salvos (PR A):** tabela nova `crm_filtros_das_listas` (`lista` = `contatos`; a 2D usa `empresas`), no molde da `crm_colunas_das_listas` (9101) e com as regras da 1D (20 por pessoa e lista, nome único por pessoa, compartilhado visível na organização). Rotas `GET/POST /api/v1/filtros-das-listas` e `PATCH/DELETE /api/v1/filtros-das-listas/[id]`.
- **Ações em massa (PR B):** a rota `POST /api/v1/acoes-em-massa` chama **uma** função invoker (`fn_escale_criar_acao_em_massa`, 9103) que, na mesma transação e com a RLS de quem pediu, grava a ação (`crm_acoes_em_massa`), resolve o alvo (ids marcados, ou o filtro inteiro, ou os N primeiros, menos os desmarcados) em `crm_acoes_em_massa_itens` e emite `contatos.acao_em_massa_requested` — **menos na exportação**, que nasce "aguardando_aprovacao" sem evento (a não ser que quem pede seja o único admin ativo). O admin decide por `fn_escale_decidir_exportacao` (invoker; aprovar põe "na_fila" e emite o evento na mesma transação), pelas rotas `POST /api/v1/acoes-em-massa/[id]/aprovar` e `/recusar`. O consumidor novo do `event_log` (`acaoEmMassaHandler`) processa em lotes de 100 com orçamento de 20 s por vez (devolve `retry` e continua), pelas rotinas do original: `createLeadHandler` (criar negócio), `patchContactHandler` (tag, que já emite `contact.tag_added`) e, para excluir, `excluirContatoComNegocios` (fork: trava da Agenda, os negócios do contato pelo mesmo caminho do "excluir em lote" do original, e o `deleteContactHandler`). Exportar monta o CSV no servidor e guarda no bucket privado `exportacoes-das-listas` por 24 h; o download é por URL assinada de 60 s.
- **Excluir da linha (PR B):** o ⋮ da linha chama a rota do fork `DELETE /api/v1/lista-de-contatos/[id]` (gerente ou acima), que usa o mesmo `excluirContatoComNegocios` com a sessão de quem pede.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix (Popover, DropdownMenu, Dialog), zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (funções SQL invoker, plpgsql, gatilho), `event_log` do original, Supabase Storage (URL assinada pelo service role).

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`). Os prints 2b (17/10, Clint atual) valem mais que as fichas antigas. Prints com o menu lateral valem pelo conteúdo do módulo, nunca pelo menu (regra do produto).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 03-001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\03-contatos\imagens\03-001-lista-contatos.png | a barra (busca, "Todos os contatos", "Filtros" + ⇕), a caixinha do cabeçalho com a setinha, a linha | 5, 10 |
| v2-17 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-17-filtros-em-chips.jpg | a faixa de chips do quadro (referência antiga; os prints 24 a 26 valem mais) | 5 |
| v2-18 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-18-filtro-painel.jpg | o painel do quadro (referência antiga; os prints 05 a 23 valem mais) | 4 |
| 18b | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\18b-menu-da-etapa-zoom.png | o "Selecione [0]" com o (?) roxo | 10 |
| v2-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-03-exportar-confirme-sua-acao.jpg | "Confirme sua ação" (título, X, texto, Cancelar e Confirmar) | 11 |
| 2b-01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-01-lista.jpg | a lista inteira: cabeçalho, barra, tabela, rodapé | 5 |
| 2b-02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-02-seletor-de-filtros.jpg | o seletor aberto: "PADRÃO" (ícone por visão: pessoas, maleta, pessoa com ×), item ativo em fundo da marca com ✓, "MEUS FILTROS" (marcador cheio na cor da marca e ⋮), "+ Criar filtro" na cor da marca | 5 |
| 2b-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-03-filtro-salvo-acoes.jpg | o ⋮ do salvo: "Renomear" (lápis) e "Excluir filtro" (lixeira, vermelho) | 5 |
| 2b-04 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-04-filtro-salvo-renomear.jpg | renomear NA PRÓPRIA LINHA: campo com borda da marca, ✓ em quadrado da marca e ✕ | 5 |
| 2b-05 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-05-painel-fechado.jpg | o painel com as quatro seções fechadas (ícone, título, chevron); sem filtro, sem rodapé | 4 |
| 2b-06, 07 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-06-secao-contato.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-07-contato-telefone-opcoes.jpg | seção Contato: "DATA DE CRIAÇÃO", "TELEFONE", conteúdo em fundo claro; as opções do telefone | 4 |
| 2b-08, 09 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-08-filtro-aplicado-personalizado.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-09-salvar-filtro.jpg | com filtro: o seletor vira "Personalizado" (ícone de controles), o selo QUADRADO da seção (fundo da marca suave), o × da seção, o rodapé à direita ("Salvar filtro" na cor da marca e "Resetar"); o balão "NOME DO FILTRO" | 4, 5 |
| 2b-10 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-10-ficha-do-contato-2e.jpg | a ficha do contato (fase 2E, só referência) | — |
| 2b-11 a 14 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-11-secao-negocio.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-12-negocio-origens.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-13-negocio-dono.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-14-negocio-motivo-de-perda.jpg | seção Negócio: os seis rótulos, a etapa desligada sem origem, as listas com caixinhas (origens agrupadas por grupo de origem na Clint; donos "Sem dono" e "Todos os donos" primeiro; motivo de perda com "Buscar por...") | 4 |
| 2b-15 a 20 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-15-secao-tags.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-16-tags-escolher.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-17-tags-operador.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-18-tags-grupo-e-lista-vazia.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-19-tags-adicionar-grupo.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-20-tags-dois-grupos.jpg | **Tags em grupos**: vazio = botão largo "+ Adicionar condição" com borda; o seletor suspenso ("Buscar por...", pílulas "Qualquer tag" e "Sem tag", a lista de tags); escolhida a tag: "← Voltar", o chip, os rádios "Possui a tag" / "Não possui a tag" e "Aplicar" embaixo à esquerda; o "GRUPO 1" com E \| OU e a lixeira; a condição "• Possui a tag [chip] ×"; "+ Adicionar condição" dentro do grupo; o botão largo "+ Adicionar grupo"; "combinar grupos por E \| OU" entre os grupos (OU por padrão) | 1, 2, 4 |
| 2b-21 a 23 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-21-campos-grupos.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-22-campos-contato.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-23-campos-operador.jpg | Campos: o seletor suspenso com "Buscar por..." e os grupos "Contato", "Negócio", "Empresa" que abrem e fecham (chevron); escolhido o campo: "← Voltar", "CONTATO" + "Nome", os operadores em rádios, o valor logo abaixo do operador marcado ("Contém" já marcado), "Aplicar" embaixo à esquerda | 4 |
| 2b-24 a 26 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-24-faixa-com-painel.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-25-faixa-de-chips-e-lista-vazia.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-26-faixa-vazia.jpg | **faixa aberta: o "Filtros" + ⇕ some da barra**; a faixa tem os chips ("Telefone **Sem Telefone** │ ×"), "+ Filtro" (borda cinza), "Resetar" e o ^ quadrado à direita; sem filtro, só "+ Filtro" e o ^; o painel abre no lugar do "Filtros"; o vazio "Não foram encontrados contatos." | 5 |
| 2b-27, 28 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-27-dica-selecionar.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-28-menu-da-setinha.jpg | a dica "Selecionar" da setinha; o menu "Selecionar todos" e "Selecionar [0] (?)" | 10 |
| 2b-29, 30, 37, 39 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-29-duas-linhas-e-barra.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-30-barra-zoom.png, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-37-dica-excluir.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-39-todos-selecionados.jpg | a barra de lote: "×", o número em branco (sem selo), "SELECIONADOS", a divisória, "Criar negócio", "Campos", "Tag", "Exportar" e a lixeira com a dica "Excluir selecionados" | 11 |
| 2b-31 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-31-criar-negocio.jpg | "Adicionar um novo negócio": Origem* e Etapa* lado a lado, Dono e Valor, Contato* desligado "2 Contatos selecionados", só "Adicionar negócio" no rodapé | 11 |
| 2b-32, 33 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-32-campos-em-massa.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-33-campos-em-massa-valor.jpg | "Alterar campo" em massa (fica para a 2C, Q3: só referência) | — |
| 2b-34 a 36 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-34-tag-em-massa.jpg, C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-35-tag-incluir-lista.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-36-tag-incluir-zoom.png | o "Tag" da barra: "Alterar tag" com X, "Incluir" (ícone de tag) e "Remover" (lixeira); depois "← Incluir Tag" e o seletor "Adicione uma tag" com a lista de chips abrindo para cima | 11 |
| 2b-38 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-38-excluir-confirmacao.jpg | a exclusão em massa: ilustração no topo, o número em negrito, "Ao continuar, eu entendo que:", três linhas com ⓧ vermelho (inclusive "Os negócios associados aos contatos serão excluídos"), "Digite **Excluir** para confirmar." com "Excluir" em vermelho, "Cancelar" e "Apagar Contatos 🗑" vermelho | 11 |
| 2b-40, 41 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-40-menu-novo-contato.jpg e C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-41-importar-passo1-contatos.jpg | o menu "Novo contato / Importar contatos" (da 2A, sem mudança) e o importador da Clint (fase própria depois da 2D, Q7: só referência) | — |

### Medidas (03-001 em zoom de 125%: medida do print ÷ 1,25 = CSS px; os prints 2b, v2-* e 18* já são CSS px)

| Peça | Medida |
|---|---|
| "Filtros" + ⇕ | 88 + 35 × 32, borda `casca-borda`, raio do gatilho; "Filtros" com o funil 15px e, com filtro, o selo redondo de 18px na cor da marca com o número. Com a faixa aberta, o par some (2b-24) |
| Faixa de chips | linha de 48px abaixo da barra, `px-6`; chips de 30px com borda `casca-borda`, raio 6, 13px "Título **valor**", divisória vertical e × 14px; "+ Filtro" de 30px com borda `casca-borda` e texto `casca-texto`; "Resetar" 12px `casca-suave`; ^ quadrado de 30px com borda, à direita |
| Painel | 356px de largura, até 80vh; cabeçalho de seção de 56px (ícone 15px, 13px/500, selo QUADRADO de 18px com raio 4 em `casca-marca-suave` e número na cor da marca, × 14px, chevron 14px); conteúdo `bg-casca-raia`, 20px de respiro, rótulos 11px/600 maiúsculos; rodapé de 44px com "Salvar filtro" e "Resetar" à direita |
| Grupos (Tags e Campos) | cartão branco com borda, raio 6, 12px de respiro; "GRUPO N" 11px/600 maiúsculo `casca-meta`; E \| OU de 24px; lixeira 14px; condição 12px com • na cor da marca; "+ Adicionar condição" 12px/600 na cor da marca; "+ Adicionar grupo" e o "+ Adicionar condição" do vazio: botão largo de 32px com borda, texto 13px/500 na cor da marca |
| Seletor suspenso (Tags e Campos) | 308px, raio 8, sombra do painel; busca de 32px com a lupa à direita; linhas de 32px |
| Barra de lote | fixa, centralizada, 12px acima do rodapé da página; 52px de altura, fundo da marca, raio 8; × 16px; o número em 13px/600 branco (sem selo); "SELECIONADOS" 11px/500 maiúsculo; divisória branca a 40%; botões de 36px, 13px/500, raio 6, hover branco a 15% |
| Faixa da seleção | 36px, `bg-casca-marca-suave`, texto 13px `casca-texto`, links 13px/500 na cor da marca |

### Textos da Clint usados nesta fase

Do bundle (`C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\`: `index-A38akjUb`, `index-BH0q213O`, `FieldFilterBuilder-BlhvqLy-`, `TagFilterBuilder-DHQYUxuA`, `SaveFilterPopover-DAVGkore`, `index-C8mLn7Gp`, `index-aSHo0T15`, `index-B5tmttGQ`, `index-fk6i2qsz`, `index-DCKImOq3`, `DealAddModal-Cp_tnqc_`, `index-UPYK_E9J`, `pt-BR-DmQ11GIn`) e dos prints 2b, copiados como estão:
- **Filtros:** "Filtros", "Filtro", "Resetar", "Recolher filtros", "Expandir filtros", "Remover filtro", "Todos os filtros", "Salvar filtro", "Contato", "Negócio", "Empresa", "Tags", "Campos", "Data de criação", "Filtrar por data de criação", "Telefone", "Com/Sem Telefone", "Sem Telefone", "Com Telefone", "Telefone inválido", "Telefone internacional", "Com/Sem negócio", "Com negócio", "Sem negócio", "Origens", "Com negócio em origens", "Etapa", "Com negócio em etapa", "{count} etapa", "{count} etapas", "Status", "Com negócio em status", "Aberto", "Ganho", "Perdido", "Dono do negócio", "Com/Sem dono do negócio", "Sem dono", "Todos os donos", "Dono", "Motivo de perda", "Motivo de Perda", "{count} selecionados", "Buscar por...", "Buscando tags...", "Qualquer tag", "Sem tag", "Possui a tag", "Não possui a tag", "Voltar", "Aplicar", "{count} tag", "{count} tags", "Nenhum campo encontrado", "Contém", "Não contém", "Igual", "Diferente", "Maior que", "Menor que", "Depois de", "Antes de", "Está vazio", "Não está vazio", "Digite o texto a buscar", "DD/MM/AAAA", "Selecione...", "Limite de {max} condições contém / não contém atingido neste filtro. Use Igual, ou remova uma condição para liberar.", "{count} campo", "{count} campos", "Grupo {number}", "E", "OU", "combinar grupos por", "Adicionar condição", "Adicionar grupo".
- **Filtros salvos:** "Padrão", "Meus filtros", "Criar filtro", "Personalizado", "Ações", "Renomear", "Excluir filtro", "Cancelar", `Tem certeza que deseja excluir o filtro "{name}"?`, "Nome do filtro", "Ex: Clientes em aberto", "Salvar", "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.", "Todos os contatos".
- **Seleção:** "Selecionar todos", "Selecionar", "Escolha quantos contatos você quer selecionar", "Remover selecionados", "selecionados".
- **Ações em massa:** "Criar negócio", "Adicionar um novo negócio", "Origem", "Selecione uma origem", "Etapa", "Dono do negócio", "Escolher dono do negócio", "Valor do negócio", "Clique aqui para adicionar", "{n} Contatos selecionados", "Adicionar negócio", "Os negócios foram enviados para criação!", "Os negócios foram criados com sucesso!", "Campos", "Tag", "Alterar tag", "Incluir", "Remover", "Incluir Tag", "Remover Tag", "Adicione uma tag", "Nenhuma tag correspondente", "Selecione a tag para remover", "Tem certeza que deseja remover a tag selecionada?", "As tags foram adicionadas aos contatos.", "Contatos com novas tags estão na fila de atualização. O processo pode levar alguns segundos.", "Falha ao adicionar tags aos contatos, tente novamente ou chame o suporte.", "A tag foi removida do(s) contato(s).", "Contato(s) com a remoção da tag estão na fila de atualização. O processo pode levar alguns segundos.", "Falha ao remover tag do(s) contato(s), tente novamente ou chame o suporte.", "Exportar", "Ver exportações", "Os contatos foram exportados com sucesso.", "A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado.", "Falha ao exportar os contatos, tente novamente ou chame o suporte.", "Baixar exportação", "Excluir selecionados", "Confirme sua ação", "Esta ação excluirá {n} contatos selecionados. Deseja Continuar?", "Esta ação excluirá 1 contato selecionado. Deseja Continuar?", "Ao continuar, eu entendo que:", "A exclusão é irreversível", "Os negócios associados aos contatos serão excluídos", "Os chats de WhatsApp e Instagram serão excluídos", "Digite **Excluir** para confirmar.", "Digite aqui...", "Apagar Contatos", "Exclusão em massa de grandes quantidades ocorrem em segundo plano e podem levar alguns minutos.", "Os contatos foram excluídos com sucesso.", "Falha ao remover os contatos, tente novamente ou chame o suporte.", "Confirmar", "Tem certeza que deseja excluir o contato selecionado?".

**Textos nossos** (sem texto da Clint, no tom dela): "Compartilhar com a equipe", "Compartilhados", "Disponível para gerente ou acima.", "Selecionar esta página ({n})", "Selecionar todos os {total} contatos", "Os {n} contatos desta página estão selecionados.", "Todos os {total} contatos estão selecionados.", "Limpar seleção", "Tem certeza que deseja exportar {n} contatos?", "Contato com compromisso na agenda não é excluído", "Os negócios associados ao contato também serão excluídos.", "A exportação foi enviada para aprovação de um administrador.", "Exportações", "Minhas exportações", "Para aprovar", "Aguardando aprovação", "Gerando", "Pronta", "Recusada", "Expirada", "Aprovar", "Recusar" e os demais marcados "(nosso)" no código.

### Comportamento da Clint conferido no código e nos prints

- **Painel** (`FilterPopover`, `FilterSections`; prints 05 a 23): Popover de 356px, até 80vh; acordeão; cada seção com selo e × que limpa só ela; clicar num chip abre o painel focado na seção, com o link "Todos os filtros"; rodapé à direita "Salvar filtro" (só com filtro personalizado e sem foco) e "Resetar"; aplica na hora (sem "Aplicar" global; "Aplicar" só dentro de cada condição).
- **Tags e Campos** (`TagFilterBuilder`, `FieldFilterBuilder`; prints 15 a 23): os dois em grupos de condições (E ou OU dentro do grupo, "combinar grupos por" entre grupos, OU por padrão entre grupos e E dentro); a condição nasce num seletor suspenso aberto pelo "+ Adicionar condição" (do grupo) ou pelo "+ Adicionar grupo" (grupo novo).
- **Faixa** (`useCollapsibleFilters`; prints 24 a 26): recolhida por padrão (`contacts-list:filter-bar-collapsed`); recolhida, "Filtros" mostra o selo com a contagem; aberta, o "Filtros" + ⇕ sai da barra e a faixa mostra chips + "+ Filtro" + "Resetar" (se o preset não é o padrão) + ^ "Recolher filtros"; muitos chips viram "+N".
- **Presets** (`useFilterPresets`): `contact-default-all` "Todos os contatos", `contact-default-with-deal` "Com negócio", `contact-default-without-deal` "Sem negócio"; os salvos em "Meus filtros"; mudar o filtro de um preset vira "Personalizado"; voltar a bater com um preset volta o nome. Renomear é na própria linha (print 04).
- **Seleção** (`index-C8mLn7Gp`): estados UNCHECKED/CHECKED/INDETERMINATE; "Selecionar todos" = todos os resultados filtrados; desmarcar uma linha nesse modo a põe em `ignoredIds`; "Selecionar [N]" ≥ total = todos; 0 limpa. (A caixinha que marca só a página e a faixa são a decisão B3 do usuário; na Clint, print 39, a caixinha marca tudo.)
- **Massa** (`Fna`): `bulk_params = { where, bulkIds, ignoredIds, insertType, selectedQuantity }`; nada vai como lista de ids quando é "todos".
- **Excluir** (`zs`; print 38): "Digite Excluir para confirmar."; "Apagar Contatos" vermelho, só liga com o texto certo; acima de 5000, o aviso de segundo plano.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Dois PRs** (Q1, Q7). A: Tasks 1–6 (9102). B: Tasks 7–13 (9103). O PR B nasce da `escale-crm/main` depois do merge do PR A | G1: planos e PRs menores; cada PR entrega algo que funciona sozinho |
| N2 | **Modelo do filtro** (`lib/escale/contatos/filtros.ts`): `criadoEm {de, ate}` (dias), `telefone` (com, sem, invalido, internacional), `negocio {tem, origens, etapas, status, donos, motivos}`, `tags {combinar, grupos[{modo, condicoes[{op: possui\|nao_possui\|qualquer\|sem, tag?}]}]}`, `campos {combinar, grupos[{modo, condicoes[]}]}`. Condição de campo: `{alvo: contato\|negocio, chave, tipo, op, valor}`. Operadores por tipo como na Clint (texto e seleção: contém, não contém, igual, diferente, vazio, não vazio; número: igual, diferente, maior, menor, vazio, não vazio; data: igual, diferente, depois, antes, vazio, não vazio). Tags e Campos: até 5 grupos, 10 condições por grupo; 10 "contém/não contém" por filtro. Entre grupos, OU por padrão; dentro do grupo, E | Clint (`index-A38akjUb`, `FieldFilterBuilder`, `TagFilterBuilder`; prints 15 a 23) |
| N3 | **Campos filtráveis nesta fase:** do contato, Nome, Email, Telefone, Data de nascimento e os links (Instagram, site…) de `CAMPOS_DO_CONTATO_2A`; do negócio, "Valor do negócio" e os campos do CRM (`camposFiltraveis` da 1D, que lê o catálogo da 1F-a). Os personalizados do contato entram sozinhos na 2C; os da empresa, na 2D. Condição de negócio vale se **algum** negócio visível a cumpre (Q10) | PRD D5; "partir do que já existe" |
| N4 | **Seção Negócio:** "Com/Sem negócio"; origens; etapa (só com origem escolhida); status; dono ("Sem dono", "Todos os donos" = com dono, pessoas e agentes de IA); motivo de perda (os canônicos e os das origens; escolher motivo põe o status em Perdido, como a Clint). Todos os critérios valem para **o mesmo** negócio; "Sem negócio" com critérios = não tem negócio que os cumpra. Só negócios de origem não arquivada e que a pessoa enxerga (RLS). Sem "Não informar" (Q9). As origens aparecem numa lista só (a Clint agrupa por grupo de origem; o grupo de origem não existe no nosso motor: diferença conhecida) | Clint (`deals:{_and:[…]}`) |
| N5 | **Filtros salvos:** tabela `crm_filtros_das_listas` (9102) com `lista`; 20 por pessoa e lista (trigger com trava), nome único por pessoa e lista (sem caixa); compartilhado visível a toda a organização, escrita só de quem criou; balão "Salvar filtro" com "Compartilhar com a equipe" (Q2); o ⋮ do item tem "Renomear", "Excluir filtro" (como a Clint, print 03) e o nosso "Compartilhar com a equipe"/"Deixar de compartilhar"; **renomear é na própria linha** (campo, ✓ e ✕, print 04); salvar não muda os critérios de um salvo (é sempre "novo"), como a Clint | Clint + PRD B2 |
| N6 | **Seletor** (o "Todos os contatos" da 2A): grupos "Padrão" (as 4 visões, Q12, cada uma com o seu ícone), "Meus filtros", "Compartilhados" e "Criar filtro" (abre o painel). O rótulo é o do salvo ativo (se os critérios ainda batem), "Personalizado" com filtro (ícone de controles), ou a visão | Clint (`useFilterPresets`, `usePresetDirtySync`; prints 02 e 08) |
| N7 | **URL:** `f` (JSON do filtro enxuto) e `fs` (id do salvo) somam-se a `q`, `v` e `p`. Faixa recolhida/aberta no navegador (`escale:contatos:faixa-de-filtros`, `try/catch`), recolhida por padrão | "URL como estado"; Clint guarda no navegador |
| N8 | **No banco, com a RLS de quem olha:** `fn_escale_contatos_do_filtro` (invoker) recebe o filtro **compilado** pela rota (nada de regex vindo do navegador: "contém" vira `padraoRegexDeBusca`, que escapa tudo). As tags se avaliam em `fn_escale_tags_passam` (invoker, sem caixa: o gravado pode ter maiúscula de antes da #1224). As datas usam o fuso da organização (`organizations.timezone`, `fusoUtilizavel`). Telefone inválido = não é um celular/fixo brasileiro válido nem um internacional válido; internacional = válido e sem +55 | Lista com dezenas de milhares (PRD §12) |
| N9 | **Painel controlado por um só Popover**, ancorado no "Filtros" (com a faixa aberta, numa âncora invisível no mesmo lugar, porque o "Filtros" some); os chips e o "+ Filtro" o abrem (o chip abre focado na seção). Mais de 6 chips: os 6 primeiros e "+N", que abre o painel. O seletor das condições de Tags e Campos é um Popover dentro do painel | Clint; um painel só |
| N10 | **Seleção (B3):** caixinha do cabeçalho marca/desmarca a página (indeterminada se parte); a setinha ("Selecionar") abre "Selecionar esta página (N)", "Selecionar todos os {total} contatos" e "Selecionar [N]" com o (?); a faixa aparece com a página toda marcada ("Os N contatos desta página estão selecionados. Selecionar todos os {total} contatos · Limpar seleção") e com tudo marcado ("Todos os {total} contatos estão selecionados. · Limpar seleção"). Marcados à mão: até 1.000, e valem entre páginas. "Todos"/"N primeiros": desmarcar uma linha a põe em "excluídos". Mudar busca, visão ou filtro limpa a seleção. Só gerente ou acima (Q11) | Decisão B3 do usuário; Clint (`ignoredIds`) |
| N11 | **Toda ação em massa vai para a fila** (`event_log`, Q6): a rota grava a ação e os itens numa transação (função invoker, RLS de quem pede), emite o evento (menos na exportação que espera aprovação, N14) e responde 201. O consumidor processa 100 por vez, 20 s por rodada, e devolve `retry`. Cada item é marcado como feito **antes** de agir (no máximo uma vez: criar negócio não duplica se o worker cair). Até 100.000 contatos por ação | Clint (`payload.queue`); o original não tem rota em massa de contato |
| N12 | **Ações:** "Criar negócio", "Campos" (desligado até a 2C, Q3), "Tag" (incluir/remover, pela rotina do PATCH do contato, que dispara "Quando um contato ganhar uma tag", Q13), "Exportar" e excluir. O "Tag" da barra é o da Clint (prints 34 a 36): "Alterar tag" → "Incluir"/"Remover" → "← Incluir Tag" com o seletor "Adicione uma tag"; **escolher a tag já aplica** na inclusão (não há "Aplicar" no print 36); na remoção, escolher a tag pede "Tem certeza que deseja remover a tag selecionada?". Toasts da Clint na fila e no fim | Clint (`index-aSHo0T15`, `index-DCKImOq3`) |
| N13 | **Aviso de fim:** a lista acompanha as ações que a pessoa disparou nesta aba (`sessionStorage` `escale:contatos:acoes`) e pergunta a cada 3 s enquanto alguma está rodando (a cada 30 s se só há exportação aguardando aprovação); quando termina, o toast da Clint, a lista se refaz, e na exportação o toast traz "Baixar exportação" (Q6). "Aguardando aprovação" **não** é fim; "Recusada" e "Expirada" são (toast de erro). O botão "Exportações" do cabeçalho (N14) mostra o estado de cada exportação mesmo depois de fechar a aba | Sem tela de "Ações em 2º plano" (PRD §9) |
| N14 | **Exportar com aprovação (Q4):** pedir é de gerente ou acima; "Confirme sua ação" com o número. A ação nasce **"aguardando_aprovacao", sem evento**, salvo quando quem pede é admin **e** o único admin ativo da organização (`user_organizations` com `role = 'admin'` e `revoked_at is null`): aí vai direto para "na_fila" com o evento, e a auditoria marca `aprovacao: "dispensada"`. Quem aprova: um admin da organização **diferente de quem pediu** (o pedido de um gerente, qualquer admin; o de um admin, outro admin). Aprovar → "na_fila" + `decidido_por`/`decidido_em` + o evento, na mesma transação (`fn_escale_decidir_exportacao`, invoker); recusar → "recusada" + quem e quando. O pedido vence em 7 dias (calculado de `created_at`, sem cron: aprovar um vencido é recusado e a lista mostra "Expirada"). O arquivo gerado vale 24 h. A contagem de admins é invoker (`fn_escale_admin_unico`): a policy `user_orgs_select` (0044) deixa gerente e admin lerem o quadro de membros, então não precisa de `security definer`. Contra atalho pelo PostgREST: a policy de quem pede não deixa pôr exportação "na_fila" (só o único admin), a policy do admin só sai de "aguardando_aprovacao" para "na_fila"/"recusada" com `decidido_por = auth.uid()` e quem pediu ≠ quem decide, e o gatilho `trg_crm_acoes_em_massa_trava_da_decisao` não deixa mudar mais nada na decisão (nem contagem, nem arquivo, nem a ação). O CSV sai do servidor (Nome, Telefone, E-mail, Instagram, Tags, Data de nascimento, Origem, Criado em, Última atividade; datas no fuso da organização, formato brasileiro; BOM UTF-8; guarda de fórmula de `celula`) no bucket privado `exportacoes-das-listas` (`{org}/{ação}/contatos-AAAA-MM-DD.csv`), 24 h; baixar = `GET /api/v1/acoes-em-massa/[id]/arquivo`, que confere o dono e responde 302 para URL assinada de 60 s. Auditoria `contacts.bulk_requested`, `contacts.export_approved`, `contacts.export_rejected` e `contacts.export_downloaded`. O botão "Exportações" (ícone de download com selo, ao lado do selo de mescla, gerente ou acima) lista as minhas exportações dos últimos 8 dias e, para o admin, "Para aprovar" | Q4 do usuário; LGPD (arquivo com PII, privado e curto) |
| N15 | **Excluir leva os negócios (Q5):** gerente ou acima; a janela da Clint com a ilustração, as três linhas (inclusive "Os negócios associados aos contatos serão excluídos"), "Digite Excluir" e "Apagar Contatos". Cada contato passa por `excluirContatoComNegocios` (fork, `lib/escale/contatos/excluir.ts`): 1) a trava da Agenda do original (`vinculosDoContatoHandler`: contato com compromisso não é excluído, e nada é apagado — falha com motivo); 2) **todos os negócios do contato na organização** (não só os que estão na tela) saem pelo mesmo caminho do "excluir em lote" do original (`app/api/v1/leads/bulk`: DELETE em `crm_leads`, evento `lead.bulk_deleted`, auditoria `lead.bulk_action`); 3) o contato sai pelo `deleteContactHandler` do original (conversas e mensagens juntas, evento `contact.deleted`, auditoria). Gerente e admin enxergam e apagam todos os negócios da organização pela RLS (`fn_can_view_lead` e `crm_leads_delete`), e o consumidor usa o service role. O "Excluir" do ⋮ da linha usa a mesma regra pela rota do fork `DELETE /api/v1/lista-de-contatos/[id]` (gerente ou acima, sessão de quem pede); o balão da Clint ganha a linha "Os negócios associados ao contato também serão excluídos." | Q5 do usuário; motor do original |
| N16 | **Criar negócio em massa:** origem*, etapa*, dono (pessoas, opcional), valor (opcional); cada contato pelo `createLeadHandler` do original com `via_planilha: true` (Q8: o usuário preferiu **não mexer no motor de automações**; só o follow-up "Lead criado" deixa de inscrever esses negócios, como na importação de planilha); título = `nomeDoContato` ou "Novo negócio". O rodapé só tem "Adicionar negócio" (print 31) | Clint (`DealAddModal`); regra 4 do roteiro |
| N17 | **Importar contatos (B6) vira fase própria depois da 2D:** mapeamento das colunas para campos de contato, negócio e empresa, como o Import Studio da Clint. Até lá, "Importar contatos" continua abrindo o importador do original (comportamento da 2A) | Q7 do usuário |
| N18 | **Duas migrations (9102, 9103)**, cada uma com o bloco igual no `supabase/baseline.sql`, logo depois do bloco da 9101 (antes de `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----`) | Regra 7 do roteiro; faixa da Frente B |
| N19 | **Desvios visuais assumidos (prints 2b):** no seletor de Campos, o grupo "Empresa" aparece **desligado com "Em breve"** até a 2D (a Clint mostra o grupo; esconder mudaria o desenho); a ilustração da exclusão em massa (print 38) vira uma composição de ícones (lixeira na cor da marca dentro de um círculo suave, com o triângulo de alerta vermelho), porque não temos a imagem; a barra de lote mostra o número sem selo (print 30); o selo da seção do painel é quadrado (print 08) | Regra do produto: diferença escrita e justificada |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. **A pasta `repo` é da Frente A** (está na 1H, com arquivos alterados): **não troque de branch nela, não faça stash, não mexa nos arquivos dela.**
- **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b` (hoje na branch `feat/fase-2a-lista-de-contatos`, já mergeada). Todo comando desta fase roda dentro dela.
- **Branches:** PR A `feat/fase-2b-filtros-de-contatos`; PR B `feat/fase-2b-acoes-em-massa`. Cada uma criada de `escale-crm/main` (a Task 1 e a 7 provam a base).
- **Migrations:** **9102** (`supabase/migrations/20261031120000_9102_filtros_de_contatos.sql`) e **9103** (`supabase/migrations/20261101120000_9103_acoes_em_massa.sql`). Antes de criar cada uma: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se o número já existir em outra branch, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` (Postgres no Docker): `corepack pnpm test:db <arquivos>`, só nas Tasks 2 e 7 e nas rodadas cheias. Se `docker info` falhar, PARE e peça ao usuário para abrir o Docker Desktop.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2B`. Sem a casca, nenhum deles muda o comportamento.

| Arquivo | Mudança | PR |
|---|---|---|
| `app/app/contacts/page.tsx` | passa tudo o que `origensDaPagina()` devolve (`<ListaDeContatos {...dados} />`) | A |
| `supabase/baseline.sql` | blocos da 9102 e da 9103, logo depois do bloco da 9101 | A, B |
| `lib/i18n/dicionario.ts` | blocos novos logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` (depois do bloco da 2A) | A, B |
| `lib/audit/actions.ts` | ações novas logo depois de `"list_columns.updated",` | A, B |
| `tests/invariants/rls-completude-varredura.test.ts` | entradas novas em `PROVA_PROPRIA`, logo depois da de `crm_colunas_das_listas` | A, B |
| `lib/event-log/register-handlers.ts` | import e `registerHandler(acaoEmMassaHandler)` logo depois de `registerHandler(lgpdExportHandler);` | B |
| `tests/unit/dispatcher-org-parada.test.ts` | `acaoEmMassaHandler` na lista `RODA` | B |

Os do fork que mudam: `lib/escale/contatos/lista.ts`, `lib/escale/contatos/origens-da-pagina.ts`, `hooks/escale/useListaDeContatos.ts`, `components/escale/contatos/ListaDeContatos.tsx`, `TabelaDeContatos.tsx`, `MenuDaLinha.tsx` (o "Excluir" da linha leva os negócios, Q5) e `lib/ui/icons-da-casca.ts` (a seta do "Voltar"). `MenuNovoContato.tsx` **não** muda: "Importar contatos" segue abrindo o importador do original (Q7).

**Conflito esperado com a Frente A:** `baseline.sql` (a 9008 da 1H também entra perto do 0323), `dicionario.ts`, `actions.ts`, `rls-completude-varredura.test.ts` e `icons-da-casca.ts`. Antes de cada PR, atualize a branch com a `escale-crm/main` e resolva mantendo os dois blocos.

### Testes que mudam de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-lista-de-contatos-rotas.test.ts` | os argumentos exatos do `rpc("fn_escale_lista_de_contatos", …)` (L131) | ganha `p_filtros` (Task 3) |
| `tests/unit/escale-tabela-de-contatos.test.tsx` | "a caixinha desligada 'Em breve'" (L56–62) | a caixinha liga para gerente (Task 10) |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens`: cores só por token da casca (`casca-*`, `surface`) ou `var(--escale-*)`; nada de `rounded` puro, `shadow` puro, `outline-none`; nenhum hex novo em `className`; texto sem alfa.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do original não importam `@/components/escale/`.
- `navegacao-completude`: nenhuma `page.tsx` nova.
- `i18n-espanhol-cobre-a-tela`: todo texto novo passa por `t()` e tem espanhol (Tasks 6 e 13).
- `rls-completude-varredura`, `rbac-config-ia-canais`, `travas-de-suporte-cobrem-toda-tabela-na-instalacao` e as varreduras de definer (`definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura`): tabelas novas com RLS e policies, funções invoker (nenhuma `security definer` nova nesta fase).
- `manifest-x-migrations`: cada migration tem a linha `-- manifest:`; o `MANIFEST.md` não muda.
- `tabelas-do-motor-nao-se-leem-pelo-login`: as tabelas novas são lidas pela sessão (RLS); o service role só no consumidor e na URL assinada.
- `dispatcher-org-parada` e `evento-comando-tem-consumidor`: o consumidor novo é "roda" e o evento `_requested` tem consumidor (Task 8).
- `cron-routes-scheduled`: nenhuma rota de cron nova (o vencimento do pedido de exportação é calculado, sem cron).

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** só nas Tasks 2 e 7, com o arquivo novo e as varreduras (`rls-completude-varredura`, `rbac-config-ia-canais`, `travas-de-suporte-cobrem-toda-tabela-na-instalacao`, `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura`), mais `escale-lista-de-contatos` na Task 2.
3. **Revisor (subagente) só** nas Tasks 2 e 7 (migrations e RLS), 3 e 9 (rotas), 8 (consumidor que grava com o service role e a exclusão com os negócios) e 11 e 12 (janelas que gravam e a aprovação). As outras: o controlador lê o diff.
4. **Uma rodada cheia por PR** (Tasks 6 e 13), em segundo plano enquanto o texto do PR é escrito, comparada com `.superpowers/sdd/falhas-conhecidas.txt` (copie da pasta `repo` para a worktree; é ignorado pelo git). Falha nova = rodar sozinha; se persistir, é regressão.
5. **Conferência visual** só no fim de cada PR, depois do deploy, em app.escaleia.com com a casca ligada: cada parte contra o print citado, com a lista escrita das diferenças que sobram (não há `.env.local` seguro para rodar local).
6. **Comandos longos sempre em segundo plano** (a suíte cheia e o `test:db`).

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` e o PRD para `docs/escale/modulos/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/contatos/filtros.ts` | novo | A | modelo do filtro (tags e campos em grupos), operadores, campos, enxugar, contar, chips, URL |
| `lib/escale/contatos/compilar-filtros.ts` | novo | A | o filtro da tela → o `jsonb` que o banco lê |
| `lib/escale/contatos/opcoes-do-filtro.ts` | novo | A | origens, etapas, motivos e campos do negócio para o painel |
| `supabase/migrations/20261031120000_9102_filtros_de_contatos.sql`, `supabase/baseline.sql` | novo / bloco | A | `crm_filtros_das_listas`, funções do filtro (com `fn_escale_tags_passam`), lista com `p_filtros` |
| `lib/escale/listas/filtros-salvos.ts` | novo | A | ler e validar filtros salvos |
| `app/api/v1/filtros-das-listas/route.ts`, `app/api/v1/filtros-das-listas/[id]/route.ts` | novos | A | rotas dos filtros salvos |
| `lib/escale/contatos/lista.ts`, `app/api/v1/lista-de-contatos/route.ts` | alterados | A | `f` na consulta, fuso, `p_filtros` |
| `lib/escale/contatos/origens-da-pagina.ts`, `app/app/contacts/page.tsx` | alterados | A | `opcoesDoFiltro` |
| `hooks/escale/useListaDeContatos.ts`, `hooks/escale/useFiltrosDaLista.ts`, `hooks/escale/useEstadoDaListaDeContatos.ts` | alterado / novos | A | consulta, salvos, estado da URL |
| `lib/ui/icons-da-casca.ts` | alterado | A | `ArrowLeft` (o "← Voltar") |
| `components/escale/ui/JanelaDeConfirmacao.tsx` | novo | A | "Confirme sua ação" reaproveitável |
| `components/escale/contatos/filtros/PecasDoFiltro.tsx`, `PainelDeFiltros.tsx`, `SecaoContatoDoFiltro.tsx`, `SecaoNegocioDoFiltro.tsx`, `SecaoTagsDoFiltro.tsx`, `SecaoCamposDoFiltro.tsx`, `FaixaDeFiltros.tsx`, `ControleDosFiltros.tsx`, `SeletorDeFiltros.tsx`, `BalaoDoFiltro.tsx` | novos | A | o painel (com os grupos de Tags e Campos), a faixa, o "Filtros" + ⇕, o seletor e o balão |
| `components/escale/contatos/ListaDeContatos.tsx` | alterado | A, B | a barra com filtros; a seleção, a barra de lote e o botão "Exportações" |
| `supabase/migrations/20261101120000_9103_acoes_em_massa.sql`, `supabase/baseline.sql` | novo / bloco | B | ações (com a aprovação da exportação), itens, funções que criam e decidem, trava da decisão, bucket |
| `lib/escale/contatos/selecao.ts` | novo | B | seleção (pura) e o alvo da ação |
| `lib/escale/contatos/excluir.ts` | novo | B | `excluirContatoComNegocios` (Agenda, negócios, contato) |
| `lib/escale/massa/tipos.ts`, `lib/escale/massa/csv-de-contatos.ts`, `lib/escale/massa/executar.ts`, `lib/escale/massa/handler.ts`, `lib/escale/massa/decisao-da-exportacao.ts` | novos | B | corpo da rota, CSV, o processamento, o consumidor e a decisão do admin |
| `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts` | alterados | B | registro do consumidor |
| `app/api/v1/acoes-em-massa/route.ts`, `app/api/v1/acoes-em-massa/[id]/arquivo/route.ts`, `app/api/v1/acoes-em-massa/[id]/aprovar/route.ts`, `app/api/v1/acoes-em-massa/[id]/recusar/route.ts`, `app/api/v1/lista-de-contatos/[id]/route.ts` | novos | B | pedir, acompanhar, aprovar, recusar, baixar; excluir da linha |
| `hooks/escale/useAcoesEmMassa.ts`, `hooks/escale/useExcluirContatoDaLista.ts` | novos | B | pedir, acompanhar e decidir; excluir da linha |
| `components/escale/contatos/massa/MenuDaSelecao.tsx`, `FaixaDaSelecao.tsx`, `BarraDeLote.tsx`, `JanelaCriarNegocios.tsx`, `PainelDeTag.tsx`, `JanelaExcluirContatos.tsx`, `AcoesEmMassa.tsx`, `textosDasAcoes.ts`, `PainelDeExportacoes.tsx` | novos | B | seleção, barra, janelas e o painel "Exportações" |
| `components/escale/contatos/TabelaDeContatos.tsx`, `components/escale/contatos/MenuDaLinha.tsx` | alterados | B | caixinhas ligadas; o "Excluir" da linha com os negócios |
| `lib/audit/actions.ts`, `lib/i18n/dicionario.ts`, `tests/invariants/rls-completude-varredura.test.ts` | alterados | A, B | ações, espanhol, varredura |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` | alterado (fora do repositório) | A, B | a linha da 2B na seção 8 |

---

# PR A — Filtros e filtros salvos (B1, B2)

### Task 1: Worktree, base e as regras puras do filtro

**Files:**
- Create: `lib/escale/contatos/filtros.ts`, `lib/escale/contatos/compilar-filtros.ts`, `lib/escale/contatos/opcoes-do-filtro.ts`, `tests/unit/escale-filtros-de-contatos-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`; o PRD para `docs/escale/modulos/2-contatos-e-empresas.md`

**Interfaces (Produces):**
- `filtros.ts`: `OPCOES_DE_TELEFONE`, `OpcaoDeTelefone`, `ROTULO_DO_TELEFONE`, `STATUS_DO_FILTRO`, `StatusDoFiltro`, `ROTULO_DO_STATUS`, `DONO_SEM`, `DONO_COM`, `TIPOS_DE_CAMPO`, `TipoDeCampo`, `OPERADORES`, `Operador`, `ROTULO_DO_OPERADOR`, `operadoresDoTipo(tipo)`, `precisaDeValor(op)`, `CONDICOES_POR_GRUPO_MAX` (10), `GRUPOS_MAX` (5), `CONTEM_MAX` (10), `OPS_DE_TAG`, `OpDeTag`, `ROTULO_DA_OP_DE_TAG`, `diaValido(texto)`, `filtrosDeContatosSchema`, `FiltrosDeContatos`, `CondicaoDoFiltro`, `GrupoDoFiltro`, `CondicaoDeTag`, `GrupoDeTags`, `NegocioDoFiltro`, `TagsDoFiltro`, `CampoDoFiltro`, `contarCondicoes(grupos)`, `CAMPOS_DO_CONTATO_DO_FILTRO`, `CAMPO_VALOR_DO_NEGOCIO`, `camposDoNegocioDoFiltro(settings[])`, `SECOES_DO_FILTRO`, `SecaoDoFiltro`, `enxugarFiltros(f)`, `temFiltros(f)`, `contarContem(f)`, `contarNaSecao(f, secao)`, `limparSecao(f, secao)`, `mesmosFiltros(a, b)`, `filtrosDaUrl(texto)`, `filtrosParaUrl(f)`, `ChaveDoChip`, `ChipDoFiltro`, `chipsDosFiltros(f)`, `removerChip(f, chave)`, `textoDoPeriodo({de, ate})`.
- `compilar-filtros.ts`: `CondicaoCompilada`, `FiltroCompilado`, `compilarFiltros(filtros, fuso): FiltroCompilado`.
- `opcoes-do-filtro.ts`: `OrigemDoFiltro`, `OpcoesDoFiltro`, `OPCOES_VAZIAS`, `OrigemLidaParaFiltro`, `opcoesDoFiltroDasOrigens(lidas): OpcoesDoFiltro`.

- [ ] **Step 1: A worktree e a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain            # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/contatos/ListaDeContatos.tsx && echo "2A ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -E "_9[0-9]{3}_" | sort | tail -3
bash scripts/checar-colisao-de-migration.sh escale-crm/main
git switch -c feat/fase-2b-filtros-de-contatos escale-crm/main
corepack pnpm install --frozen-lockfile
mkdir -p .superpowers/sdd && cp ../repo/.superpowers/sdd/falhas-conhecidas.txt .superpowers/sdd/
```

Expected: `2A ok`; a maior da faixa 91xx é a `9101` (a 9008 da Frente A pode já existir: não importa). Se aparecer `9102` ou `9103` em qualquer branch, PARE e pergunte.

- [ ] **Step 2: Copiar o plano e o PRD**

```bash
mkdir -p docs/escale/modulos docs/superpowers/plans
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-17-fase-2b-filtros-e-acoes-em-massa.md" docs/superpowers/plans/
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/modulos/2-contatos-e-empresas.md" docs/escale/modulos/
```

- [ ] **Step 3: O teste das regras (vai falhar)**

Create `tests/unit/escale-filtros-de-contatos-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import {
  CONTEM_MAX,
  chipsDosFiltros,
  contarNaSecao,
  diaValido,
  enxugarFiltros,
  filtrosDaUrl,
  filtrosDeContatosSchema,
  filtrosParaUrl,
  limparSecao,
  mesmosFiltros,
  operadoresDoTipo,
  removerChip,
  temFiltros,
  textoDoPeriodo,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import { opcoesDoFiltroDasOrigens } from "@/lib/escale/contatos/opcoes-do-filtro";

const O1 = "11111111-1111-4111-8111-111111111111";
const E1 = "22222222-2222-4222-8222-222222222222";
const U1 = "33333333-3333-4333-8333-333333333333";
const A1 = "44444444-4444-4444-8444-444444444444";

const completo: FiltrosDeContatos = {
  criadoEm: { de: "2026-10-01", ate: "2026-10-17" },
  telefone: "com",
  negocio: {
    tem: "com",
    origens: [O1],
    etapas: [E1],
    status: ["open"],
    donos: [U1, `agent:${A1}`, "sem_dono"],
  },
  tags: {
    combinar: "ou",
    grupos: [
      {
        modo: "e",
        condicoes: [
          { op: "possui", tag: "VIP" },
          { op: "nao_possui", tag: "frio" },
        ],
      },
    ],
  },
  campos: {
    combinar: "ou",
    grupos: [
      {
        modo: "e",
        condicoes: [
          { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "joao" },
          { alvo: "negocio", chave: "valor", tipo: "numero", op: "maior", valor: "1500" },
        ],
      },
    ],
  },
};

const comCondicao = (c: object) => ({
  campos: { combinar: "e", grupos: [{ modo: "e", condicoes: [c] }] },
});

describe("o modelo do filtro", () => {
  it("aceita o filtro completo da Clint", () => {
    expect(filtrosDeContatosSchema.safeParse(completo).success).toBe(true);
  });

  it("recusa operador fora do tipo, número que não é número, data que não existe, valor faltando e tag sem a tag", () => {
    const recusa = (c: object) =>
      expect(filtrosDeContatosSchema.safeParse(comCondicao(c)).success).toBe(false);
    recusa({ alvo: "contato", chave: "nome", tipo: "texto", op: "maior", valor: "1" });
    recusa({ alvo: "negocio", chave: "valor", tipo: "numero", op: "igual", valor: "abc" });
    recusa({ alvo: "contato", chave: "nascimento", tipo: "data", op: "antes", valor: "2026-02-30" });
    recusa({ alvo: "contato", chave: "nome", tipo: "texto", op: "contem" });
    expect(filtrosDeContatosSchema.safeParse({ inventado: 1 }).success).toBe(false);
    const recusaTag = (condicoes: object[]) =>
      expect(
        filtrosDeContatosSchema.safeParse({ tags: { combinar: "e", grupos: [{ modo: "e", condicoes }] } }).success,
      ).toBe(false);
    recusaTag([{ op: "possui" }]);
    recusaTag([{ op: "qualquer", tag: "vip" }]);
    recusaTag([{ op: "talvez" }]);
    recusaTag([]);
  });

  it("no máximo 10 'contém / não contém' por filtro (Clint)", () => {
    const condicao = { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "a" };
    const condicoes = Array.from({ length: CONTEM_MAX + 1 }, () => condicao);
    const grupos = [condicoes.slice(0, 6), condicoes.slice(6)].map((c) => ({ modo: "e", condicoes: c }));
    expect(filtrosDeContatosSchema.safeParse({ campos: { combinar: "e", grupos } }).success).toBe(false);
  });

  it("os operadores de cada tipo seguem a Clint", () => {
    expect(operadoresDoTipo("texto")).toEqual(["contem", "nao_contem", "igual", "diferente", "vazio", "preenchido"]);
    expect(operadoresDoTipo("numero")).toEqual(["igual", "diferente", "maior", "menor", "vazio", "preenchido"]);
    expect(operadoresDoTipo("data")).toEqual(["igual", "diferente", "depois", "antes", "vazio", "preenchido"]);
  });

  it("dia válido só quando a data existe", () => {
    expect(diaValido("2026-10-17")).toBe(true);
    expect(diaValido("2026-02-30")).toBe(false);
    expect(diaValido("17/10/2026")).toBe(false);
  });
});

describe("enxugar, URL e comparação", () => {
  it("tira o vazio e ordena as listas", () => {
    expect(
      enxugarFiltros({
        negocio: { origens: [], status: ["won", "open"] },
        tags: { combinar: "e", grupos: [] },
        campos: { combinar: "e", grupos: [] },
      }),
    ).toEqual({ negocio: { status: ["open", "won"] } });
    expect(temFiltros({ tags: { combinar: "ou", grupos: [] } })).toBe(false);
  });

  it("tags: tira o espaço da tag e mantém os grupos e a ordem", () => {
    expect(
      enxugarFiltros({
        tags: { combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "possui", tag: " vip " }, { op: "sem" }] }] },
      }),
    ).toEqual({
      tags: { combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "possui", tag: "vip" }, { op: "sem" }] }] },
    });
  });

  it("vai e volta pela URL; lixo vira filtro vazio", () => {
    expect(filtrosDaUrl(filtrosParaUrl(completo))).toEqual(enxugarFiltros(completo));
    expect(filtrosDaUrl("{quebrado")).toEqual({});
    expect(filtrosDaUrl(JSON.stringify({ telefone: "talvez" }))).toEqual({});
    expect(filtrosParaUrl({})).toBeNull();
  });

  it("compara pelo conteúdo, não pela ordem", () => {
    expect(
      mesmosFiltros({ negocio: { status: ["won", "open"] } }, { negocio: { status: ["open", "won"] } }),
    ).toBe(true);
    expect(mesmosFiltros({ telefone: "com" }, { telefone: "sem" })).toBe(false);
  });
});

describe("seções e chips", () => {
  it("conta e limpa por seção", () => {
    expect(contarNaSecao(completo, "contato")).toBe(2);
    expect(contarNaSecao(completo, "negocio")).toBe(5);
    expect(contarNaSecao(completo, "tags")).toBe(2);
    expect(contarNaSecao(completo, "campos")).toBe(2);
    expect(limparSecao(completo, "negocio").negocio).toBeUndefined();
    expect(limparSecao(completo, "contato")).not.toHaveProperty("telefone");
    expect(limparSecao(completo, "contato").tags).toEqual(enxugarFiltros(completo).tags);
  });

  it("um chip por critério, na ordem da Clint, e o × tira só ele", () => {
    expect(chipsDosFiltros(completo).map((c) => c.chave)).toEqual([
      "criadoEm",
      "telefone",
      "negocio.tem",
      "negocio.origens",
      "negocio.etapas",
      "negocio.status",
      "negocio.donos",
      "tags",
      "campos",
    ]);
    const sem = removerChip(completo, "negocio.origens");
    expect(sem.negocio?.origens).toBeUndefined();
    expect(sem.negocio?.etapas).toEqual([E1]);
  });

  it("o período no formato brasileiro", () => {
    expect(textoDoPeriodo({ de: "2026-10-01", ate: "2026-10-17" })).toBe("01/10/2026 – 17/10/2026");
  });
});

describe("compilarFiltros (o que o banco recebe)", () => {
  const c = compilarFiltros(completo, "America/Sao_Paulo");

  it("fuso, datas e telefone", () => {
    expect(c.fuso).toBe("America/Sao_Paulo");
    expect(c.criado_de).toBe("2026-10-01");
    expect(c.criado_ate).toBe("2026-10-17");
    expect(c.telefone).toBe("com");
  });

  it("donos separados em pessoas, agentes e sem dono", () => {
    expect(c.negocio).toMatchObject({
      tem: "com",
      donos_usuarios: [U1],
      donos_agentes: [A1],
      sem_dono: true,
      com_dono: false,
    });
  });

  it("tags normalizadas (minúsculas), nos grupos", () => {
    expect(c.tags).toEqual({
      combinar: "ou",
      grupos: [
        {
          modo: "e",
          condicoes: [
            { op: "possui", tag: "vip" },
            { op: "nao_possui", tag: "frio" },
          ],
        },
      ],
    });
  });

  it("tags: 'qualquer' e 'sem' vão sem tag", () => {
    expect(
      compilarFiltros({ tags: { combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "sem" }] }] } }, "UTC").tags,
    ).toEqual({ combinar: "e", grupos: [{ modo: "ou", condicoes: [{ op: "sem", tag: null }] }] });
  });

  it("'contém' vira o padrão sem acento do original, que acha 'João'", () => {
    const cond = c.campos?.grupos[0]?.condicoes[0];
    expect(cond?.padrao).toBeTruthy();
    expect(new RegExp(cond?.padrao ?? "^$", "i").test("João Silva")).toBe(true);
    expect(c.campos?.grupos[0]?.condicoes[1]).toMatchObject({ op: "maior", valor: "1500", padrao: null });
  });

  it("sem 'tem', Negócio vale 'com'", () => {
    expect(compilarFiltros({ negocio: { status: ["won"] } }, "UTC").negocio?.tem).toBe("com");
  });
});

describe("opcoesDoFiltroDasOrigens", () => {
  const opcoes = opcoesDoFiltroDasOrigens([
    {
      id: O1,
      name: "Leads INSS",
      settings: {
        lost_reasons: ["Preço", { label: "Sem crédito" }],
        fields: [{ key: "cpf_cliente", label: "CPF do cliente", type: "text" }],
      },
      crm_stages: [
        { id: "e2", name: "Ganho", position: 2, is_archived: false },
        { id: E1, name: "Entrada", position: 0, is_archived: false },
        { id: "e3", name: "Velha", position: 1, is_archived: true },
      ],
    },
  ]);

  it("todas as etapas não arquivadas, na ordem (inclui ganho e perda)", () => {
    expect(opcoes.origens[0]?.etapas.map((e) => e.nome)).toEqual(["Entrada", "Ganho"]);
  });

  it("motivos: os canônicos e os das origens, sem repetir rótulo", () => {
    expect(opcoes.motivos.find((m) => m.valor === "price")?.rotulo).toBe("Preço");
    expect(opcoes.motivos.filter((m) => m.rotulo.toLowerCase() === "preço")).toHaveLength(1);
    expect(opcoes.motivos.some((m) => m.valor === "Sem crédito")).toBe(true);
  });

  it("campos do negócio: o valor primeiro, depois os do CRM", () => {
    expect(opcoes.camposDoNegocio.map((c) => c.chave)).toEqual(["valor", "cpf_cliente"]);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-filtros-de-contatos-regras.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 5: As regras do filtro**

Create `lib/escale/contatos/filtros.ts`:

```ts
import { z } from "zod";

import { camposFiltraveis } from "@/lib/escale/filtros/campos";
import { dataBrDoIso } from "@/lib/escale/filtros/periodo";

import { CAMPOS_DO_CONTATO_2A } from "./regras";

/**
 * OS FILTROS DA LISTA DE CONTATOS (fork Escale, Fase 2B; Clint `index-A38akjUb`,
 * `FieldFilterBuilder`, `TagFilterBuilder`): as seções Contato, Negócio, Tags e
 * Campos. Regras puras. Quem avalia é o banco (`fn_escale_contatos_do_filtro`,
 * migration 9102), com o filtro já compilado em `compilar-filtros.ts`.
 */

export const OPCOES_DE_TELEFONE = ["com", "sem", "invalido", "internacional"] as const;
export type OpcaoDeTelefone = (typeof OPCOES_DE_TELEFONE)[number];
/** Rótulos da Clint; quem mostra passa por `t()`. */
export const ROTULO_DO_TELEFONE: Record<OpcaoDeTelefone, string> = {
  com: "Com Telefone",
  sem: "Sem Telefone",
  invalido: "Telefone inválido",
  internacional: "Telefone internacional",
};

export const STATUS_DO_FILTRO = ["open", "won", "lost"] as const;
export type StatusDoFiltro = (typeof STATUS_DO_FILTRO)[number];
export const ROTULO_DO_STATUS: Record<StatusDoFiltro, string> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

/** Os donos especiais da Clint: "Sem dono" (`NO_USER`) e "Todos os donos" (`ALL_USERS`, = tem dono). */
export const DONO_SEM = "sem_dono";
export const DONO_COM = "com_dono";

export const TIPOS_DE_CAMPO = ["texto", "opcao", "opcoes", "booleano", "numero", "data"] as const;
export type TipoDeCampo = (typeof TIPOS_DE_CAMPO)[number];

export const OPERADORES = [
  "contem",
  "nao_contem",
  "igual",
  "diferente",
  "maior",
  "menor",
  "depois",
  "antes",
  "vazio",
  "preenchido",
] as const;
export type Operador = (typeof OPERADORES)[number];

const DE_TEXTO: readonly Operador[] = ["contem", "nao_contem", "igual", "diferente", "vazio", "preenchido"];
const OPERADORES_DO_TIPO: Record<TipoDeCampo, readonly Operador[]> = {
  texto: DE_TEXTO,
  opcao: DE_TEXTO,
  opcoes: DE_TEXTO,
  booleano: ["igual", "diferente", "vazio", "preenchido"],
  numero: ["igual", "diferente", "maior", "menor", "vazio", "preenchido"],
  data: ["igual", "diferente", "depois", "antes", "vazio", "preenchido"],
};
export const operadoresDoTipo = (tipo: TipoDeCampo): readonly Operador[] => OPERADORES_DO_TIPO[tipo];
export const precisaDeValor = (op: Operador): boolean => op !== "vazio" && op !== "preenchido";

/** Rótulos da Clint (`FieldFilterDropdown`); quem mostra passa por `t()`. */
export const ROTULO_DO_OPERADOR: Record<Operador, string> = {
  contem: "Contém",
  nao_contem: "Não contém",
  igual: "Igual",
  diferente: "Diferente",
  maior: "Maior que",
  menor: "Menor que",
  depois: "Depois de",
  antes: "Antes de",
  vazio: "Está vazio",
  preenchido: "Não está vazio",
};

export const CONDICOES_POR_GRUPO_MAX = 10;
export const GRUPOS_MAX = 5;
/** "Limite de {max} condições contém / não contém atingido neste filtro." (Clint). */
export const CONTEM_MAX = 10;

/** As condições de tag da Clint (`TagFilterBuilder`; prints 2b-16 e 2b-17). */
export const OPS_DE_TAG = ["possui", "nao_possui", "qualquer", "sem"] as const;
export type OpDeTag = (typeof OPS_DE_TAG)[number];
/** Rótulos da Clint; quem mostra passa por `t()`. */
export const ROTULO_DA_OP_DE_TAG: Record<OpDeTag, string> = {
  possui: "Possui a tag",
  nao_possui: "Não possui a tag",
  qualquer: "Qualquer tag",
  sem: "Sem tag",
};

const DIA = /^\d{4}-\d{2}-\d{2}$/;
export function diaValido(texto: string): boolean {
  if (!DIA.test(texto)) return false;
  const d = new Date(`${texto}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === texto;
}
const NUMERO = /^-?\d+(\.\d+)?$/;
const dia = z.string().refine(diaValido);
const uuid = z.string().uuid();
const DONO = /^(sem_dono|com_dono|agent:[0-9a-f-]{36}|[0-9a-f-]{36})$/i;

const condicaoSchema = z
  .object({
    alvo: z.enum(["contato", "negocio"]),
    chave: z.string().regex(/^[A-Za-z][A-Za-z0-9_]{0,39}$/),
    tipo: z.enum(TIPOS_DE_CAMPO),
    op: z.enum(OPERADORES),
    valor: z.string().max(200).optional(),
  })
  .strict()
  .refine((c) => OPERADORES_DO_TIPO[c.tipo].includes(c.op), { message: "operador" })
  .refine((c) => !precisaDeValor(c.op) || (c.valor ?? "").trim() !== "", { message: "valor" })
  .refine((c) => c.tipo !== "numero" || !precisaDeValor(c.op) || NUMERO.test(c.valor ?? ""), {
    message: "numero",
  })
  .refine((c) => c.tipo !== "data" || !precisaDeValor(c.op) || diaValido(c.valor ?? ""), {
    message: "data",
  })
  .refine(
    (c) => c.tipo !== "booleano" || !precisaDeValor(c.op) || c.valor === "true" || c.valor === "false",
    { message: "booleano" },
  );

const grupoSchema = z
  .object({
    modo: z.enum(["e", "ou"]),
    condicoes: z.array(condicaoSchema).min(1).max(CONDICOES_POR_GRUPO_MAX),
  })
  .strict();

const tag = z.string().trim().min(1).max(40);

const negocioSchema = z
  .object({
    tem: z.enum(["com", "sem"]).optional(),
    origens: z.array(uuid).max(50).optional(),
    etapas: z.array(uuid).max(200).optional(),
    status: z.array(z.enum(STATUS_DO_FILTRO)).max(3).optional(),
    donos: z.array(z.string().regex(DONO)).max(100).optional(),
    motivos: z.array(z.string().min(1).max(200)).max(60).optional(),
  })
  .strict();

/** Tags em grupos, como os Campos (prints 2b-18 a 2b-20): "possui"/"não possui" levam a tag; "qualquer"/"sem", não. */
const condicaoDeTagSchema = z.discriminatedUnion("op", [
  z.object({ op: z.literal("possui"), tag }).strict(),
  z.object({ op: z.literal("nao_possui"), tag }).strict(),
  z.object({ op: z.literal("qualquer") }).strict(),
  z.object({ op: z.literal("sem") }).strict(),
]);

const grupoDeTagsSchema = z
  .object({
    modo: z.enum(["e", "ou"]),
    condicoes: z.array(condicaoDeTagSchema).min(1).max(CONDICOES_POR_GRUPO_MAX),
  })
  .strict();

const tagsSchema = z
  .object({ combinar: z.enum(["e", "ou"]), grupos: z.array(grupoDeTagsSchema).max(GRUPOS_MAX) })
  .strict();

type ComCampos = {
  campos?: { grupos: ReadonlyArray<{ condicoes: ReadonlyArray<{ op: string }> }> };
};
export function contarContem(f: ComCampos): number {
  return (f.campos?.grupos ?? [])
    .flatMap((g) => g.condicoes)
    .filter((c) => c.op === "contem" || c.op === "nao_contem").length;
}

export const filtrosDeContatosSchema = z
  .object({
    criadoEm: z.object({ de: dia.optional(), ate: dia.optional() }).strict().optional(),
    telefone: z.enum(OPCOES_DE_TELEFONE).optional(),
    negocio: negocioSchema.optional(),
    tags: tagsSchema.optional(),
    campos: z
      .object({ combinar: z.enum(["e", "ou"]), grupos: z.array(grupoSchema).max(GRUPOS_MAX) })
      .strict()
      .optional(),
  })
  .strict()
  .refine((f) => contarContem(f) <= CONTEM_MAX, { message: "contem" });

export type FiltrosDeContatos = z.infer<typeof filtrosDeContatosSchema>;
export type CondicaoDoFiltro = z.infer<typeof condicaoSchema>;
export type GrupoDoFiltro = z.infer<typeof grupoSchema>;
export type NegocioDoFiltro = z.infer<typeof negocioSchema>;
export type TagsDoFiltro = z.infer<typeof tagsSchema>;
export type CondicaoDeTag = z.infer<typeof condicaoDeTagSchema>;
export type GrupoDeTags = z.infer<typeof grupoDeTagsSchema>;

// ─── Campos que a seção Campos oferece ─────────────────────────────────────────
export type CampoDoFiltro = {
  alvo: "contato" | "negocio";
  chave: string;
  rotulo: string;
  tipo: TipoDeCampo;
  opcoes?: ReadonlyArray<{ value: string; label: string }>;
};

/** Do contato: os fixos e os da 2A (nascimento e links). A 2C acrescenta os personalizados. */
export const CAMPOS_DO_CONTATO_DO_FILTRO: readonly CampoDoFiltro[] = [
  { alvo: "contato", chave: "nome", rotulo: "Nome", tipo: "texto" },
  { alvo: "contato", chave: "email", rotulo: "Email", tipo: "texto" },
  { alvo: "contato", chave: "telefone", rotulo: "Telefone", tipo: "texto" },
  ...CAMPOS_DO_CONTATO_2A.map((c) => ({
    alvo: "contato" as const,
    chave: c.chave,
    rotulo: c.rotulo,
    tipo: (c.chave === "nascimento" ? "data" : "texto") as TipoDeCampo,
  })),
];

export const CAMPO_VALOR_DO_NEGOCIO: CampoDoFiltro = {
  alvo: "negocio",
  chave: "valor",
  rotulo: "Valor do negócio",
  tipo: "numero",
};

/** Do negócio: o valor e os campos do CRM (o catálogo da 1F-a projetado em `settings.fields`). */
export function camposDoNegocioDoFiltro(
  settings: ReadonlyArray<Record<string, unknown> | null | undefined>,
): CampoDoFiltro[] {
  const doCrm = camposFiltraveis(settings)
    .filter((c) => c.alvo === "negocio" && c.chave !== "valor")
    .map((c) => ({
      alvo: "negocio" as const,
      chave: c.chave,
      rotulo: c.rotulo,
      tipo: c.tipo,
      ...(c.opcoes ? { opcoes: c.opcoes } : {}),
    }));
  return [CAMPO_VALOR_DO_NEGOCIO, ...doCrm];
}

// ─── Enxugar, comparar, URL ────────────────────────────────────────────────────
const ordenada = <T extends string>(lista: readonly T[] | undefined): T[] =>
  [...new Set(lista ?? [])].sort((a, b) => a.localeCompare(b));

function enxugarNegocio(n: NegocioDoFiltro | undefined): NegocioDoFiltro | undefined {
  if (!n) return undefined;
  const saida: NegocioDoFiltro = {
    ...(n.tem ? { tem: n.tem } : {}),
    ...(n.origens?.length ? { origens: ordenada(n.origens) } : {}),
    ...(n.etapas?.length ? { etapas: ordenada(n.etapas) } : {}),
    ...(n.status?.length ? { status: ordenada(n.status) } : {}),
    ...(n.donos?.length ? { donos: ordenada(n.donos) } : {}),
    ...(n.motivos?.length ? { motivos: ordenada(n.motivos) } : {}),
  };
  return Object.keys(saida).length > 0 ? saida : undefined;
}

const enxugarCondicaoDeTag = (c: CondicaoDeTag): CondicaoDeTag =>
  c.op === "possui" || c.op === "nao_possui" ? { op: c.op, tag: c.tag.trim() } : { op: c.op };

/** Os grupos ficam na ordem em que a pessoa montou (como a Clint); grupo sem condição sai. */
function enxugarTags(tg: TagsDoFiltro | undefined): TagsDoFiltro | undefined {
  const grupos = (tg?.grupos ?? [])
    .map((g) => ({ modo: g.modo, condicoes: g.condicoes.map(enxugarCondicaoDeTag) }))
    .filter((g) => g.condicoes.length > 0);
  return grupos.length > 0 ? { combinar: tg?.combinar ?? "ou", grupos } : undefined;
}

export function enxugarFiltros(f: FiltrosDeContatos): FiltrosDeContatos {
  const criadoEm =
    f.criadoEm && (f.criadoEm.de || f.criadoEm.ate)
      ? {
          ...(f.criadoEm.de ? { de: f.criadoEm.de } : {}),
          ...(f.criadoEm.ate ? { ate: f.criadoEm.ate } : {}),
        }
      : undefined;
  const grupos = (f.campos?.grupos ?? []).filter((g) => g.condicoes.length > 0);
  const negocio = enxugarNegocio(f.negocio);
  const tags = enxugarTags(f.tags);
  return {
    ...(criadoEm ? { criadoEm } : {}),
    ...(f.telefone ? { telefone: f.telefone } : {}),
    ...(negocio ? { negocio } : {}),
    ...(tags ? { tags } : {}),
    ...(grupos.length > 0 ? { campos: { combinar: f.campos?.combinar ?? "ou", grupos } } : {}),
  };
}

export const temFiltros = (f: FiltrosDeContatos): boolean =>
  Object.keys(enxugarFiltros(f)).length > 0;

export const mesmosFiltros = (a: FiltrosDeContatos, b: FiltrosDeContatos): boolean =>
  JSON.stringify(enxugarFiltros(a)) === JSON.stringify(enxugarFiltros(b));

/** O `f` da URL → filtro válido; qualquer lixo vira filtro vazio. */
export function filtrosDaUrl(texto: string | null | undefined): FiltrosDeContatos {
  if (!texto) return {};
  try {
    const lido = filtrosDeContatosSchema.safeParse(JSON.parse(texto));
    return lido.success ? enxugarFiltros(lido.data) : {};
  } catch {
    return {};
  }
}

export function filtrosParaUrl(f: FiltrosDeContatos): string | null {
  const enxuto = enxugarFiltros(f);
  return Object.keys(enxuto).length > 0 ? JSON.stringify(enxuto) : null;
}

// ─── Seções ────────────────────────────────────────────────────────────────────
export const SECOES_DO_FILTRO = ["contato", "negocio", "tags", "campos"] as const;
export type SecaoDoFiltro = (typeof SECOES_DO_FILTRO)[number];

/** Quantas condições há nos grupos (o selo da seção e o chip; a Clint mostra "2" com dois grupos de uma, print 2b-20). */
export const contarCondicoes = (grupos: ReadonlyArray<{ condicoes: readonly unknown[] }> | undefined): number =>
  (grupos ?? []).reduce((n, g) => n + g.condicoes.length, 0);

export function contarNaSecao(f: FiltrosDeContatos, secao: SecaoDoFiltro): number {
  const e = enxugarFiltros(f);
  if (secao === "contato") return (e.criadoEm ? 1 : 0) + (e.telefone ? 1 : 0);
  if (secao === "negocio") return Object.keys(e.negocio ?? {}).length;
  if (secao === "tags") return contarCondicoes(e.tags?.grupos);
  return contarCondicoes(e.campos?.grupos);
}

export function limparSecao(f: FiltrosDeContatos, secao: SecaoDoFiltro): FiltrosDeContatos {
  const { criadoEm, telefone, negocio, tags, campos } = enxugarFiltros(f);
  return enxugarFiltros({
    ...(secao === "contato" ? {} : { criadoEm, telefone }),
    ...(secao === "negocio" ? {} : { negocio }),
    ...(secao === "tags" ? {} : { tags }),
    ...(secao === "campos" ? {} : { campos }),
  });
}

// ─── Chips da faixa ────────────────────────────────────────────────────────────
export type ChaveDoChip =
  | "criadoEm"
  | "telefone"
  | "negocio.tem"
  | "negocio.origens"
  | "negocio.etapas"
  | "negocio.status"
  | "negocio.donos"
  | "negocio.motivos"
  | "tags"
  | "campos";
export type ChipDoFiltro = { chave: ChaveDoChip; secao: SecaoDoFiltro; quantidade: number };

const LISTAS_DO_NEGOCIO = ["origens", "etapas", "status", "donos", "motivos"] as const;

export function chipsDosFiltros(f: FiltrosDeContatos): ChipDoFiltro[] {
  const e = enxugarFiltros(f);
  const chips: ChipDoFiltro[] = [];
  if (e.criadoEm) chips.push({ chave: "criadoEm", secao: "contato", quantidade: 1 });
  if (e.telefone) chips.push({ chave: "telefone", secao: "contato", quantidade: 1 });
  if (e.negocio?.tem) chips.push({ chave: "negocio.tem", secao: "negocio", quantidade: 1 });
  for (const k of LISTAS_DO_NEGOCIO) {
    const lista = e.negocio?.[k];
    if (lista?.length) chips.push({ chave: `negocio.${k}`, secao: "negocio", quantidade: lista.length });
  }
  const tags = contarNaSecao(e, "tags");
  if (tags > 0) chips.push({ chave: "tags", secao: "tags", quantidade: tags });
  const campos = contarNaSecao(e, "campos");
  if (campos > 0) chips.push({ chave: "campos", secao: "campos", quantidade: campos });
  return chips;
}

export function removerChip(f: FiltrosDeContatos, chave: ChaveDoChip): FiltrosDeContatos {
  const e = enxugarFiltros(f);
  if (chave === "criadoEm") return enxugarFiltros({ ...e, criadoEm: undefined });
  if (chave === "telefone") return enxugarFiltros({ ...e, telefone: undefined });
  if (chave === "tags") return enxugarFiltros({ ...e, tags: undefined });
  if (chave === "campos") return enxugarFiltros({ ...e, campos: undefined });
  const parte = chave.slice("negocio.".length) as keyof NegocioDoFiltro;
  return enxugarFiltros({ ...e, negocio: { ...e.negocio, [parte]: undefined } });
}

/** "01/10/2026 – 17/10/2026" (sempre no formato brasileiro). */
export function textoDoPeriodo(p: { de?: string; ate?: string }): string {
  return `${p.de ? dataBrDoIso(p.de) : "…"} – ${p.ate ? dataBrDoIso(p.ate) : "…"}`;
}
```

Repare:
- `combinar` sem valor vira `"ou"`: entre grupos, o padrão da Clint é OU; dentro do grupo, E. Vale para Tags e Campos (print 2b-20 mostra "combinar grupos por" com OU marcado).
- Tags seguem o desenho dos Campos (prints 2b-18 a 2b-20): grupos de condições `possui`/`nao_possui` (com a tag) e `qualquer`/`sem` (sem a tag). O schema recusa `possui` sem tag e `qualquer` com tag (`discriminatedUnion` + `.strict()`).
- `textoDoPeriodo` usa o `dataBrDoIso` da 1D (`lib/escale/filtros/periodo.ts`, L99), que devolve "dd/mm/aaaa".
- `CAMPOS_DO_CONTATO_2A` vem da 2A (`lib/escale/contatos/regras.ts`): `nascimento` e um `link_<tipo>` por tipo de link. A chave do Instagram é a de `chaveDoLink("instagram")`.

- [ ] **Step 6: O compilador**

Create `lib/escale/contatos/compilar-filtros.ts`:

```ts
import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";

import {
  DONO_COM,
  DONO_SEM,
  enxugarFiltros,
  precisaDeValor,
  type CondicaoDoFiltro,
  type FiltrosDeContatos,
  type OpcaoDeTelefone,
  type OpDeTag,
  type Operador,
  type TipoDeCampo,
} from "./filtros";

/**
 * O FILTRO COMPILADO (fork Escale, Fase 2B): o que `fn_escale_contatos_do_filtro`
 * (9102) lê em `p_filtros`. Só o servidor compila: o navegador nunca manda regex
 * nem fuso. "Contém" vira o padrão sem acento do original (`padraoRegexDeBusca`,
 * que escapa tudo), as tags ficam minúsculas (`normalizarTags`) e os donos se
 * separam em pessoas, agentes de IA, "sem dono" e "com dono".
 */
export type CondicaoCompilada = {
  alvo: "contato" | "negocio";
  chave: string;
  tipo: TipoDeCampo;
  op: Operador;
  valor: string | null;
  padrao: string | null;
};

export type FiltroCompilado = {
  fuso: string;
  criado_de?: string;
  criado_ate?: string;
  telefone?: OpcaoDeTelefone;
  negocio?: {
    tem: "com" | "sem";
    origens: string[];
    etapas: string[];
    status: string[];
    donos_usuarios: string[];
    donos_agentes: string[];
    sem_dono: boolean;
    com_dono: boolean;
    motivos: string[];
  };
  tags?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: Array<{ op: OpDeTag; tag: string | null }> }>;
  };
  campos?: {
    combinar: "e" | "ou";
    grupos: Array<{ modo: "e" | "ou"; condicoes: CondicaoCompilada[] }>;
  };
};

const PREFIXO_DO_AGENTE = "agent:";

/** A tag como o banco compara: normalizada e minúscula (o gravado pode ter maiúscula de antes da #1224). */
const tagNormalizada = (tag: string): string => (normalizarTags([tag])[0] ?? tag.trim()).toLowerCase();

function compilarCondicao(c: CondicaoDoFiltro): CondicaoCompilada {
  const valor = precisaDeValor(c.op) ? (c.valor ?? "").trim() : null;
  const comPadrao = (c.op === "contem" || c.op === "nao_contem") && valor !== null;
  return {
    alvo: c.alvo,
    chave: c.chave,
    tipo: c.tipo,
    op: c.op,
    valor,
    padrao: comPadrao ? padraoRegexDeBusca(valor.replace(/[()]/g, " ")) : null,
  };
}

export function compilarFiltros(entrada: FiltrosDeContatos, fuso: string): FiltroCompilado {
  const f = enxugarFiltros(entrada);
  const donos = f.negocio?.donos ?? [];
  return {
    fuso,
    ...(f.criadoEm?.de ? { criado_de: f.criadoEm.de } : {}),
    ...(f.criadoEm?.ate ? { criado_ate: f.criadoEm.ate } : {}),
    ...(f.telefone ? { telefone: f.telefone } : {}),
    ...(f.negocio
      ? {
          negocio: {
            tem: f.negocio.tem ?? "com",
            origens: f.negocio.origens ?? [],
            etapas: f.negocio.etapas ?? [],
            status: f.negocio.status ?? [],
            donos_usuarios: donos.filter(
              (d) => d !== DONO_SEM && d !== DONO_COM && !d.startsWith(PREFIXO_DO_AGENTE),
            ),
            donos_agentes: donos
              .filter((d) => d.startsWith(PREFIXO_DO_AGENTE))
              .map((d) => d.slice(PREFIXO_DO_AGENTE.length)),
            sem_dono: donos.includes(DONO_SEM),
            com_dono: donos.includes(DONO_COM),
            motivos: f.negocio.motivos ?? [],
          },
        }
      : {}),
    ...(f.tags
      ? {
          tags: {
            combinar: f.tags.combinar,
            grupos: f.tags.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map((c) => ({
                op: c.op,
                tag: c.op === "possui" || c.op === "nao_possui" ? tagNormalizada(c.tag) : null,
              })),
            })),
          },
        }
      : {}),
    ...(f.campos
      ? {
          campos: {
            combinar: f.campos.combinar,
            grupos: f.campos.grupos.map((g) => ({
              modo: g.modo,
              condicoes: g.condicoes.map(compilarCondicao),
            })),
          },
        }
      : {}),
  };
}
```

Confira antes de rodar: `padraoRegexDeBusca` está em `lib/contacts/busca-regex.ts` (L116) e `normalizarTags` em `lib/contacts/tag-normalizada.ts` (L42). `tagNormalizada` passa para minúsculas depois do `normalizarTags`, porque o banco compara sem caixa (`fn_escale_tags_passam`, Task 2).

- [ ] **Step 7: As opções do painel**

Create `lib/escale/contatos/opcoes-do-filtro.ts`:

```ts
import { rotuloDoMotivo } from "@/lib/escale/configuracoes/motivos";
import { CANONICAL_LOST_REASONS, rotuloDoMotivoDePerda } from "@/lib/schemas/leads";

import { camposDoNegocioDoFiltro, type CampoDoFiltro } from "./filtros";

/**
 * AS OPÇÕES DO PAINEL DE FILTROS (fork Escale, Fase 2B), lidas no servidor com a
 * sessão (`origensDaPagina`): as origens não arquivadas com TODAS as etapas não
 * arquivadas (ganho e perda também: filtrar "em etapa" vale para qualquer uma),
 * os motivos de perda (os canônicos do original e os das origens) e os campos do
 * negócio (o valor e o catálogo do CRM).
 */
export type OrigemDoFiltro = { id: string; nome: string; etapas: Array<{ id: string; nome: string }> };
export type OpcoesDoFiltro = {
  origens: OrigemDoFiltro[];
  motivos: Array<{ valor: string; rotulo: string }>;
  camposDoNegocio: CampoDoFiltro[];
};
export const OPCOES_VAZIAS: OpcoesDoFiltro = { origens: [], motivos: [], camposDoNegocio: [] };

export type OrigemLidaParaFiltro = {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  crm_stages: Array<{
    id: string;
    name: string;
    position: number | string;
    is_archived: boolean;
  }> | null;
};

export function opcoesDoFiltroDasOrigens(lidas: readonly OrigemLidaParaFiltro[]): OpcoesDoFiltro {
  const origens = lidas.map((p) => ({
    id: p.id,
    nome: p.name,
    etapas: [...(p.crm_stages ?? [])]
      .filter((s) => !s.is_archived)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((s) => ({ id: s.id, nome: s.name })),
  }));

  const vistos = new Set<string>();
  const motivos: OpcoesDoFiltro["motivos"] = [];
  for (const valor of CANONICAL_LOST_REASONS) {
    const rotulo = rotuloDoMotivoDePerda(valor);
    vistos.add(rotulo.toLowerCase());
    motivos.push({ valor, rotulo });
  }
  const dasOrigens = lidas
    .flatMap((p) => {
      const lista = p.settings?.lost_reasons;
      return Array.isArray(lista) ? lista.map(rotuloDoMotivo) : [];
    })
    .filter((r): r is string => r !== null)
    .sort((a, b) => a.localeCompare(b, "pt-BR"));
  for (const rotulo of dasOrigens) {
    if (vistos.has(rotulo.toLowerCase())) continue;
    vistos.add(rotulo.toLowerCase());
    motivos.push({ valor: rotulo, rotulo });
  }

  return {
    origens,
    motivos,
    camposDoNegocio: camposDoNegocioDoFiltro(lidas.map((p) => p.settings)),
  };
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-filtros-de-contatos-regras.test.ts`
Expected: PASS. Se o rótulo canônico de `price` não for "Preço" (`ROTULO_DO_MOTIVO_CANONICO` em `lib/schemas/leads.ts`), ajuste a expectativa ao rótulo real; não mude o código.

- [ ] **Step 9: Typecheck, eslint, prettier e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
NOVOS="lib/escale/contatos/filtros.ts lib/escale/contatos/compilar-filtros.ts lib/escale/contatos/opcoes-do-filtro.ts tests/unit/escale-filtros-de-contatos-regras.test.ts"
corepack pnpm exec eslint $NOVOS
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS docs/superpowers/plans/2026-10-17-fase-2b-filtros-e-acoes-em-massa.md docs/escale/modulos/2-contatos-e-empresas.md
git commit -m "feat(escale): regras do filtro da lista de contatos (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration 9102 — filtros salvos e o filtro no banco

**Files:**
- Create: `supabase/migrations/20261031120000_9102_filtros_de_contatos.sql`, `tests/unit/escale-filtros-de-contatos-migration.test.ts`, `tests/invariants/escale-filtros-de-contatos.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo antes do marco da 0323, depois do da 9101), `tests/invariants/rls-completude-varredura.test.ts` (`PROVA_PROPRIA`)

**Interfaces:**
- Consumes: o formato de `FiltroCompilado` (Task 1): `fuso`, `criado_de`, `criado_ate`, `telefone`, `negocio{tem, origens, etapas, status, donos_usuarios, donos_agentes, sem_dono, com_dono, motivos}`, `tags{combinar, grupos[{modo, condicoes[{op, tag}]}]}` (tag minúscula ou `null`), `campos{combinar, grupos[{modo, condicoes[{alvo, chave, tipo, op, valor, padrao}]}]}`.
- Produces:
  - tabela `public.crm_filtros_das_listas (id, organization_id, user_id, lista, nome, compartilhado, criterios, created_at, updated_at)`;
  - `public.fn_escale_contatos_do_filtro(p_org uuid, p_visao text, p_padrao text, p_digitos text[], p_cpf_hash text, p_filtros jsonb) returns table (contact_id uuid, last_activity_at timestamptz)`;
  - `public.fn_escale_lista_de_contatos(p_org uuid, p_visao text, p_padrao text, p_digitos text[], p_cpf_hash text, p_limite integer, p_deslocamento integer, p_filtros jsonb default '{}'::jsonb)` (mesmo retorno da 9101);
  - peças: `fn_escale_passa_condicao(jsonb, jsonb)`, `fn_escale_contato_passa(contacts, jsonb)`, `fn_escale_grupo_passa(contacts, jsonb)`, `fn_escale_negocio_passa(contacts, jsonb)`, `fn_escale_tags_passam(text[], jsonb)` (os grupos de tags, sem caixa).

- [ ] **Step 1: Conferir as cercas de migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
grep -rlE "_9[0-9]{3}_|9101" tests/unit tests/invariants | sort
```

Leia os arquivos listados procurando regra de numeração contínua. Se alguma exigir que a 9102 venha logo depois da maior da `main` (a 9008 da Frente A, por exemplo), PARE e pergunte: a faixa 9100–9199 é decisão do roteiro.

- [ ] **Step 2: O teste de forma da migration (vai falhar)**

Create `tests/unit/escale-filtros-de-contatos-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261031120000_9102_filtros_de_contatos.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");

describe("migration 9102 (filtros da lista de contatos)", () => {
  it("existe e começa pela linha do manifesto", () => {
    expect(existsSync(ARQUIVO)).toBe(true);
    expect(readFileSync(ARQUIVO, "utf8").startsWith("-- manifest:")).toBe(true);
  });

  const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

  it("toda função é invoker, com search_path, e fechada ao anon", () => {
    for (const nome of [
      "fn_escale_passa_condicao",
      "fn_escale_contato_passa",
      "fn_escale_grupo_passa",
      "fn_escale_negocio_passa",
      "fn_escale_tags_passam",
      "fn_escale_contatos_do_filtro",
      "fn_escale_lista_de_contatos",
      "fn_crm_filtros_das_listas_limite",
    ]) {
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
    }
    expect(MIGRATION).not.toMatch(/security definer/);
  });

  it("a lista da 9101 é trocada pela de 8 parâmetros", () => {
    expect(MIGRATION).toContain(
      "drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer);",
    );
    expect(MIGRATION).toContain("p_filtros jsonb default '{}'::jsonb");
  });

  it("a tabela tem RLS, as duas policies, o limite e as travas do suporte", () => {
    expect(MIGRATION).toContain("alter table public.crm_filtros_das_listas enable row level security;");
    expect(MIGRATION).toContain("create policy crm_filtros_das_listas_select");
    expect(MIGRATION).toContain("create policy crm_filtros_das_listas_dono_write");
    expect(MIGRATION).toContain("create trigger trg_crm_filtros_das_listas_limite");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
  });

  it("o baseline traz o mesmo bloco, depois do da 9101", () => {
    const i9101 = BASELINE.indexOf("FORK ESCALE · lista de contatos da casca (migration 9101)");
    const i9102 = BASELINE.indexOf("FORK ESCALE · filtros da lista de contatos (migration 9102)");
    expect(i9101).toBeGreaterThan(-1);
    expect(i9102).toBeGreaterThan(i9101);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-filtros-de-contatos-migration.test.ts`
Expected: FAIL (o arquivo não existe).

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261031120000_9102_filtros_de_contatos.sql` (a primeira linha é uma só, comprida):

```sql
-- manifest: **Filtros da lista de contatos (fork Escale, Fase 2B).** Filtros salvos das listas por pessoa (`crm_filtros_das_listas`: até 20 por pessoa e lista, nome único, o compartilhado visível na organização, só quem criou escreve) e o filtro avaliado no banco com a RLS de quem olha (`fn_escale_contatos_do_filtro` e as peças `fn_escale_passa_condicao`, `fn_escale_contato_passa`, `fn_escale_grupo_passa`, `fn_escale_negocio_passa` e `fn_escale_tags_passam` — as tags em grupos E/OU, sem caixa —, todas invoker); `fn_escale_lista_de_contatos` ganha o 8º parâmetro `p_filtros`.
-- 9102: filtros da lista de contatos (fork Escale, Frente B).

-- ── 1. Filtros salvos das listas ─────────────────────────────────────────────
create table if not exists public.crm_filtros_das_listas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  nome text not null,
  compartilhado boolean not null default false,
  criterios jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nome de lista curto e minúsculo; o conjunto (contatos, empresas) é da rota.
  constraint crm_filtros_das_listas_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_filtros_das_listas_nome_valido check (char_length(btrim(nome)) between 1 and 60),
  constraint crm_filtros_das_listas_criterios_objeto check (jsonb_typeof(criterios) = 'object'),
  constraint crm_filtros_das_listas_criterios_tamanho check (octet_length(criterios::text) <= 16384),
  constraint crm_filtros_das_listas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_filtros_das_listas_nome
  on public.crm_filtros_das_listas (organization_id, user_id, lista, lower(btrim(nome)));
create index if not exists idx_crm_filtros_das_listas_lista
  on public.crm_filtros_das_listas (organization_id, lista);
create index if not exists idx_crm_filtros_das_listas_pessoa
  on public.crm_filtros_das_listas (user_id, organization_id);

alter table public.crm_filtros_das_listas enable row level security;

drop policy if exists crm_filtros_das_listas_select on public.crm_filtros_das_listas;
drop policy if exists crm_filtros_das_listas_dono_write on public.crm_filtros_das_listas;

-- O pessoal só para quem criou; o compartilhado para toda a organização.
create policy crm_filtros_das_listas_select on public.crm_filtros_das_listas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (user_id = auth.uid() or compartilhado))
  );

-- Só quem criou escreve (qualquer papel, a partir de viewer).
create policy crm_filtros_das_listas_dono_write on public.crm_filtros_das_listas
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'viewer')
    and user_id = auth.uid()
  );

revoke all on public.crm_filtros_das_listas from anon;
grant select, insert, update, delete on public.crm_filtros_das_listas to authenticated;
grant all on public.crm_filtros_das_listas to service_role;

drop trigger if exists trg_crm_filtros_das_listas_updated_at on public.crm_filtros_das_listas;
create trigger trg_crm_filtros_das_listas_updated_at
  before update on public.crm_filtros_das_listas
  for each row execute function public.fn_set_updated_at();

-- No máximo 20 por pessoa em cada lista ("Limite de 20 filtros salvos atingido", Clint).
create or replace function public.fn_crm_filtros_das_listas_limite()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_total integer;
begin
  if tg_op = 'UPDATE'
     and (new.organization_id, new.user_id, new.lista)
         is not distinct from (old.organization_id, old.user_id, old.lista) then
    return new;
  end if;
  perform pg_advisory_xact_lock(hashtextextended(
    'crm_filtros_das_listas:' || new.organization_id::text || ':' || new.user_id::text || ':' || new.lista, 0));
  select count(*) into v_total
    from public.crm_filtros_das_listas f
   where f.organization_id = new.organization_id
     and f.user_id = new.user_id
     and f.lista = new.lista
     and (tg_op = 'INSERT' or f.id <> old.id);
  if v_total >= 20 then
    raise exception 'crm_filtros_das_listas_limite: no máximo 20 filtros salvos por pessoa em cada lista'
      using errcode = 'check_violation', constraint = 'crm_filtros_das_listas_limite';
  end if;
  return new;
end;
$$;

revoke all on function public.fn_crm_filtros_das_listas_limite() from public, anon;

drop trigger if exists trg_crm_filtros_das_listas_limite on public.crm_filtros_das_listas;
create trigger trg_crm_filtros_das_listas_limite
  before insert or update of organization_id, user_id, lista on public.crm_filtros_das_listas
  for each row execute function public.fn_crm_filtros_das_listas_limite();

comment on table public.crm_filtros_das_listas is
  'Filtros salvos das listas da casca (fork Escale, migration 9102), como userFilterPreset da Clint. O pessoal só para quem criou; o compartilhado para a organização; só quem criou escreve.';

-- ── 2. Uma condição da seção Campos sobre um valor ───────────────────────────
-- p_cond é a CondicaoCompilada da rota: {alvo, chave, tipo, op, valor, padrao}.
-- O "contém" usa o padrão que a ROTA montou (padraoRegexDeBusca, que escapa tudo).
create or replace function public.fn_escale_passa_condicao(p_valor jsonb, p_cond jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  with v as (
    select
      case
        when p_valor is null or jsonb_typeof(p_valor) = 'null' then null
        when jsonb_typeof(p_valor) = 'array'
          then (select string_agg(e, ' ') from jsonb_array_elements_text(p_valor) e)
        else p_valor #>> '{}'
      end as texto,
      case when jsonb_typeof(p_valor) = 'array'
        then (select coalesce(array_agg(lower(btrim(e))), '{}'::text[]) from jsonb_array_elements_text(p_valor) e)
      end as itens,
      p_cond ->> 'op' as op,
      p_cond ->> 'tipo' as tipo,
      p_cond ->> 'valor' as alvo,
      p_cond ->> 'padrao' as padrao
  ),
  x as (
    select v.*,
      (v.texto is null or btrim(v.texto) = '') as vazio,
      case when btrim(v.texto) ~ '^-?[0-9]+([.][0-9]+)?$' then btrim(v.texto)::numeric end as numero,
      case when v.alvo ~ '^-?[0-9]+([.][0-9]+)?$' then v.alvo::numeric end as alvo_numero,
      case when v.texto ~ '^[0-9]{4}-[0-9]{2}-[0-9]{2}' then left(v.texto, 10) end as dia
    from v
  ),
  y as (
    select x.*,
      case x.tipo
        when 'numero' then x.numero = x.alvo_numero
        when 'data' then x.dia = x.alvo
        -- Sim/Não: "Não" também acha quem nunca preencheu (regra da 1D).
        when 'booleano' then lower(coalesce(nullif(btrim(x.texto), ''), 'false')) = x.alvo
        else case when x.itens is not null then lower(btrim(x.alvo)) = any(x.itens)
                  else lower(btrim(x.texto)) = lower(btrim(x.alvo)) end
      end as igual
    from x
  )
  select coalesce(
    case y.op
      when 'vazio' then y.vazio
      when 'preenchido' then not y.vazio
      when 'contem' then not y.vazio and y.texto ~* y.padrao
      when 'nao_contem' then y.vazio or not (y.texto ~* y.padrao)
      when 'igual' then y.igual
      when 'diferente' then not coalesce(y.igual, false)
      when 'maior' then y.numero > y.alvo_numero
      when 'menor' then y.numero < y.alvo_numero
      when 'depois' then y.dia > y.alvo
      when 'antes' then y.dia < y.alvo
    end, false)
  from y
$$;

-- ── 3. Uma condição sobre um contato (do contato, ou de algum negócio visível) ─
create or replace function public.fn_escale_contato_passa(p_contato public.contacts, p_cond jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when p_cond ->> 'alvo' = 'contato' then
      public.fn_escale_passa_condicao(
        case p_cond ->> 'chave'
          when 'nome' then to_jsonb(coalesce((p_contato).name, (p_contato).display_name))
          when 'email' then to_jsonb((p_contato).email)
          when 'telefone' then to_jsonb((p_contato).phone_number)
          when 'nascimento' then to_jsonb((p_contato).birthdate::text)
          else (p_contato).custom_fields -> (p_cond ->> 'chave')
        end,
        p_cond)
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

-- ── 4. Um grupo: E = todas as condições; OU = alguma ─────────────────────────
create or replace function public.fn_escale_grupo_passa(p_contato public.contacts, p_grupo jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select case when coalesce(p_grupo ->> 'modo', 'e') = 'ou'
    then exists (
      select 1 from jsonb_array_elements(coalesce(p_grupo -> 'condicoes', '[]'::jsonb)) k
       where public.fn_escale_contato_passa(p_contato, k))
    else not exists (
      select 1 from jsonb_array_elements(coalesce(p_grupo -> 'condicoes', '[]'::jsonb)) k
       where not public.fn_escale_contato_passa(p_contato, k))
  end
$$;

-- ── 5. A seção Negócio: todos os critérios no MESMO negócio visível ──────────
-- "com" = existe um negócio que cumpre; "sem" = não existe nenhum.
create or replace function public.fn_escale_negocio_passa(p_contato public.contacts, p_negocio jsonb)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select (coalesce(p_negocio ->> 'tem', 'com') = 'com') = exists (
    select 1
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.contact_id = (p_contato).id
       and l.organization_id = (p_contato).organization_id
       and not p.is_archived
       and (jsonb_array_length(coalesce(p_negocio -> 'origens', '[]'::jsonb)) = 0
            or l.pipeline_id::text in (select jsonb_array_elements_text(p_negocio -> 'origens')))
       and (jsonb_array_length(coalesce(p_negocio -> 'etapas', '[]'::jsonb)) = 0
            or l.stage_id::text in (select jsonb_array_elements_text(p_negocio -> 'etapas')))
       and (jsonb_array_length(coalesce(p_negocio -> 'status', '[]'::jsonb)) = 0
            or l.status in (select jsonb_array_elements_text(p_negocio -> 'status')))
       and (
         (jsonb_array_length(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)) = 0
          and jsonb_array_length(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)) = 0
          and not coalesce((p_negocio ->> 'sem_dono')::boolean, false)
          and not coalesce((p_negocio ->> 'com_dono')::boolean, false))
         or l.owner_user_id::text in (
              select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_usuarios', '[]'::jsonb)))
         or l.owner_agent_id::text in (
              select jsonb_array_elements_text(coalesce(p_negocio -> 'donos_agentes', '[]'::jsonb)))
         or (coalesce((p_negocio ->> 'sem_dono')::boolean, false)
             and l.owner_user_id is null and l.owner_agent_id is null)
         or (coalesce((p_negocio ->> 'com_dono')::boolean, false)
             and (l.owner_user_id is not null or l.owner_agent_id is not null))
       )
       and (jsonb_array_length(coalesce(p_negocio -> 'motivos', '[]'::jsonb)) = 0
            or (l.status = 'lost'
                and l.lost_reason in (select jsonb_array_elements_text(p_negocio -> 'motivos'))))
  )
$$;

-- ── 5b. A seção Tags: grupos de condições, como os Campos (prints 2b-18 a 2b-20) ──
-- p_filtro = {combinar, grupos[{modo, condicoes[{op, tag}]}]}, com a tag já minúscula
-- (a rota compila). Sem caixa dos dois lados: o gravado pode ter maiúscula de antes
-- da #1224. Dentro do grupo, E = todas; OU = alguma. Entre grupos, `combinar`.
create or replace function public.fn_escale_tags_passam(p_tags text[], p_filtro jsonb)
returns boolean
language sql
immutable
security invoker
set search_path = public, pg_temp
as $$
  with t as (
    select coalesce(array_agg(lower(btrim(x))), '{}'::text[]) as tags
      from unnest(coalesce(p_tags, '{}'::text[])) x
  ),
  c as (
    select gi.ordem as grupo,
           coalesce(gi.valor ->> 'modo', 'e') as modo,
           case k ->> 'op'
             when 'qualquer' then cardinality(t.tags) > 0
             when 'sem' then cardinality(t.tags) = 0
             when 'possui' then lower(btrim(k ->> 'tag')) = any(t.tags)
             when 'nao_possui' then not (lower(btrim(k ->> 'tag')) = any(t.tags))
             else false
           end as passa
      from t
     cross join jsonb_array_elements(coalesce(p_filtro -> 'grupos', '[]'::jsonb))
           with ordinality as gi(valor, ordem)
     cross join jsonb_array_elements(coalesce(gi.valor -> 'condicoes', '[]'::jsonb)) k
  ),
  g as (
    select c.grupo,
           case when min(c.modo) = 'ou' then bool_or(c.passa) else bool_and(c.passa) end as passa
      from c
     group by c.grupo
  )
  select case
           when not exists (select 1 from g) then true
           when coalesce(p_filtro ->> 'combinar', 'ou') = 'ou' then coalesce(bool_or(g.passa), false)
           else coalesce(bool_and(g.passa), false)
         end
    from g
$$;

-- ── 6. Os contatos de uma busca + visão + filtro (a base da lista e das ações em massa)
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
     -- a busca: a mesma da 9101
     and (
       (p_padrao is null and coalesce(cardinality(p_digitos), 0) = 0 and p_cpf_hash is null)
       or (p_padrao is not null and (
            c.name ~* p_padrao
            or c.display_name ~* p_padrao
            or c.email ~* p_padrao
            or c.phone_number ~* p_padrao
            or (c.custom_fields ->> 'link_instagram') ~* p_padrao))
       or exists (
            select 1 from unnest(coalesce(p_digitos, '{}'::text[])) d
             where c.phone_number like '%' || d || '%')
       or (p_cpf_hash is not null and c.cpf_hash = p_cpf_hash)
     )
     -- a visão pronta
     and (
       p_visao in ('todos', 'pessoais')
       or (p_visao = 'com_negocio' and public.fn_escale_negocio_passa(c, '{"tem":"com"}'::jsonb))
       or (p_visao = 'sem_negocio' and public.fn_escale_negocio_passa(c, '{"tem":"sem"}'::jsonb))
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

-- ── 7. A lista da 9101, agora com o filtro ───────────────────────────────────
drop function if exists public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer);

create or replace function public.fn_escale_lista_de_contatos(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_limite integer,
  p_deslocamento integer,
  p_filtros jsonb default '{}'::jsonb
)
returns table (contact_id uuid, total bigint, negocios integer, negocio_unico uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with visiveis as not materialized (
    select l.id, l.contact_id
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.organization_id = p_org
       and l.contact_id is not null
       and not p.is_archived
  ),
  pagina as (
    select f.contact_id as id, f.last_activity_at, count(*) over () as total
      from public.fn_escale_contatos_do_filtro(p_org, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros) f
     order by f.last_activity_at desc nulls last, f.contact_id desc
     limit least(greatest(coalesce(p_limite, 10), 1), 100)
    offset greatest(coalesce(p_deslocamento, 0), 0)
  )
  select pg.id,
         pg.total,
         coalesce(n.negocios, 0),
         case when n.negocios = 1 then n.unico end
    from pagina pg
    left join lateral (
      select count(*)::integer as negocios, min(v.id::text)::uuid as unico
        from visiveis v
       where v.contact_id = pg.id
    ) n on true
   order by pg.last_activity_at desc nulls last, pg.id desc
$$;

revoke all on function public.fn_escale_passa_condicao(jsonb, jsonb) from public, anon;
revoke all on function public.fn_escale_contato_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_grupo_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_negocio_passa(public.contacts, jsonb) from public, anon;
revoke all on function public.fn_escale_tags_passam(text[], jsonb) from public, anon;
revoke all on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) from public, anon;
revoke all on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) from public, anon;
grant execute on function public.fn_escale_passa_condicao(jsonb, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contato_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_grupo_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_negocio_passa(public.contacts, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_tags_passam(text[], jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) to authenticated, service_role;
grant execute on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) to authenticated, service_role;

comment on function public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb) is
  'Fork Escale (9102): os contatos de uma busca + visão + filtro compilado, na ordem da lista. Invoker: a RLS de quem olha decide os contatos e os negócios.';
comment on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer, jsonb) is
  'Fork Escale (9101, 9102): uma página da lista de contatos da casca, com o total e os negócios que quem olha enxerga. Invoker.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

Repare: a cerca do teste da Step 2 procura `revoke all on function public.<nome>(...)` com o nome seguido de `(`. Os `revoke` acima seguem esse formato; o do gatilho (`fn_crm_filtros_das_listas_limite()`) está logo depois da função.

- [ ] **Step 4: O bloco do baseline**

Rode da raiz da worktree:

```bash
node - <<'JS'
const fs = require("fs");
const ARQ = "supabase/baseline.sql";
const MARCO = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const base = fs.readFileSync(ARQ, "utf8");
if (base.includes("FORK ESCALE · filtros da lista de contatos (migration 9102)")) {
  console.log("já está");
  process.exit(0);
}
const i = base.indexOf(MARCO);
if (i < 0) throw new Error("marco da 0323 não achado");
if (i < base.indexOf("FORK ESCALE · lista de contatos da casca (migration 9101)")) throw new Error("ordem errada");
const sql = fs.readFileSync("supabase/migrations/20261031120000_9102_filtros_de_contatos.sql", "utf8").trimEnd();
const bloco = `-- ---- FORK ESCALE · filtros da lista de contatos (migration 9102) ----\n${sql}\n\n`;
fs.writeFileSync(ARQ, base.slice(0, i) + bloco + base.slice(i));
console.log("bloco 9102 inserido");
JS
```

Run: `corepack pnpm vitest run tests/unit/escale-filtros-de-contatos-migration.test.ts tests/unit/escale-lista-de-contatos-migration.test.ts`
Expected: PASS nos dois (o da 2A ainda acha o `create or replace function public.fn_escale_lista_de_contatos(` do bloco 9101).

- [ ] **Step 5: A varredura de RLS**

Em `tests/invariants/rls-completude-varredura.test.ts`, logo depois da entrada de `crm_colunas_das_listas` em `PROVA_PROPRIA`, acrescente:

```ts
  {
    tabela: "crm_filtros_das_listas",
    razao:
      "tests/invariants/escale-filtros-de-contatos.test.ts — fork Escale (migration 9102): o filtro pessoal só para quem criou " +
      "(zero para o gerente), o compartilhado para toda a organização, só quem criou escreve, 20 por pessoa e lista, " +
      "nome único sem caixa, CHECK da lista e FK da pessoa.",
  },
```

- [ ] **Step 6: A prova no Postgres (vai falhar antes da migration aplicada)**

Create `tests/invariants/escale-filtros-de-contatos.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * FILTROS DA LISTA DE CONTATOS (fork Escale, migration 9102) — prova contra
 * Postgres real: cada seção do filtro compilado (telefone, data, negócio, tags,
 * campos em grupos E/OU) restringe a lista com a RLS de quem olha; a lista de
 * 8 parâmetros conta o total filtrado; as funções são invoker e fechadas ao
 * anon; e os filtros salvos seguem as regras da 1D. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9102-4000-8000-0000000000a1";
const S1 = "e5ca1e00-9102-4000-8000-0000000000b1";
const S2 = "e5ca1e00-9102-4000-8000-0000000000b2";
const C_ANA = "e5ca1e00-9102-4000-8000-0000000000c1"; // celular BR, VIP, negócio aberto do agent B (R$ 2.000, renda 1500)
const C_BRUNO = "e5ca1e00-9102-4000-8000-0000000000c2"; // Portugal, frio, negócio perdido por preço, sem dono
const C_CARLA = "e5ca1e00-9102-4000-8000-0000000000c3"; // sem telefone, Instagram, nasceu em 1990
const C_DAVI = "e5ca1e00-9102-4000-8000-0000000000c4"; // +55 com 7 dígitos locais: inválido

const filtro = (f: object) =>
  `'${JSON.stringify({ fuso: "America/Sao_Paulo", ...f })}'::jsonb`;
const contar = (f: object) =>
  `select count(*) from public.fn_escale_contatos_do_filtro('${GOV_ORG}', 'todos', 'filtrodois', null, null, ${filtro(f)})`;
const cond = (c: object) => ({ campos: { combinar: "ou", grupos: [{ modo: "e", condicoes: [c] }] } });

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_filtros_das_listas where organization_id = '${GOV_ORG}';
    delete from public.crm_leads where id::text like 'e5ca1e00-9102-%';
    delete from public.contacts where id::text like 'e5ca1e00-9102-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9102-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9102-%';
    insert into public.crm_pipelines (id, organization_id, name, slug)
      values ('${P}', '${GOV_ORG}', 'Filtros 2B', 'escale-filtros-2b');
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ('${S1}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0),
      ('${S2}', '${GOV_ORG}', '${P}', 'Proposta', 'proposta', 1);
    insert into public.contacts (id, organization_id, display_name, phone_number, tags, custom_fields, birthdate, created_at, last_activity_at) values
      ('${C_ANA}', '${GOV_ORG}', 'Filtrodois Ana', '+5564999446816', '{VIP}', '{}'::jsonb, null, '2026-10-10 12:00-03', now()),
      ('${C_BRUNO}', '${GOV_ORG}', 'Filtrodois Bruno', '+351912345678', '{frio}', '{}'::jsonb, null, '2026-09-01 12:00-03', now() - interval '1 day'),
      ('${C_CARLA}', '${GOV_ORG}', 'Filtrodois Carla', null, '{}', '{"link_instagram":"https://instagram.com/carla"}'::jsonb, '1990-05-01', '2026-10-05 12:00-03', now() - interval '2 days'),
      ('${C_DAVI}', '${GOV_ORG}', 'Filtrodois Davi', '+55111234567', '{}', '{}'::jsonb, null, '2026-10-12 12:00-03', now() - interval '3 days');
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id, value_cents, custom_fields) values
      ('e5ca1e00-9102-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S1}', 'Da Ana', '${C_ANA}', '${GOV_AGENT_B}', 200000, '{"renda":"1500"}'::jsonb);
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, status, lost_reason, closed_at) values
      ('e5ca1e00-9102-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S2}', 'Do Bruno', '${C_BRUNO}', 'lost', 'price', now());
  `);
});

describe("fn_escale_contatos_do_filtro", () => {
  it("sem filtro, os quatro", () => {
    expect(countAs(GOV_MANAGER, contar({}))).toBe(4);
  });

  it("Telefone: com, sem, internacional e inválido", () => {
    expect(countAs(GOV_MANAGER, contar({ telefone: "com" }))).toBe(3);
    expect(countAs(GOV_MANAGER, contar({ telefone: "sem" }))).toBe(1);
    expect(countAs(GOV_MANAGER, contar({ telefone: "internacional" }))).toBe(1);
    expect(countAs(GOV_MANAGER, contar({ telefone: "invalido" }))).toBe(1);
  });

  it("Data de criação no fuso da organização", () => {
    expect(countAs(GOV_MANAGER, contar({ criado_de: "2026-10-01", criado_ate: "2026-10-11" }))).toBe(2);
  });

  it("Negócio: com, sem, status, motivo, dono — e o agent A não enxerga o negócio do B", () => {
    const n = (x: object) => ({ negocio: { tem: "com", origens: [], etapas: [], status: [], donos_usuarios: [], donos_agentes: [], sem_dono: false, com_dono: false, motivos: [], ...x } });
    expect(countAs(GOV_MANAGER, contar(n({})))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(n({ tem: "sem" })))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(n({ status: ["lost"] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ motivos: ["price"] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ sem_dono: true })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ com_dono: true })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ donos_usuarios: [GOV_AGENT_B] })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(n({ etapas: [S2] })))).toBe(1);
    expect(countAs(GOV_AGENT_A, contar(n({})))).toBe(1);
  });

  it("Tags: possui (sem caixa), não possui, qualquer e sem", () => {
    const tg = (...condicoes: object[]) => ({ tags: { combinar: "ou", grupos: [{ modo: "e", condicoes }] } });
    expect(countAs(GOV_MANAGER, contar(tg({ op: "possui", tag: "vip" })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "nao_possui", tag: "vip" })))).toBe(3);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "qualquer", tag: null })))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(tg({ op: "sem", tag: null })))).toBe(2);
  });

  it("Tags em grupos: E e OU dentro do grupo; OU soma e E cruza entre grupos", () => {
    const g = (modo: string, ...condicoes: object[]) => ({ modo, condicoes });
    const tg = (combinar: string, ...grupos: object[]) => ({ tags: { combinar, grupos } });
    const vip = { op: "possui", tag: "vip" };
    const frio = { op: "possui", tag: "frio" };
    expect(countAs(GOV_MANAGER, contar(tg("ou", g("ou", vip, frio))))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(tg("ou", g("e", vip, frio))))).toBe(0);
    expect(countAs(GOV_MANAGER, contar(tg("ou", g("e", vip), g("e", { op: "sem", tag: null }))))).toBe(3);
    expect(
      countAs(GOV_MANAGER, contar(tg("e", g("e", { op: "qualquer", tag: null }), g("e", { op: "nao_possui", tag: "frio" })))),
    ).toBe(1);
  });

  it("Campos do contato: contém (padrão), preenchido, data antes de", () => {
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "ana", padrao: "ana" })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "contato", chave: "nome", tipo: "texto", op: "nao_contem", valor: "ana", padrao: "ana" })))).toBe(3);
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "contato", chave: "link_instagram", tipo: "texto", op: "preenchido", valor: null, padrao: null })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "contato", chave: "nascimento", tipo: "data", op: "antes", valor: "2000-01-01", padrao: null })))).toBe(1);
  });

  it("Campos do negócio: valor maior que e campo do CRM igual", () => {
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "negocio", chave: "valor", tipo: "numero", op: "maior", valor: "1000", padrao: null })))).toBe(1);
    expect(countAs(GOV_MANAGER, contar(cond({ alvo: "negocio", chave: "renda", tipo: "texto", op: "igual", valor: "1500", padrao: null })))).toBe(1);
  });

  it("grupos: OU entre grupos soma; E entre grupos cruza; OU dentro do grupo", () => {
    const ana = { alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "ana", padrao: "ana" };
    const insta = { alvo: "contato", chave: "link_instagram", tipo: "texto", op: "preenchido", valor: null, padrao: null };
    const dois = (combinar: string) => ({ campos: { combinar, grupos: [{ modo: "e", condicoes: [ana] }, { modo: "e", condicoes: [insta] }] } });
    expect(countAs(GOV_MANAGER, contar(dois("ou")))).toBe(2);
    expect(countAs(GOV_MANAGER, contar(dois("e")))).toBe(0);
    expect(countAs(GOV_MANAGER, contar({ campos: { combinar: "e", grupos: [{ modo: "ou", condicoes: [ana, insta] }] } }))).toBe(2);
  });

  it("a lista de 8 parâmetros devolve o total filtrado", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'filtrodois', null, null, 100, 0, ${filtro({ telefone: "sem" })}) where total = 1`,
      ),
    ).toBe(1);
  });

  it("as funções são invoker e o anon não executa", () => {
    expect(
      Number(
        sql(`select count(*) from pg_proc where proname in ('fn_escale_contatos_do_filtro','fn_escale_passa_condicao','fn_escale_contato_passa','fn_escale_grupo_passa','fn_escale_negocio_passa','fn_escale_tags_passam','fn_escale_lista_de_contatos') and prosecdef;`).trim(),
      ),
    ).toBe(0);
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_contatos_do_filtro(uuid, text, text, text[], text, jsonb)', 'execute');`).trim(),
    ).toBe("f");
  });
});

describe("crm_filtros_das_listas", () => {
  const novo = (user: string, nome: string, compartilhado = false) =>
    `insert into public.crm_filtros_das_listas (organization_id, user_id, lista, nome, compartilhado, criterios) values ('${GOV_ORG}', '${user}', 'contatos', '${nome}', ${compartilhado}, '{}'::jsonb)`;

  it("cada um grava o seu; ninguém grava o de outro", () => {
    expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "Meu pessoal"))).toBe(1);
    expect(writeCountAs(GOV_VIEWER, novo(GOV_MANAGER, "Do gerente"))).toBe(0);
  });

  it("o pessoal só para quem criou; o compartilhado para a organização; só quem criou muda", () => {
    expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "Da equipe", true))).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_filtros_das_listas where nome = 'Meu pessoal'`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_filtros_das_listas where nome = 'Da equipe'`)).toBe(1);
    expect(
      writeCountAs(GOV_AGENT_A, `update public.crm_filtros_das_listas set nome = 'Tomado' where nome = 'Da equipe'`),
    ).toBe(0);
  });

  it("nome repetido (sem caixa) e lista inválida são recusados", () => {
    expect(() => writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "MEU PESSOAL"))).toThrow();
    expect(() =>
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_filtros_das_listas (organization_id, user_id, lista, nome) values ('${GOV_ORG}', '${GOV_VIEWER}', 'Contatos!', 'x')`,
      ),
    ).toThrow();
  });

  it("no máximo 20 por pessoa e lista", () => {
    for (let i = 3; i <= 20; i++) expect(writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, `F${i}`))).toBe(1);
    expect(() => writeCountAs(GOV_VIEWER, novo(GOV_VIEWER, "F21"))).toThrow(/crm_filtros_das_listas_limite/);
  });
});
```

Confira antes de rodar:
- `contacts` aceita `display_name`, `tags`, `birthdate`, `created_at` e `last_activity_at` no insert (a 2A já usou os três primeiros). Se houver CHECK no formato do telefone que recuse `+55111234567`, troque o do Davi por outro E.164 com +55 e 7 dígitos locais que passe no CHECK (ele precisa só NÃO ser um celular/fixo brasileiro válido).
- `crm_leads` exige `closed_at` e `lost_reason` quando `status = 'lost'` (CHECKs `crm_leads_closed_at_consistency` e `crm_leads_lost_reason_required`): o insert do Bruno os traz.

- [ ] **Step 7: Rodar a prova (em segundo plano)**

```bash
docker info > /dev/null 2>&1 || { echo "Docker fechado: PARE e peça ao usuário"; exit 1; }
corepack pnpm test:db tests/invariants/escale-filtros-de-contatos.test.ts tests/invariants/escale-lista-de-contatos.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/rbac-config-ia-canais.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts tests/invariants/hardening-definer-varredura.test.ts > .superpowers/sdd/2b-task2-db.log 2>&1
tail -40 .superpowers/sdd/2b-task2-db.log
```

Expected: tudo verde. Se uma contagem divergir, leia a função antes de mexer no teste: a prova é o contrato.

- [ ] **Step 8: Revisor (subagente) da migration e da RLS**

Despache um revisor com: o arquivo da migration, o teste novo, a entrada da varredura e as decisões N2–N5 e N8. Pontos que ele confere: nenhuma função `definer`; nenhum `execute` dinâmico; o padrão regex só vem da rota; o `in (select jsonb_array_elements_text(...))` não quebra com lista ausente; `fn_escale_tags_passam` trata grupo vazio, lista de grupos vazia e tag com maiúscula; a RLS de `crm_leads` vale dentro das peças (são invoker); o limite de 20 com trava; o `drop function` da assinatura antiga não deixa sobrecarga ambígua. Corrija o que for crítico ou importante antes do commit.

- [ ] **Step 9: Commit**

```bash
git add supabase/migrations/20261031120000_9102_filtros_de_contatos.sql supabase/baseline.sql tests/unit/escale-filtros-de-contatos-migration.test.ts tests/invariants/escale-filtros-de-contatos.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9102 — filtros da lista de contatos e filtros salvos (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: Rotas — a lista com filtro e os filtros salvos

**Files:**
- Create: `lib/escale/listas/filtros-salvos.ts`, `app/api/v1/filtros-das-listas/route.ts`, `app/api/v1/filtros-das-listas/[id]/route.ts`, `hooks/escale/useFiltrosDaLista.ts`, `tests/unit/escale-filtros-das-listas-rotas.test.ts`
- Modify: `lib/escale/contatos/lista.ts`, `app/api/v1/lista-de-contatos/route.ts`, `hooks/escale/useListaDeContatos.ts`, `lib/audit/actions.ts`, `tests/unit/escale-lista-de-contatos-rotas.test.ts` (L131)

**Interfaces:**
- Consumes: `filtrosDeContatosSchema`, `enxugarFiltros`, `temFiltros`, `FiltrosDeContatos` (Task 1); `compilarFiltros`, `FiltroCompilado` (Task 1); a função de 8 parâmetros (Task 2).
- Produces:
  - `lista.ts`: `consultaDaListaSchema` com `f?: string`; `filtrosDaConsulta(consulta): FiltrosDeContatos | null` (null = `f` inválido); `fusoDaOrganizacao(supabase, orgId): Promise<string>`; `listarContatos(supabase, orgId, consulta, filtro?: FiltroCompilado)`.
  - `filtros-salvos.ts`: `LISTAS_COM_FILTROS`, `ListaComFiltros`, `listaSchema`, `FILTROS_DA_LISTA_MAX`, `NOME_DO_FILTRO_MAX`, `FiltroDaLista {id, nome, compartilhado, meu, criterios}`, `novoFiltroSchema`, `mudarFiltroSchema`, `nomeLimpo`, `nomeRepetido`, `filtrosDasLinhas`, `lerFiltrosDaLista`, `falhaDaGravacao`.
  - Rotas: `GET /api/v1/filtros-das-listas?lista=contatos` → `{ data: FiltroDaLista[] }`; `POST` `{lista, nome, compartilhado, criterios}` → 201 `{ data: { id, filtros } }`; `PATCH /api/v1/filtros-das-listas/[id]` `{nome?, compartilhado?}` → `{ data: FiltroDaLista[] }`; `DELETE` → `{ data: FiltroDaLista[] }`.
  - Hooks: `chaveDosFiltrosDaLista(lista)`, `useFiltrosDaLista(lista)`, `useCriarFiltroDaLista(lista)`, `useMudarFiltroDaLista(lista)`, `useExcluirFiltroDaLista(lista)`; `ConsultaDaTela` ganha `f?: string`.
  - Auditoria: `list_filter.created`, `list_filter.updated`, `list_filter.deleted`.

- [ ] **Step 1: O teste das rotas (vai falhar)**

Create `tests/unit/escale-filtros-das-listas-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE, PATCH } from "@/app/api/v1/filtros-das-listas/[id]/route";
import { GET, POST } from "@/app/api/v1/filtros-das-listas/route";
import { GET as GET_LISTA } from "@/app/api/v1/lista-de-contatos/route";
import { audit } from "@/lib/audit";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/logger", () => ({
  logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };
const ID = "55555555-5555-4555-8555-555555555555";
const OUTRO = "66666666-6666-4666-8666-666666666666";

/** Supabase de mentira: cada tabela devolve a sua resposta; as escritas ficam anotadas. */
function banco(tabelas: Record<string, Resposta>, escrita: Resposta = { data: { id: ID }, error: null }) {
  const gravado: Array<{ tabela: string; tipo: string; corpo?: unknown }> = [];
  const rpc = vi.fn().mockResolvedValue({ data: [], error: null });
  const from = vi.fn((tabela: string) => {
    const resposta = tabelas[tabela] ?? { data: [], error: null };
    let atual: Resposta = resposta;
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn(async () => {
      const d = atual.data;
      return { data: Array.isArray(d) ? (d[0] ?? null) : d, error: atual.error };
    });
    cadeia.single = vi.fn(async () => atual);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(atual).then(ok);
    for (const tipo of ["insert", "update", "delete"]) {
      cadeia[tipo] = vi.fn((corpo?: unknown) => {
        gravado.push({ tabela, tipo, corpo });
        atual = escrita;
        return cadeia;
      });
    }
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from, gravado };
}

const linha = (extra: object) => ({
  id: OUTRO,
  user_id: USER_ID,
  nome: "Clientes em aberto",
  compartilhado: false,
  criterios: { telefone: "com" },
  ...extra,
});

const pedido = (url: string, init?: { method?: string; body?: unknown }) =>
  new NextRequest(new URL(url, "http://x"), {
    method: init?.method ?? "GET",
    ...(init?.body !== undefined ? { body: JSON.stringify(init.body) } : {}),
  } as never);
const comId = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  // `authOk` só aceita "manager" | "admin" (tests/helpers/stages-db-double.ts, L503); as rotas pedem viewer.
  authOk();
});

describe("GET /api/v1/filtros-das-listas", () => {
  it("lista inválida é 422", async () => {
    banco({});
    expect((await GET(pedido("/api/v1/filtros-das-listas?lista=negocios"))).status).toBe(422);
  });

  it("devolve os filtros com 'meu' e critérios limpos", async () => {
    banco({
      crm_filtros_das_listas: {
        data: [linha({}), linha({ id: ID, user_id: "outra", compartilhado: true, criterios: { lixo: 1 } })],
        error: null,
      },
    });
    const r = await GET(pedido("/api/v1/filtros-das-listas?lista=contatos"));
    expect(r.status).toBe(200);
    const corpo = (await r.json()) as { data: Array<{ meu: boolean; criterios: object }> };
    expect(corpo.data.map((f) => f.meu)).toEqual([true, false]);
    expect(corpo.data[0]?.criterios).toEqual({ telefone: "com" });
    expect(corpo.data[1]?.criterios).toEqual({});
  });
});

describe("POST /api/v1/filtros-das-listas", () => {
  const corpo = {
    lista: "contatos",
    nome: "  VIPs  ",
    compartilhado: true,
    criterios: { tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] } },
  };

  it("o acompanhamento só-leitura não grava", async () => {
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    banco({});
    expect((await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }))).status).toBe(403);
  });

  it("nome vazio é 422; repetido (sem caixa) é 409", async () => {
    banco({ crm_filtros_das_listas: { data: [linha({ nome: "vips" })], error: null } });
    expect((await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: { ...corpo, nome: "  " } }))).status).toBe(422);
    expect((await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }))).status).toBe(409);
  });

  it("o 21º é recusado com o texto da Clint", async () => {
    const vinte = Array.from({ length: 20 }, (_, i) => linha({ id: `${i}`, nome: `F${i}` }));
    banco({ crm_filtros_das_listas: { data: vinte, error: null } });
    const r = await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }));
    expect(r.status).toBe(422);
    expect(JSON.stringify(await r.json())).toContain("Limite de 20 filtros salvos atingido");
  });

  it("grava com o nome limpo, os critérios enxutos e audita", async () => {
    const { gravado } = banco({ crm_filtros_das_listas: { data: [], error: null } });
    const r = await POST(pedido("/api/v1/filtros-das-listas", { method: "POST", body: corpo }));
    expect(r.status).toBe(201);
    expect(gravado[0]).toMatchObject({
      tipo: "insert",
      corpo: {
        organization_id: ORG_ID,
        user_id: USER_ID,
        lista: "contatos",
        nome: "VIPs",
        compartilhado: true,
        criterios: { tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] } },
      },
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "list_filter.created" }));
  });
});

describe("PATCH e DELETE /api/v1/filtros-das-listas/[id]", () => {
  it("filtro que não é meu é 404", async () => {
    banco({ crm_filtros_das_listas: { data: null, error: null } });
    expect((await PATCH(pedido(`/x/${ID}`, { method: "PATCH", body: { nome: "Novo" } }), comId(ID))).status).toBe(404);
    expect((await DELETE(pedido(`/x/${ID}`, { method: "DELETE" }), comId(ID))).status).toBe(404);
  });

  it("id que não é uuid é 422", async () => {
    banco({});
    expect((await DELETE(pedido("/x/abc", { method: "DELETE" }), comId("abc"))).status).toBe(422);
  });

  it("renomear para um nome que já tenho é 409", async () => {
    banco({
      crm_filtros_das_listas: {
        data: [linha({ id: ID, nome: "Antigo", lista: "contatos" }), linha({ nome: "Novo", lista: "contatos" })],
        error: null,
      },
    });
    expect((await PATCH(pedido(`/x/${ID}`, { method: "PATCH", body: { nome: "novo" } }), comId(ID))).status).toBe(409);
  });

  it("compartilhar e excluir gravam e auditam", async () => {
    const { gravado } = banco({ crm_filtros_das_listas: { data: [linha({ id: ID, lista: "contatos" })], error: null } });
    expect((await PATCH(pedido(`/x/${ID}`, { method: "PATCH", body: { compartilhado: true } }), comId(ID))).status).toBe(200);
    expect(gravado.at(-1)).toMatchObject({ tipo: "update", corpo: { compartilhado: true } });
    expect((await DELETE(pedido(`/x/${ID}`, { method: "DELETE" }), comId(ID))).status).toBe(200);
    expect(gravado.at(-1)).toMatchObject({ tipo: "delete" });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "list_filter.deleted" }));
  });
});

describe("GET /api/v1/lista-de-contatos com filtro", () => {
  it("f inválido é 422", async () => {
    banco({});
    expect((await GET_LISTA(pedido(`/api/v1/lista-de-contatos?f=${encodeURIComponent("{x")}`))).status).toBe(422);
  });

  it("f válido vai compilado, com o fuso da organização", async () => {
    const { rpc } = banco({ organizations: { data: { timezone: "America/Manaus" }, error: null } });
    const f = encodeURIComponent(JSON.stringify({ telefone: "sem" }));
    expect((await GET_LISTA(pedido(`/api/v1/lista-de-contatos?f=${f}`))).status).toBe(200);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_lista_de_contatos",
      expect.objectContaining({ p_filtros: { fuso: "America/Manaus", telefone: "sem" } }),
    );
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-filtros-das-listas-rotas.test.ts`
Expected: FAIL (as rotas não existem).

- [ ] **Step 2: As ações de auditoria**

Em `lib/audit/actions.ts`, logo depois de `"list_columns.updated",`:

```ts
  // FORK ESCALE · Fase 2B: os filtros salvos das listas (migration 9102).
  "list_filter.created",
  "list_filter.updated",
  "list_filter.deleted",
```

- [ ] **Step 3: O filtro na consulta da lista**

Em `lib/escale/contatos/lista.ts`:

1. Nos imports, acrescente:

```ts
import { fusoUtilizavel } from "@/lib/tempo/fusos";

import type { FiltroCompilado } from "./compilar-filtros";
import { filtrosDeContatosSchema, type FiltrosDeContatos } from "./filtros";
```

2. Troque `consultaDaListaSchema` por:

```ts
export const consultaDaListaSchema = z.object({
  q: z.string().max(200).optional(),
  v: z.enum(VISOES_DE_CONTATOS).default("todos"),
  p: z.coerce.number().int().min(1).max(1_000_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
  // FORK ESCALE · Fase 2B: o filtro da tela (JSON de `FiltrosDeContatos`).
  f: z.string().max(16384).optional(),
});
```

3. Logo depois de `export type ConsultaDaLista = …`, acrescente:

```ts
/** O `f` da consulta → filtro; `null` quando veio e não vale (a rota responde 422). */
export function filtrosDaConsulta(consulta: { f?: string }): FiltrosDeContatos | null {
  if (!consulta.f) return {};
  try {
    const lido = filtrosDeContatosSchema.safeParse(JSON.parse(consulta.f));
    return lido.success ? lido.data : null;
  } catch {
    return null;
  }
}

/** O fuso da organização (Configurações › Empresa), sempre utilizável. */
export async function fusoDaOrganizacao(supabase: SupabaseClient, orgId: string): Promise<string> {
  const { data } = await supabase.from("organizations").select("timezone").eq("id", orgId).maybeSingle();
  return fusoUtilizavel((data as { timezone?: string | null } | null)?.timezone);
}
```

4. Troque a assinatura e a chamada da função em `listarContatos`:

```ts
export async function listarContatos(
  supabase: SupabaseClient,
  orgId: string,
  consulta: ConsultaDaLista,
  filtro?: FiltroCompilado,
): Promise<PaginaDeContatos> {
```

e, dentro do `supabase.rpc("fn_escale_lista_de_contatos", { … })`, logo depois de `p_deslocamento: (consulta.p - 1) * consulta.n,`:

```ts
    p_filtros: filtro ?? {},
```

- [ ] **Step 4: A rota da lista**

Em `app/api/v1/lista-de-contatos/route.ts`, troque o import da lista e o bloco `try` por:

```ts
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import {
  consultaDaListaSchema,
  filtrosDaConsulta,
  fusoDaOrganizacao,
  listarContatos,
} from "@/lib/escale/contatos/lista";
```

```ts
  // FORK ESCALE · Fase 2B: o filtro vem compilado (padrão sem acento, tags, fuso).
  const filtros = filtrosDaConsulta(lido.data);
  if (filtros === null) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
    });
  }
  try {
    const supabase = await createClient();
    const orgId = authz.org.orgId;
    const filtro = temFiltros(filtros)
      ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId))
      : undefined;
    return ok(await listarContatos(supabase, orgId, lido.data, filtro), { requestId });
  } catch (err) {
```

(o `catch` continua o mesmo).

- [ ] **Step 5: O teste da 2A que pina os argumentos**

Em `tests/unit/escale-lista-de-contatos-rotas.test.ts`, no `expect(rpc).toHaveBeenCalledWith("fn_escale_lista_de_contatos", { … })` (L131), acrescente `p_filtros: {},` logo depois de `p_deslocamento: 10,`.

- [ ] **Step 6: A biblioteca dos filtros salvos**

Create `lib/escale/listas/filtros-salvos.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import {
  enxugarFiltros,
  filtrosDeContatosSchema,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";

/**
 * OS FILTROS SALVOS DAS LISTAS (fork Escale, Fase 2B; migration 9102; Clint
 * `userFilterPreset`). Uma tabela para as listas da casca (`contatos` agora,
 * `empresas` na 2D). As regras da 1D: 20 por pessoa e lista, nome único por
 * pessoa (sem caixa), o compartilhado visível a toda a organização, só quem
 * criou escreve (a RLS garante; a rota só dá a mensagem certa antes).
 */
export const LISTAS_COM_FILTROS = ["contatos"] as const;
export type ListaComFiltros = (typeof LISTAS_COM_FILTROS)[number];
export const listaSchema = z.enum(LISTAS_COM_FILTROS);
export const FILTROS_DA_LISTA_MAX = 20;
export const NOME_DO_FILTRO_MAX = 60;

export type FiltroDaLista = {
  id: string;
  nome: string;
  compartilhado: boolean;
  meu: boolean;
  criterios: FiltrosDeContatos;
};

export const novoFiltroSchema = z
  .object({
    lista: listaSchema,
    nome: z.string().max(200),
    compartilhado: z.boolean(),
    criterios: filtrosDeContatosSchema,
  })
  .strict();

export const mudarFiltroSchema = z
  .object({ nome: z.string().max(200).optional(), compartilhado: z.boolean().optional() })
  .strict()
  .refine((b) => b.nome !== undefined || b.compartilhado !== undefined, { message: "vazio" });

export function nomeLimpo(nome: string): string | null {
  const limpo = nome.trim().replace(/\s+/g, " ");
  return limpo.length >= 1 && limpo.length <= NOME_DO_FILTRO_MAX ? limpo : null;
}

export function nomeRepetido(
  nome: string,
  meus: ReadonlyArray<{ id: string; nome: string }>,
  ignorar?: string,
): boolean {
  const alvo = nome.trim().toLowerCase();
  return meus.some((f) => f.id !== ignorar && f.nome.trim().toLowerCase() === alvo);
}

type Linha = { id: string; user_id: string; nome: string; compartilhado: boolean; criterios: unknown };

/** Critério que não vale mais (o modelo mudou) vira filtro vazio, em vez de quebrar a lista. */
export function filtrosDasLinhas(linhas: readonly Linha[], userId: string): FiltroDaLista[] {
  return linhas.map((l) => {
    const lido = filtrosDeContatosSchema.safeParse(l.criterios);
    return {
      id: l.id,
      nome: l.nome,
      compartilhado: l.compartilhado,
      meu: l.user_id === userId,
      criterios: lido.success ? enxugarFiltros(lido.data) : {},
    };
  });
}

/** Lança o erro do banco para a rota tratar. */
export async function lerFiltrosDaLista(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComFiltros,
): Promise<FiltroDaLista[]> {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, user_id, nome, compartilhado, criterios")
    .eq("organization_id", orgId)
    .eq("lista", lista)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return filtrosDasLinhas((data ?? []) as Linha[], userId);
}

/** 23505 = nome repetido; o gatilho do limite = o 21º. Outro erro: `null` (a rota trata como inesperado). */
export function falhaDaGravacao(
  erro: { code?: string; message?: string },
  t: (texto: string) => string,
  requestId: string,
): Response | null {
  if (erro.code === "23505") {
    return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
  }
  if ((erro.message ?? "").includes("crm_filtros_das_listas_limite")) {
    return fail(
      "unprocessable_entity",
      t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."),
      422,
      { requestId },
    );
  }
  return null;
}
```

- [ ] **Step 7: As rotas dos filtros salvos**

Create `app/api/v1/filtros-das-listas/route.ts`:

```ts
/**
 * GET/POST /api/v1/filtros-das-listas — os filtros salvos de uma lista da casca
 * (fork Escale, Fase 2B; migration 9102). `organization_id` e a pessoa saem da
 * sessão; a RLS decide o que cada um vê e grava.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { enxugarFiltros } from "@/lib/escale/contatos/filtros";
import {
  FILTROS_DA_LISTA_MAX,
  falhaDaGravacao,
  lerFiltrosDaLista,
  listaSchema,
  nomeLimpo,
  nomeRepetido,
  novoFiltroSchema,
} from "@/lib/escale/listas/filtros-salvos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/filtros-das-listas";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lista = listaSchema.safeParse(req.nextUrl.searchParams.get("lista"));
  if (!lista.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
    });
  }
  try {
    const filtros = await lerFiltrosDaLista(await createClient(), authz.org.orgId, authz.user.id, lista.data);
    return ok(filtros, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler os filtros salvos" },
      t,
      requestId,
    );
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = novoFiltroSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: lido.error.flatten(),
    });
  }
  const nome = nomeLimpo(lido.data.nome);
  if (!nome) {
    return fail("unprocessable_entity", t("Dê ao filtro um nome de 1 a 60 caracteres."), 422, { requestId });
  }

  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const meus = (await lerFiltrosDaLista(supabase, orgId, userId, lido.data.lista)).filter((f) => f.meu);
    if (nomeRepetido(nome, meus)) {
      return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
    }
    if (meus.length >= FILTROS_DA_LISTA_MAX) {
      return fail(
        "unprocessable_entity",
        t("Limite de 20 filtros salvos atingido. Exclua algum para salvar outro."),
        422,
        { requestId },
      );
    }
    const { data: criado, error } = await supabase
      .from("crm_filtros_das_listas")
      .insert({
        organization_id: orgId,
        user_id: userId,
        lista: lido.data.lista,
        nome,
        compartilhado: lido.data.compartilhado,
        criterios: enxugarFiltros(lido.data.criterios),
      })
      .select("id")
      .single();
    if (error || !criado) {
      return (
        (error && falhaDaGravacao(error, t, requestId)) ??
        falhaInesperadaDoQuadro(error, { rota: `POST ${ROTA}`, operacao: "salvar o filtro" }, t, requestId)
      );
    }
    const id = (criado as { id: string }).id;
    void audit({
      action: "list_filter.created",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: lido.data.lista, compartilhado: lido.data.compartilhado },
    });
    const filtros = await lerFiltrosDaLista(supabase, orgId, userId, lido.data.lista);
    return ok({ id, filtros }, { status: 201, requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `POST ${ROTA}`, operacao: "salvar o filtro" },
      t,
      requestId,
    );
  }
}
```

Create `app/api/v1/filtros-das-listas/[id]/route.ts`:

```ts
/**
 * PATCH/DELETE /api/v1/filtros-das-listas/[id] — renomear, compartilhar e excluir
 * um filtro salvo (fork Escale, Fase 2B). Só quem criou: o filtro é procurado
 * com `user_id` da sessão, e a RLS barra o resto.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  falhaDaGravacao,
  lerFiltrosDaLista,
  listaSchema,
  mudarFiltroSchema,
  nomeLimpo,
  nomeRepetido,
  type ListaComFiltros,
} from "@/lib/escale/listas/filtros-salvos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Contexto = { params: Promise<{ id: string }> };
type Supabase = Awaited<ReturnType<typeof createClient>>;

async function inicio(req: NextRequest, ctx: Contexto) {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return { resposta: supportDenied } as const;
  const authz = await requireRole("viewer", { requestId, resource: "crm_filtros_das_listas" });
  if (!authz.ok) return { resposta: authz.response } as const;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return {
      resposta: fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
        requestId,
      }),
    } as const;
  }
  return { requestId, authz, t, id } as const;
}

/** O meu filtro com esse id, ou null. */
async function meuFiltro(supabase: Supabase, orgId: string, userId: string, id: string) {
  const { data, error } = await supabase
    .from("crm_filtros_das_listas")
    .select("id, lista, nome")
    .eq("id", id)
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const lista = listaSchema.safeParse((data as { lista: string }).lista);
  return lista.success ? { id, lista: lista.data as ListaComFiltros } : null;
}

export async function PATCH(req: NextRequest, ctx: Contexto): Promise<Response> {
  const c = await inicio(req, ctx);
  if ("resposta" in c) return c.resposta;
  const { requestId, authz, t, id } = c;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = mudarFiltroSchema.safeParse(corpo.json);
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
    });
  }
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const filtro = await meuFiltro(supabase, orgId, userId, id);
    if (!filtro) return fail("not_found", t("Filtro não encontrado."), 404, { requestId });
    let nome: string | undefined;
    if (lido.data.nome !== undefined) {
      const limpo = nomeLimpo(lido.data.nome);
      if (!limpo) {
        return fail("unprocessable_entity", t("Dê ao filtro um nome de 1 a 60 caracteres."), 422, { requestId });
      }
      const meus = (await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista)).filter((f) => f.meu);
      if (nomeRepetido(limpo, meus, id)) {
        return fail("state_conflict", t("Já existe um filtro com esse nome."), 409, { requestId });
      }
      nome = limpo;
    }
    const { error } = await supabase
      .from("crm_filtros_das_listas")
      .update({
        ...(nome !== undefined ? { nome } : {}),
        ...(lido.data.compartilhado !== undefined ? { compartilhado: lido.data.compartilhado } : {}),
      })
      .eq("id", id)
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    if (error) {
      return (
        falhaDaGravacao(error, t, requestId) ??
        falhaInesperadaDoQuadro(error, { rota: "PATCH /api/v1/filtros-das-listas/[id]", operacao: "mudar o filtro" }, t, requestId)
      );
    }
    void audit({
      action: "list_filter.updated",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: filtro.lista, campos: Object.keys(lido.data) },
    });
    return ok(await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "PATCH /api/v1/filtros-das-listas/[id]", operacao: "mudar o filtro" },
      t,
      requestId,
    );
  }
}

export async function DELETE(req: NextRequest, ctx: Contexto): Promise<Response> {
  const c = await inicio(req, ctx);
  if ("resposta" in c) return c.resposta;
  const { requestId, authz, t, id } = c;
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const filtro = await meuFiltro(supabase, orgId, userId, id);
    if (!filtro) return fail("not_found", t("Filtro não encontrado."), 404, { requestId });
    const { error } = await supabase
      .from("crm_filtros_das_listas")
      .delete()
      .eq("id", id)
      .eq("organization_id", orgId)
      .eq("user_id", userId);
    if (error) {
      return falhaInesperadaDoQuadro(
        error,
        { rota: "DELETE /api/v1/filtros-das-listas/[id]", operacao: "excluir o filtro" },
        t,
        requestId,
      );
    }
    void audit({
      action: "list_filter.deleted",
      actorUserId: userId,
      organizationId: orgId,
      resourceType: "crm_filtros_das_listas",
      resourceId: id,
      requestId,
      metadata: { lista: filtro.lista },
    });
    return ok(await lerFiltrosDaLista(supabase, orgId, userId, filtro.lista), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "DELETE /api/v1/filtros-das-listas/[id]", operacao: "excluir o filtro" },
      t,
      requestId,
    );
  }
}
```

Confira antes de rodar: os códigos `invalid_request`, `unprocessable_entity`, `state_conflict` e `not_found` existem no tipo de `fail` (`lib/api/wrappers.ts`); a 2A já usa os três primeiros. Se `not_found` tiver outro nome, use o que existir.

- [ ] **Step 8: Os hooks**

Create `hooks/escale/useFiltrosDaLista.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import type { FiltroDaLista, ListaComFiltros } from "@/lib/escale/listas/filtros-salvos";

/** Os filtros salvos de uma lista da casca (fork Escale, Fase 2B). Toda escrita devolve a lista. */
export const chaveDosFiltrosDaLista = (lista: ListaComFiltros) => ["filtros-das-listas", lista] as const;

export function useFiltrosDaLista(lista: ListaComFiltros) {
  return useQuery({
    queryKey: chaveDosFiltrosDaLista(lista),
    queryFn: async () =>
      (await apiClient.get<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas?lista=${lista}`)).data,
    staleTime: 60_000,
  });
}

export function useCriarFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (novo: { nome: string; compartilhado: boolean; criterios: FiltrosDeContatos }) =>
      (
        await apiClient.post<{ data: { id: string; filtros: FiltroDaLista[] } }>("/api/v1/filtros-das-listas", {
          lista,
          ...novo,
        })
      ).data,
    onSuccess: (r) => qc.setQueryData(chaveDosFiltrosDaLista(lista), r.filtros),
  });
}

export function useMudarFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...mudar }: { id: string; nome?: string; compartilhado?: boolean }) =>
      (await apiClient.patch<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas/${id}`, mudar)).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}

export function useExcluirFiltroDaLista(lista: ListaComFiltros) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete<{ data: FiltroDaLista[] }>(`/api/v1/filtros-das-listas/${id}`)).data,
    onSuccess: (filtros) => qc.setQueryData(chaveDosFiltrosDaLista(lista), filtros),
  });
}
```

Em `hooks/escale/useListaDeContatos.ts`, troque o tipo e acrescente o `f`:

```ts
export type ConsultaDaTela = { q?: string; v: VisaoDeContatos; p: number; n: number; f?: string | null };
```

e, logo depois de `if (consulta.q?.trim()) qs.set("q", consulta.q.trim());`:

```ts
      if (consulta.f) qs.set("f", consulta.f);
```

- [ ] **Step 9: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-filtros-das-listas-rotas.test.ts tests/unit/escale-lista-de-contatos-rotas.test.ts
```

Expected: PASS nos dois.

- [ ] **Step 10: Revisor (subagente) das rotas**

Despache um revisor com as três rotas, a biblioteca e o teste. Pontos: `requireSupportWrite` antes de toda escrita; `organization_id` e `user_id` só da sessão; PATCH/DELETE com `user_id` na cláusula (não confiar só na RLS); nenhum dado do corpo vai cru para o banco (critérios enxutos e validados); o `f` inválido é 422, não 500; os textos passam por `t()`.

- [ ] **Step 11: Guardas, typecheck, eslint, prettier e commit**

```bash
ALTERADOS="lib/escale/contatos/lista.ts app/api/v1/lista-de-contatos/route.ts hooks/escale/useListaDeContatos.ts lib/audit/actions.ts"
NOVOS="lib/escale/listas/filtros-salvos.ts app/api/v1/filtros-das-listas/route.ts app/api/v1/filtros-das-listas/[id]/route.ts hooks/escale/useFiltrosDaLista.ts tests/unit/escale-filtros-das-listas-rotas.test.ts"
for f in $ALTERADOS; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u | xargs -r corepack pnpm vitest run
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $ALTERADOS $NOVOS tests/unit/escale-lista-de-contatos-rotas.test.ts
corepack pnpm exec prettier --write $NOVOS
git add $ALTERADOS $NOVOS tests/unit/escale-lista-de-contatos-rotas.test.ts
git commit -m "feat(escale): rotas da lista com filtro e dos filtros salvos (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: O painel de filtros (Contato, Negócio, Tags, Campos)

**Files:**
- Create: `components/escale/contatos/filtros/PecasDoFiltro.tsx`, `PainelDeFiltros.tsx`, `SecaoContatoDoFiltro.tsx`, `SecaoNegocioDoFiltro.tsx`, `SecaoTagsDoFiltro.tsx`, `SecaoCamposDoFiltro.tsx`, `tests/unit/escale-painel-de-filtros-de-contatos.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (a seta do "← Voltar")

**Interfaces:**
- Consumes: Task 1 (`filtros.ts`: `ROTULO_DA_OP_DE_TAG`, `CondicaoDeTag`, `GrupoDeTags`, `CONDICOES_POR_GRUPO_MAX`, `GRUPOS_MAX`; `OpcoesDoFiltro`); peças da casca: `SeletorDaCasca` (combobox + `option`), `SeletorMultiploDaCasca` (combobox + caixinhas), `AlternanciaDaCasca`, `BotaoDaCasca`, `CalendarioDePeriodo` (`tiposDisponiveis={["criacao"]}`), `PainelSuspenso`; da 1D: `RotuloDoGrupo`, `CLASSE_DO_CAMPO`, `CLASSE_DA_LINHA_DO_MENU` (`components/escale/filtros/controles.tsx`), `numeroDoValor` (`lib/escale/filtros/campos.ts`), `isoDaDataBr`, `dataBrDoIso` (`lib/escale/filtros/periodo.ts`); hooks do original: `useAssignableMembers`, `useAssignableAgents`, `useContactTagVocabulary`, `useAuth`; `ChipDaTag` (`components/escale/quadro/PecasDoCard.tsx`); `agentOwnerFilter` (`lib/kanban/filters.ts`).
- Produces: `PainelDeFiltros({ filtros, aoMudar, opcoes, foco, aoMudarFoco, rodape? })`; peças: `GrupoDoFiltro`, `Pilula`, `OpcaoDeRadio`, `BotaoVoltar`, `GruposDoFiltro<C>({ grupos, combinar, aoMudar, textoDaCondicao, seletor })`, `GrupoGenerico<C>`.

Abra antes: os prints 2b-05 a 2b-23 (o painel, cada seção, os grupos de Tags e o seletor de Campos) e o v2-18 (referência antiga). Detalhes a reproduzir: painel de 356px; seções em acordeão de 56px com ícone 15px, título 13px/500, selo QUADRADO (raio 4, 18px, `casca-marca-suave` com o número na cor da marca), × que limpa só a seção e chevron; conteúdo em fundo claro (`bg-casca-raia`) com rótulos 11px/600 maiúsculos ("DATA DE CRIAÇÃO", "TELEFONE", "COM/SEM NEGÓCIO", "ORIGENS", "ETAPA", "STATUS", "DONO DO NEGÓCIO", "MOTIVO DE PERDA") e os campos de 32px da Clint (`CLASSE_DO_CAMPO`). **Tags e Campos em grupos** (prints 2b-15 a 2b-23): vazio, o botão largo com borda "+ Adicionar condição"; o seletor suspenso de 308px; o cartão "GRUPO 1" com E \| OU e a lixeira; "• condição ×"; "+ Adicionar condição" do grupo; o botão largo "+ Adicionar grupo"; "combinar grupos por E \| OU" centralizado entre os cartões.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-de-filtros-de-contatos.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, within } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import { PainelDeFiltros } from "@/components/escale/contatos/filtros/PainelDeFiltros";
import type { FiltrosDeContatos, SecaoDoFiltro, TagsDoFiltro } from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Rafa", role: "agent" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "frio"], isLoading: false }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const O1 = "11111111-1111-4111-8111-111111111111";
const E1 = "22222222-2222-4222-8222-222222222222";
const OPCOES: OpcoesDoFiltro = {
  origens: [{ id: O1, nome: "Leads INSS", etapas: [{ id: E1, nome: "Entrada" }] }],
  motivos: [{ valor: "price", rotulo: "Preço" }],
  camposDoNegocio: [{ alvo: "negocio", chave: "valor", rotulo: "Valor do negócio", tipo: "numero" }],
};
const SO_QUALQUER: TagsDoFiltro = { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "qualquer" }] }] };

function Painel({
  inicial = {},
  foco = null,
  espia,
  aoMudarFoco = vi.fn(),
}: {
  inicial?: FiltrosDeContatos;
  foco?: SecaoDoFiltro | null;
  espia: (f: FiltrosDeContatos) => void;
  aoMudarFoco?: (s: SecaoDoFiltro | null) => void;
}) {
  const [f, setF] = useState<FiltrosDeContatos>(inicial);
  return (
    <QueryClientProvider client={new QueryClient()}>
      <PainelDeFiltros
        filtros={f}
        aoMudar={(n) => {
          setF(n);
          espia(n);
        }}
        opcoes={OPCOES}
        foco={foco}
        aoMudarFoco={aoMudarFoco}
      />
    </QueryClientProvider>
  );
}

const abrir = (secao: string) => fireEvent.click(screen.getByRole("button", { name: secao }));
/** O seletor suspenso das condições (Tags e Campos) é uma região com nome. */
const seletor = (nome: string) => screen.getByRole("region", { name: nome });

describe("PainelDeFiltros (prints 2b-05 a 2b-23)", () => {
  it("as quatro seções da Clint, com o selo e o × que limpa só a seção", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} inicial={{ telefone: "com", tags: SO_QUALQUER }} />);
    for (const s of ["Contato", "Negócio", "Tags", "Campos"]) {
      expect(screen.getByRole("button", { name: s })).toBeInTheDocument();
    }
    fireEvent.click(screen.getByRole("button", { name: "Limpar Contato" }));
    expect(espia).toHaveBeenLastCalledWith({ tags: SO_QUALQUER });
  });

  it("Contato › Telefone", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Contato");
    fireEvent.click(screen.getByRole("combobox", { name: "Telefone" }));
    fireEvent.click(screen.getByRole("option", { name: "Sem Telefone" }));
    expect(espia).toHaveBeenLastCalledWith({ telefone: "sem" });
  });

  it("Negócio › a etapa só liga com a origem escolhida", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Negócio");
    expect(screen.getByRole("combobox", { name: "Etapa" })).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Origens" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Leads INSS" }));
    expect(espia).toHaveBeenLastCalledWith({ negocio: { origens: [O1], etapas: [] } });
    expect(screen.getByRole("combobox", { name: "Etapa" })).not.toBeDisabled();
  });

  it("Negócio › escolher motivo de perda põe o status em Perdido (Clint)", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Negócio");
    fireEvent.click(screen.getByRole("combobox", { name: "Motivo de perda" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Preço" }));
    expect(espia).toHaveBeenLastCalledWith({ negocio: { motivos: ["price"], status: ["lost"] } });
  });

  it("Tags › vazio: o botão largo abre o seletor; a tag, 'Não possui a tag' e Aplicar viram o GRUPO 1", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Tags");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    const tags = seletor("Escolher tag");
    expect(within(tags).getByRole("button", { name: "Qualquer tag" })).toBeInTheDocument();
    expect(within(tags).getByRole("button", { name: "Sem tag" })).toBeInTheDocument();
    fireEvent.click(within(tags).getByRole("button", { name: "vip" }));
    expect(screen.getByRole("radio", { name: "Possui a tag" })).toHaveAttribute("aria-checked", "true");
    fireEvent.click(screen.getByRole("radio", { name: "Não possui a tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "nao_possui", tag: "vip" }] }] },
    });
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
  });

  it("Tags › 'Qualquer tag' aplica na hora; 'Adicionar grupo' cria o GRUPO 2; a lixeira tira o grupo", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Tags");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    fireEvent.click(within(seletor("Escolher tag")).getByRole("button", { name: "Qualquer tag" }));
    expect(espia).toHaveBeenLastCalledWith({ tags: SO_QUALQUER });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar grupo" }));
    fireEvent.click(within(seletor("Escolher tag")).getByRole("button", { name: "Sem tag" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: {
        combinar: "ou",
        grupos: [
          { modo: "e", condicoes: [{ op: "qualquer" }] },
          { modo: "e", condicoes: [{ op: "sem" }] },
        ],
      },
    });
    expect(screen.getByText("Grupo 2")).toBeInTheDocument();
    expect(screen.getByText("combinar grupos por")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir grupo Grupo 1" }));
    expect(espia).toHaveBeenLastCalledWith({
      tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "sem" }] }] },
    });
  });

  it("Campos › Contato, Negócio e Empresa (em breve); o grupo abre; 'Contém' já vem marcado; valor e Aplicar", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Campos");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    const campos = seletor("Escolher campo");
    expect(within(campos).getByRole("button", { name: "Empresa" })).toBeDisabled();
    expect(within(campos).queryByRole("button", { name: "Nome" })).not.toBeInTheDocument();
    fireEvent.click(within(campos).getByRole("button", { name: "Contato" }));
    fireEvent.click(within(campos).getByRole("button", { name: "Nome" }));
    expect(screen.getByRole("radio", { name: "Contém" })).toHaveAttribute("aria-checked", "true");
    fireEvent.change(screen.getByPlaceholderText("Digite o texto a buscar"), { target: { value: "ana" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia).toHaveBeenLastCalledWith({
      campos: {
        combinar: "ou",
        grupos: [{ modo: "e", condicoes: [{ alvo: "contato", chave: "nome", tipo: "texto", op: "contem", valor: "ana" }] }],
      },
    });
    expect(screen.getByText("Grupo 1")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar grupo" })).toBeInTheDocument();
  });

  it("Campos › a busca abre o grupo do que achou; número no formato brasileiro vira número", () => {
    const espia = vi.fn();
    render(<Painel espia={espia} />);
    abrir("Campos");
    fireEvent.click(screen.getByRole("button", { name: "Adicionar condição" }));
    fireEvent.change(within(seletor("Escolher campo")).getByRole("textbox", { name: "Buscar campo" }), {
      target: { value: "valor" },
    });
    fireEvent.click(within(seletor("Escolher campo")).getByRole("button", { name: "Valor do negócio" }));
    fireEvent.click(screen.getByRole("radio", { name: "Maior que" }));
    fireEvent.change(screen.getByPlaceholderText("Digite o valor"), { target: { value: "1.500,50" } });
    fireEvent.click(screen.getByRole("button", { name: "Aplicar" }));
    expect(espia.mock.lastCall?.[0].campos.grupos[0].condicoes[0]).toEqual({
      alvo: "negocio",
      chave: "valor",
      tipo: "numero",
      op: "maior",
      valor: "1500.5",
    });
  });

  it("com foco, só a seção e o 'Todos os filtros'", () => {
    const aoMudarFoco = vi.fn();
    render(<Painel espia={vi.fn()} foco="tags" aoMudarFoco={aoMudarFoco} />);
    expect(screen.queryByRole("button", { name: "Contato" })).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Todos os filtros" }));
    expect(aoMudarFoco).toHaveBeenCalledWith(null);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-filtros-de-contatos.test.tsx`
Expected: FAIL (os componentes não existem).

- [ ] **Step 2: As peças (e a seta do "Voltar")**

Em `lib/ui/icons-da-casca.ts`, logo depois da linha `export { StickyNote, ArrowRightLeft, Target, Glasses, MessagesSquare } from "lucide-react";` (Fase 1G), acrescente:

```ts

// Fase 2B (filtros e ações em massa): a seta do "← Voltar" (seletores de Tags, Campos e Tag em massa).
export { ArrowLeft } from "lucide-react";
```

(Se a linha da 1G ainda não estiver na `main`, acrescente logo depois da linha da Fase 2A, `export { AtSign, ChevronsUpDown, GripVertical } from "lucide-react";`.)

Create `components/escale/contatos/filtros/PecasDoFiltro.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { RotuloDoGrupo } from "@/components/escale/filtros/controles";
import { AlternanciaDaCasca } from "@/components/escale/ui/AlternanciaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CONDICOES_POR_GRUPO_MAX, GRUPOS_MAX } from "@/lib/escale/contatos/filtros";
import { ArrowLeft, Plus, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Um grupo da seção (prints 2b-06 e 2b-11): o rótulo maiúsculo da Clint ("TELEFONE") e o controle. */
export function GrupoDoFiltro({ rotulo, children }: { rotulo: string; children: ReactNode }) {
  return (
    <div className="space-y-2">
      <RotuloDoGrupo>{rotulo}</RotuloDoGrupo>
      {children}
    </div>
  );
}

/** A pílula da Clint ("Qualquer tag", "Sem tag"; print 2b-16): 24px, borda, texto na cor da marca. */
export function Pilula({
  ativa,
  onClick,
  children,
}: {
  ativa: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      aria-pressed={ativa}
      onClick={onClick}
      className={cn(
        "h-6 rounded-full border px-2.5 text-[11px] font-medium",
        ativa
          ? "border-casca-marca bg-casca-marca-suave text-casca-marca"
          : "border-casca-borda bg-surface text-casca-marca hover:bg-casca-marca-suave",
      )}
    >
      {children}
    </button>
  );
}

/** O "rádio" da Clint sem o controle nativo: bolinha de 14px; marcada, com o miolo na cor da marca. */
export function OpcaoDeRadio({
  marcada,
  onClick,
  children,
}: {
  marcada: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcada}
      onClick={onClick}
      className="flex h-8 w-full items-center gap-2 rounded-[4px] px-2 text-left text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
    >
      <span
        aria-hidden
        className={cn(
          "grid size-3.5 place-items-center rounded-full border",
          marcada ? "border-casca-marca" : "border-casca-borda",
        )}
      >
        {marcada ? <span className="size-2 rounded-full bg-casca-marca" /> : null}
      </span>
      {children}
    </button>
  );
}

/** O "← Voltar" da Clint (prints 2b-17 e 2b-23). */
export function BotaoVoltar({ onClick }: { onClick: () => void }) {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-1.5 text-[12px] text-casca-suave hover:text-casca-texto"
    >
      <ArrowLeft size={14} aria-hidden />
      {t("Voltar")}
    </button>
  );
}

/** O botão largo com borda da Clint: "+ Adicionar condição" no vazio e "+ Adicionar grupo" (prints 2b-15 e 2b-18). */
const BOTAO_LARGO =
  "flex h-8 w-full items-center justify-center gap-1.5 rounded-[6px] border border-casca-borda bg-surface text-[13px] font-medium text-casca-marca hover:bg-casca-marca-suave disabled:cursor-not-allowed disabled:text-casca-meta";

export type GrupoGenerico<C> = { modo: "e" | "ou"; condicoes: readonly C[] };

/**
 * OS GRUPOS DE CONDIÇÕES DA CLINT (Tags e Campos; prints 2b-15 a 2b-23). Sem grupo,
 * o botão largo "+ Adicionar condição". Com grupos, cada um num cartão com "GRUPO N",
 * E | OU e a lixeira; as condições "• texto ×"; o "+ Adicionar condição" do grupo;
 * "combinar grupos por E | OU" entre os cartões; e o botão largo "+ Adicionar grupo".
 * A condição nasce no seletor suspenso que a seção monta (`seletor`): escolher
 * fecha o seletor e grava (no grupo, ou num grupo novo). Padrões da Clint: E dentro
 * do grupo, OU entre grupos.
 */
export function GruposDoFiltro<C>({
  grupos,
  combinar,
  aoMudar,
  textoDaCondicao,
  seletor,
}: {
  grupos: ReadonlyArray<GrupoGenerico<C>>;
  combinar: "e" | "ou";
  aoMudar: (grupos: Array<GrupoGenerico<C>>, combinar: "e" | "ou") => void;
  textoDaCondicao: (c: C) => ReactNode;
  seletor: (aoEscolher: (c: C) => void) => ReactNode;
}) {
  const t = useT();
  /** Onde o seletor está aberto: o índice do grupo, ou `grupos.length` para um grupo novo. */
  const [aberto, setAberto] = useState<number | null>(null);
  const nomeDoGrupo = (i: number) => t("Grupo {number}").replace("{number}", String(i + 1));
  const E_OU = [
    { valor: "e" as const, rotulo: t("E") },
    { valor: "ou" as const, rotulo: t("OU") },
  ];

  function escolher(grupo: number, c: C) {
    const novos =
      grupo < grupos.length
        ? grupos.map((g, i) => (i === grupo ? { ...g, condicoes: [...g.condicoes, c] } : g))
        : [...grupos, { modo: "e" as const, condicoes: [c] }];
    aoMudar(novos, combinar);
    setAberto(null);
  }

  const tirar = (grupo: number, indice: number) =>
    aoMudar(
      grupos
        .map((g, i) => (i === grupo ? { ...g, condicoes: g.condicoes.filter((_, j) => j !== indice) } : g))
        .filter((g) => g.condicoes.length > 0),
      combinar,
    );

  const comSeletor = (lugar: number, gatilho: ReactNode) => (
    <Popover open={aberto === lugar} onOpenChange={(a) => setAberto(a ? lugar : null)}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="start" sideOffset={6} className="w-[308px] p-0">
        {seletor((c) => escolher(lugar, c))}
      </PainelSuspenso>
    </Popover>
  );

  if (grupos.length === 0) {
    return comSeletor(
      0,
      <button type="button" className={BOTAO_LARGO}>
        <Plus size={14} aria-hidden />
        {t("Adicionar condição")}
      </button>,
    );
  }

  const grupoCheio = (g: GrupoGenerico<C>) => g.condicoes.length >= CONDICOES_POR_GRUPO_MAX;

  return (
    <div className="space-y-3">
      {grupos.map((g, i) => (
        <div key={i} className="space-y-3">
          {i > 0 ? (
            <div className="flex items-center justify-center gap-2 text-[11px] text-casca-suave">
              {t("combinar grupos por")}
              <AlternanciaDaCasca
                valor={combinar}
                opcoes={E_OU}
                aoMudar={(v) => aoMudar([...grupos], v)}
                aria-label={t("combinar grupos por")}
              />
            </div>
          ) : null}
          <div className="rounded-[6px] border border-casca-borda bg-surface p-3">
            <div className="mb-2 flex items-center gap-2">
              <span className="flex-1 text-[11px] font-semibold tracking-[0.04em] text-casca-meta uppercase">
                {nomeDoGrupo(i)}
              </span>
              <AlternanciaDaCasca
                valor={g.modo}
                opcoes={E_OU}
                aoMudar={(v) => aoMudar(grupos.map((x, j) => (j === i ? { ...x, modo: v } : x)), combinar)}
                aria-label={nomeDoGrupo(i)}
              />
              <button
                type="button"
                aria-label={`${t("Excluir grupo")} ${nomeDoGrupo(i)}`}
                onClick={() => aoMudar(grupos.filter((_, j) => j !== i), combinar)}
                className="grid size-6 place-items-center text-casca-suave hover:text-casca-alerta"
              >
                <Trash2 size={14} aria-hidden />
              </button>
            </div>
            <ul className="space-y-1">
              {g.condicoes.map((c, j) => (
                <li key={j} className="flex items-center gap-2 text-[12px] text-casca-texto">
                  <span aria-hidden className="size-1 shrink-0 rounded-full bg-casca-marca" />
                  <span className="flex min-w-0 flex-1 flex-wrap items-center gap-1">{textoDaCondicao(c)}</span>
                  <button
                    type="button"
                    aria-label={t("Remover filtro")}
                    onClick={() => tirar(i, j)}
                    className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                  >
                    <X size={12} aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
            {comSeletor(
              i,
              <button
                type="button"
                disabled={grupoCheio(g)}
                title={grupoCheio(g) ? t("Limite de 10 condições por grupo atingido.") : undefined}
                className="mt-2 inline-flex items-center gap-1 text-[12px] font-semibold text-casca-marca disabled:text-casca-meta"
              >
                <Plus size={12} aria-hidden />
                {t("Adicionar condição")}
              </button>,
            )}
          </div>
        </div>
      ))}
      {comSeletor(
        grupos.length,
        <button
          type="button"
          disabled={grupos.length >= GRUPOS_MAX}
          title={grupos.length >= GRUPOS_MAX ? t("Limite de 5 grupos atingido.") : undefined}
          className={BOTAO_LARGO}
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar grupo")}
        </button>,
      )}
    </div>
  );
}
```

Repare: o seletor é um Popover dentro do Popover do painel (o calendário da seção Contato já faz isso); o Radix trata o clique dentro do seletor como dentro do painel. Se a `AlternanciaDaCasca` tiver outra API (`valor`, `opcoes`, `aoMudar`, `aria-label`), siga a dela (`grep -n "export function AlternanciaDaCasca" -A 20 components/escale/ui/AlternanciaDaCasca.tsx`).

- [ ] **Step 3: Contato**

Create `components/escale/contatos/filtros/SecaoContatoDoFiltro.tsx`:

```tsx
"use client";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  OPCOES_DE_TELEFONE,
  ROTULO_DO_TELEFONE,
  textoDoPeriodo,
  type FiltrosDeContatos,
} from "@/lib/escale/contatos/filtros";
import { Calendar } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { GrupoDoFiltro } from "./PecasDoFiltro";

/** Seção Contato (Clint `index-A38akjUb`): "Data de criação" e "Telefone". */
export function SecaoContatoDoFiltro({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
}) {
  const t = useT();
  const periodo = filtros.criadoEm;
  return (
    <>
      <GrupoDoFiltro rotulo={t("Data de criação")}>
        <Popover>
          <PopoverTrigger asChild>
            <button
              type="button"
              aria-label={t("Data de criação")}
              className={cn(CLASSE_DO_CAMPO, "flex items-center justify-between text-left")}
            >
              <span className={periodo ? "text-casca-texto" : "text-casca-meta"}>
                {periodo ? textoDoPeriodo(periodo) : t("Filtrar por data de criação")}
              </span>
              <Calendar size={14} aria-hidden className="text-casca-suave" />
            </button>
          </PopoverTrigger>
          <PainelSuspenso className="w-auto p-0">
            <CalendarioDePeriodo
              valor={{ tipo: "criacao", de: periodo?.de, ate: periodo?.ate }}
              tiposDisponiveis={["criacao"]}
              aoMudar={(p) =>
                aoMudar({
                  ...filtros,
                  criadoEm: p.de || p.ate ? { ...(p.de ? { de: p.de } : {}), ...(p.ate ? { ate: p.ate } : {}) } : undefined,
                })
              }
            />
          </PainelSuspenso>
        </Popover>
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Telefone")}>
        <SeletorDaCasca
          valor={filtros.telefone ?? ""}
          opcoes={OPCOES_DE_TELEFONE.map((o) => ({ valor: o, rotulo: t(ROTULO_DO_TELEFONE[o]) }))}
          aoMudar={(v) => aoMudar({ ...filtros, telefone: v || undefined })}
          vazio={t("Com/Sem Telefone")}
          aria-label={t("Telefone")}
        />
      </GrupoDoFiltro>
    </>
  );
}
```

- [ ] **Step 4: Negócio**

Create `components/escale/contatos/filtros/SecaoNegocioDoFiltro.tsx`:

```tsx
"use client";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  DONO_COM,
  DONO_SEM,
  ROTULO_DO_STATUS,
  STATUS_DO_FILTRO,
  type FiltrosDeContatos,
  type NegocioDoFiltro,
  type StatusDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { agentOwnerFilter } from "@/lib/kanban/filters";

import { GrupoDoFiltro } from "./PecasDoFiltro";

/**
 * Seção Negócio (Clint `index-A38akjUb`): todos os critérios valem para o MESMO
 * negócio. A etapa só liga com origem escolhida; escolher motivo de perda põe o
 * status em Perdido, como a Clint.
 */
export function SecaoNegocioDoFiltro({
  filtros,
  aoMudar,
  opcoes,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  opcoes: OpcoesDoFiltro;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const agentes = useAssignableAgents(true);
  const n: NegocioDoFiltro = filtros.negocio ?? {};
  const mudar = (parte: NegocioDoFiltro) => aoMudar({ ...filtros, negocio: { ...n, ...parte } });
  const origensEscolhidas = n.origens ?? [];
  const variasOrigens = origensEscolhidas.length > 1;
  const etapas = opcoes.origens
    .filter((o) => origensEscolhidas.includes(o.id))
    .flatMap((o) => o.etapas.map((e) => ({ valor: e.id, rotulo: variasOrigens ? `${o.nome} › ${e.nome}` : e.nome })));
  const donos = [
    { valor: DONO_SEM, rotulo: t("Sem dono") },
    { valor: DONO_COM, rotulo: t("Todos os donos") },
    ...(membros.data ?? []).map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? t("Sem nome") })),
    ...(agentes.data ?? []).map((a) => ({ valor: agentOwnerFilter(a.agent_id), rotulo: a.name })),
  ];

  return (
    <>
      <GrupoDoFiltro rotulo={t("Com/Sem negócio")}>
        <SeletorDaCasca
          valor={n.tem ?? ""}
          opcoes={[
            { valor: "com", rotulo: t("Com negócio") },
            { valor: "sem", rotulo: t("Sem negócio") },
          ]}
          aoMudar={(v) => mudar({ tem: v || undefined })}
          vazio={t("Com/Sem negócio")}
          aria-label={t("Com/Sem negócio")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Origens")}>
        <SeletorMultiploDaCasca
          valores={origensEscolhidas}
          opcoes={opcoes.origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(origens) =>
            mudar({
              origens,
              etapas: (n.etapas ?? []).filter((id) =>
                opcoes.origens.some((o) => origens.includes(o.id) && o.etapas.some((e) => e.id === id)),
              ),
            })
          }
          aria-label={t("Origens")}
          vazio={t("Com negócio em origens")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Etapa")}>
        <SeletorMultiploDaCasca
          valores={n.etapas ?? []}
          opcoes={etapas}
          aoMudar={(v) => mudar({ etapas: v })}
          aria-label={t("Etapa")}
          vazio={t("Com negócio em etapa")}
          desabilitado={origensEscolhidas.length === 0}
          dica={t("Escolha uma origem antes")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Status")}>
        <SeletorMultiploDaCasca
          valores={n.status ?? []}
          opcoes={STATUS_DO_FILTRO.map((s) => ({ valor: s, rotulo: t(ROTULO_DO_STATUS[s]) }))}
          aoMudar={(v) => mudar({ status: v as StatusDoFiltro[] })}
          aria-label={t("Status")}
          vazio={t("Com negócio em status")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Dono do negócio")}>
        <SeletorMultiploDaCasca
          valores={n.donos ?? []}
          opcoes={donos}
          aoMudar={(v) => mudar({ donos: v })}
          aria-label={t("Dono do negócio")}
          vazio={t("Com/Sem dono do negócio")}
        />
      </GrupoDoFiltro>
      <GrupoDoFiltro rotulo={t("Motivo de perda")}>
        <SeletorMultiploDaCasca
          valores={n.motivos ?? []}
          opcoes={opcoes.motivos.map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) }))}
          aoMudar={(v) => mudar({ motivos: v, ...(v.length > 0 ? { status: ["lost"] as StatusDoFiltro[] } : {}) })}
          aria-label={t("Motivo de perda")}
          vazio={t("Motivo de Perda")}
        />
      </GrupoDoFiltro>
    </>
  );
}
```

Confira antes de rodar: o tipo de `useAssignableAgents` traz `agent_id` e `name` (a 1D usa os dois em `components/escale/filtros/SecaoDono.tsx`, L47). O teste espera `{ negocio: { origens: [O1], etapas: [] } }`: o componente manda `etapas: []` junto, e é o `enxugarFiltros` da URL que tira o vazio.

- [ ] **Step 5: Tags**

Create `components/escale/contatos/filtros/SecaoTagsDoFiltro.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DA_OP_DE_TAG,
  type CondicaoDeTag,
  type FiltrosDeContatos,
  type GrupoDeTags,
} from "@/lib/escale/contatos/filtros";
import { Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BotaoVoltar, GruposDoFiltro, OpcaoDeRadio, Pilula } from "./PecasDoFiltro";

/**
 * O SELETOR DE UMA CONDIÇÃO DE TAG (Clint `TagFilterBuilder`; prints 2b-16 e 2b-17):
 * "Buscar por...", as pílulas "Qualquer tag" e "Sem tag" (aplicam na hora) e a
 * lista de tags; escolhida a tag, "← Voltar", o chip, "Possui a tag" (já marcado)
 * ou "Não possui a tag" e "Aplicar" embaixo à esquerda.
 */
function SeletorDeTag({ aoEscolher }: { aoEscolher: (c: CondicaoDeTag) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null);
  const [busca, setBusca] = useState("");
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [op, setOp] = useState<"possui" | "nao_possui">("possui");
  const termo = busca.trim().toLowerCase();
  const opcoes = (vocabulario.data ?? []).filter((tg) => tg.toLowerCase().includes(termo)).slice(0, 50);

  if (escolhida) {
    return (
      <div role="region" aria-label={t("Escolher tag")} className="space-y-3 p-3">
        <BotaoVoltar onClick={() => setEscolhida(null)} />
        <div>
          <ChipDaTag tag={escolhida} />
        </div>
        <div role="radiogroup" aria-label={t("Condição da tag")}>
          {(["possui", "nao_possui"] as const).map((o) => (
            <OpcaoDeRadio key={o} marcada={op === o} onClick={() => setOp(o)}>
              {t(ROTULO_DA_OP_DE_TAG[o])}
            </OpcaoDeRadio>
          ))}
        </div>
        <BotaoDaCasca type="button" variante="marca" tamanho="sm" onClick={() => aoEscolher({ op, tag: escolhida })}>
          {t("Aplicar")}
        </BotaoDaCasca>
      </div>
    );
  }

  return (
    <div role="region" aria-label={t("Escolher tag")} className="space-y-2 p-2">
      <label className="relative block">
        <input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar por...")}
          aria-label={t("Buscar tag")}
          className={cn(CLASSE_DO_CAMPO, "pr-8")}
        />
        <Search
          size={14}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
        />
      </label>
      <div className="flex gap-2 px-1">
        <Pilula ativa={false} onClick={() => aoEscolher({ op: "qualquer" })}>
          {t("Qualquer tag")}
        </Pilula>
        <Pilula ativa={false} onClick={() => aoEscolher({ op: "sem" })}>
          {t("Sem tag")}
        </Pilula>
      </div>
      {vocabulario.isLoading ? (
        <p className="px-1 text-[12px] text-casca-suave">{t("Buscando tags...")}</p>
      ) : opcoes.length === 0 ? (
        <p className="px-1 text-[12px] text-casca-suave">{t("Nenhuma tag correspondente")}</p>
      ) : (
        <ul className="max-h-48 overflow-y-auto">
          {opcoes.map((tg) => (
            <li key={tg}>
              <button
                type="button"
                aria-label={tg}
                onClick={() => {
                  setEscolhida(tg);
                  setOp("possui");
                }}
                className={CLASSE_DA_LINHA_DO_MENU}
              >
                <ChipDaTag tag={tg} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** A condição no cartão do grupo: "Possui a tag [chip]", "Qualquer tag" (print 2b-18). */
function TextoDaCondicaoDeTag({ c }: { c: CondicaoDeTag }) {
  const t = useT();
  return (
    <>
      <span>{t(ROTULO_DA_OP_DE_TAG[c.op])}</span>
      {c.op === "possui" || c.op === "nao_possui" ? <ChipDaTag tag={c.tag} /> : null}
    </>
  );
}

/**
 * Seção Tags (Clint `TagFilterBuilder`; prints 2b-15 a 2b-20): grupos de condições,
 * como os Campos. Dentro do grupo, E ou OU; entre grupos, "combinar grupos por".
 */
export function SecaoTagsDoFiltro({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
}) {
  const grupos: GrupoDeTags[] = filtros.tags?.grupos ?? [];
  return (
    <GruposDoFiltro
      grupos={grupos}
      combinar={filtros.tags?.combinar ?? "ou"}
      aoMudar={(novos, combinar) =>
        aoMudar({
          ...filtros,
          tags:
            novos.length > 0
              ? { combinar, grupos: novos.map((g) => ({ modo: g.modo, condicoes: [...g.condicoes] })) }
              : undefined,
        })
      }
      textoDaCondicao={(c: CondicaoDeTag) => <TextoDaCondicaoDeTag c={c} />}
      seletor={(aoEscolher) => <SeletorDeTag aoEscolher={aoEscolher} />}
    />
  );
}
```

- [ ] **Step 6: Campos**

Create `components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DO_CONTATO_DO_FILTRO,
  CONTEM_MAX,
  ROTULO_DO_OPERADOR,
  contarContem,
  operadoresDoTipo,
  precisaDeValor,
  type CampoDoFiltro,
  type CondicaoDoFiltro,
  type FiltrosDeContatos,
  type GrupoDoFiltro,
  type Operador,
} from "@/lib/escale/contatos/filtros";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataBrDoIso, isoDaDataBr } from "@/lib/escale/filtros/periodo";
import { ChevronDown, ChevronRight, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BotaoVoltar, GruposDoFiltro, OpcaoDeRadio } from "./PecasDoFiltro";

type Traduzir = (texto: string) => string;

/** O valor digitado → o valor guardado (número com ponto, data ISO), ou null se não vale. */
function valorDigitado(campo: CampoDoFiltro, texto: string): string | null {
  const limpo = texto.trim();
  if (!limpo) return null;
  if (campo.tipo === "numero") {
    const n = numeroDoValor(limpo);
    return n === null ? null : String(n);
  }
  if (campo.tipo === "data") return isoDaDataBr(limpo);
  return limpo;
}

function valorLegivel(c: CondicaoDoFiltro, campo: CampoDoFiltro | undefined, t: Traduzir): string {
  const v = c.valor ?? "";
  if (c.tipo === "data") return dataBrDoIso(v);
  if (c.tipo === "booleano") return v === "true" ? t("Sim") : t("Não");
  if (c.tipo === "numero") return Number(v).toLocaleString("pt-BR");
  const opcao = campo?.opcoes?.find((o) => o.value === v);
  return opcao ? opcao.label : `"${v}"`;
}

function ValorDaCondicao({
  campo,
  texto,
  aoMudar,
}: {
  campo: CampoDoFiltro;
  texto: string;
  aoMudar: (texto: string) => void;
}) {
  const t = useT();
  if (campo.tipo === "booleano") {
    return (
      <SeletorDaCasca
        valor={texto}
        opcoes={[
          { valor: "true", rotulo: t("Sim") },
          { valor: "false", rotulo: t("Não") },
        ]}
        aoMudar={aoMudar}
        vazio={t("Selecione...")}
        aria-label={t("Valor")}
      />
    );
  }
  if ((campo.tipo === "opcao" || campo.tipo === "opcoes") && campo.opcoes?.length) {
    return (
      <SeletorDaCasca
        valor={texto}
        opcoes={campo.opcoes.map((o) => ({ valor: o.value, rotulo: o.label }))}
        aoMudar={aoMudar}
        vazio={t("Selecione...")}
        aria-label={t("Valor")}
      />
    );
  }
  const dica =
    campo.tipo === "data" ? t("DD/MM/AAAA") : campo.tipo === "numero" ? t("Digite o valor") : t("Digite o texto a buscar");
  return (
    <input
      value={texto}
      onChange={(e) => aoMudar(e.target.value)}
      placeholder={dica}
      aria-label={t("Valor")}
      inputMode={campo.tipo === "numero" ? "decimal" : undefined}
      className={CLASSE_DO_CAMPO}
    />
  );
}

type GrupoDoSeletor = "contato" | "negocio" | "empresa";
const GRUPOS_DO_SELETOR: ReadonlyArray<{ chave: GrupoDoSeletor; rotulo: string }> = [
  { chave: "contato", rotulo: "Contato" },
  { chave: "negocio", rotulo: "Negócio" },
  { chave: "empresa", rotulo: "Empresa" },
];

/**
 * O SELETOR DE CAMPO (Clint `FieldFilterBuilder`; prints 2b-21 a 2b-23): a busca e
 * os grupos "Contato", "Negócio" e "Empresa", que abrem e fecham pelo chevron (a
 * busca abre os que acharam algo). "Empresa" fica desligado com "Em breve" até a 2D
 * (N19). Escolhido o campo: "← Voltar", o grupo e o campo, os operadores em rádio
 * com o valor logo abaixo do marcado (o primeiro do tipo já vem marcado: "Contém"
 * no texto) e "Aplicar" embaixo à esquerda.
 */
function SeletorDeCampo({
  campos,
  contemBloqueado,
  aoEscolher,
}: {
  campos: readonly CampoDoFiltro[];
  contemBloqueado: boolean;
  aoEscolher: (c: CondicaoDoFiltro) => void;
}) {
  const t = useT();
  const [campo, setCampo] = useState<CampoDoFiltro | null>(null);
  const [busca, setBusca] = useState("");
  const [abertos, setAbertos] = useState<ReadonlySet<GrupoDoSeletor>>(new Set());
  const [op, setOp] = useState<Operador | null>(null);
  const [texto, setTexto] = useState("");

  const operadores = (c: CampoDoFiltro) =>
    operadoresDoTipo(c.tipo).filter((o) => !(contemBloqueado && (o === "contem" || o === "nao_contem")));

  function escolherCampo(c: CampoDoFiltro) {
    setCampo(c);
    setOp(operadores(c)[0] ?? null);
    setTexto("");
  }

  function alternar(g: GrupoDoSeletor) {
    setAbertos((atual) => {
      const novo = new Set(atual);
      if (novo.has(g)) novo.delete(g);
      else novo.add(g);
      return novo;
    });
  }

  if (!campo) {
    const termo = busca.trim().toLowerCase();
    const achados = campos.filter((c) => t(c.rotulo).toLowerCase().includes(termo));
    return (
      <div role="region" aria-label={t("Escolher campo")} className="p-2">
        <label className="relative block">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por...")}
            aria-label={t("Buscar campo")}
            className={cn(CLASSE_DO_CAMPO, "pr-8")}
          />
          <Search
            size={14}
            aria-hidden
            className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave"
          />
        </label>
        {termo && achados.length === 0 ? (
          <p className="px-1 pt-2 text-[12px] text-casca-suave">{t("Nenhum campo encontrado")}</p>
        ) : (
          <div className="mt-1 max-h-64 overflow-y-auto">
            {GRUPOS_DO_SELETOR.map((g) => {
              const doGrupo = achados.filter((c) => c.alvo === g.chave);
              if (termo && doGrupo.length === 0) return null;
              const emBreve = g.chave === "empresa";
              const aberto = !emBreve && (abertos.has(g.chave) || (termo !== "" && doGrupo.length > 0));
              return (
                <div key={g.chave} className="border-b border-casca-borda last:border-b-0">
                  <button
                    type="button"
                    aria-expanded={aberto}
                    disabled={emBreve}
                    title={emBreve ? t("Em breve") : undefined}
                    onClick={() => alternar(g.chave)}
                    className="flex h-9 w-full items-center gap-2 px-2 text-left text-[13px] font-semibold text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:text-casca-meta"
                  >
                    {aberto ? <ChevronDown size={14} aria-hidden /> : <ChevronRight size={14} aria-hidden />}
                    {t(g.rotulo)}
                  </button>
                  {aberto ? (
                    <div className="pb-1">
                      {doGrupo.map((c) => (
                        <button
                          key={c.chave}
                          type="button"
                          onClick={() => escolherCampo(c)}
                          className={cn(CLASSE_DA_LINHA_DO_MENU, "pl-7")}
                        >
                          {t(c.rotulo)}
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  const valor = valorDigitado(campo, texto);
  const pode = op !== null && (!precisaDeValor(op) || valor !== null);
  return (
    <div role="region" aria-label={t("Escolher campo")} className="space-y-3 p-3">
      <BotaoVoltar onClick={() => setCampo(null)} />
      <div>
        <p className="text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase">
          {campo.alvo === "contato" ? t("Contato") : t("Negócio")}
        </p>
        <p className="text-[13px] font-semibold text-casca-texto">{t(campo.rotulo)}</p>
      </div>
      <div role="radiogroup" aria-label={t("Operador")} className="max-h-56 space-y-0.5 overflow-y-auto">
        {operadores(campo).map((o) => (
          <div key={o}>
            <OpcaoDeRadio marcada={op === o} onClick={() => setOp(o)}>
              {t(ROTULO_DO_OPERADOR[o])}
            </OpcaoDeRadio>
            {op === o && precisaDeValor(o) ? (
              <div className="pb-1 pl-6">
                <ValorDaCondicao campo={campo} texto={texto} aoMudar={setTexto} />
              </div>
            ) : null}
          </div>
        ))}
      </div>
      <BotaoDaCasca
        type="button"
        variante="marca"
        tamanho="sm"
        disabled={!pode}
        title={pode ? undefined : t("Escolha o operador e o valor.")}
        onClick={() => {
          if (!op) return;
          aoEscolher({
            alvo: campo.alvo,
            chave: campo.chave,
            tipo: campo.tipo,
            op,
            ...(precisaDeValor(op) && valor !== null ? { valor } : {}),
          });
        }}
      >
        {t("Aplicar")}
      </BotaoDaCasca>
    </div>
  );
}

/**
 * Seção Campos (Clint `FieldFilterBuilder`; prints 2b-21 a 2b-23): os mesmos grupos
 * da seção Tags (`GruposDoFiltro`), com o seletor de campo e o limite de 10
 * "contém / não contém" por filtro.
 */
export function SecaoCamposDoFiltro({
  filtros,
  aoMudar,
  camposDoNegocio,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  camposDoNegocio: readonly CampoDoFiltro[];
}) {
  const t = useT();
  const grupos: GrupoDoFiltro[] = filtros.campos?.grupos ?? [];
  const todos = [...CAMPOS_DO_CONTATO_DO_FILTRO, ...camposDoNegocio];
  const noLimite = contarContem(filtros) >= CONTEM_MAX;

  return (
    <div className="space-y-3">
      <GruposDoFiltro
        grupos={grupos}
        combinar={filtros.campos?.combinar ?? "ou"}
        aoMudar={(novos, combinar) =>
          aoMudar({
            ...filtros,
            campos:
              novos.length > 0
                ? { combinar, grupos: novos.map((g) => ({ modo: g.modo, condicoes: [...g.condicoes] })) }
                : undefined,
          })
        }
        textoDaCondicao={(c: CondicaoDoFiltro) => {
          const campo = todos.find((x) => x.alvo === c.alvo && x.chave === c.chave);
          return (
            <span className="min-w-0 truncate">
              <span className="font-medium">{campo ? t(campo.rotulo) : c.chave}</span>{" "}
              {t(ROTULO_DO_OPERADOR[c.op]).toLowerCase()}
              {precisaDeValor(c.op) ? ` ${valorLegivel(c, campo, t)}` : ""}
            </span>
          );
        }}
        seletor={(aoEscolher) => (
          <SeletorDeCampo campos={todos} contemBloqueado={noLimite} aoEscolher={aoEscolher} />
        )}
      />
      {noLimite ? (
        <p className="text-[11px] text-casca-alerta">
          {t(
            "Limite de {max} condições contém / não contém atingido neste filtro. Use Igual, ou remova uma condição para liberar.",
          ).replace("{max}", String(CONTEM_MAX))}
        </p>
      ) : null}
    </div>
  );
}
```

Repare: os nomes dos grupos do seletor ("Contato", "Negócio") são os mesmos dos cabeçalhos das seções do painel; por isso o teste procura dentro da região "Escolher campo". `ChevronRight` e `Search` já saem de `lib/ui/icons-da-casca.ts`.

- [ ] **Step 7: O painel**

Create `components/escale/contatos/filtros/PainelDeFiltros.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  SECOES_DO_FILTRO,
  contarNaSecao,
  limparSecao,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { Briefcase, ChevronDown, ChevronLeft, ChevronUp, ListChecks, Tag, User, X } from "@/lib/ui/icons-da-casca";

import { SecaoCamposDoFiltro } from "./SecaoCamposDoFiltro";
import { SecaoContatoDoFiltro } from "./SecaoContatoDoFiltro";
import { SecaoNegocioDoFiltro } from "./SecaoNegocioDoFiltro";
import { SecaoTagsDoFiltro } from "./SecaoTagsDoFiltro";

const TITULO: Record<SecaoDoFiltro, string> = {
  contato: "Contato",
  negocio: "Negócio",
  tags: "Tags",
  campos: "Campos",
};
const ICONE = { contato: User, negocio: Briefcase, tags: Tag, campos: ListChecks } as const;

/**
 * O PAINEL DE FILTROS DA LISTA DE CONTATOS (fork Escale, Fase 2B; Clint
 * `FilterPopover` + `FilterSections`; prints 2b-05 a 2b-23): acordeão com as seções
 * Contato, Negócio, Tags e Campos; cada uma com o selo da contagem e o × que
 * limpa só ela. Com `foco`, só aquela seção e o link "Todos os filtros" (é como
 * o chip da faixa abre o painel). O rodapé ("Salvar filtro", "Resetar") vem de
 * fora e só aparece sem foco. Aplica na hora: cada mudança chama `aoMudar`.
 */
export function PainelDeFiltros({
  filtros,
  aoMudar,
  opcoes,
  foco,
  aoMudarFoco,
  rodape,
}: {
  filtros: FiltrosDeContatos;
  aoMudar: (f: FiltrosDeContatos) => void;
  opcoes: OpcoesDoFiltro;
  foco: SecaoDoFiltro | null;
  aoMudarFoco: (s: SecaoDoFiltro | null) => void;
  rodape?: ReactNode;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<SecaoDoFiltro | null>(
    foco ?? SECOES_DO_FILTRO.find((s) => contarNaSecao(filtros, s) > 0) ?? null,
  );
  const secoes = foco ? [foco] : SECOES_DO_FILTRO;

  const conteudo = (s: SecaoDoFiltro) => {
    if (s === "contato") return <SecaoContatoDoFiltro filtros={filtros} aoMudar={aoMudar} />;
    if (s === "negocio") return <SecaoNegocioDoFiltro filtros={filtros} aoMudar={aoMudar} opcoes={opcoes} />;
    if (s === "tags") return <SecaoTagsDoFiltro filtros={filtros} aoMudar={aoMudar} />;
    return <SecaoCamposDoFiltro filtros={filtros} aoMudar={aoMudar} camposDoNegocio={opcoes.camposDoNegocio} />;
  };

  return (
    <div className="flex max-h-[80vh] w-[356px] flex-col">
      {foco ? (
        <button
          type="button"
          onClick={() => aoMudarFoco(null)}
          className="flex h-10 shrink-0 items-center gap-1 border-b border-casca-borda px-4 text-[12px] font-medium text-casca-marca"
        >
          <ChevronLeft size={14} aria-hidden />
          {t("Todos os filtros")}
        </button>
      ) : null}
      <div className="min-h-0 flex-1 overflow-y-auto">
        {secoes.map((s) => {
          const Icone = ICONE[s];
          const n = contarNaSecao(filtros, s);
          const estaAberta = foco !== null || aberta === s;
          return (
            <section key={s} className="border-b border-casca-borda last:border-b-0">
              <div className="flex h-14 items-center gap-2 px-5">
                <button
                  type="button"
                  aria-expanded={estaAberta}
                  onClick={() => setAberta(estaAberta ? null : s)}
                  className="flex min-w-0 flex-1 items-center gap-2 text-left text-[13px] font-medium text-casca-texto"
                >
                  <Icone size={15} aria-hidden className="text-casca-suave" />
                  {t(TITULO[s])}
                </button>
                {n > 0 ? (
                  <>
                    <span className="grid h-[18px] min-w-[18px] place-items-center rounded-[4px] bg-casca-marca-suave px-1 text-[11px] font-semibold text-casca-marca">
                      {n}
                    </span>
                    <button
                      type="button"
                      aria-label={`${t("Limpar")} ${t(TITULO[s])}`}
                      onClick={() => aoMudar(limparSecao(filtros, s))}
                      className="grid size-5 place-items-center text-casca-suave hover:text-casca-texto"
                    >
                      <X size={14} aria-hidden />
                    </button>
                  </>
                ) : null}
                {estaAberta ? (
                  <ChevronUp size={14} aria-hidden className="text-casca-suave" />
                ) : (
                  <ChevronDown size={14} aria-hidden className="text-casca-suave" />
                )}
              </div>
              {estaAberta ? <div className="space-y-4 bg-casca-raia px-5 py-5">{conteudo(s)}</div> : null}
            </section>
          );
        })}
      </div>
      {foco ? null : rodape}
    </div>
  );
}
```

Confira antes de rodar: `User`, `ChevronLeft`, `Briefcase`, `Tag` e `ListChecks` são exportados por `lib/ui/icons-da-casca.ts` (estão lá). Se algum faltar, acrescente-o no `export { … } from "lucide-react"` da linha 50.

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-filtros-de-contatos.test.tsx`
Expected: PASS. Se o `SeletorMultiploDaCasca` mostrar as opções com outro papel (não `checkbox`), ajuste a busca do teste ao papel real (`grep -n "role=" components/escale/ui/SeletorMultiploDaCasca.tsx`), sem mudar o componente.

- [ ] **Step 9: Guardas, typecheck, eslint, prettier e commit**

```bash
NOVOS="components/escale/contatos/filtros/PecasDoFiltro.tsx components/escale/contatos/filtros/PainelDeFiltros.tsx components/escale/contatos/filtros/SecaoContatoDoFiltro.tsx components/escale/contatos/filtros/SecaoNegocioDoFiltro.tsx components/escale/contatos/filtros/SecaoTagsDoFiltro.tsx components/escale/contatos/filtros/SecaoCamposDoFiltro.tsx tests/unit/escale-painel-de-filtros-de-contatos.test.tsx"
corepack pnpm vitest run tests/unit/escale-painel-de-filtros-de-contatos.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts
for f in lib/ui/icons-da-casca.ts; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u | xargs -r corepack pnpm vitest run
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS lib/ui/icons-da-casca.ts
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS lib/ui/icons-da-casca.ts
git commit -m "feat(escale): painel de filtros da lista de contatos, com Tags e Campos em grupos (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(Se `tailwind-tokens` ou `controle-decorativo` tiverem outro nome de arquivo, ache com `ls tests/unit | grep -iE "tailwind|decorativo"`.)

---

### Task 5: A faixa, o seletor de filtros salvos e a lista ligada

**Files:**
- Create: `components/escale/ui/JanelaDeConfirmacao.tsx`, `components/escale/contatos/filtros/BalaoDoFiltro.tsx`, `SeletorDeFiltros.tsx`, `FaixaDeFiltros.tsx`, `ControleDosFiltros.tsx`, `hooks/escale/useEstadoDaListaDeContatos.ts`, `tests/unit/escale-faixa-e-seletor-de-filtros.test.tsx`
- Modify: `components/escale/contatos/ListaDeContatos.tsx` (troca inteira), `lib/escale/contatos/origens-da-pagina.ts`, `app/app/contacts/page.tsx` (encaixe)

**Interfaces:**
- Consumes: Tasks 1, 3 e 4 (`PainelDeFiltros`, hooks dos salvos, `ConsultaDaTela.f`, `ROTULO_DA_OP_DE_TAG`).
- Produces:
  - `JanelaDeConfirmacao({ aberta, aoFechar, titulo?, children, rotuloDoConfirmar?, iconeDoConfirmar?, aoConfirmar, perigo?, desabilitado?, ocupado?, dica? })` — a PR B reaproveita.
  - `BalaoDoFiltro({ gatilho, aoSalvar(nome, compartilhado): Promise<string | null> })`.
  - `SeletorDeFiltros({ visao, filtros, filtroSalvoId, salvos, aoEscolherVisao, aoAplicarSalvo, aoCriarFiltro, aoRenomear, aoCompartilhar, aoExcluir })` e `rotuloDoSeletor(...)`.
  - `FaixaDeFiltros({ filtros, opcoes, aoMudar, aoAbrir, podeResetar, aoResetar, aoRecolher })`.
  - `ControleDosFiltros({ faixaAberta, quantos, aoAlternarFaixa })` — vai DENTRO do `<Popover>` do painel: com a faixa recolhida, o "Filtros" (gatilho) + ⇕; com a faixa aberta, só uma âncora invisível no mesmo lugar.
  - `useEstadoDaListaDeContatos(): { visao, pagina, busca, filtros, f, filtroSalvoId, irPara, mudarFiltros }`.
  - `ListaDeContatos({ origens, papel, opcoesDoFiltro? })`; `origensDaPagina(): { origens, papel, opcoesDoFiltro }`.

Abra antes: os prints 2b-01 a 2b-04 (a barra e o seletor), 2b-08 e 2b-09 ("Personalizado", o rodapé e o balão) e 2b-24 a 2b-26 (a faixa); o 03-001 para as medidas da barra. Detalhes: "Todos os contatos ▾" com o ícone de pessoas na cor da marca ("Personalizado" com o ícone de controles); no menu, cada visão com o seu ícone, o item ativo em fundo da marca suave com ✓, os salvos com o marcador cheio na cor da marca e o ⋮ ("Renomear" com lápis, "Excluir filtro" vermelho com lixeira), "+ Criar filtro" na cor da marca; renomear vira um campo na própria linha com ✓ e ✕; "Filtros" e ⇕ colados (88 + 35 × 32), com filtro o selo redondo com o número dentro do "Filtros"; **com a faixa aberta o "Filtros" + ⇕ some**; a faixa de 48px com chips de 30px "Título **valor** │ ×", "+ Filtro" com borda cinza, "Resetar" e o ^ quadrado à direita; sem filtro, só "+ Filtro" e o ^.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-faixa-e-seletor-de-filtros.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { ControleDosFiltros } from "@/components/escale/contatos/filtros/ControleDosFiltros";
import { FaixaDeFiltros } from "@/components/escale/contatos/filtros/FaixaDeFiltros";
import { SeletorDeFiltros, rotuloDoSeletor } from "@/components/escale/contatos/filtros/SeletorDeFiltros";
import { Popover } from "@/components/ui/popover";
import type { TagsDoFiltro } from "@/lib/escale/contatos/filtros";
import type { FiltroDaLista } from "@/lib/escale/listas/filtros-salvos";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u1", full_name: "Rafa", role: "agent" }] }),
}));
vi.mock("@/hooks/kanban/useAssignableAgents", () => ({ useAssignableAgents: () => ({ data: [] }) }));

const O1 = "11111111-1111-4111-8111-111111111111";
const OPCOES: OpcoesDoFiltro = {
  origens: [{ id: O1, nome: "Leads INSS", etapas: [] }],
  motivos: [],
  camposDoNegocio: [],
};
const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const VIP: TagsDoFiltro = { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "possui", tag: "vip" }] }] };
const SALVOS: FiltroDaLista[] = [
  { id: "f1", nome: "VIPs", compartilhado: false, meu: true, criterios: { tags: VIP } },
  { id: "f2", nome: "Da equipe", compartilhado: true, meu: false, criterios: { telefone: "sem" } },
];

describe("FaixaDeFiltros (prints 2b-24 a 2b-26)", () => {
  const props = {
    opcoes: OPCOES,
    aoMudar: vi.fn(),
    aoAbrir: vi.fn(),
    podeResetar: true,
    aoResetar: vi.fn(),
    aoRecolher: vi.fn(),
  };

  it("um chip por critério; o × tira só ele; o chip abre a seção", () => {
    envolver(<FaixaDeFiltros {...props} filtros={{ telefone: "sem", negocio: { origens: [O1] } }} />);
    expect(screen.getByText("Sem Telefone")).toBeInTheDocument();
    expect(screen.getByText("Leads INSS")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Remover filtro Telefone" }));
    expect(props.aoMudar).toHaveBeenLastCalledWith({ negocio: { origens: [O1] } });
    fireEvent.click(screen.getByText("Sem Telefone"));
    expect(props.aoAbrir).toHaveBeenLastCalledWith("contato");
    fireEvent.click(screen.getByRole("button", { name: "Filtro" }));
    expect(props.aoAbrir).toHaveBeenLastCalledWith(null);
    fireEvent.click(screen.getByRole("button", { name: "Resetar" }));
    expect(props.aoResetar).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Recolher filtros" }));
    expect(props.aoRecolher).toHaveBeenCalled();
  });

  it("o chip de Tags conta as condições dos grupos ('Tags 2 tags', print 2b-25)", () => {
    envolver(
      <FaixaDeFiltros
        {...props}
        filtros={{
          tags: {
            combinar: "ou",
            grupos: [
              { modo: "e", condicoes: [{ op: "possui", tag: "vip" }] },
              { modo: "e", condicoes: [{ op: "possui", tag: "frio" }] },
            ],
          },
        }}
      />,
    );
    expect(screen.getByText("2 tags")).toBeInTheDocument();
  });

  it("mais de 6 chips: os 6 primeiros e '+N'", () => {
    envolver(
      <FaixaDeFiltros
        {...props}
        filtros={{
          criadoEm: { de: "2026-10-01" },
          telefone: "com",
          negocio: { tem: "com", origens: [O1], status: ["open"], donos: ["u1"], motivos: ["price"] },
          tags: { combinar: "ou", grupos: [{ modo: "e", condicoes: [{ op: "sem" }] }] },
        }}
      />,
    );
    expect(screen.getByRole("button", { name: "+2" })).toBeInTheDocument();
  });

  it("sem filtro: só '+ Filtro' e o ^ (print 2b-26)", () => {
    envolver(<FaixaDeFiltros {...props} podeResetar={false} filtros={{}} />);
    expect(screen.getByRole("button", { name: "Filtro" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Recolher filtros" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Resetar" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Remover filtro/ })).not.toBeInTheDocument();
  });
});

describe("ControleDosFiltros (prints 2b-01 e 2b-24)", () => {
  it("faixa recolhida: 'Filtros' com o selo e o ⇕; faixa aberta: o par some", () => {
    const aoAlternarFaixa = vi.fn();
    const { rerender } = render(
      <Popover>
        <ControleDosFiltros faixaAberta={false} quantos={2} aoAlternarFaixa={aoAlternarFaixa} />
      </Popover>,
    );
    expect(screen.getByRole("button", { name: /Filtros/ })).toHaveTextContent("2");
    fireEvent.click(screen.getByRole("button", { name: "Expandir filtros" }));
    expect(aoAlternarFaixa).toHaveBeenCalled();
    rerender(
      <Popover>
        <ControleDosFiltros faixaAberta quantos={2} aoAlternarFaixa={aoAlternarFaixa} />
      </Popover>,
    );
    expect(screen.queryByRole("button", { name: /Filtros/ })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Expandir filtros" })).not.toBeInTheDocument();
  });
});

describe("rotuloDoSeletor (Clint `usePresetDirtySync`)", () => {
  it("visão sem filtro; 'Personalizado' com filtro; o nome do salvo enquanto bate", () => {
    expect(rotuloDoSeletor({ visao: "todos", filtros: {}, filtroSalvoId: null, salvos: SALVOS })).toEqual({ tipo: "visao", visao: "todos" });
    expect(rotuloDoSeletor({ visao: "todos", filtros: { telefone: "com" }, filtroSalvoId: null, salvos: SALVOS })).toEqual({ tipo: "personalizado" });
    expect(rotuloDoSeletor({ visao: "todos", filtros: { tags: VIP }, filtroSalvoId: "f1", salvos: SALVOS })).toEqual({ tipo: "salvo", id: "f1", nome: "VIPs" });
    expect(rotuloDoSeletor({ visao: "todos", filtros: { telefone: "com" }, filtroSalvoId: "f1", salvos: SALVOS })).toEqual({ tipo: "personalizado" });
  });
});

describe("SeletorDeFiltros (prints 2b-02 a 2b-04)", () => {
  const props = {
    visao: "todos" as const,
    filtros: {},
    filtroSalvoId: null,
    salvos: SALVOS,
    aoEscolherVisao: vi.fn(),
    aoCompartilhar: vi.fn(),
    aoExcluir: vi.fn(),
  };

  it("Padrão, Meus filtros, Compartilhados e Criar filtro", async () => {
    const user = userEvent.setup();
    const aoAplicarSalvo = vi.fn();
    const aoCriarFiltro = vi.fn();
    envolver(
      <SeletorDeFiltros {...props} aoAplicarSalvo={aoAplicarSalvo} aoCriarFiltro={aoCriarFiltro} aoRenomear={vi.fn()} />,
    );
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    expect(screen.getByText("Padrão")).toBeInTheDocument();
    expect(screen.getByText("Meus filtros")).toBeInTheDocument();
    expect(screen.getByText("Compartilhados")).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Da equipe" }));
    expect(aoAplicarSalvo).toHaveBeenCalledWith(SALVOS[1]);
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    await user.click(screen.getByRole("menuitem", { name: "Criar filtro" }));
    expect(aoCriarFiltro).toHaveBeenCalled();
  });

  it("o ⋮ do salvo: 'Renomear' vira um campo na própria linha, com ✓ e ✕", async () => {
    const user = userEvent.setup();
    const aoRenomear = vi.fn(async () => null);
    envolver(<SeletorDeFiltros {...props} aoAplicarSalvo={vi.fn()} aoCriarFiltro={vi.fn()} aoRenomear={aoRenomear} />);
    await user.click(screen.getByRole("button", { name: /Todos os contatos/ }));
    await user.click(screen.getByRole("menuitem", { name: "Ações VIPs" }));
    expect(screen.getByRole("menuitem", { name: "Excluir filtro" })).toBeInTheDocument();
    await user.click(screen.getByRole("menuitem", { name: "Renomear" }));
    const campo = screen.getByRole("textbox", { name: "Nome do filtro" });
    expect(campo).toHaveValue("VIPs");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await user.clear(campo);
    await user.type(campo, "Clientes VIP");
    await user.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(aoRenomear).toHaveBeenCalledWith("f1", "Clientes VIP");
    expect(screen.queryByRole("textbox", { name: "Nome do filtro" })).not.toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-faixa-e-seletor-de-filtros.test.tsx`
Expected: FAIL.

- [ ] **Step 2: A janela de confirmação da casca**

Create `components/escale/ui/JanelaDeConfirmacao.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * "CONFIRME SUA AÇÃO" DA CLINT (v2-03; fork Escale, Fase 2B): título 16px/500 e X
 * numa faixa de 56px, o texto em 13px, e o rodapé com "Cancelar" (contorno) e o
 * botão de confirmar (na cor da marca, ou vermelho quando `perigo`). A mesma
 * janela que `ExportarCards` (1E) monta por dentro, agora reaproveitável.
 */
export function JanelaDeConfirmacao({
  aberta,
  aoFechar,
  titulo,
  children,
  rotuloDoConfirmar,
  iconeDoConfirmar,
  aoConfirmar,
  perigo = false,
  desabilitado = false,
  ocupado = false,
  dica,
}: {
  aberta: boolean;
  aoFechar: () => void;
  titulo?: string;
  children: ReactNode;
  rotuloDoConfirmar?: string;
  /** Ícone depois do rótulo (a lixeira do "Apagar Contatos", print 2b-38). */
  iconeDoConfirmar?: ReactNode;
  aoConfirmar: () => void;
  perigo?: boolean;
  desabilitado?: boolean;
  ocupado?: boolean;
  /** Por que o confirmar está desligado (o `title`). */
  dica?: string;
}) {
  const t = useT();
  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !a && !ocupado && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content className="fixed top-[50%] left-[50%] z-50 w-[min(576px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] rounded-[8px] bg-surface text-casca-texto shadow-casca-painel">
          <div className="flex h-14 items-center justify-between border-b border-casca-borda px-5">
            <DialogTitle className="text-base font-medium">{titulo ?? t("Confirme sua ação")}</DialogTitle>
            <DialogPrimitive.Close
              aria-label={t("Fechar")}
              className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <DialogPrimitive.Description asChild>
            <div className="space-y-3 px-6 py-6 text-[13px] text-casca-suave">{children}</div>
          </DialogPrimitive.Description>
          <div className="flex justify-end gap-3 border-t border-casca-borda px-3 py-3">
            <button
              type="button"
              onClick={aoFechar}
              disabled={ocupado}
              title={ocupado ? t("Aguarde…") : undefined}
              className="h-8 rounded-[6px] border border-casca-borda px-4 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={aoConfirmar}
              disabled={desabilitado || ocupado}
              title={desabilitado ? dica : ocupado ? t("Aguarde…") : undefined}
              className={cn(
                "inline-flex h-8 items-center gap-1.5 rounded-[6px] px-4 text-[13px] font-medium text-white disabled:cursor-not-allowed disabled:opacity-50",
                perigo ? "bg-casca-alerta hover:brightness-95" : "bg-casca-marca hover:bg-casca-marca-forte",
              )}
            >
              {rotuloDoConfirmar ?? t("Confirmar")}
              {iconeDoConfirmar}
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

- [ ] **Step 3: O balão "Salvar filtro"**

Create `components/escale/contatos/filtros/BalaoDoFiltro.tsx`:

```tsx
"use client";
import { useState, type ReactElement } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";

/**
 * "SALVAR FILTRO" DA CLINT (`SaveFilterPopover`): "Nome do filtro", "Ex: Clientes
 * em aberto", "Cancelar" e "Salvar"; Enter salva, Esc cancela. A caixinha
 * "Compartilhar com a equipe" é nossa (PRD B2, Q2). `aoSalvar` devolve a
 * mensagem do problema, ou null quando deu certo.
 */
export function BalaoDoFiltro({
  gatilho,
  aoSalvar,
}: {
  gatilho: ReactElement;
  aoSalvar: (nome: string, compartilhado: boolean) => Promise<string | null>;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [compartilhado, setCompartilhado] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  function mudarAberto(v: boolean) {
    setAberto(v);
    if (!v) {
      setNome("");
      setCompartilhado(false);
      setErro(null);
    }
  }

  async function salvar() {
    if (!nome.trim() || salvando) return;
    setSalvando(true);
    const problema = await aoSalvar(nome, compartilhado);
    setSalvando(false);
    if (problema) return setErro(problema);
    mudarAberto(false);
  }

  return (
    <Popover open={aberto} onOpenChange={mudarAberto}>
      <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
      <PainelSuspenso align="start" className="w-72 space-y-3 p-4">
        <label className="grid gap-1.5">
          <span className="text-[12px] font-medium text-casca-texto">{t("Nome do filtro")}</span>
          <CampoDeTexto
            value={nome}
            maxLength={60}
            placeholder={t("Ex: Clientes em aberto")}
            onChange={(e) => {
              setNome(e.target.value);
              setErro(null);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                void salvar();
              }
              if (e.key === "Escape") mudarAberto(false);
            }}
            className="h-8 px-3"
          />
        </label>
        <CaixaDaCasca marcada={compartilhado} aoMudar={setCompartilhado} rotulo={t("Compartilhar com a equipe")} />
        {erro ? (
          <p role="alert" className="text-[12px] text-casca-alerta">
            {erro}
          </p>
        ) : null}
        <div className="flex justify-end gap-2">
          <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={() => mudarAberto(false)}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca
            type="button"
            variante="marca"
            tamanho="sm"
            disabled={!nome.trim() || salvando}
            title={!nome.trim() ? t("Dê um nome ao filtro.") : salvando ? t("Aguarde…") : undefined}
            onClick={() => void salvar()}
          >
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 4: O seletor de filtros (o "Todos os contatos" da 2A)**

Create `components/escale/contatos/filtros/SeletorDeFiltros.tsx`:

```tsx
"use client";
import { useState, type KeyboardEvent } from "react";

import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { mesmosFiltros, temFiltros, type FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import { ROTULO_DA_VISAO, VISOES_DE_CONTATOS, type VisaoDeContatos } from "@/lib/escale/contatos/regras";
import type { FiltroDaLista } from "@/lib/escale/listas/filtros-salvos";
import {
  Bookmark,
  Briefcase,
  Check,
  ChevronDown,
  EllipsisVertical,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  User,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const ROTULO_DO_GRUPO = "px-3 pt-2 pb-1 text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase";
const ATIVO = "bg-casca-marca-suave text-casca-marca";

/** O ícone de cada visão (print 2b-02): pessoas, maleta, pessoa com ×; "Pessoais" (do original) com uma pessoa. */
const ICONE_DA_VISAO: Record<VisaoDeContatos, LucideIcon> = {
  todos: Users,
  com_negocio: Briefcase,
  sem_negocio: UserX,
  pessoais: User,
};

export type RotuloDoSeletor =
  | { tipo: "visao"; visao: VisaoDeContatos }
  | { tipo: "salvo"; id: string; nome: string }
  | { tipo: "personalizado" };

/** O que o seletor mostra (Clint `usePresetDirtySync`): o salvo enquanto os critérios batem; senão "Personalizado"; sem filtro, a visão. */
export function rotuloDoSeletor({
  visao,
  filtros,
  filtroSalvoId,
  salvos,
}: {
  visao: VisaoDeContatos;
  filtros: FiltrosDeContatos;
  filtroSalvoId: string | null;
  salvos: readonly FiltroDaLista[];
}): RotuloDoSeletor {
  const salvo = salvos.find((s) => s.id === filtroSalvoId);
  if (salvo && mesmosFiltros(salvo.criterios, filtros)) return { tipo: "salvo", id: salvo.id, nome: salvo.nome };
  if (temFiltros(filtros)) return { tipo: "personalizado" };
  return { tipo: "visao", visao };
}

/**
 * O SELETOR DE FILTROS (Clint `index-BH0q213O` + `useFilterPresets`; prints 2b-02 a
 * 2b-04): "Padrão" (as visões prontas), "Meus filtros" (com ⋮: "Renomear", que vira
 * um campo na própria linha com ✓ e ✕, o nosso "Compartilhar com a equipe" e
 * "Excluir filtro"), "Compartilhados" (os das outras pessoas, Q2) e "Criar filtro".
 */
export function SeletorDeFiltros({
  visao,
  filtros,
  filtroSalvoId,
  salvos,
  aoEscolherVisao,
  aoAplicarSalvo,
  aoCriarFiltro,
  aoRenomear,
  aoCompartilhar,
  aoExcluir,
}: {
  visao: VisaoDeContatos;
  filtros: FiltrosDeContatos;
  filtroSalvoId: string | null;
  salvos: readonly FiltroDaLista[];
  aoEscolherVisao: (v: VisaoDeContatos) => void;
  aoAplicarSalvo: (f: FiltroDaLista) => void;
  aoCriarFiltro: () => void;
  aoRenomear: (id: string, nome: string) => Promise<string | null>;
  aoCompartilhar: (id: string, compartilhado: boolean) => void;
  aoExcluir: (id: string) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [renomeando, setRenomeando] = useState<string | null>(null);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [excluindo, setExcluindo] = useState<FiltroDaLista | null>(null);
  const ativo = rotuloDoSeletor({ visao, filtros, filtroSalvoId, salvos });
  const texto =
    ativo.tipo === "salvo" ? ativo.nome : ativo.tipo === "personalizado" ? t("Personalizado") : t(ROTULO_DA_VISAO[ativo.visao]);
  const IconeDoGatilho =
    ativo.tipo === "salvo" ? Bookmark : ativo.tipo === "personalizado" ? SlidersHorizontal : ICONE_DA_VISAO[ativo.visao];
  const meus = salvos.filter((s) => s.meu);
  const daEquipe = salvos.filter((s) => !s.meu);
  const marca = <Check size={14} aria-hidden className="ml-auto text-casca-marca" />;

  function cancelarRenomear() {
    setRenomeando(null);
    setErro(null);
  }

  async function confirmarRenomear() {
    if (!renomeando || !nome.trim()) return;
    const problema = await aoRenomear(renomeando, nome);
    if (problema) return setErro(problema);
    cancelarRenomear();
  }

  /** O menu do Radix procura item pela letra digitada: dentro do campo, a tecla fica no campo. */
  function teclaNoCampo(e: KeyboardEvent<HTMLInputElement>) {
    e.stopPropagation();
    if (e.key === "Enter") {
      e.preventDefault();
      void confirmarRenomear();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelarRenomear();
    }
  }

  const linha = (f: FiltroDaLista) => {
    if (renomeando === f.id) {
      return (
        <div key={f.id} className="px-1 py-0.5">
          <div className="flex h-8 items-center gap-1.5 rounded-[4px] bg-casca-marca-suave px-2">
            <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
            <input
              autoFocus
              value={nome}
              maxLength={60}
              aria-label={t("Nome do filtro")}
              onChange={(e) => {
                setNome(e.target.value);
                setErro(null);
              }}
              onKeyDown={teclaNoCampo}
              className="h-6 min-w-0 flex-1 rounded-[4px] border border-casca-marca bg-surface px-1.5 text-[13px] text-casca-texto outline-hidden"
            />
            <button
              type="button"
              aria-label={t("Salvar nome")}
              disabled={!nome.trim()}
              title={!nome.trim() ? t("Dê um nome ao filtro.") : undefined}
              onClick={() => void confirmarRenomear()}
              className="grid size-6 shrink-0 place-items-center rounded-[4px] bg-casca-marca text-white hover:bg-casca-marca-forte disabled:opacity-50"
            >
              <Check size={14} aria-hidden />
            </button>
            <button
              type="button"
              aria-label={t("Cancelar")}
              onClick={cancelarRenomear}
              className="grid size-6 shrink-0 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          {erro ? (
            <p role="alert" className="px-2 pt-1 text-[12px] text-casca-alerta">
              {erro}
            </p>
          ) : null}
        </div>
      );
    }
    const estaAtivo = ativo.tipo === "salvo" && ativo.id === f.id;
    return (
      <div key={f.id} className="flex items-center">
        <DropdownMenuItem
          className={cn(ITEM_DO_MENU, "min-w-0 flex-1", estaAtivo && ATIVO)}
          onSelect={() => aoAplicarSalvo(f)}
        >
          <Bookmark size={14} aria-hidden className="shrink-0 fill-current text-casca-marca" />
          <span className="truncate">{f.nome}</span>
          {estaAtivo ? marca : null}
        </DropdownMenuItem>
        {f.meu ? (
          <DropdownMenuSub>
            <DropdownMenuSubTrigger
              aria-label={`${t("Ações")} ${f.nome}`}
              className="grid size-7 shrink-0 place-items-center rounded-[4px] text-casca-suave [&>svg:last-child]:hidden"
            >
              <EllipsisVertical size={14} aria-hidden />
            </DropdownMenuSubTrigger>
            <DropdownMenuSubContent className={CONTEUDO_DO_MENU}>
              <DropdownMenuItem
                className={ITEM_DO_MENU}
                onSelect={(e) => {
                  // O menu continua aberto: o nome vira um campo na própria linha (print 2b-04).
                  e.preventDefault();
                  setNome(f.nome);
                  setErro(null);
                  setRenomeando(f.id);
                }}
              >
                <Pencil size={14} aria-hidden />
                {t("Renomear")}
              </DropdownMenuItem>
              <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => aoCompartilhar(f.id, !f.compartilhado)}>
                <Users size={14} aria-hidden />
                {f.compartilhado ? t("Deixar de compartilhar") : t("Compartilhar com a equipe")}
              </DropdownMenuItem>
              <DropdownMenuItem className={cn(ITEM_DO_MENU, "text-casca-alerta")} onSelect={() => setExcluindo(f)}>
                <Trash2 size={14} aria-hidden />
                {t("Excluir filtro")}
              </DropdownMenuItem>
            </DropdownMenuSubContent>
          </DropdownMenuSub>
        ) : null}
      </div>
    );
  };

  return (
    <>
      <DropdownMenu
        open={aberto}
        onOpenChange={(a) => {
          setAberto(a);
          if (!a) cancelarRenomear();
        }}
      >
        <DropdownMenuTrigger className="flex h-8 max-w-[240px] items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia data-[state=open]:border-casca-marca">
          <IconeDoGatilho size={15} aria-hidden className="shrink-0 text-casca-marca" />
          <span className="truncate">{texto}</span>
          <ChevronDown size={14} aria-hidden className="shrink-0" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className={cn(CONTEUDO_DO_MENU, "w-64")}>
          <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Padrão")}</DropdownMenuLabel>
          {VISOES_DE_CONTATOS.map((v) => {
            const Icone = ICONE_DA_VISAO[v];
            const estaAtiva = ativo.tipo === "visao" && ativo.visao === v;
            return (
              <DropdownMenuItem
                key={v}
                className={cn(ITEM_DO_MENU, estaAtiva && ATIVO)}
                onSelect={() => aoEscolherVisao(v)}
              >
                <Icone size={14} aria-hidden className="shrink-0" />
                {t(ROTULO_DA_VISAO[v])}
                {estaAtiva ? marca : null}
              </DropdownMenuItem>
            );
          })}
          {meus.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Meus filtros")}</DropdownMenuLabel>
              {meus.map(linha)}
            </>
          ) : null}
          {daEquipe.length > 0 ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuLabel className={ROTULO_DO_GRUPO}>{t("Compartilhados")}</DropdownMenuLabel>
              {daEquipe.map(linha)}
            </>
          ) : null}
          <DropdownMenuItem className={cn(ITEM_DO_MENU, "text-casca-marca")} onSelect={aoCriarFiltro}>
            <Plus size={14} aria-hidden />
            {t("Criar filtro")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <JanelaDeConfirmacao
        aberta={excluindo !== null}
        aoFechar={() => setExcluindo(null)}
        perigo
        rotuloDoConfirmar={t("Excluir filtro")}
        aoConfirmar={() => {
          if (excluindo) aoExcluir(excluindo.id);
          setExcluindo(null);
        }}
      >
        <p>{t('Tem certeza que deseja excluir o filtro "{name}"?').replace("{name}", excluindo?.nome ?? "")}</p>
      </JanelaDeConfirmacao>
    </>
  );
}
```

Repare:
- O `DropdownMenuSubTrigger` do shadcn põe um chevron à direita; o `[&>svg:last-child]:hidden` o esconde para sobrar só o ⋮. Confira em `components/ui/dropdown-menu.tsx` se o chevron é o último `svg`; se não for, ajuste o seletor.
- "Criar filtro" vem logo depois dos salvos, sem separador (print 2b-02).
- O `fill-current` deixa o marcador cheio, como o da Clint.

- [ ] **Step 5: A faixa de chips e o "Filtros" + ⇕**

Create `components/escale/contatos/filtros/FaixaDeFiltros.tsx`:

```tsx
"use client";

import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { useAssignableAgents } from "@/hooks/kanban/useAssignableAgents";
import {
  DONO_COM,
  DONO_SEM,
  ROTULO_DA_OP_DE_TAG,
  ROTULO_DO_STATUS,
  ROTULO_DO_TELEFONE,
  chipsDosFiltros,
  removerChip,
  textoDoPeriodo,
  type ChipDoFiltro,
  type FiltrosDeContatos,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { agentOwnerFilter } from "@/lib/kanban/filters";
import { ChevronUp, Plus, X } from "@/lib/ui/icons-da-casca";

const CHIPS_VISIVEIS = 6;

/**
 * A FAIXA DE FILTROS (prints 2b-24 a 2b-26; Clint `useCollapsibleFilters`): um chip
 * por critério ("Título **valor** │ ×"); o chip abre o painel na seção dele; "+ Filtro"
 * abre o painel inteiro; mais de 6 viram "+N"; "Resetar" volta ao padrão; o ^ à
 * direita recolhe a faixa. Sem filtro, só "+ Filtro" e o ^. Enquanto a faixa está
 * aberta, o "Filtros" + ⇕ sai da barra (`ControleDosFiltros`).
 */
export function FaixaDeFiltros({
  filtros,
  opcoes,
  aoMudar,
  aoAbrir,
  podeResetar,
  aoResetar,
  aoRecolher,
}: {
  filtros: FiltrosDeContatos;
  opcoes: OpcoesDoFiltro;
  aoMudar: (f: FiltrosDeContatos) => void;
  aoAbrir: (secao: SecaoDoFiltro | null) => void;
  podeResetar: boolean;
  aoResetar: () => void;
  aoRecolher: () => void;
}) {
  const t = useT();
  const membros = useAssignableMembers(true);
  const agentes = useAssignableAgents(true);
  const chips = chipsDosFiltros(filtros);
  const visiveis = chips.slice(0, CHIPS_VISIVEIS);
  const resto = chips.length - visiveis.length;
  const selecionados = (n: number) => t("{count} selecionados").replace("{count}", String(n));
  const contagem = (n: number, um: string, varios: string) => (n === 1 ? t(um) : t(varios)).replace("{count}", String(n));

  const nomeDoDono = (d: string) => {
    if (d === DONO_SEM) return t("Sem dono");
    if (d === DONO_COM) return t("Todos os donos");
    const membro = (membros.data ?? []).find((m) => m.user_id === d);
    if (membro) return membro.full_name ?? t("Sem nome");
    return (agentes.data ?? []).find((a) => agentOwnerFilter(a.agent_id) === d)?.name ?? t("Sem nome");
  };

  function texto(chip: ChipDoFiltro): { titulo: string; valor: string } {
    const n = filtros.negocio ?? {};
    switch (chip.chave) {
      case "criadoEm":
        return { titulo: t("Data de criação"), valor: textoDoPeriodo(filtros.criadoEm ?? {}) };
      case "telefone":
        return { titulo: t("Telefone"), valor: filtros.telefone ? t(ROTULO_DO_TELEFONE[filtros.telefone]) : "" };
      case "negocio.tem":
        return { titulo: t("Negócio"), valor: n.tem === "sem" ? t("Sem negócio") : t("Com negócio") };
      case "negocio.origens":
        return {
          titulo: t("Origens"),
          valor:
            chip.quantidade === 1
              ? (opcoes.origens.find((o) => o.id === n.origens?.[0])?.nome ?? selecionados(1))
              : selecionados(chip.quantidade),
        };
      case "negocio.etapas":
        return { titulo: t("Etapa"), valor: contagem(chip.quantidade, "{count} etapa", "{count} etapas") };
      case "negocio.status":
        return {
          titulo: t("Status"),
          valor: chip.quantidade === 1 && n.status?.[0] ? t(ROTULO_DO_STATUS[n.status[0]]) : selecionados(chip.quantidade),
        };
      case "negocio.donos":
        return {
          titulo: t("Dono"),
          valor: chip.quantidade === 1 && n.donos?.[0] ? nomeDoDono(n.donos[0]) : selecionados(chip.quantidade),
        };
      case "negocio.motivos":
        return {
          titulo: t("Motivo de perda"),
          valor:
            chip.quantidade === 1
              ? t(opcoes.motivos.find((m) => m.valor === n.motivos?.[0])?.rotulo ?? n.motivos?.[0] ?? "")
              : selecionados(chip.quantidade),
        };
      case "tags": {
        // Uma condição só: o texto dela ("vip", "Qualquer tag", "Não possui a tag frio"); mais: "2 tags" (print 2b-25).
        const unica = chip.quantidade === 1 ? filtros.tags?.grupos[0]?.condicoes[0] : undefined;
        const valor = !unica
          ? contagem(chip.quantidade, "{count} tag", "{count} tags")
          : unica.op === "possui"
            ? unica.tag
            : unica.op === "nao_possui"
              ? `${t(ROTULO_DA_OP_DE_TAG.nao_possui)} ${unica.tag}`
              : t(ROTULO_DA_OP_DE_TAG[unica.op]);
        return { titulo: t("Tags"), valor };
      }
      case "campos":
        return { titulo: t("Campos"), valor: contagem(chip.quantidade, "{count} campo", "{count} campos") };
    }
  }

  return (
    <div className="flex min-h-12 shrink-0 flex-wrap items-center gap-2 border-b border-casca-borda px-6 py-2">
      {visiveis.map((chip) => {
        const { titulo, valor } = texto(chip);
        return (
          <span
            key={chip.chave}
            className="inline-flex h-[30px] items-center rounded-[6px] border border-casca-borda bg-surface text-[13px] text-casca-suave"
          >
            <button type="button" onClick={() => aoAbrir(chip.secao)} className="inline-flex h-full items-center gap-1 px-3">
              {titulo} <span className="font-semibold text-casca-texto">{valor}</span>
            </button>
            <span aria-hidden className="h-full w-px bg-casca-borda" />
            <button
              type="button"
              aria-label={`${t("Remover filtro")} ${titulo}`}
              onClick={() => aoMudar(removerChip(filtros, chip.chave))}
              className="grid h-full w-8 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </span>
        );
      })}
      {resto > 0 ? (
        <button
          type="button"
          onClick={() => aoAbrir(null)}
          className="h-[30px] rounded-[6px] border border-casca-borda px-2.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
        >
          {`+${resto}`}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t("Filtro")}
        onClick={() => aoAbrir(null)}
        className="inline-flex h-[30px] items-center gap-1.5 rounded-[6px] border border-casca-borda bg-surface px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
      >
        <Plus size={14} aria-hidden />
        {t("Filtro")}
      </button>
      {podeResetar ? (
        <button
          type="button"
          onClick={aoResetar}
          className="h-[30px] px-2 text-[12px] font-medium text-casca-suave hover:text-casca-texto"
        >
          {t("Resetar")}
        </button>
      ) : null}
      <button
        type="button"
        aria-label={t("Recolher filtros")}
        title={t("Recolher filtros")}
        onClick={aoRecolher}
        className="ml-auto grid size-[30px] place-items-center rounded-[6px] border border-casca-borda text-casca-suave hover:bg-casca-raia"
      >
        <ChevronUp size={14} aria-hidden />
      </button>
    </div>
  );
}
```

Create `components/escale/contatos/filtros/ControleDosFiltros.tsx`:

```tsx
"use client";

import { PopoverAnchor, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronsUpDown, Funnel } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const BOTAO_DA_BARRA =
  "flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia";

/**
 * O "FILTROS" + ⇕ DA BARRA (prints 2b-01 e 2b-24; Clint `useCollapsibleFilters`).
 * Vai dentro do `<Popover>` do painel. Com a faixa recolhida: o "Filtros" é o
 * gatilho do painel (com o selo da contagem) e o ⇕ abre a faixa. Com a faixa
 * aberta, a Clint tira o par da barra; fica só uma âncora invisível no mesmo lugar,
 * para o painel (aberto pelos chips ou pelo "+ Filtro") nascer onde nascia.
 */
export function ControleDosFiltros({
  faixaAberta,
  quantos,
  aoAlternarFaixa,
}: {
  faixaAberta: boolean;
  quantos: number;
  aoAlternarFaixa: () => void;
}) {
  const t = useT();
  if (faixaAberta) {
    return (
      <PopoverAnchor asChild>
        <span aria-hidden className="block h-8 w-0" />
      </PopoverAnchor>
    );
  }
  return (
    <span className="flex">
      <PopoverTrigger asChild>
        <button type="button" className={cn(BOTAO_DA_BARRA, "rounded-r-none")}>
          <Funnel size={15} aria-hidden />
          {t("Filtros")}
          {quantos > 0 ? (
            <span className="grid size-[18px] place-items-center rounded-full bg-casca-marca text-[10px] font-semibold text-white">
              {quantos}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <button
        type="button"
        aria-label={t("Expandir filtros")}
        title={t("Expandir filtros")}
        aria-expanded={false}
        onClick={aoAlternarFaixa}
        className={cn(BOTAO_DA_BARRA, "rounded-l-none border-l-0 px-2")}
      >
        <ChevronsUpDown size={14} aria-hidden />
      </button>
    </span>
  );
}
```

- [ ] **Step 6: O estado da lista na URL**

Create `hooks/escale/useEstadoDaListaDeContatos.ts`:

```ts
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useMemo } from "react";

import { filtrosDaUrl, filtrosParaUrl, type FiltrosDeContatos } from "@/lib/escale/contatos/filtros";
import { VISOES_DE_CONTATOS, type VisaoDeContatos } from "@/lib/escale/contatos/regras";

/**
 * O ESTADO DA LISTA DE CONTATOS NA URL (fork Escale, 2A e 2B): busca `q`, visão
 * `v`, página `p`, filtro `f` (JSON enxuto) e o filtro salvo aplicado `fs`.
 */
export function useEstadoDaListaDeContatos() {
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const v = params.get("v") ?? "";
  const visao: VisaoDeContatos = (VISOES_DE_CONTATOS as readonly string[]).includes(v)
    ? (v as VisaoDeContatos)
    : "todos";
  const pagina = Math.max(1, Number(params.get("p")) || 1);
  const textoDoFiltro = params.get("f");
  const filtros = useMemo(() => filtrosDaUrl(textoDoFiltro), [textoDoFiltro]);

  const irPara = (mudar: Record<string, string | null>) => {
    const novo = new URLSearchParams(params.toString());
    for (const [k, valor] of Object.entries(mudar)) {
      if (valor === null || valor === "") novo.delete(k);
      else novo.set(k, valor);
    }
    router.replace(`${caminho}?${novo.toString()}`, { scroll: false });
  };

  return {
    visao,
    pagina,
    busca: params.get("q") ?? "",
    filtros,
    f: filtrosParaUrl(filtros),
    filtroSalvoId: params.get("fs"),
    irPara,
    mudarFiltros: (novos: FiltrosDeContatos, salvoId: string | null = null) =>
      irPara({ f: filtrosParaUrl(novos), fs: salvoId, p: null }),
  };
}
```

- [ ] **Step 7: As opções na página**

Em `lib/escale/contatos/origens-da-pagina.ts`:

1. Imports: acrescente `import { opcoesDoFiltroDasOrigens, type OpcoesDoFiltro } from "./opcoes-do-filtro";`.
2. O tipo `OrigemLida` ganha `settings: Record<string, unknown> | null;`.
3. O `select` passa a ser `"id, name, position, settings, crm_stages(id, name, position, is_archived, is_won, is_lost)"`.
4. A assinatura e o retorno:

```ts
export async function origensDaPagina(): Promise<{
  origens: OrigemParaCriar[];
  papel: Role;
  opcoesDoFiltro: OpcoesDoFiltro;
}> {
```

```ts
  const lidas = (data ?? []) as unknown as OrigemLida[];
  const origens = lidas.map((p) => ({
    id: p.id,
    nome: p.name,
    etapas: [...(p.crm_stages ?? [])]
      .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((s) => ({ id: s.id, nome: s.name })),
  }));
  // FORK ESCALE · Fase 2B: o painel de filtros oferece todas as etapas (ganho e perda também).
  return { origens, papel: activeOrg.role as Role, opcoesDoFiltro: opcoesDoFiltroDasOrigens(lidas) };
```

Em `app/app/contacts/page.tsx`, troque as duas linhas de dentro do `if` por:

```tsx
    // FORK ESCALE · Fase 2B: tudo o que a página lê (origens, papel e as opções do filtro).
    const dados = await origensDaPagina();
    return <ListaDeContatos {...dados} />;
```

- [ ] **Step 8: A lista ligada**

Troque o conteúdo de `components/escale/contatos/ListaDeContatos.tsx` por:

```tsx
"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover } from "@/components/ui/popover";
import { useColunasDaLista, useSalvarColunasDaLista } from "@/hooks/escale/useColunasDaLista";
import { useEstadoDaListaDeContatos } from "@/hooks/escale/useEstadoDaListaDeContatos";
import {
  useCriarFiltroDaLista,
  useExcluirFiltroDaLista,
  useFiltrosDaLista,
  useMudarFiltroDaLista,
} from "@/hooks/escale/useFiltrosDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import {
  chipsDosFiltros,
  filtrosParaUrl,
  mesmosFiltros,
  temFiltros,
  type SecaoDoFiltro,
} from "@/lib/escale/contatos/filtros";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { OPCOES_VAZIAS, type OpcoesDoFiltro } from "@/lib/escale/contatos/opcoes-do-filtro";
import { CHAVE_DO_POR_PAGINA, POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";
import { Bookmark, RefreshCw, Search } from "@/lib/ui/icons-da-casca";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { BalaoDoFiltro } from "./filtros/BalaoDoFiltro";
import { ControleDosFiltros } from "./filtros/ControleDosFiltros";
import { FaixaDeFiltros } from "./filtros/FaixaDeFiltros";
import { PainelDeFiltros } from "./filtros/PainelDeFiltros";
import { SeletorDeFiltros } from "./filtros/SeletorDeFiltros";
import { JanelaNovoNegocio } from "./JanelaNovoNegocio";
import { MenuNovoContato } from "./MenuNovoContato";
import { PainelDeColunas } from "./PainelDeColunas";
import { SeloDeMescla } from "./SeloDeMescla";
import { TabelaDeContatos } from "./TabelaDeContatos";

const CHAVE_DA_FAIXA = "escale:contatos:faixa-de-filtros";

function lerPorPagina(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_DO_POR_PAGINA));
    return (POR_PAGINA as readonly number[]).includes(n) ? n : POR_PAGINA_PADRAO;
  } catch {
    return POR_PAGINA_PADRAO;
  }
}

/** A faixa nasce recolhida, como na Clint (`contacts-list:filter-bar-collapsed`). */
function lerFaixaAberta(): boolean {
  try {
    return window.localStorage.getItem(CHAVE_DA_FAIXA) === "aberta";
  } catch {
    return false;
  }
}

const mensagemDoErro = (e: unknown, padrao: string) => (e instanceof Error && e.message ? e.message : padrao);

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fases 2A e 2B; capturas 03-001,
 * 03-002 e os prints 2b-01 a 2b-26): cabeçalho, barra (busca, filtros prontos e
 * salvos, "Filtros" + ⇕), a faixa de chips, a tabela e o rodapé. Com a faixa
 * aberta, o "Filtros" + ⇕ sai da barra, como na Clint. Busca, visão, página,
 * filtro e filtro salvo na URL; o "N por página" e a faixa no navegador.
 */
export function ListaDeContatos({
  origens,
  papel,
  opcoesDoFiltro = OPCOES_VAZIAS,
}: {
  origens: OrigemParaCriar[];
  papel: Role;
  opcoesDoFiltro?: OpcoesDoFiltro;
}) {
  const t = useT();
  const { visao, pagina, busca: buscaDaUrl, filtros, f, filtroSalvoId, irPara, mudarFiltros } =
    useEstadoDaListaDeContatos();
  const [busca, setBusca] = useState(buscaDaUrl);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [faixaAberta, setFaixaAberta] = useState(false);
  const [painelAberto, setPainelAberto] = useState(false);
  const [foco, setFoco] = useState<SecaoDoFiltro | null>(null);
  const [novoNegocio, setNovoNegocio] = useState<LinhaDeContato | null>(null);
  const [girando, setGirando] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
    setPorPagina(lerPorPagina());
    setFaixaAberta(lerFaixaAberta());
  }, []);

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== buscaDaUrl) irPara({ q: busca.trim() || null, p: null });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);

  const consulta = useListaDeContatos({ q: buscaDaUrl, v: visao, p: pagina, n: porPagina, f });
  const colunas = useColunasDaLista("contatos");
  const salvarColunas = useSalvarColunasDaLista("contatos");
  const salvos = useFiltrosDaLista("contatos");
  const criarFiltro = useCriarFiltroDaLista("contatos");
  const mudarFiltro = useMudarFiltroDaLista("contatos");
  const excluirFiltro = useExcluirFiltroDaLista("contatos");
  const dados = consulta.data;

  useEffect(() => {
    if (dados && dados.linhas.length === 0 && pagina > 1) irPara({ p: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volta à primeira quando a página esvazia (Clint)
  }, [dados, pagina]);

  const podeCriar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const podeMesclar = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const total = dados?.total ?? 0;
  const comFiltro = temFiltros(filtros);
  const salvoAtivo = (salvos.data ?? []).find((s) => s.id === filtroSalvoId) ?? null;
  const batendoComSalvo = salvoAtivo !== null && mesmosFiltros(salvoAtivo.criterios, filtros);
  const quantos = chipsDosFiltros(filtros).length;
  const falhou = t("Não consegui completar essa ação. Tente de novo.");

  const mudarPorPagina = (n: number) => {
    setPorPagina(n);
    try {
      window.localStorage.setItem(CHAVE_DO_POR_PAGINA, String(n));
    } catch {
      // o navegador pode recusar; o tamanho vale só nesta visita
    }
    irPara({ p: null });
  };

  const alternarFaixa = () => {
    const nova = !faixaAberta;
    setFaixaAberta(nova);
    try {
      window.localStorage.setItem(CHAVE_DA_FAIXA, nova ? "aberta" : "recolhida");
    } catch {
      // o navegador pode recusar; a faixa vale só nesta visita
    }
  };

  const abrirPainel = (s: SecaoDoFiltro | null) => {
    setFoco(s);
    setPainelAberto(true);
  };
  const resetar = () => irPara({ f: null, fs: null, v: null, p: null });

  async function salvarFiltro(nome: string, compartilhado: boolean): Promise<string | null> {
    try {
      const r = await criarFiltro.mutateAsync({ nome, compartilhado, criterios: filtros });
      irPara({ fs: r.id });
      return null;
    } catch (e) {
      return mensagemDoErro(e, falhou);
    }
  }

  const rodapeDoPainel = (
    <div className="flex h-[44px] shrink-0 items-center justify-end gap-2 border-t border-casca-borda px-4">
      {comFiltro && !batendoComSalvo ? (
        <BalaoDoFiltro
          aoSalvar={salvarFiltro}
          gatilho={
            <BotaoDaCasca type="button" variante="texto" tamanho="sm">
              <Bookmark size={14} aria-hidden />
              {t("Salvar filtro")}
            </BotaoDaCasca>
          }
        />
      ) : null}
      {comFiltro ? (
        <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={resetar}>
          {t("Resetar")}
        </BotaoDaCasca>
      ) : null}
    </div>
  );

  return (
    <div className="flex h-[calc(100dvh-3.5rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))] min-h-[28rem] flex-col bg-surface md:[body:has([data-escale-casca])_&]:h-[calc(100dvh-2.75rem-var(--space-6)-max(var(--space-6),var(--rodape-ocupado,0px)))]">
      <header className="flex h-[50px] shrink-0 items-center justify-between gap-4 border-b border-casca-borda px-6">
        <h1 className="text-[16px] font-medium text-casca-texto">{t("Contatos")}</h1>
        <div className="flex items-center gap-4">
          {podeMesclar && <SeloDeMescla />}
          <MenuNovoContato origens={origens} podeCriar={podeCriar} />
        </div>
      </header>

      <div className="flex shrink-0 items-center gap-3 border-b border-casca-borda px-6 py-3">
        <label className="flex h-8 w-[280px] items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por contato ou Empresa")}
            aria-label={t("Buscar por contato ou Empresa")}
            className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
          <Search size={15} aria-hidden className="shrink-0 text-casca-suave" />
        </label>
        <SeletorDeFiltros
          visao={visao}
          filtros={filtros}
          filtroSalvoId={filtroSalvoId}
          salvos={salvos.data ?? []}
          aoEscolherVisao={(v) => irPara({ v: v === "todos" ? null : v, f: null, fs: null, p: null })}
          aoAplicarSalvo={(s) => irPara({ f: filtrosParaUrl(s.criterios), fs: s.id, v: null, p: null })}
          aoCriarFiltro={() => abrirPainel(null)}
          aoRenomear={async (id, nome) => {
            try {
              await mudarFiltro.mutateAsync({ id, nome });
              return null;
            } catch (e) {
              return mensagemDoErro(e, falhou);
            }
          }}
          aoCompartilhar={(id, compartilhado) =>
            mudarFiltro.mutate({ id, compartilhado }, { onError: (e) => toast.error(mensagemDoErro(e, falhou)) })
          }
          aoExcluir={(id) =>
            excluirFiltro.mutate(id, {
              onSuccess: () => {
                if (id === filtroSalvoId) irPara({ fs: null });
              },
              onError: (e) => toast.error(mensagemDoErro(e, falhou)),
            })
          }
        />
        <Popover
          open={painelAberto}
          onOpenChange={(aberto) => {
            setPainelAberto(aberto);
            if (!aberto) setFoco(null);
          }}
        >
          {/* Faixa recolhida: "Filtros" (gatilho) + ⇕. Aberta: só a âncora do painel (prints 2b-24 a 2b-26). */}
          <ControleDosFiltros faixaAberta={faixaAberta} quantos={quantos} aoAlternarFaixa={alternarFaixa} />
          <PainelSuspenso align="start" sideOffset={8} className="w-auto p-0">
            <PainelDeFiltros
              filtros={filtros}
              aoMudar={(novos) => mudarFiltros(novos, filtroSalvoId)}
              opcoes={opcoesDoFiltro}
              foco={foco}
              aoMudarFoco={setFoco}
              rodape={rodapeDoPainel}
            />
          </PainelSuspenso>
        </Popover>
        <div className="ml-auto flex items-center gap-2">
          <span className="text-[14px] text-casca-suave">
            <span className="mr-1 font-semibold text-casca-texto">{total}</span>
            {total === 1 ? t("contato") : t("contatos")}
          </span>
          <button
            type="button"
            title={t("Atualizar")}
            aria-label={t("Atualizar")}
            onClick={() => {
              setGirando(true);
              void consulta.refetch().finally(() => setGirando(false));
            }}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <RefreshCw size={17} aria-hidden className={girando ? "animate-spin" : ""} />
          </button>
          <PainelDeColunas itens={colunas.itens} aoMudar={(itens) => salvarColunas.mutate(itens)} />
        </div>
      </div>

      {faixaAberta ? (
        <FaixaDeFiltros
          filtros={filtros}
          opcoes={opcoesDoFiltro}
          aoMudar={(novos) => mudarFiltros(novos, filtroSalvoId)}
          aoAbrir={abrirPainel}
          podeResetar={comFiltro || visao !== "todos"}
          aoResetar={resetar}
          aoRecolher={alternarFaixa}
        />
      ) : null}

      <div className="min-h-0 flex-1 overflow-auto px-6">
        <TabelaDeContatos
          linhas={dados?.linhas ?? []}
          colunas={colunas.itens}
          carregando={consulta.isLoading}
          erro={consulta.isError}
          aoTentarDeNovo={() => void consulta.refetch()}
          podeVerNegocios={podeCriar}
          podeExcluir={podeExcluir}
          aoAdicionarNegocio={setNovoNegocio}
        />
      </div>

      <footer className="shrink-0 border-t border-casca-borda px-6">
        <PaginacaoDaCasca
          pagina={pagina}
          total={total}
          porPagina={porPagina}
          opcoesPorPagina={POR_PAGINA}
          aoMudarPagina={(p) => irPara({ p: p === 1 ? null : String(p) })}
          aoMudarPorPagina={mudarPorPagina}
        />
      </footer>

      <JanelaNovoNegocio contato={novoNegocio} aoFechar={() => setNovoNegocio(null)} origens={origens} />
    </div>
  );
}
```

Repare:
- O seletor substitui o `DropdownMenu` de visões da 2A (mesma aparência, agora com os salvos).
- "Filtros" deixa de ser "Em breve" e o ⇕ vira "Expandir filtros". Com a faixa aberta, o par sai da barra (`ControleDosFiltros`); o painel continua no mesmo Popover, ancorado no mesmo lugar, e abre pelos chips e pelo "+ Filtro". O ^ da faixa recolhe.
- O rodapé do painel fica à direita ("Salvar filtro" e "Resetar", print 2b-08).
- O `react-hooks/set-state-in-effect` da 2A vale para as duas leituras do navegador; se o eslint pedir o comentário em cada `set`, repita-o.

- [ ] **Step 9: Rodar e ver passar (com os testes da 2A que leem estes arquivos)**

```bash
corepack pnpm vitest run tests/unit/escale-faixa-e-seletor-de-filtros.test.tsx tests/unit/escale-lista-de-contatos-pagina.test.tsx tests/unit/escale-tabela-de-contatos.test.tsx
for f in components/escale/contatos/ListaDeContatos.tsx lib/escale/contatos/origens-da-pagina.ts app/app/contacts/page.tsx; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u | xargs -r corepack pnpm vitest run
```

Expected: PASS. A `escale-lista-de-contatos-pagina` continua verde: ela simula `origensDaPagina` sem `opcoesDoFiltro`, e a lista usa `OPCOES_VAZIAS`.

- [ ] **Step 10: Typecheck, eslint, prettier e commit**

```bash
ALTERADOS="components/escale/contatos/ListaDeContatos.tsx lib/escale/contatos/origens-da-pagina.ts app/app/contacts/page.tsx"
NOVOS="components/escale/ui/JanelaDeConfirmacao.tsx components/escale/contatos/filtros/BalaoDoFiltro.tsx components/escale/contatos/filtros/SeletorDeFiltros.tsx components/escale/contatos/filtros/FaixaDeFiltros.tsx components/escale/contatos/filtros/ControleDosFiltros.tsx hooks/escale/useEstadoDaListaDeContatos.ts tests/unit/escale-faixa-e-seletor-de-filtros.test.tsx"
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $ALTERADOS $NOVOS
corepack pnpm exec prettier --write $NOVOS
git add $ALTERADOS $NOVOS
git commit -m "feat(escale): faixa de filtros, filtros salvos e a lista de contatos ligada (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: Espanhol, rodada cheia e o PR A

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco novo logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`)
- Modify (fora do repositório): `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` (a linha da 2B na seção 8)

- [ ] **Step 1: O espanhol**

Rode da raiz da worktree (o script pula chave que já existe, com ou sem aspas):

```bash
node - <<'JS'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const MARCO = "  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───";
const TITULO = "  // ─── FORK ESCALE · Fase 2B (PR A): filtros e filtros salvos da lista de contatos ───";
const ES = {
  "Com Telefone": "Con teléfono",
  "Sem Telefone": "Sin teléfono",
  "Telefone inválido": "Teléfono inválido",
  "Telefone internacional": "Teléfono internacional",
  "Aberto": "Abierto",
  "Ganho": "Ganado",
  "Perdido": "Perdido",
  "Contém": "Contiene",
  "Não contém": "No contiene",
  "Igual": "Igual",
  "Diferente": "Diferente",
  "Maior que": "Mayor que",
  "Menor que": "Menor que",
  "Depois de": "Después de",
  "Antes de": "Antes de",
  "Está vazio": "Está vacío",
  "Não está vazio": "No está vacío",
  "Nome": "Nombre",
  "Email": "Email",
  "Telefone": "Teléfono",
  "Valor do negócio": "Valor del negocio",
  "Contato": "Contacto",
  "Negócio": "Negocio",
  "Tags": "Etiquetas",
  "Campos": "Campos",
  "Limpar": "Limpiar",
  "Todos os filtros": "Todos los filtros",
  "Data de criação": "Fecha de creación",
  "Filtrar por data de criação": "Filtrar por fecha de creación",
  "Com/Sem Telefone": "Con/Sin teléfono",
  "Com/Sem negócio": "Con/Sin negocio",
  "Com negócio": "Con negocio",
  "Sem negócio": "Sin negocio",
  "Origens": "Orígenes",
  "Com negócio em origens": "Con negocio en orígenes",
  "Etapa": "Etapa",
  "Com negócio em etapa": "Con negocio en etapa",
  "Escolha uma origem antes": "Elige un origen antes",
  "Status": "Estado",
  "Com negócio em status": "Con negocio en estado",
  "Dono do negócio": "Responsable del negocio",
  "Com/Sem dono do negócio": "Con/Sin responsable del negocio",
  "Sem dono": "Sin responsable",
  "Todos os donos": "Todos los responsables",
  "Sem nome": "Sin nombre",
  "Motivo de perda": "Motivo de pérdida",
  "Motivo de Perda": "Motivo de pérdida",
  "Qualquer tag": "Cualquier etiqueta",
  "Sem tag": "Sin etiqueta",
  "Condição da tag": "Condición de la etiqueta",
  "Possui a tag": "Tiene la etiqueta",
  "Não possui a tag": "No tiene la etiqueta",
  "Cancelar": "Cancelar",
  "Aplicar": "Aplicar",
  "Buscar por...": "Buscar por...",
  "Buscar tag": "Buscar etiqueta",
  "Buscando tags...": "Buscando etiquetas...",
  "Nenhuma tag correspondente": "Ninguna etiqueta coincide",
  "Remover filtro": "Quitar filtro",
  "Sim": "Sí",
  "Não": "No",
  "Selecione...": "Selecciona...",
  "Valor": "Valor",
  "DD/MM/AAAA": "DD/MM/AAAA",
  "Digite o valor": "Escribe el valor",
  "Digite o texto a buscar": "Escribe el texto a buscar",
  "Buscar campo": "Buscar campo",
  "Nenhum campo encontrado": "Ningún campo encontrado",
  "Operador": "Operador",
  "Voltar": "Volver",
  "Excluir grupo": "Eliminar grupo",
  "Escolher tag": "Elegir etiqueta",
  "Escolher campo": "Elegir campo",
  "Empresa": "Empresa",
  "Em breve": "Próximamente",
  "Escolha o operador e o valor.": "Elige el operador y el valor.",
  "Grupo {number}": "Grupo {number}",
  "E": "Y",
  "OU": "O",
  "combinar grupos por": "combinar grupos por",
  "Limite de 10 condições por grupo atingido.": "Límite de 10 condiciones por grupo alcanzado.",
  "Adicionar condição": "Agregar condición",
  "Limite de 5 grupos atingido.": "Límite de 5 grupos alcanzado.",
  "Adicionar grupo": "Agregar grupo",
  "Limite de {max} condições contém / não contém atingido neste filtro. Use Igual, ou remova uma condição para liberar.":
    "Límite de {max} condiciones contiene / no contiene alcanzado en este filtro. Usa Igual o quita una condición para liberar.",
  "Confirme sua ação": "Confirma tu acción",
  "Fechar": "Cerrar",
  "Aguarde…": "Espera…",
  "Confirmar": "Confirmar",
  "Nome do filtro": "Nombre del filtro",
  "Ex: Clientes em aberto": "Ej.: Clientes abiertos",
  "Compartilhar com a equipe": "Compartir con el equipo",
  "Dê um nome ao filtro.": "Ponle un nombre al filtro.",
  "Salvar": "Guardar",
  "Personalizado": "Personalizado",
  "Ações": "Acciones",
  "Renomear": "Renombrar",
  "Deixar de compartilhar": "Dejar de compartir",
  "Salvar nome": "Guardar nombre",
  "Excluir filtro": "Eliminar filtro",
  "Padrão": "Predeterminados",
  "Meus filtros": "Mis filtros",
  "Compartilhados": "Compartidos",
  "Criar filtro": "Crear filtro",
  'Tem certeza que deseja excluir o filtro "{name}"?': '¿Seguro que quieres eliminar el filtro "{name}"?',
  "{count} selecionados": "{count} seleccionados",
  "{count} etapa": "{count} etapa",
  "{count} etapas": "{count} etapas",
  "Dono": "Responsable",
  "{count} tag": "{count} etiqueta",
  "{count} tags": "{count} etiquetas",
  "{count} campo": "{count} campo",
  "{count} campos": "{count} campos",
  "Filtro": "Filtro",
  "Resetar": "Restablecer",
  "Recolher filtros": "Ocultar filtros",
  "Expandir filtros": "Mostrar filtros",
  "Salvar filtro": "Guardar filtro",
  "Filtros": "Filtros",
  "Já existe um filtro com esse nome.": "Ya existe un filtro con ese nombre.",
  "Limite de 20 filtros salvos atingido. Exclua algum para salvar outro.":
    "Límite de 20 filtros guardados alcanzado. Elimina alguno para guardar otro.",
  "Dê ao filtro um nome de 1 a 60 caracteres.": "Ponle al filtro un nombre de 1 a 60 caracteres.",
  "Filtro não encontrado.": "Filtro no encontrado.",
};
const base = fs.readFileSync(ARQ, "utf8");
const i = base.indexOf(MARCO);
if (i < 0) throw new Error("marco da 1G não achado");
const existe = (k) => base.includes(`\n  ${JSON.stringify(k)}:`) || base.includes(`\n  ${k}:`);
const linhas = Object.entries(ES)
  .filter(([k]) => !existe(k))
  .map(([k, v]) => `  ${JSON.stringify(k)}: { es: ${JSON.stringify(v)} },`);
if (linhas.length === 0) {
  console.log("nada novo");
  process.exit(0);
}
fs.writeFileSync(ARQ, base.slice(0, i) + [TITULO, ...linhas, ""].join("\n") + base.slice(i));
console.log(`${linhas.length} chaves novas`);
JS
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Expected: PASS. Se o teste listar texto faltando (de um componente desta fase), acrescente a chave com a tradução ao `ES` e rode o script de novo: ele só insere o que falta.

- [ ] **Step 2: Atualizar com a `main` e os gates rápidos**

```bash
git fetch escale-crm --quiet
git merge escale-crm/main      # conflito em baseline.sql, dicionario.ts, actions.ts ou rls-completude: manter os DOIS blocos
bash scripts/checar-colisao-de-migration.sh escale-crm/main
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm lint
```

Expected: sem colisão, typecheck e lint limpos.

- [ ] **Step 3: A rodada cheia, em segundo plano**

```bash
( export NODE_OPTIONS=--max-old-space-size=6144
  corepack pnpm test:unit > .superpowers/sdd/2b-a-unit.log 2>&1; echo "unit=$?" >> .superpowers/sdd/2b-a-unit.log
  corepack pnpm test:db > .superpowers/sdd/2b-a-db.log 2>&1; echo "db=$?" >> .superpowers/sdd/2b-a-db.log ) &
```

Enquanto roda, escreva o texto do PR (Step 4). Quando terminar:

```bash
grep -oE "FAIL +[^ ]+\.test\.tsx?" .superpowers/sdd/2b-a-unit.log .superpowers/sdd/2b-a-db.log | awk '{print $2}' | sort -u > .superpowers/sdd/2b-a-falhas.txt
comm -23 .superpowers/sdd/2b-a-falhas.txt <(sort -u .superpowers/sdd/falhas-conhecidas.txt)
```

Cada arquivo que sobrar é falha nova: rode-o sozinho (`corepack pnpm vitest run <arquivo>` ou `corepack pnpm test:db <arquivo>`). Se passar sozinho, era carga; se falhar sozinho, é regressão: corrija antes do PR.

- [ ] **Step 4: O PR A**

```bash
git push -u escale-crm feat/fase-2b-filtros-de-contatos
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-2b-filtros-de-contatos \
  --title "Fase 2B (PR A): filtros e filtros salvos da lista de contatos" \
  --body-file .superpowers/sdd/2b-a-pr.md
```

O `.superpowers/sdd/2b-a-pr.md` traz: o que entrou (painel, faixa, seletor, filtros salvos, filtro no banco); a migration 9102 (tabela, funções invoker, a lista de 8 parâmetros); as respostas do usuário de 17/10 que valem para o PR A (Q1, Q2, Q9, Q10, Q12); as diferenças conhecidas (N4: as origens sem o grupo de origem da Clint; N19: "Empresa" em breve no seletor de Campos e o selo quadrado; "Não informar" fora; o "+N" sem print, item 4 dos prints que faltam); a verificação (testes da fase, `test:db` da Task 2, a rodada cheia com a comparação contra as falhas conhecidas); a conferência visual pendente para depois do deploy; e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 5: O PRD**

No PRD fora do repositório, linha da 2B na seção 8, coluna "Estado": `PR A aberto (#<número>, filtros e filtros salvos); PR B a seguir`.

**PARE aqui.** Merge, tag, release e deploy só com o "pode fazer" do usuário. O PR B nasce da `main` depois do merge do PR A.

---

# PR B — Seleção, ações em massa, exportar com aprovação e excluir com os negócios (B3, B4, B5)

### Task 7: Branch do PR B e a migration 9103

**Files:**
- Create: `supabase/migrations/20261101120000_9103_acoes_em_massa.sql`, `tests/unit/escale-acoes-em-massa-migration.test.ts`, `tests/invariants/escale-acoes-em-massa.test.ts`
- Modify: `supabase/baseline.sql` (bloco depois do da 9102), `tests/invariants/rls-completude-varredura.test.ts` (`PROVA_PROPRIA`)

**Interfaces:**
- Consumes: `fn_escale_contatos_do_filtro` (9102), `public.emit_event(text, text, uuid, jsonb, jsonb, uuid)` do original, `public.fn_role_at_least(uuid, text)`, `public.fn_user_org_ids()`, a policy `user_orgs_select` da 0044 (gerente e admin leem o quadro de membros da organização).
- Produces:
  - `public.crm_acoes_em_massa (id, organization_id, user_id, lista, acao, parametros, status, total, feitos, falhas, erros, arquivo, expira_em, decidido_por, decidido_em, created_at, updated_at)`; `acao` ∈ `criar_negocios | incluir_tag | remover_tag | exportar | excluir`; `status` ∈ `preparando | aguardando_aprovacao | na_fila | processando | concluida | falhou | recusada` (os dois de aprovação só na exportação).
  - `public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao, feito)`.
  - `public.fn_escale_admin_unico(p_org uuid) returns boolean` — quem chama é admin e o único admin ativo (invoker).
  - `public.fn_escale_criar_acao_em_massa(p_org uuid, p_acao text, p_parametros jsonb, p_ids uuid[], p_visao text, p_padrao text, p_digitos text[], p_cpf_hash text, p_filtros jsonb, p_quantidade integer, p_excluidos uuid[]) returns table (acao_id uuid, quantidade integer, status text)` — com `p_ids` não nulo usa os ids; senão, o filtro (os `p_quantidade` primeiros, ou todos), menos `p_excluidos`; `status` = `na_fila` (emite `contatos.acao_em_massa_requested` com `payload.acao_id`) ou `aguardando_aprovacao` (exportação de quem não é o único admin; sem evento).
  - `public.fn_escale_decidir_exportacao(p_acao uuid, p_aprovar boolean) returns text` (o novo status: `na_fila` ou `recusada`); erros `acao_em_massa_inexistente`, `acao_em_massa_sem_permissao`, `acao_em_massa_nao_aguarda`, `acao_em_massa_expirada`, `acao_em_massa_propria`.
  - Gatilho `trg_crm_acoes_em_massa_trava_da_decisao` (função `fn_crm_acoes_em_massa_trava_da_decisao`, invoker).
  - Bucket privado `exportacoes-das-listas` (100 MB, `text/csv`, sem policy).

- [ ] **Step 1: A branch, a base e a colisão**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
git status --porcelain            # Expected: vazio
git fetch escale-crm --quiet
git ls-tree --name-only escale-crm/main supabase/migrations/ | grep -c "_9102_" # Expected: 1 (PR A mergeado)
bash scripts/checar-colisao-de-migration.sh escale-crm/main
git switch -c feat/fase-2b-acoes-em-massa escale-crm/main
corepack pnpm install --frozen-lockfile
```

Sem a 9102 na `main`, PARE: o PR B depende do PR A.

- [ ] **Step 2: O teste de forma (vai falhar)**

Create `tests/unit/escale-acoes-em-massa-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261101120000_9103_acoes_em_massa.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9103 (ações em massa)", () => {
  it("existe, com a linha do manifesto", () => {
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
  });

  it("as funções são invoker e fechadas ao anon; criar e aprovar emitem o evento", () => {
    for (const nome of [
      "fn_escale_admin_unico",
      "fn_escale_criar_acao_em_massa",
      "fn_escale_decidir_exportacao",
      "fn_crm_acoes_em_massa_trava_da_decisao",
    ]) {
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
    }
    expect(MIGRATION.match(/'contatos\.acao_em_massa_requested'/g)?.length).toBe(2);
    expect(MIGRATION).not.toMatch(/security definer/);
  });

  it("a exportação espera aprovação: os status, as policies do admin, a trava e os 7 dias", () => {
    expect(MIGRATION).toContain("'aguardando_aprovacao'");
    expect(MIGRATION).toContain("'recusada'");
    expect(MIGRATION).toContain("create policy crm_acoes_em_massa_select_admin");
    expect(MIGRATION).toContain("create policy crm_acoes_em_massa_decisao");
    expect(MIGRATION).toContain("create trigger trg_crm_acoes_em_massa_trava_da_decisao");
    expect(MIGRATION).toContain("interval '7 days'");
  });

  it("as duas tabelas têm RLS e as travas do suporte; o bucket é privado", () => {
    expect(MIGRATION).toContain("alter table public.crm_acoes_em_massa enable row level security;");
    expect(MIGRATION).toContain("alter table public.crm_acoes_em_massa_itens enable row level security;");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
    expect(MIGRATION).toMatch(/'exportacoes-das-listas',\s*'exportacoes-das-listas',\s*false/);
  });

  it("o baseline traz o mesmo bloco, depois do da 9102", () => {
    const i9102 = BASELINE.indexOf("FORK ESCALE · filtros da lista de contatos (migration 9102)");
    const i9103 = BASELINE.indexOf("FORK ESCALE · ações em massa das listas (migration 9103)");
    expect(i9102).toBeGreaterThan(-1);
    expect(i9103).toBeGreaterThan(i9102);
    expect(BASELINE).toContain(MIGRATION.trimEnd());
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-migration.test.ts`
Expected: FAIL.

- [ ] **Step 3: A migration**

Create `supabase/migrations/20261101120000_9103_acoes_em_massa.sql` (a primeira linha é uma só, comprida):

```sql
-- manifest: **Ações em massa das listas (fork Escale, Fase 2B).** A ação pedida (`crm_acoes_em_massa`: criar negócios, incluir ou remover tag, exportar, excluir; só gerente ou acima cria; cada um vê as suas, e o admin vê as exportações da organização que esperam ou tiveram decisão) e os contatos que ela alcança (`crm_acoes_em_massa_itens`), resolvidos de uma vez com a RLS de quem pede por `fn_escale_criar_acao_em_massa` (invoker), que também emite `contatos.acao_em_massa_requested` para o consumidor do `event_log` — menos na exportação, que nasce `aguardando_aprovacao` e espera um admin diferente de quem pediu (`fn_escale_decidir_exportacao`, invoker: aprova com o evento na mesma transação, ou recusa; o pedido vence em 7 dias), salvo quando quem pede é o único admin ativo (`fn_escale_admin_unico`, invoker); o gatilho `trg_crm_acoes_em_massa_trava_da_decisao` não deixa a decisão mudar mais nada; bucket privado `exportacoes-das-listas` para o CSV exportado (só o service role).
-- 9103: ações em massa da lista de contatos (fork Escale, Frente B).

-- ── 1. As tabelas ────────────────────────────────────────────────────────────
create table if not exists public.crm_acoes_em_massa (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  acao text not null,
  parametros jsonb not null default '{}'::jsonb,
  status text not null default 'preparando',
  total integer not null default 0,
  feitos integer not null default 0,
  falhas integer not null default 0,
  erros jsonb not null default '[]'::jsonb,
  arquivo text,
  expira_em timestamptz,
  -- Quem aprovou ou recusou a exportação, e quando (Q4). Sem FK: a pessoa pode sair da organização.
  decidido_por uuid,
  decidido_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_acoes_em_massa_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_acoes_em_massa_acao_valida
    check (acao in ('criar_negocios', 'incluir_tag', 'remover_tag', 'exportar', 'excluir')),
  constraint crm_acoes_em_massa_status_valido
    check (status in ('preparando', 'aguardando_aprovacao', 'na_fila', 'processando', 'concluida', 'falhou', 'recusada')),
  constraint crm_acoes_em_massa_aprovacao_so_na_exportacao
    check (acao = 'exportar' or (status not in ('aguardando_aprovacao', 'recusada') and decidido_por is null)),
  constraint crm_acoes_em_massa_decisao_coerente
    check ((decidido_por is null) = (decidido_em is null)),
  constraint crm_acoes_em_massa_parametros_objeto
    check (jsonb_typeof(parametros) = 'object' and octet_length(parametros::text) <= 8192),
  constraint crm_acoes_em_massa_erros_lista
    check (jsonb_typeof(erros) = 'array' and octet_length(erros::text) <= 32768),
  constraint crm_acoes_em_massa_contagens
    check (total between 0 and 100000 and feitos >= 0 and falhas >= 0),
  constraint crm_acoes_em_massa_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_acoes_em_massa_pessoa
  on public.crm_acoes_em_massa (user_id, organization_id, created_at desc);
create index if not exists idx_crm_acoes_em_massa_arquivo
  on public.crm_acoes_em_massa (organization_id, expira_em) where arquivo is not null;
create index if not exists idx_crm_acoes_em_massa_aprovacao
  on public.crm_acoes_em_massa (organization_id, created_at) where status = 'aguardando_aprovacao';

-- Sem FK no contato: excluir em massa apaga o próprio contato do item.
create table if not exists public.crm_acoes_em_massa_itens (
  acao_id uuid not null references public.crm_acoes_em_massa(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  posicao integer not null,
  feito boolean not null default false,
  primary key (acao_id, contact_id)
);

create index if not exists idx_crm_acoes_em_massa_itens_fila
  on public.crm_acoes_em_massa_itens (acao_id, feito, posicao);

-- ── 2. O único admin (Q4) ────────────────────────────────────────────────────
-- Quem chama é admin e é o ÚNICO admin ativo da organização? Aí a exportação não
-- espera aprovação. Invoker: a policy `user_orgs_select` (0044) deixa gerente e
-- admin lerem o quadro de membros; para quem não é admin, a resposta já é "não".
create or replace function public.fn_escale_admin_unico(p_org uuid)
returns boolean
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select public.fn_role_at_least(p_org, 'admin')
     and (select count(*)
            from public.user_organizations u
           where u.organization_id = p_org
             and u.role = 'admin'
             and u.revoked_at is null) = 1
$$;

revoke all on function public.fn_escale_admin_unico(uuid) from public, anon;
grant execute on function public.fn_escale_admin_unico(uuid) to authenticated, service_role;

-- ── 3. RLS ───────────────────────────────────────────────────────────────────
alter table public.crm_acoes_em_massa enable row level security;
alter table public.crm_acoes_em_massa_itens enable row level security;

drop policy if exists crm_acoes_em_massa_select on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_select_admin on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_insert on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_preparo on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_decisao on public.crm_acoes_em_massa;
drop policy if exists crm_acoes_em_massa_itens_select on public.crm_acoes_em_massa_itens;
drop policy if exists crm_acoes_em_massa_itens_insert on public.crm_acoes_em_massa_itens;

-- Cada um vê as suas ações.
create policy crm_acoes_em_massa_select on public.crm_acoes_em_massa
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

-- O admin vê as exportações da organização que esperam decisão ou já foram
-- decididas (o painel "Exportações"). As outras ações das outras pessoas, não.
create policy crm_acoes_em_massa_select_admin on public.crm_acoes_em_massa
  for select using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and (status = 'aguardando_aprovacao' or decidido_por is not null)
  );

-- Só gerente ou acima pede; nasce "preparando", zerada, sem arquivo e sem decisão.
create policy crm_acoes_em_massa_insert on public.crm_acoes_em_massa
  for insert with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'manager')
    and user_id = auth.uid()
    and status = 'preparando'
    and total = 0 and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
    and decidido_por is null and decidido_em is null
  );

-- Quem pediu só fecha o preparo: "na_fila", ou "aguardando_aprovacao" na exportação.
-- A exportação só vai direto para a fila quando quem pede é o ÚNICO admin ativo (Q4):
-- pelo PostgREST, ninguém pula a aprovação. O resto é do consumidor (service role).
create policy crm_acoes_em_massa_preparo on public.crm_acoes_em_massa
  for update
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and user_id = auth.uid()
    and status = 'preparando'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and user_id = auth.uid()
    and status in ('preparando', 'aguardando_aprovacao', 'na_fila')
    and (status <> 'aguardando_aprovacao' or acao = 'exportar')
    and (status <> 'na_fila' or acao <> 'exportar' or public.fn_escale_admin_unico(organization_id))
    and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
    and decidido_por is null and decidido_em is null
  );

-- O admin decide a exportação de OUTRA pessoa enquanto ela espera e não venceu
-- (7 dias): só "na_fila" ou "recusada", com a decisão em nome dele. O gatilho da
-- trava (seção 4) garante que nada mais muda na mesma escrita.
create policy crm_acoes_em_massa_decisao on public.crm_acoes_em_massa
  for update
  using (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and status = 'aguardando_aprovacao'
    and user_id <> auth.uid()
    and created_at > now() - interval '7 days'
  )
  with check (
    (organization_id in (select public.fn_user_org_ids()))
    and public.fn_role_at_least(organization_id, 'admin')
    and acao = 'exportar'
    and status in ('na_fila', 'recusada')
    and user_id <> auth.uid()
    and decidido_por = auth.uid()
    and decidido_em is not null
    and feitos = 0 and falhas = 0
    and arquivo is null and expira_em is null
  );

-- Os itens, só de quem pediu.
create policy crm_acoes_em_massa_itens_select on public.crm_acoes_em_massa_itens
  for select using (
    exists (
      select 1 from public.crm_acoes_em_massa a
       where a.id = crm_acoes_em_massa_itens.acao_id
         and a.user_id = auth.uid())
  );

create policy crm_acoes_em_massa_itens_insert on public.crm_acoes_em_massa_itens
  for insert with check (
    exists (
      select 1 from public.crm_acoes_em_massa a
       where a.id = crm_acoes_em_massa_itens.acao_id
         and a.organization_id = crm_acoes_em_massa_itens.organization_id
         and a.user_id = auth.uid()
         and a.status = 'preparando')
  );

revoke all on public.crm_acoes_em_massa from anon;
revoke all on public.crm_acoes_em_massa_itens from anon;
grant select, insert, update on public.crm_acoes_em_massa to authenticated;
grant select, insert on public.crm_acoes_em_massa_itens to authenticated;
grant all on public.crm_acoes_em_massa to service_role;
grant all on public.crm_acoes_em_massa_itens to service_role;

drop trigger if exists trg_crm_acoes_em_massa_updated_at on public.crm_acoes_em_massa;
create trigger trg_crm_acoes_em_massa_updated_at
  before update on public.crm_acoes_em_massa
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_acoes_em_massa is
  'Ações em massa das listas da casca (fork Escale, migration 9103), como bulk_params da Clint. Quem pediu (gerente+) cria e vê; a exportação espera a aprovação de outro admin (salvo o único admin); o consumidor do event_log processa com o service role.';

-- ── 4. A trava da decisão ────────────────────────────────────────────────────
-- Do aguardo só se sai para a fila ou para a recusa, com quem decidiu e quando, e
-- nada mais muda na mesma escrita (nem a ação, nem a contagem, nem o arquivo, nem
-- quem pediu). Fora do aguardo, a decisão não se mexe. `created_at` fica de fora:
-- só serve ao vencimento, e mudá-lo pela API exige sair do aguardo (as policies).
create or replace function public.fn_crm_acoes_em_massa_trava_da_decisao()
returns trigger
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  if old.status = 'aguardando_aprovacao' then
    if (new.id, new.organization_id, new.user_id, new.lista, new.acao, new.parametros, new.total,
        new.feitos, new.falhas, new.erros, new.arquivo, new.expira_em)
       is distinct from
       (old.id, old.organization_id, old.user_id, old.lista, old.acao, old.parametros, old.total,
        old.feitos, old.falhas, old.erros, old.arquivo, old.expira_em) then
      raise exception 'crm_acoes_em_massa_trava_da_decisao: na decisão, só o status e quem decidiu mudam'
        using errcode = 'check_violation';
    end if;
    if new.status is distinct from old.status then
      if new.status not in ('na_fila', 'recusada') or new.decidido_por is null or new.decidido_em is null then
        raise exception 'crm_acoes_em_massa_trava_da_decisao: do aguardo só se sai para a fila ou para a recusa, com quem decidiu'
          using errcode = 'check_violation';
      end if;
    elsif (new.decidido_por, new.decidido_em) is distinct from (old.decidido_por, old.decidido_em) then
      raise exception 'crm_acoes_em_massa_trava_da_decisao: a decisão só se grava ao sair do aguardo'
        using errcode = 'check_violation';
    end if;
  elsif (new.decidido_por, new.decidido_em) is distinct from (old.decidido_por, old.decidido_em) then
    raise exception 'crm_acoes_em_massa_trava_da_decisao: a decisão só se grava ao sair do aguardo'
      using errcode = 'check_violation';
  end if;
  return new;
end;
$$;

revoke all on function public.fn_crm_acoes_em_massa_trava_da_decisao() from public, anon;

drop trigger if exists trg_crm_acoes_em_massa_trava_da_decisao on public.crm_acoes_em_massa;
create trigger trg_crm_acoes_em_massa_trava_da_decisao
  before update on public.crm_acoes_em_massa
  for each row execute function public.fn_crm_acoes_em_massa_trava_da_decisao();

-- ── 5. Pedir a ação ──────────────────────────────────────────────────────────
-- A ação inteira numa transação, com a RLS de quem pede: grava a ação, resolve os
-- contatos (ids marcados, ou o filtro: todos ou os N primeiros, menos os desmarcados),
-- fecha o preparo e emite o evento. Vazia ou acima de 100.000: nada fica gravado.
-- Exportar espera a aprovação de um admin (Q4), sem evento, salvo o único admin ativo.
create or replace function public.fn_escale_criar_acao_em_massa(
  p_org uuid,
  p_acao text,
  p_parametros jsonb,
  p_ids uuid[],
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_filtros jsonb,
  p_quantidade integer,
  p_excluidos uuid[]
)
returns table (acao_id uuid, quantidade integer, status text)
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
#variable_conflict use_column
declare
  v_id uuid;
  v_total integer;
  v_status text;
begin
  insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao, parametros)
  values (p_org, auth.uid(), 'contatos', p_acao, coalesce(p_parametros, '{}'::jsonb))
  returning id into v_id;

  if p_ids is not null then
    insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao)
    select v_id, p_org, c.id,
           row_number() over (order by c.last_activity_at desc nulls last, c.id desc)
      from public.contacts c
     where c.organization_id = p_org
       and c.id = any(p_ids)
       and c.is_merged_into is null;
  else
    insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao)
    select v_id, p_org, s.contact_id, s.posicao
      from (
        select f.contact_id,
               row_number() over (order by f.last_activity_at desc nulls last, f.contact_id desc) as posicao
          from public.fn_escale_contatos_do_filtro(p_org, p_visao, p_padrao, p_digitos, p_cpf_hash, p_filtros) f
      ) s
     where s.posicao <= least(coalesce(p_quantidade, 100001), 100001)
       and not (s.contact_id = any(coalesce(p_excluidos, '{}'::uuid[])));
  end if;
  get diagnostics v_total = row_count;

  if v_total = 0 then
    raise exception 'acao_em_massa_vazia: nenhum contato selecionado' using errcode = 'P0001';
  end if;
  if v_total > 100000 then
    raise exception 'acao_em_massa_grande_demais: no máximo 100.000 contatos por ação' using errcode = 'P0001';
  end if;

  v_status := case
    when p_acao = 'exportar' and not public.fn_escale_admin_unico(p_org) then 'aguardando_aprovacao'
    else 'na_fila'
  end;
  update public.crm_acoes_em_massa set total = v_total, status = v_status where id = v_id;

  if v_status = 'na_fila' then
    perform public.emit_event(
      'contatos.acao_em_massa_requested',
      'crm_acao_em_massa',
      v_id,
      jsonb_build_object('acao_id', v_id),
      '{}'::jsonb,
      p_org
    );
  end if;

  return query select v_id, v_total, v_status;
end;
$$;

revoke all on function public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[]) from public, anon;
grant execute on function public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[]) to authenticated, service_role;

-- ── 6. Decidir a exportação (Q4) ─────────────────────────────────────────────
-- Um admin da organização, diferente de quem pediu, aprova (fila + evento, na mesma
-- transação) ou recusa. O pedido vence em 7 dias (calculado de `created_at`, sem cron).
-- Invoker: quem não é admin nem enxerga o pedido de outra pessoa (cai em "inexistente").
create or replace function public.fn_escale_decidir_exportacao(p_acao uuid, p_aprovar boolean)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_dono uuid;
  v_acao text;
  v_status text;
  v_criada timestamptz;
  v_novo text := case when p_aprovar then 'na_fila' else 'recusada' end;
  v_linhas integer;
begin
  select a.organization_id, a.user_id, a.acao, a.status, a.created_at
    into v_org, v_dono, v_acao, v_status, v_criada
    from public.crm_acoes_em_massa a
   where a.id = p_acao;
  if not found then
    raise exception 'acao_em_massa_inexistente: pedido de exportação não encontrado' using errcode = 'P0001';
  end if;
  if not public.fn_role_at_least(v_org, 'admin') then
    raise exception 'acao_em_massa_sem_permissao: só um administrador decide a exportação' using errcode = 'P0001';
  end if;
  if v_acao <> 'exportar' or v_status <> 'aguardando_aprovacao' then
    raise exception 'acao_em_massa_nao_aguarda: o pedido já foi decidido' using errcode = 'P0001';
  end if;
  if v_criada <= now() - interval '7 days' then
    raise exception 'acao_em_massa_expirada: o pedido passou de 7 dias' using errcode = 'P0001';
  end if;
  if v_dono = auth.uid() then
    raise exception 'acao_em_massa_propria: outro administrador precisa decidir' using errcode = 'P0001';
  end if;

  update public.crm_acoes_em_massa
     set status = v_novo, decidido_por = auth.uid(), decidido_em = now()
   where id = p_acao
     and status = 'aguardando_aprovacao';
  get diagnostics v_linhas = row_count;
  if v_linhas = 0 then
    raise exception 'acao_em_massa_nao_aguarda: o pedido já foi decidido' using errcode = 'P0001';
  end if;

  if p_aprovar then
    perform public.emit_event(
      'contatos.acao_em_massa_requested',
      'crm_acao_em_massa',
      p_acao,
      jsonb_build_object('acao_id', p_acao),
      jsonb_build_object('aprovado_por', auth.uid()),
      v_org
    );
  end if;
  return v_novo;
end;
$$;

revoke all on function public.fn_escale_decidir_exportacao(uuid, boolean) from public, anon;
grant execute on function public.fn_escale_decidir_exportacao(uuid, boolean) to authenticated, service_role;

-- ── 7. O CSV exportado: privado, sem policy (só o service role grava e assina a URL)
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('exportacoes-das-listas', 'exportacoes-das-listas', false, 104857600, array['text/csv'])
on conflict (id) do nothing;

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

Repare:
- `#variable_conflict use_column` evita que `acao_id` e `status` (as colunas de saída) colidam com as colunas das tabelas dentro do `insert` e do `update`.
- A função de pedir é invoker, então o `update` para "na_fila" de uma exportação passa pela policy `crm_acoes_em_massa_preparo`, que só deixa quando `fn_escale_admin_unico` diz sim. A regra mora no banco, não só na função.
- A decisão também é invoker: o `update` passa pela policy `crm_acoes_em_massa_decisao` (admin, outra pessoa, não vencido) e pelo gatilho da trava; a linha nova continua visível ao admin pela `crm_acoes_em_massa_select_admin` (`decidido_por is not null`), como o Postgres exige no `update`.
- Um admin que fizer o `update` direto pelo PostgREST, em vez de chamar a função, só consegue deixar a exportação "na_fila" **sem evento** (parada, sem arquivo): nada vaza e nada se forja. Quem tem o poder de aprovar é ele mesmo.

- [ ] **Step 4: O baseline e a varredura**

```bash
node - <<'JS'
const fs = require("fs");
const ARQ = "supabase/baseline.sql";
const MARCO = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const base = fs.readFileSync(ARQ, "utf8");
if (base.includes("FORK ESCALE · ações em massa das listas (migration 9103)")) process.exit(0);
const i = base.indexOf(MARCO);
if (i < 0 || i < base.indexOf("(migration 9102)")) throw new Error("marco da 0323 ou bloco 9102 fora do lugar");
const sql = fs.readFileSync("supabase/migrations/20261101120000_9103_acoes_em_massa.sql", "utf8").trimEnd();
fs.writeFileSync(ARQ, base.slice(0, i) + `-- ---- FORK ESCALE · ações em massa das listas (migration 9103) ----\n${sql}\n\n` + base.slice(i));
console.log("bloco 9103 inserido");
JS
```

Em `tests/invariants/rls-completude-varredura.test.ts`, logo depois da entrada de `crm_filtros_das_listas`:

```ts
  {
    tabela: "crm_acoes_em_massa",
    razao:
      "tests/invariants/escale-acoes-em-massa.test.ts — fork Escale (migration 9103): só gerente+ cria, cada um vê as suas " +
      "(zero para os outros; o admin vê só as exportações que esperam ou tiveram decisão), quem pediu só fecha o preparo e " +
      "não põe exportação na fila sem ser o único admin, o admin decide a exportação de outra pessoa em até 7 dias e a trava " +
      "não deixa a decisão mudar mais nada; CHECKs e FK da pessoa.",
  },
  {
    tabela: "crm_acoes_em_massa_itens",
    razao:
      "tests/invariants/escale-acoes-em-massa.test.ts — fork Escale (migration 9103): itens só da ação de quem pediu, " +
      "só enquanto ela está em preparo; zero para os outros.",
  },
```

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-migration.test.ts`
Expected: PASS.

- [ ] **Step 5: A prova no Postgres**

Create `tests/invariants/escale-acoes-em-massa.test.ts`:

```ts
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import {
  GOV_ADMIN,
  GOV_AGENT_A,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * AÇÕES EM MASSA (fork Escale, migration 9103) — prova contra Postgres real: a
 * função resolve os contatos (ids, filtro, os N primeiros, menos os desmarcados)
 * com a RLS de quem pede, emite o evento, recusa vazio, só gerente+ cria, e cada
 * um só vê e mexe nas suas. A exportação espera a aprovação de OUTRO admin (Q4),
 * vence em 7 dias, e o único admin ativo não espera. Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9103-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9103-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9103-4000-8000-0000000000c3";
/** O 2º admin da GOV_ORG: só deste arquivo (sai no afterAll). */
const ADMIN_2 = "e5ca1e00-9103-4000-8000-0000000000a2";
/** Uma organização com um admin só, para a exportação que não espera. */
const ORG_SO = "e5ca1e00-9103-4000-8000-0000000000e1";
const ADMIN_SO = "e5ca1e00-9103-4000-8000-0000000000e2";
const C_SO = "e5ca1e00-9103-4000-8000-0000000000e3";
const FILTRO = `'{"fuso":"UTC"}'::jsonb`;

type Extra = { ids?: string; quantidade?: string; excluidos?: string; busca?: string; org?: string };
const criar = (acao: string, extra: Extra = {}) =>
  `select quantidade from public.fn_escale_criar_acao_em_massa('${extra.org ?? GOV_ORG}', '${acao}', '{}'::jsonb, ${
    extra.ids ?? "null"
  }, 'todos', '${extra.busca ?? "massadois"}', null, null, ${FILTRO}, ${extra.quantidade ?? "null"}, ${
    extra.excluidos ?? "null"
  })`;
const ultima = (org = GOV_ORG) =>
  sql(`select id from public.crm_acoes_em_massa where organization_id = '${org}' order by created_at desc, id desc limit 1;`).trim();
const statusDe = (id: string) => sql(`select status from public.crm_acoes_em_massa where id = '${id}';`).trim();
const decididoPor = (id: string) =>
  sql(`select decidido_por from public.crm_acoes_em_massa where id = '${id}';`).trim();
const eventosDe = (id: string) =>
  Number(
    sql(`select count(*) from public.event_log where event_type = 'contatos.acao_em_massa_requested' and entity_id = '${id}';`).trim(),
  );
const decidir = (id: string, aprovar: boolean) =>
  `select count(*) from (select public.fn_escale_decidir_exportacao('${id}', ${aprovar})) x`;
/** Pede a exportação de um contato e devolve o id da ação. */
const pedirExportacao = (quem: string, org = GOV_ORG, contato = C1) => {
  expect(countAs(quem, criar("exportar", { org, ids: `array['${contato}']::uuid[]` }))).toBe(1);
  return ultima(org);
};

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_acoes_em_massa where organization_id in ('${GOV_ORG}', '${ORG_SO}');
    delete from public.contacts where id::text like 'e5ca1e00-9103-%';
    insert into auth.users (id, email) values
      ('${ADMIN_2}', 'massa-admin-2@invariant.test'),
      ('${ADMIN_SO}', 'massa-admin-so@invariant.test')
      on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${ADMIN_2}', '${GOV_ORG}', 'admin', now()) on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_SO}', 'massa-admin-unico', 'Massa Admin Unico', 'Massa SO') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${ADMIN_SO}', '${ORG_SO}', 'admin', now()) on conflict do nothing;
    insert into public.contacts (id, organization_id, display_name, last_activity_at) values
      ('${C1}', '${GOV_ORG}', 'Massadois Um', now()),
      ('${C2}', '${GOV_ORG}', 'Massadois Dois', now() - interval '1 day'),
      ('${C3}', '${GOV_ORG}', 'Massadois Tres', now() - interval '2 days'),
      ('${C_SO}', '${ORG_SO}', 'Massadois Sozinho', now());
  `);
});

afterAll(() => {
  // Os outros testes da GOV_ORG contam com um admin só.
  sql(`delete from public.user_organizations where user_id = '${ADMIN_2}' and organization_id = '${GOV_ORG}';`);
});

describe("fn_escale_criar_acao_em_massa", () => {
  it("pelo filtro: todos os da busca, com os itens e o evento", () => {
    expect(countAs(GOV_MANAGER, criar("incluir_tag"))).toBe(3);
    const id = ultima();
    expect(Number(sql(`select count(*) from public.crm_acoes_em_massa_itens where acao_id = '${id}';`).trim())).toBe(3);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("os N primeiros menos os desmarcados", () => {
    expect(countAs(GOV_MANAGER, criar("remover_tag", { quantidade: "2", excluidos: `array['${C1}']::uuid[]` }))).toBe(1);
    const id = ultima();
    expect(sql(`select contact_id from public.crm_acoes_em_massa_itens where acao_id = '${id}';`).trim()).toBe(C2);
  });

  it("pelos ids: só os da organização", () => {
    expect(
      countAs(GOV_MANAGER, criar("excluir", { ids: `array['${C3}', 'e5ca1e00-9103-4000-8000-0000000000ff']::uuid[]` })),
    ).toBe(1);
  });

  it("vazia é recusada e não deixa nada gravado", () => {
    const antes = sql(`select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}';`).trim();
    expect(() => countAs(GOV_MANAGER, criar("incluir_tag", { busca: "ninguemtemessenome" }))).toThrow(/acao_em_massa_vazia/);
    expect(sql(`select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}';`).trim()).toBe(antes);
  });

  it("atendente não cria", () => {
    expect(() => countAs(GOV_AGENT_A, criar("incluir_tag"))).toThrow();
  });

  it("as funções são invoker e fechadas ao anon", () => {
    expect(
      sql(
        `select count(*) from pg_proc where proname in ('fn_escale_criar_acao_em_massa','fn_escale_decidir_exportacao','fn_escale_admin_unico','fn_crm_acoes_em_massa_trava_da_decisao') and prosecdef;`,
      ).trim(),
    ).toBe("0");
    expect(
      sql(
        `select has_function_privilege('anon', 'public.fn_escale_criar_acao_em_massa(uuid, text, jsonb, uuid[], text, text, text[], text, jsonb, integer, uuid[])', 'execute');`,
      ).trim(),
    ).toBe("f");
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_decidir_exportacao(uuid, boolean)', 'execute');`).trim(),
    ).toBe("f");
  });
});

describe("exportar com aprovação (Q4)", () => {
  it("o pedido do gerente espera aprovação, sem evento", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(eventosDe(id)).toBe(0);
  });

  it("gerente e atendente não aprovam", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(() => countAs(GOV_MANAGER, decidir(id, true))).toThrow(/acao_em_massa_sem_permissao/);
    expect(() => countAs(GOV_AGENT_A, decidir(id, true))).toThrow(/acao_em_massa_inexistente/);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
  });

  it("um admin aprova: vai para a fila, com quem decidiu e UM evento; decidir de novo é recusado", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(countAs(GOV_ADMIN, decidir(id, true))).toBe(1);
    expect(statusDe(id)).toBe("na_fila");
    expect(decididoPor(id)).toBe(GOV_ADMIN);
    expect(eventosDe(id)).toBe(1);
    expect(() => countAs(ADMIN_2, decidir(id, true))).toThrow(/acao_em_massa_nao_aguarda/);
    expect(eventosDe(id)).toBe(1);
  });

  it("o pedido de um admin precisa de OUTRO admin", () => {
    const id = pedirExportacao(GOV_ADMIN);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(() => countAs(GOV_ADMIN, decidir(id, true))).toThrow(/acao_em_massa_propria/);
    expect(countAs(ADMIN_2, decidir(id, true))).toBe(1);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("recusar: fica 'recusada', com quem decidiu, sem evento", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(countAs(ADMIN_2, decidir(id, false))).toBe(1);
    expect(statusDe(id)).toBe("recusada");
    expect(decididoPor(id)).toBe(ADMIN_2);
    expect(eventosDe(id)).toBe(0);
  });

  it("vencido (mais de 7 dias) não se aprova", () => {
    const id = pedirExportacao(GOV_MANAGER);
    sql(`update public.crm_acoes_em_massa set created_at = now() - interval '8 days' where id = '${id}';`);
    expect(() => countAs(GOV_ADMIN, decidir(id, true))).toThrow(/acao_em_massa_expirada/);
    expect(statusDe(id)).toBe("aguardando_aprovacao");
    expect(eventosDe(id)).toBe(0);
  });

  it("o único admin ativo exporta sem esperar", () => {
    const id = pedirExportacao(ADMIN_SO, ORG_SO, C_SO);
    expect(statusDe(id)).toBe("na_fila");
    expect(eventosDe(id)).toBe(1);
  });

  it("o admin enxerga as exportações da organização que esperam ou foram decididas; o resto, não", () => {
    expect(
      countAs(
        GOV_ADMIN,
        `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}' and acao = 'exportar' and status = 'aguardando_aprovacao'`,
      ),
    ).toBeGreaterThan(0);
    expect(
      countAs(GOV_ADMIN, `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}' and acao <> 'exportar'`),
    ).toBe(0);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_acoes_em_massa where user_id = '${GOV_MANAGER}'`)).toBe(0);
  });

  it("na decisão, nada além do status e de quem decidiu muda (a trava)", () => {
    const id = pedirExportacao(GOV_MANAGER);
    expect(() => writeCountAs(GOV_ADMIN, `update public.crm_acoes_em_massa set total = 99 where id = '${id}'`)).toThrow(
      /crm_acoes_em_massa_trava_da_decisao/,
    );
    expect(statusDe(id)).toBe("aguardando_aprovacao");
  });

  it("pelo PostgREST, quem pede não pula a aprovação", () => {
    expect(
      writeCountAs(
        GOV_MANAGER,
        `insert into public.crm_acoes_em_massa (organization_id, user_id, lista, acao) values ('${GOV_ORG}', '${GOV_MANAGER}', 'contatos', 'exportar')`,
      ),
    ).toBe(1);
    expect(
      writeCountAs(
        GOV_MANAGER,
        `update public.crm_acoes_em_massa set status = 'na_fila' where user_id = '${GOV_MANAGER}' and acao = 'exportar' and status = 'preparando'`,
      ),
    ).toBe(0);
  });
});

describe("RLS das ações", () => {
  it("cada um vê só as suas; ninguém mexe em ação já na fila", () => {
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_acoes_em_massa`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_acoes_em_massa_itens`)).toBe(0);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_acoes_em_massa where organization_id = '${GOV_ORG}'`)).toBeGreaterThan(0);
    expect(
      writeCountAs(GOV_MANAGER, `update public.crm_acoes_em_massa set status = 'concluida' where organization_id = '${GOV_ORG}'`),
    ).toBe(0);
  });

  it("ninguém põe item na ação de outro", () => {
    const id = ultima();
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_acoes_em_massa_itens (acao_id, organization_id, contact_id, posicao) values ('${id}', '${GOV_ORG}', '${C1}', 9)`,
      ),
    ).toBe(0);
  });

  it("o bucket da exportação é privado", () => {
    expect(sql(`select public from storage.buckets where id = 'exportacoes-das-listas';`).trim()).toBe("f");
  });
});
```

Confira antes de rodar (leia `tests/invariants/gov-helpers.ts`):
- `writeCountAs` devolve 0 quando a RLS recusa (o `stderr` traz "row-level security") e relança qualquer outro erro: é por isso que a trava (um `raise` do gatilho, que roda antes do `with check`) aparece como `toThrow(/crm_acoes_em_massa_trava_da_decisao/)` e a policy como `toBe(0)`.
- O `update ... set status = 'concluida'` do gerente acha a linha "preparando" que o último teste de "exportar com aprovação" deixou: o `with check` do preparo recusa "concluida", e o resultado continua 0.
- Se `organizations` exigir outra coluna no insert, copie a lista do `seedGov` (L165).
- Se algum outro arquivo de `tests/invariants` contar os admins da `GOV_ORG` e rodar ao mesmo tempo que este, o `afterAll` já tirou o `ADMIN_2`; se o `test:db` rodar os arquivos em paralelo e algum quebrar por isso, troque o `ADMIN_2` por uma terceira organização com dois admins, no molde da `ORG_SO`.

```bash
docker info > /dev/null 2>&1 || { echo "Docker fechado: PARE e peça ao usuário"; exit 1; }
corepack pnpm test:db tests/invariants/escale-acoes-em-massa.test.ts tests/invariants/escale-filtros-de-contatos.test.ts tests/invariants/rls-completude-varredura.test.ts tests/invariants/rbac-config-ia-canais.test.ts tests/invariants/travas-de-suporte-cobrem-toda-tabela-na-instalacao.test.ts tests/invariants/definer-membership-varredura.test.ts tests/invariants/definer-nova-nasce-exposta.test.ts tests/invariants/hardening-definer-varredura.test.ts > .superpowers/sdd/2b-task7-db.log 2>&1
tail -40 .superpowers/sdd/2b-task7-db.log
```

Expected: tudo verde.

- [ ] **Step 6: Revisor (subagente) da migration e da RLS**

Pontos: o insert e o update de quem pede não deixam forjar status, contagem, arquivo ou decisão; ninguém põe exportação "na_fila" pelo PostgREST sem ser o único admin; a policy do admin só sai do aguardo para "na_fila"/"recusada", com `decidido_por = auth.uid()`, quem pediu ≠ quem decide e dentro dos 7 dias; o gatilho da trava cobre todas as colunas que importam; a linha decidida continua visível ao admin (o Postgres confere a linha nova contra a policy de leitura no `update`); `fn_escale_admin_unico` lê `user_organizations` com a RLS de quem chama (policy 0044) e é invoker, sem `security definer`; os itens só entram na ação de quem pede enquanto em preparo e só ele os lê; as funções são invoker (a RLS de `contacts` e de `crm_leads` vale na resolução do filtro); vazio e acima de 100.000 desfazem tudo; o evento sai na mesma transação (ao pedir, ou ao aprovar); o bucket não tem policy.

- [ ] **Step 7: Commit**

```bash
git add supabase/migrations/20261101120000_9103_acoes_em_massa.sql supabase/baseline.sql tests/unit/escale-acoes-em-massa-migration.test.ts tests/invariants/escale-acoes-em-massa.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9103 — ações em massa e exportação com aprovação (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A seleção (pura), o CSV e o consumidor das ações

**Files:**
- Create: `lib/escale/contatos/selecao.ts`, `lib/escale/contatos/excluir.ts`, `lib/escale/massa/tipos.ts`, `lib/escale/massa/csv-de-contatos.ts`, `lib/escale/massa/executar.ts`, `lib/escale/massa/handler.ts`, `tests/unit/escale-selecao-de-contatos.test.ts`, `tests/unit/escale-acoes-em-massa-executar.test.ts`, `tests/unit/escale-excluir-contato-com-negocios.test.ts`
- Modify: `lib/event-log/register-handlers.ts`, `tests/unit/dispatcher-org-parada.test.ts`

**Interfaces:**
- Consumes: `VisaoDeContatos`, `formatarTelefone`, `instagramDoLink` (2A); `fusoDaOrganizacao` (Task 3); `celula` (`lib/escale/exportar/csv-do-quadro.ts`); `lerLinks` (`lib/leads/links-de-contato.ts`); `nomeDoContato` (`lib/contacts/rotulo-do-contato.ts`); `normalizarTags` (`lib/contacts/tag-normalizada.ts`); `createLeadHandler` (`app/api/v1/leads/_handler.ts`, L505), `patchContactHandler`, `vinculosDoContatoHandler` e `deleteContactHandler` (`app/api/v1/contacts/_handler.ts`, L577, L942 e L951); o caminho do "excluir em lote" de negócios do original (`app/api/v1/leads/bulk/route.ts`, `case "delete"` L489 e o evento/auditoria agregados logo depois: `lead.bulk_deleted`, `lead.bulk_action`); `audit` (`lib/audit`); `traduzir` (`lib/i18n/dicionario.ts`); `ApiError` (`lib/api/types.ts`); `EventHandler`, `EventRow`, `HandlerResult` (`lib/event-log/dispatcher.ts`); `createAdminClient` (`lib/supabase/admin.ts`). O precedente de chamar `createLeadHandler` com o service role é `lib/automation/actions/create-or-move-lead.ts` (L211).
- Produces:
  - `selecao.ts`: `IDS_MAX` (1000), `Selecao`, `SEM_SELECAO`, `SELECIONAR_TODOS`, `totalSelecionado(s, total)`, `linhaMarcada(s, id, indice)`, `alternarLinha(s, id, indice, marcar)`, `estadoDaPagina(s, linhas, primeiro)`, `marcarPagina(s, linhas, primeiro, marcar)`, `selecionarQuantidade(n, total)`, `todosMarcados(s)`, `AlvoDaAcao`, `alvoDaSelecao(s, consulta)`.
  - `excluir.ts`: `excluirContatoComNegocios(db, ctx, contactId): Promise<{ id: string; negocios: number }>` (Q5: trava da Agenda, os negócios do contato, o contato).
  - `tipos.ts`: `ACOES_EM_MASSA`, `AcaoEmMassa`, `pedidoDeAcaoSchema`, `PedidoDeAcao`, `StatusDaAcao`, `StatusVisivel`, `VALIDADE_DO_PEDIDO_MS` (7 dias), `statusVisivel(status, criadaEm, agora)`, `ResumoDaAcao`, `PedidoParaAprovar`, `AcoesDaPessoa`, `EVENTO_DA_ACAO_EM_MASSA`, `BUCKET_DAS_EXPORTACOES`.
  - `csv-de-contatos.ts`: `ContatoExportado`, `COLUNAS_EXPORTADAS`, `CABECALHO_DO_CSV`, `dataHoraBr(iso, fuso)`, `diaBr(dia)`, `linhaDoCsv(c, fuso)`, `csvDeContatos(linhas)`, `nomeDoArquivoDeContatos(agora, fuso)`.
  - `executar.ts`: `CONSUMIDOR_DA_ACAO_EM_MASSA`, `LOTE` (100), `ORCAMENTO_MS` (20 000), `ERROS_GUARDADOS` (50), `VALIDADE_DO_ARQUIVO_MS` (24 h), `Dependencias`, `processarAcaoEmMassa(row, deps): Promise<HandlerResult>`.
  - `handler.ts`: `acaoEmMassaHandler` ("roda").

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-selecao-de-contatos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  IDS_MAX,
  SELECIONAR_TODOS,
  SEM_SELECAO,
  alternarLinha,
  alvoDaSelecao,
  estadoDaPagina,
  linhaMarcada,
  marcarPagina,
  selecionarQuantidade,
  todosMarcados,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";

const pagina = [{ id: "a" }, { id: "b" }, { id: "c" }];

describe("seleção da lista de contatos (B3)", () => {
  it("a caixinha do cabeçalho marca e desmarca só a página", () => {
    const s = marcarPagina(SEM_SELECAO, pagina, 0, true);
    expect(estadoDaPagina(s, pagina, 0)).toBe(true);
    expect(totalSelecionado(s, 64001)).toBe(3);
    expect(estadoDaPagina(alternarLinha(s, "b", 1, false), pagina, 0)).toBe("indeterminada");
    expect(marcarPagina(s, pagina, 0, false)).toEqual(SEM_SELECAO);
  });

  it("marcados à mão valem entre páginas, até 1.000", () => {
    const s = marcarPagina(marcarPagina(SEM_SELECAO, pagina, 0, true), [{ id: "d" }], 10, true);
    expect(totalSelecionado(s, 64001)).toBe(4);
    const cheia: Selecao = { tipo: "ids", ids: Array.from({ length: IDS_MAX }, (_, i) => `x${i}`) };
    expect(alternarLinha(cheia, "novo", 0, true)).toBe(cheia);
  });

  it("todos: o total do filtro, e desmarcar uma linha a exclui", () => {
    const s = alternarLinha(SELECIONAR_TODOS, "b", 1, false);
    expect(totalSelecionado(s, 64001)).toBe(64000);
    expect(linhaMarcada(s, "b", 1)).toBe(false);
    expect(linhaMarcada(s, "z", 5000)).toBe(true);
    expect(todosMarcados(SELECIONAR_TODOS)).toBe(true);
    expect(todosMarcados(s)).toBe(false);
  });

  it("'Selecionar [N]': os N primeiros; N ≥ total = todos; 0 limpa", () => {
    const s = selecionarQuantidade(2, 10);
    expect(linhaMarcada(s, "a", 0)).toBe(true);
    expect(linhaMarcada(s, "c", 2)).toBe(false);
    expect(totalSelecionado(s, 10)).toBe(2);
    expect(selecionarQuantidade(10, 10)).toEqual(SELECIONAR_TODOS);
    expect(selecionarQuantidade(0, 10)).toEqual(SEM_SELECAO);
  });

  it("o alvo da ação: ids, ou o filtro com quantidade e excluídos (nunca a lista inteira de ids)", () => {
    expect(alvoDaSelecao({ tipo: "ids", ids: ["a"] }, { v: "todos" })).toEqual({ tipo: "ids", ids: ["a"] });
    expect(
      alvoDaSelecao({ tipo: "todos", quantidade: 50, excluidos: ["b"] }, { q: " ana ", v: "com_negocio", f: '{"telefone":"com"}' }),
    ).toEqual({ tipo: "filtro", q: "ana", v: "com_negocio", f: '{"telefone":"com"}', quantidade: 50, excluidos: ["b"] });
  });
});
```

Create `tests/unit/escale-acoes-em-massa-executar.test.ts`:

```ts
import { describe, expect, it, vi } from "vitest";

import type { EventRow } from "@/lib/event-log/dispatcher";
import { ApiError } from "@/lib/api/types";
import { csvDeContatos, dataHoraBr, linhaDoCsv } from "@/lib/escale/massa/csv-de-contatos";
import { ORCAMENTO_MS, processarAcaoEmMassa, type Dependencias } from "@/lib/escale/massa/executar";

const ORG = "cccccccc-0000-4000-8000-000000000001";
const ACAO = "aaaaaaaa-0000-4000-8000-000000000001";
const USER = "bbbbbbbb-0000-4000-8000-000000000001";

type Resposta = { data: unknown; error: { message: string } | null };

/** Supabase de mentira: cada tabela tem uma fila de respostas (uma por leitura); toda escrita fica anotada. */
function banco(filas: Record<string, Resposta[]>) {
  const anotado: Array<{ tabela: string; tipo: string; corpo?: unknown }> = [];
  const from = vi.fn((tabela: string) => {
    let escrita = false;
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "gt", "lt", "in", "not", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    const proxima = (): Resposta =>
      escrita ? { data: null, error: null } : (filas[tabela]?.shift() ?? { data: [], error: null });
    cadeia.maybeSingle = vi.fn(async () => proxima());
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(proxima()).then(ok);
    for (const tipo of ["update", "insert", "delete"]) {
      cadeia[tipo] = vi.fn((corpo?: unknown) => {
        escrita = true;
        anotado.push({ tabela, tipo, corpo });
        return cadeia;
      });
    }
    return cadeia;
  });
  const upload = vi.fn(async () => ({ data: {}, error: null }));
  const remove = vi.fn(async () => ({ data: [], error: null }));
  const storage = { from: vi.fn(() => ({ upload, remove })) };
  return { db: { from, storage } as never, anotado, upload, remove };
}

const evento = (attempts = 0): EventRow => ({
  id: "ev",
  organization_id: ORG,
  event_type: "contatos.acao_em_massa_requested",
  entity_kind: "crm_acao_em_massa",
  entity_id: ACAO,
  payload: { acao_id: ACAO },
  metadata: {},
  consumed_by: [],
  attempts,
});

const acao = (tipo: string, parametros: object = {}, extra: object = {}) => ({
  data: { id: ACAO, organization_id: ORG, user_id: USER, acao: tipo, parametros, status: "na_fila", total: 2, feitos: 0, falhas: 0, erros: [], ...extra },
  error: null,
});

function deps(db: never, extra: Partial<Dependencias> = {}): Dependencias {
  return {
    db,
    agora: () => 0,
    criarNegocio: vi.fn(async () => ({})),
    mudarContato: vi.fn(async () => ({})),
    excluirContato: vi.fn(async () => ({ id: "x" })),
    ...extra,
  };
}

describe("processarAcaoEmMassa", () => {
  it("sem acao_id no evento: pula", async () => {
    const { db } = banco({});
    const r = await processarAcaoEmMassa({ ...evento(), payload: {} }, deps(db));
    expect(r.status).toBe("skipped");
  });

  it("ação já terminada: não faz nada", async () => {
    const { db, anotado } = banco({ crm_acoes_em_massa: [acao("incluir_tag", { tag: "vip" }, { status: "concluida" })] });
    expect((await processarAcaoEmMassa(evento(), deps(db))).status).toBe("ok");
    expect(anotado).toHaveLength(0);
  });

  it("ação fora da fila (aguardando aprovação, recusada, em preparo): pula, sem escrever (Q4)", async () => {
    for (const status of ["aguardando_aprovacao", "recusada", "preparando"]) {
      const { db, anotado } = banco({ crm_acoes_em_massa: [acao("exportar", {}, { status })] });
      expect((await processarAcaoEmMassa(evento(), deps(db))).status).toBe("skipped");
      expect(anotado).toHaveLength(0);
    }
  });

  it("incluir tag: marca o lote antes de agir, pula quem já tem, grava as contagens e conclui", async () => {
    const { db, anotado } = banco({
      crm_acoes_em_massa: [acao("incluir_tag", { tag: "vip" })],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1" }, { contact_id: "c2" }], error: null }, { data: [], error: null }],
      contacts: [{ data: [{ id: "c1", tags: ["a"] }, { id: "c2", tags: ["VIP"] }], error: null }],
    });
    const d = deps(db);
    const ordem: string[] = [];
    d.mudarContato = vi.fn(async () => {
      ordem.push(`mudar:${anotado.filter((a) => a.tabela === "crm_acoes_em_massa_itens").length}`);
      return {};
    });
    expect((await processarAcaoEmMassa(evento(), d)).status).toBe("ok");
    expect(d.mudarContato).toHaveBeenCalledTimes(1);
    expect(d.mudarContato).toHaveBeenCalledWith(expect.objectContaining({ organization_id: ORG }), "c1", { tags: ["a", "vip"] });
    expect(ordem).toEqual(["mudar:1"]);
    expect(anotado.at(-1)).toMatchObject({ tabela: "crm_acoes_em_massa", corpo: { status: "concluida", feitos: 2, falhas: 0 } });
  });

  it("excluir: a trava da Agenda vira falha com motivo", async () => {
    const { db, anotado } = banco({
      crm_acoes_em_massa: [acao("excluir")],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1" }, { contact_id: "c2" }], error: null }, { data: [], error: null }],
      contacts: [{ data: [{ id: "c1", tags: [] }, { id: "c2", tags: [] }], error: null }],
    });
    const d = deps(db, {
      excluirContato: vi.fn(async (_ctx, id: string) => {
        if (id === "c2") throw new ApiError(409, "state_conflict", { vinculos: ["agenda"] }, "r", "bloqueado");
        return { id };
      }),
    });
    await processarAcaoEmMassa(evento(), d);
    expect(anotado.at(-1)?.corpo).toMatchObject({
      status: "concluida",
      feitos: 1,
      falhas: 1,
      erros: [{ contato: "c2", motivo: "Contato com compromisso na agenda não é excluído" }],
    });
  });

  it("criar negócios: pela rotina do original, com o nome do contato e sem follow-up de planilha", async () => {
    const { db } = banco({
      crm_acoes_em_massa: [acao("criar_negocios", { pipeline_id: "p1", stage_id: "s1", owner_user_id: USER, valor_centavos: 15000 })],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1" }], error: null }, { data: [], error: null }],
      contacts: [{ data: [{ id: "c1", name: "Maria", display_name: null, phone_number: null, tags: [] }], error: null }],
    });
    const d = deps(db);
    await processarAcaoEmMassa(evento(), d);
    expect(d.criarNegocio).toHaveBeenCalledWith(
      expect.objectContaining({ actor: { type: "user", id: USER } }),
      expect.objectContaining({
        pipeline_id: "p1",
        stage_id: "s1",
        title: "Maria",
        contact_id: "c1",
        owner_user_id: USER,
        value_cents: 15000,
        via_planilha: true,
      }),
    );
  });

  it("estourou o orçamento: devolve retry e continua depois", async () => {
    const { db } = banco({
      crm_acoes_em_massa: [acao("remover_tag", { tag: "vip" })],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1" }], error: null }],
      contacts: [{ data: [{ id: "c1", tags: ["vip"] }], error: null }],
    });
    let t = 0;
    const r = await processarAcaoEmMassa(evento(), deps(db, { agora: () => (t += ORCAMENTO_MS) }));
    expect(r.status).toBe("retry");
    expect(r.retry_at).toBeTruthy();
  });

  it("exportar: o CSV vai para o bucket privado, a ação guarda o caminho e vence em 24 h", async () => {
    const { db, anotado, upload } = banco({
      crm_acoes_em_massa: [acao("exportar"), { data: [], error: null }],
      organizations: [{ data: { timezone: "America/Sao_Paulo" }, error: null }],
      crm_acoes_em_massa_itens: [{ data: [{ contact_id: "c1", posicao: 1 }], error: null }, { data: [], error: null }],
      contacts: [
        {
          data: [{ id: "c1", name: "=1+1", display_name: null, email: "a@b.c", phone_number: "+5564999446816", tags: ["vip"], custom_fields: {}, birthdate: null, source: "manual", created_at: "2026-10-17T15:00:00Z", last_activity_at: null }],
          error: null,
        },
      ],
    });
    await processarAcaoEmMassa(evento(), deps(db, { agora: () => Date.UTC(2026, 9, 17, 15) }));
    const [caminho, conteudo] = upload.mock.calls[0] as unknown as [string, Blob];
    expect(caminho).toBe(`${ORG}/${ACAO}/contatos-2026-10-17.csv`);
    expect(conteudo).toBeInstanceOf(Blob);
    expect(anotado.at(-1)?.corpo).toMatchObject({ status: "concluida", arquivo: caminho, feitos: 1 });
  });
});

describe("o CSV dos contatos", () => {
  it("cabeçalho, telefone brasileiro, data no fuso e guarda de fórmula", () => {
    const linha = linhaDoCsv(
      { name: "=1+1", display_name: null, email: "a@b.c", phone_number: "+5564999446816", tags: ["vip", "frio"], custom_fields: {}, birthdate: "1990-05-01", source: "manual", created_at: "2026-10-17T15:00:00Z", last_activity_at: null },
      "America/Sao_Paulo",
    );
    expect(linha.slice(0, 2)).toEqual(["=1+1", "(64) 99944-6816"]);
    const csv = csvDeContatos([linha]);
    expect(csv.startsWith("﻿Nome,Telefone,E-mail,Instagram,Tags")).toBe(true);
    expect(csv).toContain("'=1+1");
    expect(csv).toContain("01/05/1990");
    expect(dataHoraBr("2026-10-17T15:00:00Z", "America/Sao_Paulo")).toBe("17/10/2026 12:00");
  });
});
```

Create `tests/unit/escale-excluir-contato-com-negocios.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";

import { deleteContactHandler, vinculosDoContatoHandler } from "@/app/api/v1/contacts/_handler";
import { audit } from "@/lib/audit";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";

vi.mock("@/app/api/v1/contacts/_handler", () => ({
  vinculosDoContatoHandler: vi.fn(),
  deleteContactHandler: vi.fn(),
}));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));

const ORG = "cccccccc-0000-4000-8000-000000000001";
const USER = "bbbbbbbb-0000-4000-8000-000000000001";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const ctx = { organization_id: ORG, actor: { type: "user" as const, id: USER }, requestId: "r1" };

/** Supabase de mentira: o DELETE de `crm_leads` devolve os negócios apagados; o `rpc` fica anotado. */
function banco(negocios: Array<{ id: string }>) {
  const filtros: Array<[string, string]> = [];
  const apagar: Record<string, unknown> = {};
  apagar.eq = vi.fn((coluna: string, valor: string) => {
    filtros.push([coluna, valor]);
    return apagar;
  });
  apagar.select = vi.fn(async () => ({ data: negocios, error: null }));
  const from = vi.fn(() => ({ delete: vi.fn(() => apagar) }));
  const rpc = vi.fn(async () => ({ data: null, error: null }));
  return { db: { from, rpc } as never, from, rpc, filtros };
}

beforeEach(() => {
  vi.mocked(vinculosDoContatoHandler).mockReset().mockResolvedValue({ vinculos: [], por_tabela: {} });
  vi.mocked(deleteContactHandler).mockReset().mockResolvedValue({ id: C1 });
  vi.mocked(audit).mockReset();
});

describe("excluirContatoComNegocios (Q5)", () => {
  it("com compromisso na Agenda: 409 e nada é apagado", async () => {
    vi.mocked(vinculosDoContatoHandler).mockResolvedValue({
      vinculos: ["1 compromisso(s) na agenda"],
      por_tabela: { calendar_appointments: 1 },
    });
    const { db, from } = banco([{ id: "l1" }]);
    await expect(excluirContatoComNegocios(db, ctx, C1)).rejects.toMatchObject({
      status: 409,
      code: "state_conflict",
    });
    expect(from).not.toHaveBeenCalled();
    expect(deleteContactHandler).not.toHaveBeenCalled();
  });

  it("apaga TODOS os negócios do contato na organização, pelo caminho do lote do original, e depois o contato", async () => {
    const { db, from, rpc, filtros } = banco([{ id: "l1" }, { id: "l2" }]);
    expect(await excluirContatoComNegocios(db, ctx, C1)).toEqual({ id: C1, negocios: 2 });
    expect(from).toHaveBeenCalledWith("crm_leads");
    expect(filtros).toEqual([
      ["organization_id", ORG],
      ["contact_id", C1],
    ]);
    expect(rpc).toHaveBeenCalledWith(
      "emit_event",
      expect.objectContaining({
        p_event_type: "lead.bulk_deleted",
        p_organization_id: ORG,
        p_payload: expect.objectContaining({ action: "delete", lead_ids: ["l1", "l2"] }),
      }),
    );
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "lead.bulk_action", actorUserId: USER, organizationId: ORG }),
    );
    expect(deleteContactHandler).toHaveBeenCalledWith(db, ctx, C1);
    expect(vi.mocked(deleteContactHandler).mock.invocationCallOrder[0]).toBeGreaterThan(
      from.mock.invocationCallOrder[0] ?? Infinity,
    );
  });

  it("sem negócio: nem evento nem auditoria de negócios; o contato sai", async () => {
    const { db, rpc } = banco([]);
    expect(await excluirContatoComNegocios(db, ctx, C1)).toEqual({ id: C1, negocios: 0 });
    expect(rpc).not.toHaveBeenCalled();
    expect(audit).not.toHaveBeenCalled();
    expect(deleteContactHandler).toHaveBeenCalledWith(db, ctx, C1);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-selecao-de-contatos.test.ts tests/unit/escale-acoes-em-massa-executar.test.ts tests/unit/escale-excluir-contato-com-negocios.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 2: A seleção**

Create `lib/escale/contatos/selecao.ts`:

```ts
import type { VisaoDeContatos } from "./regras";

/**
 * A SELEÇÃO DA LISTA DE CONTATOS (fork Escale, Fase 2B; decisão B3 do usuário
 * sobre a Clint `index-C8mLn7Gp`). Dois jeitos:
 * - "ids": marcados à mão (a caixinha de cada linha e a do cabeçalho, que marca
 *   só a página); valem entre páginas, até 1.000;
 * - "todos": todos os resultados do filtro, ou os N primeiros ("Selecionar
 *   [N]"), menos os desmarcados (`excluidos`, os `ignoredIds` da Clint).
 * A ação nunca recebe a lista inteira de ids no modo "todos": vai o filtro.
 */
export const IDS_MAX = 1000;

export type Selecao =
  | { tipo: "ids"; ids: readonly string[] }
  | { tipo: "todos"; quantidade: number | null; excluidos: readonly string[] };

export const SEM_SELECAO: Selecao = { tipo: "ids", ids: [] };
export const SELECIONAR_TODOS: Selecao = { tipo: "todos", quantidade: null, excluidos: [] };

const noAlcance = (s: Extract<Selecao, { tipo: "todos" }>, indice: number) =>
  s.quantidade === null || indice < s.quantidade;

export function totalSelecionado(s: Selecao, total: number): number {
  if (s.tipo === "ids") return s.ids.length;
  const base = s.quantidade === null ? total : Math.min(s.quantidade, total);
  return Math.max(0, base - s.excluidos.length);
}

export function linhaMarcada(s: Selecao, id: string, indice: number): boolean {
  if (s.tipo === "ids") return s.ids.includes(id);
  return noAlcance(s, indice) && !s.excluidos.includes(id);
}

export function alternarLinha(s: Selecao, id: string, indice: number, marcar: boolean): Selecao {
  if (s.tipo === "ids") {
    if (!marcar) return { tipo: "ids", ids: s.ids.filter((x) => x !== id) };
    return s.ids.includes(id) || s.ids.length >= IDS_MAX ? s : { tipo: "ids", ids: [...s.ids, id] };
  }
  if (!noAlcance(s, indice)) return s;
  if (marcar) return { ...s, excluidos: s.excluidos.filter((x) => x !== id) };
  return s.excluidos.includes(id) || s.excluidos.length >= IDS_MAX ? s : { ...s, excluidos: [...s.excluidos, id] };
}

/** A caixinha do cabeçalho: marcada, desmarcada ou "indeterminada" (parte da página). */
export function estadoDaPagina(
  s: Selecao,
  linhas: ReadonlyArray<{ id: string }>,
  primeiro: number,
): boolean | "indeterminada" {
  if (linhas.length === 0) return false;
  const marcadas = linhas.filter((l, i) => linhaMarcada(s, l.id, primeiro + i)).length;
  if (marcadas === 0) return false;
  return marcadas === linhas.length ? true : "indeterminada";
}

export function marcarPagina(
  s: Selecao,
  linhas: ReadonlyArray<{ id: string }>,
  primeiro: number,
  marcar: boolean,
): Selecao {
  return linhas.reduce<Selecao>((acc, l, i) => alternarLinha(acc, l.id, primeiro + i, marcar), s);
}

/** "Selecionar [N]" (Clint): N ≥ total é "todos"; 0 ou vazio limpa. */
export function selecionarQuantidade(n: number, total: number): Selecao {
  if (!Number.isFinite(n) || n <= 0) return SEM_SELECAO;
  if (n >= total) return SELECIONAR_TODOS;
  return { tipo: "todos", quantidade: Math.floor(n), excluidos: [] };
}

export const todosMarcados = (s: Selecao): boolean =>
  s.tipo === "todos" && s.quantidade === null && s.excluidos.length === 0;

export type AlvoDaAcao =
  | { tipo: "ids"; ids: string[] }
  | {
      tipo: "filtro";
      q?: string;
      v: VisaoDeContatos;
      f?: string;
      quantidade: number | null;
      excluidos: string[];
    };

export function alvoDaSelecao(
  s: Selecao,
  consulta: { q?: string; v: VisaoDeContatos; f?: string | null },
): AlvoDaAcao {
  if (s.tipo === "ids") return { tipo: "ids", ids: [...s.ids] };
  const q = consulta.q?.trim();
  return {
    tipo: "filtro",
    ...(q ? { q } : {}),
    v: consulta.v,
    ...(consulta.f ? { f: consulta.f } : {}),
    quantidade: s.quantidade,
    excluidos: [...s.excluidos],
  };
}
```

- [ ] **Step 3: Os tipos e o CSV**

Create `lib/escale/massa/tipos.ts`:

```ts
import { z } from "zod";

import { VISOES_DE_CONTATOS } from "@/lib/escale/contatos/regras";
import { IDS_MAX } from "@/lib/escale/contatos/selecao";

/** AS AÇÕES EM MASSA DA LISTA DE CONTATOS (fork Escale, Fase 2B; migration 9103; Clint `bulk_params`). */
export const ACOES_EM_MASSA = ["criar_negocios", "incluir_tag", "remover_tag", "exportar", "excluir"] as const;
export type AcaoEmMassa = (typeof ACOES_EM_MASSA)[number];
export const EVENTO_DA_ACAO_EM_MASSA = "contatos.acao_em_massa_requested";
export const BUCKET_DAS_EXPORTACOES = "exportacoes-das-listas";
export const CONTATOS_POR_ACAO_MAX = 100_000;

const uuid = z.string().uuid();
const tag = z.string().trim().min(1).max(40);

const alvoSchema = z.discriminatedUnion("tipo", [
  z.object({ tipo: z.literal("ids"), ids: z.array(uuid).min(1).max(IDS_MAX) }).strict(),
  z
    .object({
      tipo: z.literal("filtro"),
      q: z.string().max(200).optional(),
      v: z.enum(VISOES_DE_CONTATOS),
      f: z.string().max(16384).optional(),
      quantidade: z.number().int().min(1).max(CONTATOS_POR_ACAO_MAX).nullable(),
      excluidos: z.array(uuid).max(IDS_MAX),
    })
    .strict(),
]);

const base = { lista: z.literal("contatos"), alvo: alvoSchema };

export const pedidoDeAcaoSchema = z.discriminatedUnion("acao", [
  z
    .object({
      ...base,
      acao: z.literal("criar_negocios"),
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
  z.object({ ...base, acao: z.literal("incluir_tag"), parametros: z.object({ tag }).strict() }).strict(),
  z.object({ ...base, acao: z.literal("remover_tag"), parametros: z.object({ tag }).strict() }).strict(),
  z.object({ ...base, acao: z.literal("exportar"), parametros: z.object({}).strict() }).strict(),
  z.object({ ...base, acao: z.literal("excluir"), parametros: z.object({}).strict() }).strict(),
]);
export type PedidoDeAcao = z.infer<typeof pedidoDeAcaoSchema>;

/** Os status do banco (9103). Os de aprovação só existem na exportação (Q4). */
export type StatusDaAcao =
  | "preparando"
  | "aguardando_aprovacao"
  | "na_fila"
  | "processando"
  | "concluida"
  | "falhou"
  | "recusada";
/** O que a tela vê: o do banco, ou "expirada" (pedido de exportação que passou de 7 dias sem decisão). */
export type StatusVisivel = StatusDaAcao | "expirada";
/** O pedido de exportação vence em 7 dias (Q4), contados de `created_at`, sem cron. */
export const VALIDADE_DO_PEDIDO_MS = 7 * 24 * 60 * 60 * 1000;

export function statusVisivel(status: StatusDaAcao, criadaEm: string, agora: number): StatusVisivel {
  return status === "aguardando_aprovacao" && agora - new Date(criadaEm).getTime() >= VALIDADE_DO_PEDIDO_MS
    ? "expirada"
    : status;
}

/** Um pedido de exportação de outra pessoa, para o admin decidir (Q4). */
export type PedidoParaAprovar = { id: string; solicitante_id: string; total: number; created_at: string };

export type ResumoDaAcao = {
  id: string;
  acao: AcaoEmMassa;
  status: StatusVisivel;
  total: number;
  feitos: number;
  falhas: number;
  tem_arquivo: boolean;
  created_at: string;
};

/** O `GET /api/v1/acoes-em-massa`: as minhas e, para o admin, os pedidos que esperam a decisão dele. */
export type AcoesDaPessoa = { minhas: ResumoDaAcao[]; para_aprovar: PedidoParaAprovar[] };
```

Create `lib/escale/massa/csv-de-contatos.ts`:

```ts
import { formatarTelefone, instagramDoLink } from "@/lib/escale/contatos/regras";
import { celula } from "@/lib/escale/exportar/csv-do-quadro";
import { lerLinks } from "@/lib/leads/links-de-contato";

/**
 * O CSV DA EXPORTAÇÃO DE CONTATOS (fork Escale, Fase 2B). Montado no servidor
 * (o consumidor da ação), com a guarda de fórmula da 1E (`celula`), BOM UTF-8
 * para o Excel e datas no fuso da organização, no formato brasileiro.
 */
export type ContatoExportado = {
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  birthdate: string | null;
  source: string | null;
  created_at: string;
  last_activity_at: string | null;
};

export const COLUNAS_EXPORTADAS =
  "id, name, display_name, email, phone_number, tags, custom_fields, birthdate, source, created_at, last_activity_at";

export const CABECALHO_DO_CSV = [
  "Nome",
  "Telefone",
  "E-mail",
  "Instagram",
  "Tags",
  "Data de nascimento",
  "Origem",
  "Criado em",
  "Última atividade",
] as const;

export function dataHoraBr(iso: string | null, fuso: string): string {
  if (!iso) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    timeZone: fuso,
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(", ", " ");
}

/** "1990-05-01" → "01/05/1990" (dia sem fuso: é data de calendário). */
export function diaBr(dia: string | null): string {
  if (!dia) return "";
  const [a, m, d] = dia.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

export function linhaDoCsv(c: ContatoExportado, fuso: string): string[] {
  const links = lerLinks(c.custom_fields ?? {}) as Record<string, string>;
  return [
    c.name ?? c.display_name ?? "",
    formatarTelefone(c.phone_number),
    c.email ?? "",
    instagramDoLink(links.instagram ?? null) ?? "",
    (c.tags ?? []).join("; "),
    diaBr(c.birthdate),
    c.source ?? "",
    dataHoraBr(c.created_at, fuso),
    dataHoraBr(c.last_activity_at, fuso),
  ];
}

export function csvDeContatos(linhas: readonly string[][]): string {
  const corpo = [[...CABECALHO_DO_CSV], ...linhas].map((l) => l.map(celula).join(",")).join("\r\n");
  return `﻿${corpo}\r\n`;
}

/** "contatos-2026-10-17.csv", com o dia no fuso da organização. */
export function nomeDoArquivoDeContatos(agora: number, fuso: string): string {
  const dia = new Intl.DateTimeFormat("en-CA", { timeZone: fuso, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    new Date(agora),
  );
  return `contatos-${dia}.csv`;
}
```

Confira antes de rodar: `celula` (`lib/escale/exportar/csv-do-quadro.ts`, L51) devolve a célula já escapada (aspas RFC 4180) e com o `'` na frente de `=`, `+`, `-`, `@`. O teste "guarda de fórmula" depende disso.

- [ ] **Step 4: O processamento**

Create `lib/escale/massa/executar.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ApiError } from "@/lib/api/types";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import { COLUNAS_EXPORTADAS, csvDeContatos, linhaDoCsv, nomeDoArquivoDeContatos, type ContatoExportado } from "./csv-de-contatos";
import { BUCKET_DAS_EXPORTACOES, type AcaoEmMassa } from "./tipos";

/**
 * O CONSUMIDOR DAS AÇÕES EM MASSA (fork Escale, Fase 2B; migration 9103). Roda
 * no worker com o service role, mas só sobre os contatos que a função
 * `fn_escale_criar_acao_em_massa` resolveu com a RLS de quem pediu. Cada contato
 * passa pela MESMA rotina da tela (criar negócio, PATCH do contato, e excluir
 * com os negócios, `excluirContatoComNegocios`, Q5), para o original continuar
 * valendo: eventos, auditoria, trava da Agenda. Só a fila anda: ação em preparo,
 * aguardando aprovação ou recusada é pulada (ninguém exporta sem aprovação, nem
 * emitindo o evento à mão).
 *
 * - 100 por lote; 20 s por rodada; acabou o tempo, `retry` e continua depois.
 * - O lote é marcado como feito ANTES de agir: no máximo uma vez (criar negócio
 *   não duplica se o worker cair no meio).
 * - Exportar lê tudo, monta o CSV e guarda no bucket privado por 24 h.
 */
export const CONSUMIDOR_DA_ACAO_EM_MASSA = "escale-acao-em-massa.v1";
export const LOTE = 100;
const LOTE_DA_EXPORTACAO = 200;
export const ORCAMENTO_MS = 20_000;
export const ERROS_GUARDADOS = 50;
export const VALIDADE_DO_ARQUIVO_MS = 24 * 60 * 60 * 1000;
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const TAGS_DO_CONTATO_MAX = 20;
const MOTIVO_DA_AGENDA = "Contato com compromisso na agenda não é excluído";

type Ctx = HandlerCtx;
export type Dependencias = {
  db: SupabaseClient;
  agora: () => number;
  criarNegocio: (ctx: Ctx, input: Record<string, unknown>) => Promise<unknown>;
  mudarContato: (ctx: Ctx, id: string, input: { tags: string[] }) => Promise<unknown>;
  excluirContato: (ctx: Ctx, id: string) => Promise<unknown>;
};

type Erro = { contato: string | null; motivo: string };
type Acao = {
  id: string;
  organization_id: string;
  user_id: string;
  acao: AcaoEmMassa;
  parametros: Record<string, unknown>;
  status: string;
  total: number;
  feitos: number;
  falhas: number;
  erros: Erro[];
};
type ContatoDoLote = {
  id: string;
  name?: string | null;
  display_name?: string | null;
  phone_number?: string | null;
  tags?: string[] | null;
};

const resultado = (status: HandlerResult["status"], detail?: string, retry_at?: string): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_ACAO_EM_MASSA,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

function motivoDaFalha(e: unknown): string {
  if (e instanceof ApiError && e.code === "state_conflict") return MOTIVO_DA_AGENDA;
  return e instanceof Error ? e.message : String(e);
}

const naoAchado = (e: unknown) => e instanceof ApiError && e.status === 404;

async function lerContatos(db: SupabaseClient, org: string, ids: string[]): Promise<Map<string, ContatoDoLote>> {
  const { data, error } = await db
    .from("contacts")
    .select("id, name, display_name, phone_number, tags")
    .eq("organization_id", org)
    .in("id", ids);
  if (error) throw new Error(error.message);
  return new Map(((data ?? []) as ContatoDoLote[]).map((c) => [c.id, c]));
}

async function agir(acao: Acao, ctx: Ctx, deps: Dependencias, id: string, c: ContatoDoLote | undefined) {
  const p = acao.parametros;
  if (acao.acao === "excluir") {
    if (!c) return;
    try {
      await deps.excluirContato(ctx, id);
    } catch (e) {
      if (!naoAchado(e)) throw e;
    }
    return;
  }
  if (!c) throw new Error("Contato não encontrado.");
  if (acao.acao === "criar_negocios") {
    const nome = nomeDoContato({ name: c.name ?? null, display_name: c.display_name ?? null, phone_number: c.phone_number ?? null });
    await deps.criarNegocio(ctx, {
      pipeline_id: p.pipeline_id,
      stage_id: p.stage_id,
      title: nome && nome.trim().length >= 2 ? nome.trim().slice(0, 200) : "Novo negócio",
      contact_id: id,
      owner_user_id: (p.owner_user_id as string | null | undefined) ?? null,
      value_cents: (p.valor_centavos as number | null | undefined) ?? null,
      tags: [],
      source: "manual",
      via_planilha: true,
    });
    return;
  }
  const tag = normalizarTags([String(p.tag ?? "")])[0];
  if (!tag) throw new Error("Tag inválida.");
  const atuais = normalizarTags(c.tags ?? []);
  if (acao.acao === "incluir_tag") {
    if (atuais.includes(tag)) return;
    if (atuais.length >= TAGS_DO_CONTATO_MAX) throw new Error("O contato já tem 20 tags.");
    await deps.mudarContato(ctx, id, { tags: [...atuais, tag] });
    return;
  }
  if (!atuais.includes(tag)) return;
  await deps.mudarContato(ctx, id, { tags: atuais.filter((x) => x !== tag) });
}

async function emLotes(acao: Acao, ctx: Ctx, deps: Dependencias): Promise<HandlerResult> {
  const inicio = deps.agora();
  let feitos = acao.feitos;
  let falhas = acao.falhas;
  const erros = [...acao.erros];
  while (deps.agora() - inicio < ORCAMENTO_MS) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_itens")
      .select("contact_id")
      .eq("acao_id", acao.id)
      .eq("feito", false)
      .order("posicao", { ascending: true })
      .limit(LOTE);
    if (error) throw new Error(error.message);
    const ids = ((data ?? []) as Array<{ contact_id: string }>).map((i) => i.contact_id);
    if (ids.length === 0) {
      await deps.db.from("crm_acoes_em_massa").update({ status: "concluida", feitos, falhas, erros }).eq("id", acao.id);
      return resultado("ok");
    }
    const marcado = await deps.db
      .from("crm_acoes_em_massa_itens")
      .update({ feito: true })
      .eq("acao_id", acao.id)
      .in("contact_id", ids);
    if (marcado.error) throw new Error(marcado.error.message);
    const contatos = await lerContatos(deps.db, acao.organization_id, ids);
    for (const id of ids) {
      try {
        await agir(acao, ctx, deps, id, contatos.get(id));
        feitos += 1;
      } catch (e) {
        falhas += 1;
        if (erros.length < ERROS_GUARDADOS) erros.push({ contato: id, motivo: motivoDaFalha(e) });
      }
    }
    await deps.db.from("crm_acoes_em_massa").update({ feitos, falhas, erros }).eq("id", acao.id);
  }
  return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
}

/** Os arquivos vencidos da organização saem do bucket antes de cada exportação nova. */
async function apagarVencidos(org: string, deps: Dependencias) {
  const { data } = await deps.db
    .from("crm_acoes_em_massa")
    .select("id, arquivo")
    .eq("organization_id", org)
    .not("arquivo", "is", null)
    .lt("expira_em", new Date(deps.agora()).toISOString());
  const vencidos = (data ?? []) as Array<{ id: string; arquivo: string }>;
  if (vencidos.length === 0) return;
  await deps.db.storage.from(BUCKET_DAS_EXPORTACOES).remove(vencidos.map((v) => v.arquivo));
  await deps.db
    .from("crm_acoes_em_massa")
    .update({ arquivo: null })
    .in("id", vencidos.map((v) => v.id));
}

async function exportar(acao: Acao, deps: Dependencias): Promise<HandlerResult> {
  await apagarVencidos(acao.organization_id, deps);
  const fuso = await fusoDaOrganizacao(deps.db, acao.organization_id);
  const linhas: string[][] = [];
  let desde = 0;
  for (;;) {
    const { data, error } = await deps.db
      .from("crm_acoes_em_massa_itens")
      .select("contact_id, posicao")
      .eq("acao_id", acao.id)
      .gt("posicao", desde)
      .order("posicao", { ascending: true })
      .limit(LOTE_DA_EXPORTACAO);
    if (error) throw new Error(error.message);
    const itens = (data ?? []) as Array<{ contact_id: string; posicao: number }>;
    if (itens.length === 0) break;
    const lidos = await deps.db
      .from("contacts")
      .select(COLUNAS_EXPORTADAS)
      .eq("organization_id", acao.organization_id)
      .in("id", itens.map((i) => i.contact_id));
    if (lidos.error) throw new Error(lidos.error.message);
    const porId = new Map(((lidos.data ?? []) as Array<ContatoExportado & { id: string }>).map((c) => [c.id, c]));
    for (const i of itens) {
      const c = porId.get(i.contact_id);
      if (c) linhas.push(linhaDoCsv(c, fuso));
    }
    desde = itens[itens.length - 1]?.posicao ?? desde;
  }
  const caminho = `${acao.organization_id}/${acao.id}/${nomeDoArquivoDeContatos(deps.agora(), fuso)}`;
  const subida = await deps.db.storage
    .from(BUCKET_DAS_EXPORTACOES)
    .upload(caminho, new Blob([csvDeContatos(linhas)], { type: "text/csv" }), {
      upsert: true,
      contentType: "text/csv; charset=utf-8",
    });
  if (subida.error) throw new Error(subida.error.message);
  await deps.db
    .from("crm_acoes_em_massa")
    .update({
      status: "concluida",
      feitos: linhas.length,
      falhas: Math.max(0, acao.total - linhas.length),
      arquivo: caminho,
      expira_em: new Date(deps.agora() + VALIDADE_DO_ARQUIVO_MS).toISOString(),
    })
    .eq("id", acao.id);
  return resultado("ok");
}

export async function processarAcaoEmMassa(row: EventRow, deps: Dependencias): Promise<HandlerResult> {
  const acaoId = typeof row.payload?.acao_id === "string" ? row.payload.acao_id : null;
  if (!acaoId) return resultado("skipped", "sem_acao_id");
  const { data, error } = await deps.db
    .from("crm_acoes_em_massa")
    .select("id, organization_id, user_id, acao, parametros, status, total, feitos, falhas, erros")
    .eq("id", acaoId)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (error) return resultado("error", error.message);
  if (!data) return resultado("skipped", "acao_inexistente");
  const acao = data as Acao;
  if (acao.status === "concluida" || acao.status === "falhou") return resultado("ok", "ja_terminada");
  if (acao.status !== "na_fila" && acao.status !== "processando") return resultado("skipped", "fora_da_fila");
  if (acao.status !== "processando") {
    await deps.db.from("crm_acoes_em_massa").update({ status: "processando" }).eq("id", acao.id);
  }
  const ctx: Ctx = { organization_id: acao.organization_id, actor: { type: "user", id: acao.user_id }, requestId: acao.id };
  try {
    return acao.acao === "exportar" ? await exportar(acao, deps) : await emLotes(acao, ctx, deps);
  } catch (e) {
    const motivo = motivoDaFalha(e);
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_acoes_em_massa")
        .update({ status: "falhou", erros: [...acao.erros, { contato: null, motivo }].slice(-ERROS_GUARDADOS) })
        .eq("id", acao.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivo);
  }
}
```

Repare no teste "ação já terminada": a única leitura é a da ação; nenhuma escrita. No "exportar", a fila de `crm_acoes_em_massa` tem duas respostas: a da ação e a da busca dos vencidos (vazia).

- [ ] **Step 5: Excluir com os negócios, o consumidor e o registro**

Create `lib/escale/contatos/excluir.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { deleteContactHandler, vinculosDoContatoHandler } from "@/app/api/v1/contacts/_handler";
import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ApiError } from "@/lib/api/types";
import { audit } from "@/lib/audit";
import { traduzir } from "@/lib/i18n/dicionario";

/**
 * EXCLUIR O CONTATO COM OS NEGÓCIOS (fork Escale, Fase 2B; Q5 de 17/10: "Os negócios
 * associados aos contatos serão excluídos", como a Clint). Vale para a exclusão em
 * massa (consumidor, service role) e para o ⋮ da linha (rota do fork, sessão).
 *
 * 1. A trava da Agenda do original vem ANTES de tudo (`vinculosDoContatoHandler`):
 *    contato com compromisso não sai, e nenhum negócio é apagado.
 * 2. TODOS os negócios do contato na organização (não só os da tela) saem pelo mesmo
 *    caminho do "excluir em lote" do original (`app/api/v1/leads/bulk`): DELETE em
 *    `crm_leads`, o evento `lead.bulk_deleted` e a auditoria `lead.bulk_action`.
 *    Gerente e admin enxergam e apagam todos pela RLS (`fn_can_view_lead`).
 * 3. O contato sai pelo `deleteContactHandler` do original (conversas e mensagens
 *    numa transação, `contact.deleted`, auditoria). Se ele falhar depois do passo 2,
 *    os negócios já saíram: a falha vira "falha com motivo" na ação, como hoje.
 */
export async function excluirContatoComNegocios(
  db: SupabaseClient,
  ctx: HandlerCtx,
  contactId: string,
): Promise<{ id: string; negocios: number }> {
  const { vinculos, por_tabela } = await vinculosDoContatoHandler(db, ctx, contactId);
  if (vinculos.length > 0) {
    throw new ApiError(
      409,
      "state_conflict",
      { vinculos, por_tabela },
      ctx.requestId,
      traduzir("Não foi possível excluir: o contato ainda tem registros vinculados.", ctx.idioma ?? "pt-BR"),
    );
  }

  const { data, error } = await db
    .from("crm_leads")
    .delete()
    .eq("organization_id", ctx.organization_id)
    .eq("contact_id", contactId)
    .select("id");
  if (error) throw new ApiError(500, "internal_error", undefined, ctx.requestId, error.message);
  const ids = ((data ?? []) as Array<{ id: string }>).map((l) => l.id);

  if (ids.length > 0) {
    const ator = ctx.actor.type === "user" ? ctx.actor.id : null;
    // O mesmo evento e a mesma auditoria agregados do "excluir em lote" do original.
    await db
      .rpc("emit_event", {
        p_event_type: "lead.bulk_deleted",
        p_entity_kind: "crm_lead",
        p_entity_id: null,
        p_payload: { action: "delete", lead_ids: ids, params: {} },
        p_metadata: { request_id: ctx.requestId, actor_user_id: ator, origem: "excluir_contato" },
        p_organization_id: ctx.organization_id,
      })
      .then(({ error: falhou }) => {
        if (falhou) console.error("[contatos.excluir] emit_event failed", falhou.message);
      });
    await audit({
      action: "lead.bulk_action",
      actorUserId: ator,
      organizationId: ctx.organization_id,
      resourceType: "crm_lead",
      resourceId: null,
      requestId: ctx.requestId,
      metadata: {
        action: "delete",
        lead_ids: ids,
        count: ids.length,
        updated_count: ids.length,
        params: {},
        origem: "excluir_contato",
        contact_id: contactId,
      },
    });
  }

  await deleteContactHandler(db, ctx, contactId);
  return { id: contactId, negocios: ids.length };
}
```

Confira antes de rodar: o `audit` aceita `actorUserId: null` (o `deleteContactHandler` passa o de `actorAuditPayload`, que também pode ser nulo); se o tipo exigir `string`, use o `actorAuditPayload` do original (`grep -rn "export function actorAuditPayload" lib app`). O `console.error` repete o do original (`app/api/v1/leads/bulk/route.ts`).

Create `lib/escale/massa/handler.ts`:

```ts
import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler } from "@/app/api/v1/leads/_handler";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { createAdminClient } from "@/lib/supabase/admin";

import { CONSUMIDOR_DA_ACAO_EM_MASSA, processarAcaoEmMassa } from "./executar";
import { EVENTO_DA_ACAO_EM_MASSA } from "./tipos";

/**
 * Consumidor do `event_log` das ações em massa (fork Escale, Fase 2B). "roda" na
 * organização parada: é escrita interna pedida por alguém da própria organização,
 * sem custo e sem sair para fora (régua de `tests/unit/dispatcher-org-parada.test.ts`).
 */
export const acaoEmMassaHandler: EventHandler = {
  key: CONSUMIDOR_DA_ACAO_EM_MASSA,
  naOrgParada: "roda",
  events: [EVENTO_DA_ACAO_EM_MASSA],
  async handle(row) {
    const db = createAdminClient();
    return processarAcaoEmMassa(row, {
      db,
      agora: () => Date.now(),
      criarNegocio: (ctx, input) => createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2]),
      mudarContato: (ctx, id, input) => patchContactHandler(db, ctx, id, input),
      // Q5: excluir leva os negócios do contato (todos os da organização).
      excluirContato: (ctx, id) => excluirContatoComNegocios(db, ctx, id),
    });
  },
};
```

Em `lib/event-log/register-handlers.ts`:
- nos imports, logo depois de `import { lgpdRedactHandler } from "@/workers/lgpd-redact-worker.handler";`:

```ts
// FORK ESCALE · Fase 2B: as ações em massa da lista de contatos.
import { acaoEmMassaHandler } from "@/lib/escale/massa/handler";
```

- logo depois de `  registerHandler(lgpdRedactHandler);`:

```ts
  // FORK ESCALE · Fase 2B: escrita interna pedida pela própria organização (lotes com orçamento).
  registerHandler(acaoEmMassaHandler);
```

Em `tests/unit/dispatcher-org-parada.test.ts`: importe `acaoEmMassaHandler` de `@/lib/escale/massa/handler` e acrescente-o à lista `RODA` (logo depois de `lgpdRedactHandler,`), com o comentário `// FORK ESCALE · Fase 2B: ações em massa, escrita interna da própria organização.`.

- [ ] **Step 6: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-selecao-de-contatos.test.ts tests/unit/escale-acoes-em-massa-executar.test.ts tests/unit/escale-excluir-contato-com-negocios.test.ts tests/unit/dispatcher-org-parada.test.ts tests/unit/evento-comando-tem-consumidor.test.ts
```

Expected: PASS nos cinco.

- [ ] **Step 7: Revisor (subagente) do consumidor**

Pontos: só age sobre itens da própria ação e da própria organização (`organization_id` em toda leitura); só processa ação "na_fila"/"processando" (exportação sem aprovação nunca roda); `excluirContatoComNegocios` checa a Agenda antes de apagar qualquer negócio, filtra `crm_leads` por organização e contato, e repete o evento e a auditoria do lote do original; marca antes de agir; respeita o orçamento; falhas de um contato não param o lote; `createLeadHandler`/`patchContactHandler`/`deleteContactHandler` recebem `actor` = quem pediu; o CSV não vaza coluna fora da lista; o caminho no bucket começa pela organização; vencidos são apagados.

- [ ] **Step 8: Guardas, typecheck, eslint, prettier e commit**

```bash
NOVOS="lib/escale/contatos/selecao.ts lib/escale/contatos/excluir.ts lib/escale/massa/tipos.ts lib/escale/massa/csv-de-contatos.ts lib/escale/massa/executar.ts lib/escale/massa/handler.ts tests/unit/escale-selecao-de-contatos.test.ts tests/unit/escale-acoes-em-massa-executar.test.ts tests/unit/escale-excluir-contato-com-negocios.test.ts"
ALTERADOS="lib/event-log/register-handlers.ts tests/unit/dispatcher-org-parada.test.ts"
for f in lib/event-log/register-handlers.ts; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts'; done | sort -u | xargs -r corepack pnpm vitest run
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS $ALTERADOS
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS $ALTERADOS
git commit -m "feat(escale): seleção, consumidor das ações em massa e excluir contato com os negócios (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 9: Rotas — pedir, acompanhar, aprovar, baixar e excluir da linha

**Files:**
- Create: `app/api/v1/acoes-em-massa/route.ts`, `app/api/v1/acoes-em-massa/[id]/arquivo/route.ts`, `app/api/v1/acoes-em-massa/[id]/aprovar/route.ts`, `app/api/v1/acoes-em-massa/[id]/recusar/route.ts`, `lib/escale/massa/decisao-da-exportacao.ts`, `app/api/v1/lista-de-contatos/[id]/route.ts`, `hooks/escale/useAcoesEmMassa.ts`, `hooks/escale/useExcluirContatoDaLista.ts`, `tests/unit/escale-acoes-em-massa-rotas.test.ts`, `tests/unit/escale-excluir-contato-da-lista-rota.test.ts`
- Modify: `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `pedidoDeAcaoSchema`, `ResumoDaAcao`, `StatusDaAcao`, `statusVisivel`, `VALIDADE_DO_PEDIDO_MS`, `PedidoParaAprovar`, `AcoesDaPessoa`, `BUCKET_DAS_EXPORTACOES`, `excluirContatoComNegocios` (Task 8); `filtrosDaConsulta`, `parametrosDaBusca`, `fusoDaOrganizacao` (Task 3 e 2A); `compilarFiltros`, `temFiltros` (Task 1); as funções da 9103 (`fn_escale_criar_acao_em_massa`, `fn_escale_decidir_exportacao`); `mensagemDeBloqueioPorVinculo` (`hooks/contacts/useDeleteContact.ts`), `showApiError` (`components/feedback/ApiErrorToast`).
- Produces:
  - `POST /api/v1/acoes-em-massa` (gerente ou acima) corpo `PedidoDeAcao` → 201 `{ data: { id, total, status } }` (`status` = `na_fila` ou `aguardando_aprovacao`); 422 com "Nenhum contato selecionado.", "No máximo 100.000 contatos por ação." ou "Escolha a origem e a etapa.".
  - `GET /api/v1/acoes-em-massa` → `{ data: AcoesDaPessoa }`: `minhas` (as minhas dos últimos 8 dias, até 20, com "expirada" calculado) e, para o admin, `para_aprovar` (exportações da organização aguardando, não vencidas, de outras pessoas, até 50).
  - `POST /api/v1/acoes-em-massa/[id]/aprovar` e `/recusar` (admin; `requireSupportWrite`) → 200 `{ data: { id, status } }`; 404/403/409/422 conforme o erro da função; auditoria `contacts.export_approved` / `contacts.export_rejected`.
  - `GET /api/v1/acoes-em-massa/[id]/arquivo` → 302 para a URL assinada de 60 s; 404 "A exportação expirou. Exporte de novo.".
  - `DELETE /api/v1/lista-de-contatos/[id]` (gerente ou acima; `requireSupportWrite`) → 200 `{ data: { id, negocios } }`; o 409 da Agenda com `details` (os vínculos), como o original.
  - Hooks: `CHAVE_DAS_ACOES`, `usePedirAcaoEmMassa()`, `useAcoesEmMassa(ativo: boolean, intervalo?: number | false)`, `useDecidirExportacao()`; `useExcluirContatoDaLista()`.
  - Auditoria: `contacts.bulk_requested`, `contacts.export_approved`, `contacts.export_rejected`, `contacts.export_downloaded`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-acoes-em-massa-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { POST as APROVAR } from "@/app/api/v1/acoes-em-massa/[id]/aprovar/route";
import { GET as GET_ARQUIVO } from "@/app/api/v1/acoes-em-massa/[id]/arquivo/route";
import { POST as RECUSAR } from "@/app/api/v1/acoes-em-massa/[id]/recusar/route";
import { GET, POST } from "@/app/api/v1/acoes-em-massa/route";
import { audit } from "@/lib/audit";
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

type Resposta = { data: unknown; error: { code?: string; message: string } | null };
const ACAO = "aaaaaaaa-0000-4000-8000-000000000001";
const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const P1 = "11111111-1111-4111-8111-111111111111";
const S1 = "22222222-2222-4222-8222-222222222222";
const OUTRA = "99999999-0000-4000-8000-000000000009";
const DIA = 24 * 60 * 60 * 1000;

/**
 * Supabase de mentira. `tabelas`: a mesma resposta em toda leitura da tabela;
 * `filas`: uma resposta por `from()` (o GET do admin lê a tabela duas vezes).
 */
function banco(opts: { rpc?: Resposta; tabelas?: Record<string, Resposta>; filas?: Record<string, Resposta[]> }) {
  const rpc = vi.fn().mockResolvedValue(
    opts.rpc ?? { data: [{ acao_id: ACAO, quantidade: 3, status: "na_fila" }], error: null },
  );
  const from = vi.fn((tabela: string) => {
    const resposta = opts.filas?.[tabela]?.shift() ?? opts.tabelas?.[tabela] ?? { data: [], error: null };
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "neq", "gte", "gt", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn(async () => resposta);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(resposta).then(ok);
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from };
}

const pedido = (url: string, corpo?: unknown) =>
  new NextRequest(new URL(url, "http://x"), {
    method: corpo === undefined ? "GET" : "POST",
    ...(corpo !== undefined ? { body: JSON.stringify(corpo) } : {}),
  } as never);
const comId = { params: Promise.resolve({ id: ACAO }) };

beforeEach(() => {
  vi.mocked(createClient).mockReset();
  vi.mocked(audit).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("POST /api/v1/acoes-em-massa", () => {
  const porIds = { lista: "contatos", acao: "incluir_tag", alvo: { tipo: "ids", ids: [C1] }, parametros: { tag: "vip" } };

  it("pede gerente ou acima, e o acompanhamento só-leitura não grava", async () => {
    banco({});
    await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("manager");
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await POST(pedido("/api/v1/acoes-em-massa", porIds))).status).toBe(403);
  });

  it("corpo inválido é 422", async () => {
    banco({});
    expect((await POST(pedido("/api/v1/acoes-em-massa", { ...porIds, acao: "apagar_tudo" }))).status).toBe(422);
  });

  it("pelos ids: a função recebe os ids e filtro vazio; 201, o status e a auditoria", async () => {
    const { rpc } = banco({});
    const r = await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({ p_org: ORG_ID, p_acao: "incluir_tag", p_parametros: { tag: "vip" }, p_ids: [C1], p_filtros: {} }),
    );
    expect(await r.json()).toEqual({ data: { id: ACAO, total: 3, status: "na_fila" } });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "contacts.bulk_requested" }));
  });

  it("pelo filtro: busca, visão, filtro compilado, quantidade e excluídos", async () => {
    const { rpc } = banco({ tabelas: { organizations: { data: { timezone: "America/Manaus" }, error: null } } });
    const r = await POST(
      pedido("/api/v1/acoes-em-massa", {
        lista: "contatos",
        acao: "exportar",
        alvo: { tipo: "filtro", q: "ana", v: "com_negocio", f: JSON.stringify({ telefone: "com" }), quantidade: 50, excluidos: [C1] },
        parametros: {},
      }),
    );
    expect(r.status).toBe(201);
    expect(rpc).toHaveBeenCalledWith(
      "fn_escale_criar_acao_em_massa",
      expect.objectContaining({
        p_ids: null,
        p_visao: "com_negocio",
        p_filtros: { fuso: "America/Manaus", telefone: "com" },
        p_quantidade: 50,
        p_excluidos: [C1],
      }),
    );
  });

  it("exportar que espera aprovação: devolve o status e audita a aprovação pendente (Q4)", async () => {
    banco({ rpc: { data: [{ acao_id: ACAO, quantidade: 3, status: "aguardando_aprovacao" }], error: null } });
    const r = await POST(pedido("/api/v1/acoes-em-massa", { ...porIds, acao: "exportar", parametros: {} }));
    expect(await r.json()).toEqual({ data: { id: ACAO, total: 3, status: "aguardando_aprovacao" } });
    expect(audit).toHaveBeenCalledWith(
      expect.objectContaining({ action: "contacts.bulk_requested", metadata: expect.objectContaining({ aprovacao: "pendente" }) }),
    );
  });

  it("criar negócios: etapa de outra origem é recusada", async () => {
    banco({ tabelas: { crm_stages: { data: { id: S1, pipeline_id: "outra", is_archived: false }, error: null } } });
    const r = await POST(
      pedido("/api/v1/acoes-em-massa", { ...porIds, acao: "criar_negocios", parametros: { pipeline_id: P1, stage_id: S1 } }),
    );
    expect(r.status).toBe(422);
  });

  it("nenhum contato: 422 com o texto", async () => {
    banco({ rpc: { data: null, error: { code: "P0001", message: "acao_em_massa_vazia: nenhum contato selecionado" } } });
    const r = await POST(pedido("/api/v1/acoes-em-massa", porIds));
    expect(r.status).toBe(422);
    expect(JSON.stringify(await r.json())).toContain("Nenhum contato selecionado.");
  });
});

describe("GET /api/v1/acoes-em-massa", () => {
  const futuro = () => new Date(Date.now() + 60_000).toISOString();
  const passado = () => new Date(Date.now() - 60_000).toISOString();
  const linhas = () => [
    { id: "a1", acao: "exportar", status: "concluida", total: 2, feitos: 2, falhas: 0, arquivo: "x.csv", expira_em: futuro(), created_at: new Date().toISOString() },
    { id: "a2", acao: "exportar", status: "concluida", total: 2, feitos: 2, falhas: 0, arquivo: "y.csv", expira_em: passado(), created_at: new Date().toISOString() },
    { id: "a3", acao: "exportar", status: "aguardando_aprovacao", total: 5, feitos: 0, falhas: 0, arquivo: null, expira_em: null, created_at: new Date(Date.now() - 7.5 * DIA).toISOString() },
  ];

  it("gerente: as minhas, com 'tem_arquivo' só antes de vencer e o pedido velho como 'expirada'; nada para aprovar", async () => {
    const { from } = banco({ tabelas: { crm_acoes_em_massa: { data: linhas(), error: null } } });
    const corpo = (await (await GET()).json()) as {
      data: { minhas: Array<{ tem_arquivo: boolean; status: string }>; para_aprovar: unknown[] };
    };
    expect(corpo.data.minhas.map((a) => a.tem_arquivo)).toEqual([true, false, false]);
    expect(corpo.data.minhas.map((a) => a.status)).toEqual(["concluida", "concluida", "expirada"]);
    expect(corpo.data.para_aprovar).toEqual([]);
    expect(from).toHaveBeenCalledTimes(1);
  });

  it("admin: também os pedidos de outras pessoas para aprovar", async () => {
    authOk("admin");
    const criado = new Date().toISOString();
    banco({
      filas: {
        crm_acoes_em_massa: [
          { data: [], error: null },
          { data: [{ id: ACAO, user_id: OUTRA, total: 7, created_at: criado }], error: null },
        ],
      },
    });
    const corpo = (await (await GET()).json()) as { data: { para_aprovar: unknown[] } };
    expect(corpo.data.para_aprovar).toEqual([{ id: ACAO, solicitante_id: OUTRA, total: 7, created_at: criado }]);
  });
});

describe("POST /api/v1/acoes-em-massa/[id]/aprovar e /recusar (Q4)", () => {
  it("só admin, e o acompanhamento só-leitura não decide", async () => {
    authOk("admin");
    banco({ rpc: { data: "na_fila", error: null } });
    await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId);
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("admin");
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId)).status).toBe(403);
  });

  it("aprovar e recusar chamam a função e auditam", async () => {
    authOk("admin");
    const { rpc } = banco({ rpc: { data: "na_fila", error: null } });
    const r = await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId);
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { id: ACAO, status: "na_fila" } });
    expect(rpc).toHaveBeenCalledWith("fn_escale_decidir_exportacao", { p_acao: ACAO, p_aprovar: true });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "contacts.export_approved", actorUserId: USER_ID }));
    const recusado = banco({ rpc: { data: "recusada", error: null } });
    expect((await RECUSAR(pedido(`/x/${ACAO}/recusar`, {}), comId)).status).toBe(200);
    expect(recusado.rpc).toHaveBeenCalledWith("fn_escale_decidir_exportacao", { p_acao: ACAO, p_aprovar: false });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "contacts.export_rejected" }));
  });

  it("os erros da função viram 404, 403, 409 e 422", async () => {
    authOk("admin");
    const casos: Array<[string, number]> = [
      ["acao_em_massa_inexistente: x", 404],
      ["acao_em_massa_sem_permissao: x", 403],
      ["acao_em_massa_propria: x", 403],
      ["acao_em_massa_nao_aguarda: x", 409],
      ["acao_em_massa_expirada: x", 422],
    ];
    for (const [message, status] of casos) {
      banco({ rpc: { data: null, error: { code: "P0001", message } } });
      expect((await APROVAR(pedido(`/x/${ACAO}/aprovar`, {}), comId)).status).toBe(status);
    }
    expect(audit).not.toHaveBeenCalled();
  });
});

describe("GET /api/v1/acoes-em-massa/[id]/arquivo", () => {
  it("não achou ou venceu: 404", async () => {
    banco({ tabelas: { crm_acoes_em_massa: { data: null, error: null } } });
    expect((await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId)).status).toBe(404);
    banco({
      tabelas: { crm_acoes_em_massa: { data: { arquivo: "a.csv", expira_em: new Date(Date.now() - 1000).toISOString() }, error: null } },
    });
    expect((await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId)).status).toBe(404);
  });

  it("válido: 302 para a URL assinada de 60 s, e audita", async () => {
    banco({
      tabelas: {
        crm_acoes_em_massa: {
          data: { arquivo: `${ORG_ID}/${ACAO}/contatos-2026-10-17.csv`, expira_em: new Date(Date.now() + 60_000).toISOString() },
          error: null,
        },
      },
    });
    const createSignedUrl = vi.fn(async () => ({ data: { signedUrl: "https://storage/assinada" }, error: null }));
    vi.mocked(createAdminClient).mockReturnValue({ storage: { from: () => ({ createSignedUrl }) } } as never);
    const r = await GET_ARQUIVO(pedido(`/x/${ACAO}/arquivo`), comId);
    expect(r.status).toBe(302);
    expect(r.headers.get("location")).toBe("https://storage/assinada");
    expect(createSignedUrl).toHaveBeenCalledWith(`${ORG_ID}/${ACAO}/contatos-2026-10-17.csv`, 60, {
      download: "contatos-2026-10-17.csv",
    });
    expect(audit).toHaveBeenCalledWith(expect.objectContaining({ action: "contacts.export_downloaded", actorUserId: USER_ID }));
  });
});
```

Create `tests/unit/escale-excluir-contato-da-lista-rota.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { DELETE } from "@/app/api/v1/lista-de-contatos/[id]/route";
import { ApiError } from "@/lib/api/types";
import { requireRole } from "@/lib/auth/require-role";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/escale/contatos/excluir", () => ({ excluirContatoComNegocios: vi.fn() }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

const C1 = "c1c1c1c1-0000-4000-8000-000000000001";
const SESSAO = { sessao: true };
const pedido = () => new NextRequest(new URL(`/api/v1/lista-de-contatos/${C1}`, "http://x"), { method: "DELETE" } as never);
const comId = (id: string) => ({ params: Promise.resolve({ id }) });

beforeEach(() => {
  vi.mocked(excluirContatoComNegocios).mockReset();
  vi.mocked(createClient).mockResolvedValue(SESSAO as never);
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("DELETE /api/v1/lista-de-contatos/[id] (Q5)", () => {
  it("gerente ou acima; o acompanhamento só-leitura não exclui; id inválido é 422", async () => {
    vi.mocked(excluirContatoComNegocios).mockResolvedValue({ id: C1, negocios: 0 });
    await DELETE(pedido(), comId(C1));
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("manager");
    expect((await DELETE(pedido(), comId("abc"))).status).toBe(422);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    expect((await DELETE(pedido(), comId(C1))).status).toBe(403);
  });

  it("exclui com os negócios, pela sessão de quem pede", async () => {
    vi.mocked(excluirContatoComNegocios).mockResolvedValue({ id: C1, negocios: 2 });
    const r = await DELETE(pedido(), comId(C1));
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ data: { id: C1, negocios: 2 } });
    expect(excluirContatoComNegocios).toHaveBeenCalledWith(
      SESSAO,
      expect.objectContaining({ organization_id: ORG_ID, actor: { type: "user", id: USER_ID } }),
      C1,
    );
  });

  it("a trava da Agenda volta como 409 com os vínculos, como no original", async () => {
    vi.mocked(excluirContatoComNegocios).mockRejectedValue(
      new ApiError(409, "state_conflict", { vinculos: ["1 compromisso(s) na agenda"], por_tabela: { calendar_appointments: 1 } }, "r", "bloqueado"),
    );
    const r = await DELETE(pedido(), comId(C1));
    expect(r.status).toBe(409);
    expect(JSON.stringify(await r.json())).toContain("calendar_appointments");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-rotas.test.ts tests/unit/escale-excluir-contato-da-lista-rota.test.ts`
Expected: FAIL.

- [ ] **Step 2: As ações de auditoria**

Em `lib/audit/actions.ts`, logo depois de `"list_filter.deleted",`:

```ts
  // FORK ESCALE · Fase 2B: ações em massa da lista de contatos e a aprovação da exportação (migration 9103).
  "contacts.bulk_requested",
  "contacts.export_approved",
  "contacts.export_rejected",
  "contacts.export_downloaded",
```

- [ ] **Step 3: A rota de pedir e acompanhar**

Create `app/api/v1/acoes-em-massa/route.ts`:

```ts
/**
 * POST/GET /api/v1/acoes-em-massa — pedir uma ação em massa sobre contatos e
 * acompanhar as minhas (fork Escale, Fase 2B; migration 9103). O pedido é
 * gerente ou acima (PRD §5). Os contatos são resolvidos pela função invoker com
 * a sessão de quem pede; o consumidor do `event_log` faz o resto. A exportação
 * espera a aprovação de um admin (Q4): o POST devolve o status, e o GET mostra
 * ao admin os pedidos que esperam a decisão dele.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { compilarFiltros } from "@/lib/escale/contatos/compilar-filtros";
import { temFiltros } from "@/lib/escale/contatos/filtros";
import { filtrosDaConsulta, fusoDaOrganizacao, parametrosDaBusca } from "@/lib/escale/contatos/lista";
import {
  VALIDADE_DO_PEDIDO_MS,
  pedidoDeAcaoSchema,
  statusVisivel,
  type AcoesDaPessoa,
  type PedidoParaAprovar,
  type ResumoDaAcao,
  type StatusDaAcao,
} from "@/lib/escale/massa/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/acoes-em-massa";
const DIA_MS = 24 * 60 * 60 * 1000;
/** 7 dias de validade do pedido de exportação + 1 dia para a pessoa ver "Expirada". */
const JANELA_DA_LISTA_MS = 8 * DIA_MS;

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });

  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = pedidoDeAcaoSchema.safeParse(corpo.json);
  if (!lido.success) return recusa("Não consegui completar essa ação. Tente de novo.");
  const { acao, alvo, parametros } = lido.data;
  const orgId = authz.org.orgId;

  try {
    const supabase = await createClient();

    if (acao === "criar_negocios") {
      const p = parametros as { pipeline_id: string; stage_id: string };
      const { data: etapa } = await supabase
        .from("crm_stages")
        .select("id, pipeline_id, is_archived")
        .eq("id", p.stage_id)
        .eq("organization_id", orgId)
        .maybeSingle();
      const e = etapa as { pipeline_id: string; is_archived: boolean } | null;
      if (!e || e.pipeline_id !== p.pipeline_id || e.is_archived) return recusa("Escolha a origem e a etapa.");
    }

    let argumentos: Record<string, unknown>;
    if (alvo.tipo === "ids") {
      argumentos = {
        p_ids: alvo.ids,
        p_visao: "todos",
        p_padrao: null,
        p_digitos: null,
        p_cpf_hash: null,
        p_filtros: {},
        p_quantidade: null,
        p_excluidos: null,
      };
    } else {
      const filtros = filtrosDaConsulta({ f: alvo.f });
      if (filtros === null) return recusa("Não consegui completar essa ação. Tente de novo.");
      const busca = parametrosDaBusca(alvo.q);
      if (busca.vazia) return recusa("Nenhum contato selecionado.");
      argumentos = {
        p_ids: null,
        p_visao: alvo.v,
        p_padrao: busca.padrao,
        p_digitos: busca.digitos,
        p_cpf_hash: busca.cpfHash,
        p_filtros: temFiltros(filtros) ? compilarFiltros(filtros, await fusoDaOrganizacao(supabase, orgId)) : {},
        p_quantidade: alvo.quantidade,
        p_excluidos: alvo.excluidos,
      };
    }

    const { data, error } = await supabase.rpc("fn_escale_criar_acao_em_massa", {
      p_org: orgId,
      p_acao: acao,
      p_parametros: parametros,
      ...argumentos,
    });
    if (error) {
      const mensagem = error.message ?? "";
      if (mensagem.includes("acao_em_massa_vazia")) return recusa("Nenhum contato selecionado.");
      if (mensagem.includes("acao_em_massa_grande_demais")) return recusa("No máximo 100.000 contatos por ação.");
      return falhaInesperadaDoQuadro(error, { rota: `POST ${ROTA}`, operacao: "pedir a ação em massa" }, t, requestId);
    }
    const linha = ((data ?? []) as Array<{ acao_id: string; quantidade: number; status: StatusDaAcao }>)[0];
    if (!linha) return recusa("Nenhum contato selecionado.");
    void audit({
      action: "contacts.bulk_requested",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: linha.acao_id,
      requestId,
      metadata: {
        acao,
        total: linha.quantidade,
        alvo: alvo.tipo,
        ...(acao === "exportar"
          ? { aprovacao: linha.status === "aguardando_aprovacao" ? "pendente" : "dispensada" }
          : {}),
      },
    });
    return ok({ id: linha.acao_id, total: linha.quantidade, status: linha.status }, { status: 201, requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `POST ${ROTA}`, operacao: "pedir a ação em massa" },
      t,
      requestId,
    );
  }
}

type LinhaDaAcao = Omit<ResumoDaAcao, "tem_arquivo" | "status"> & {
  status: StatusDaAcao;
  arquivo: string | null;
  expira_em: string | null;
};
type LinhaDoPedido = { id: string; user_id: string; total: number; created_at: string };

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const orgId = authz.org.orgId;
  const userId = authz.user.id;
  try {
    const supabase = await createClient();
    const agora = Date.now();
    const { data, error } = await supabase
      .from("crm_acoes_em_massa")
      .select("id, acao, status, total, feitos, falhas, arquivo, expira_em, created_at")
      .eq("organization_id", orgId)
      .eq("user_id", userId)
      .gte("created_at", new Date(agora - JANELA_DA_LISTA_MS).toISOString())
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw error;
    const minhas: ResumoDaAcao[] = ((data ?? []) as LinhaDaAcao[]).map(({ arquivo, expira_em, status, ...a }) => ({
      ...a,
      status: statusVisivel(status, a.created_at, agora),
      tem_arquivo: Boolean(arquivo) && expira_em !== null && new Date(expira_em).getTime() > agora,
    }));

    // Q4: o admin vê os pedidos de exportação de outras pessoas que esperam a decisão dele.
    let paraAprovar: PedidoParaAprovar[] = [];
    if (authz.org.role === "admin") {
      const pedidos = await supabase
        .from("crm_acoes_em_massa")
        .select("id, user_id, total, created_at")
        .eq("organization_id", orgId)
        .eq("acao", "exportar")
        .eq("status", "aguardando_aprovacao")
        .neq("user_id", userId)
        .gt("created_at", new Date(agora - VALIDADE_DO_PEDIDO_MS).toISOString())
        .order("created_at", { ascending: true })
        .limit(50);
      if (pedidos.error) throw pedidos.error;
      paraAprovar = ((pedidos.data ?? []) as LinhaDoPedido[]).map((p) => ({
        id: p.id,
        solicitante_id: p.user_id,
        total: p.total,
        created_at: p.created_at,
      }));
    }
    const resposta: AcoesDaPessoa = { minhas, para_aprovar: paraAprovar };
    return ok(resposta, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as ações em massa" },
      t,
      requestId,
    );
  }
}
```

- [ ] **Step 4: Aprovar e recusar a exportação**

Create `lib/escale/massa/decisao-da-exportacao.ts`:

```ts
import { randomUUID } from "node:crypto";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

/** Os erros de `fn_escale_decidir_exportacao` (9103) → resposta da rota. */
const FALHAS: ReadonlyArray<{ marca: string; status: number; codigo: string; texto: string }> = [
  { marca: "acao_em_massa_inexistente", status: 404, codigo: "not_found", texto: "Pedido de exportação não encontrado." },
  { marca: "acao_em_massa_sem_permissao", status: 403, codigo: "forbidden", texto: "Só um administrador aprova exportações." },
  { marca: "acao_em_massa_propria", status: 403, codigo: "forbidden", texto: "Outro administrador precisa decidir o seu pedido." },
  { marca: "acao_em_massa_nao_aguarda", status: 409, codigo: "state_conflict", texto: "Este pedido já foi decidido." },
  { marca: "acao_em_massa_expirada", status: 422, codigo: "unprocessable_entity", texto: "O pedido expirou: passou de 7 dias." },
];

/**
 * APROVAR OU RECUSAR UMA EXPORTAÇÃO (fork Escale, Fase 2B; Q4). Admin, com o
 * acompanhamento só-leitura barrado. Quem decide de verdade é o banco
 * (`fn_escale_decidir_exportacao`, invoker): admin da organização, diferente de quem
 * pediu, pedido aguardando e com menos de 7 dias; aprovar põe na fila e emite o
 * evento na mesma transação. As rotas `[id]/aprovar` e `[id]/recusar` só chamam esta.
 */
export async function decidirExportacao(
  ctx: { params: Promise<{ id: string }> },
  aprovar: boolean,
): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("admin", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const rota = `POST /api/v1/acoes-em-massa/[id]/${aprovar ? "aprovar" : "recusar"}`;
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Pedido de exportação não encontrado."), 404, { requestId });
  }
  try {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("fn_escale_decidir_exportacao", { p_acao: id, p_aprovar: aprovar });
    if (error) {
      const falha = FALHAS.find((f) => (error.message ?? "").includes(f.marca));
      if (falha) return fail(falha.codigo, t(falha.texto), falha.status, { requestId });
      return falhaInesperadaDoQuadro(error, { rota, operacao: "decidir a exportação" }, t, requestId);
    }
    const status = String(data);
    void audit({
      action: aprovar ? "contacts.export_approved" : "contacts.export_rejected",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: id,
      requestId,
      metadata: { status },
    });
    return ok({ id, status }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota, operacao: "decidir a exportação" },
      t,
      requestId,
    );
  }
}
```

Create `app/api/v1/acoes-em-massa/[id]/aprovar/route.ts`:

```ts
/** POST /api/v1/acoes-em-massa/[id]/aprovar — o admin aprova o pedido de exportação (fork Escale, Fase 2B; Q4). */
import { type NextRequest } from "next/server";

import { decidirExportacao } from "@/lib/escale/massa/decisao-da-exportacao";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return decidirExportacao(ctx, true);
}
```

Create `app/api/v1/acoes-em-massa/[id]/recusar/route.ts`:

```ts
/** POST /api/v1/acoes-em-massa/[id]/recusar — o admin recusa o pedido de exportação (fork Escale, Fase 2B; Q4). */
import { type NextRequest } from "next/server";

import { decidirExportacao } from "@/lib/escale/massa/decisao-da-exportacao";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  return decidirExportacao(ctx, false);
}
```

Confira antes de rodar: o código `forbidden` existe no `fail` (o `requireRole` já o usa); `fail` aceita qualquer `string` como código (`ApiErrorCode | (string & {})`).

- [ ] **Step 5: A rota de baixar**

Create `app/api/v1/acoes-em-massa/[id]/arquivo/route.ts`:

```ts
/**
 * GET /api/v1/acoes-em-massa/[id]/arquivo — baixar a exportação (fork Escale,
 * Fase 2B). Só quem pediu (a RLS e o `user_id` da sessão), só antes de vencer
 * (24 h). Responde 302 para uma URL assinada de 60 s, gerada pelo service role
 * (o bucket não tem policy), e audita o download.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { BUCKET_DAS_EXPORTACOES } from "@/lib/escale/massa/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const VALIDADE_DA_URL_S = 60;

export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_acoes_em_massa" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  const expirou = () => fail("not_found", t("A exportação expirou. Exporte de novo."), 404, { requestId });
  if (!z.string().uuid().safeParse(id).success) return expirou();
  try {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("crm_acoes_em_massa")
      .select("arquivo, expira_em")
      .eq("id", id)
      .eq("organization_id", authz.org.orgId)
      .eq("user_id", authz.user.id)
      .maybeSingle();
    if (error) throw error;
    const linha = data as { arquivo: string | null; expira_em: string | null } | null;
    if (!linha?.arquivo || !linha.expira_em || new Date(linha.expira_em).getTime() <= Date.now()) return expirou();
    const nome = linha.arquivo.split("/").pop() ?? "contatos.csv";
    const assinada = await createAdminClient()
      .storage.from(BUCKET_DAS_EXPORTACOES)
      .createSignedUrl(linha.arquivo, VALIDADE_DA_URL_S, { download: nome });
    if (assinada.error || !assinada.data?.signedUrl) return expirou();
    void audit({
      action: "contacts.export_downloaded",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_acoes_em_massa",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return Response.redirect(assinada.data.signedUrl, 302);
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/acoes-em-massa/[id]/arquivo", operacao: "baixar a exportação" },
      t,
      requestId,
    );
  }
}
```

- [ ] **Step 6: Excluir da linha (com os negócios)**

Create `app/api/v1/lista-de-contatos/[id]/route.ts`:

```ts
/**
 * DELETE /api/v1/lista-de-contatos/[id] — o "Excluir" do ⋮ da linha da casca (fork
 * Escale, Fase 2B; Q5): exclui o contato COM os negócios dele, pela mesma regra da
 * exclusão em massa (`excluirContatoComNegocios`: trava da Agenda, negócios pelo
 * caminho do lote do original, `deleteContactHandler`), com a sessão de quem pede.
 * Gerente ou acima, como o ⋮ da casca já mostra (2A). O `DELETE /api/v1/contacts/[id]`
 * do original não muda.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { ApiError } from "@/lib/api/types";
import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { excluirContatoComNegocios } from "@/lib/escale/contatos/excluir";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  try {
    const feito = await excluirContatoComNegocios(
      await createClient(),
      {
        organization_id: authz.org.orgId,
        actor: { type: "user", id: authz.user.id },
        requestId,
        idioma: authz.user.idioma,
      },
      id,
    );
    return ok(feito, { requestId });
  } catch (err) {
    if (err instanceof ApiError) {
      // `details` leva os vínculos que barraram (a Agenda), como o DELETE do original.
      return fail(err.code, err.message, err.status, {
        details: err.details as Record<string, unknown> | undefined,
        requestId,
      });
    }
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "DELETE /api/v1/lista-de-contatos/[id]", operacao: "excluir o contato" },
      t,
      requestId,
    );
  }
}
```

Confira antes de rodar: o `DELETE` do original (`app/api/v1/contacts/[id]/route.ts`, L127) usa `fail(err.code, err.message, err.status, { details: err.details, requestId })`; se o tipo de `details` lá for outro, siga o dele.

- [ ] **Step 7: Os hooks**

Create `hooks/escale/useAcoesEmMassa.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { AcoesDaPessoa, PedidoDeAcao, StatusDaAcao } from "@/lib/escale/massa/tipos";

export const CHAVE_DAS_ACOES = ["acoes-em-massa"] as const;

/** Pedir uma ação em massa (fork Escale, Fase 2B). Responde com o id, o total resolvido e o status (Q4). */
export function usePedirAcaoEmMassa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: PedidoDeAcao) =>
      (
        await apiClient.post<{ data: { id: string; total: number; status: StatusDaAcao } }>(
          "/api/v1/acoes-em-massa",
          pedido,
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_ACOES }),
  });
}

/**
 * As minhas ações (últimos 8 dias) e, para o admin, os pedidos de exportação para
 * aprovar. Quem usa diz se pergunta e de quanto em quanto tempo; com dois usos ao
 * mesmo tempo (o aviso de fim e o botão "Exportações"), vale o menor intervalo.
 */
export function useAcoesEmMassa(ativo: boolean, intervalo: number | false = 3000) {
  return useQuery({
    queryKey: CHAVE_DAS_ACOES,
    queryFn: async () => (await apiClient.get<{ data: AcoesDaPessoa }>("/api/v1/acoes-em-massa")).data,
    enabled: ativo,
    refetchInterval: ativo ? intervalo : false,
  });
}

/** O admin aprova ou recusa um pedido de exportação (Q4). */
export function useDecidirExportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, aprovar }: { id: string; aprovar: boolean }) =>
      (
        await apiClient.post<{ data: { id: string; status: StatusDaAcao } }>(
          `/api/v1/acoes-em-massa/${id}/${aprovar ? "aprovar" : "recusar"}`,
          {},
        )
      ).data,
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_ACOES }),
  });
}
```

Create `hooks/escale/useExcluirContatoDaLista.ts`:

```ts
"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

import { showApiError } from "@/components/feedback/ApiErrorToast";
import { mensagemDeBloqueioPorVinculo } from "@/hooks/contacts/useDeleteContact";
import { apiClient } from "@/lib/api/client";
import { ApiError } from "@/lib/api/types";
import { traduzir } from "@/lib/i18n/dicionario";
import { idiomaAtual } from "@/lib/i18n/IdiomaProvider";

/**
 * O "Excluir" do ⋮ da linha (fork Escale, Fase 2B; Q5): o contato e os negócios dele,
 * pela rota do fork. A trava da Agenda dá o mesmo aviso do original
 * (`mensagemDeBloqueioPorVinculo`); o resto, o toast de erro do original.
 */
export function useExcluirContatoDaLista() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) =>
      (await apiClient.delete<{ data: { id: string; negocios: number } }>(`/api/v1/lista-de-contatos/${id}`)).data,
    onError: (err) => {
      const t = (s: string) => traduzir(s, idiomaAtual());
      const bloqueio = err instanceof ApiError ? mensagemDeBloqueioPorVinculo(err.details, t) : null;
      if (bloqueio) toast.error(bloqueio);
      else showApiError(err);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}
```

- [ ] **Step 8: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-acoes-em-massa-rotas.test.ts tests/unit/escale-excluir-contato-da-lista-rota.test.ts`
Expected: PASS. Se `fail` não aceitar `"not_found"`, use o código de 404 que existir em `lib/api/wrappers.ts` (o mesmo da Task 3).

- [ ] **Step 9: Revisor (subagente) das rotas**

Pontos: `requireSupportWrite` e `requireRole("manager")` no POST e no DELETE da linha; `requireRole("admin")` nas decisões; nada do corpo vai cru para o banco (o filtro é compilado no servidor, a busca passa pelo `parametrosDaBusca`); a etapa é conferida contra a origem e a organização; a decisão é do banco (a rota só traduz os erros) e a auditoria só sai quando deu certo; o GET só mostra `para_aprovar` ao admin, sem os próprios pedidos e sem os vencidos; o download confere dono, organização e validade antes de assinar; a URL dura 60 s e o service role só toca o Storage; o DELETE da linha usa a sessão (RLS) e devolve os vínculos da Agenda como o original.

- [ ] **Step 10: Guardas, typecheck, eslint, prettier e commit**

```bash
NOVOS="app/api/v1/acoes-em-massa/route.ts app/api/v1/acoes-em-massa/[id]/arquivo/route.ts app/api/v1/acoes-em-massa/[id]/aprovar/route.ts app/api/v1/acoes-em-massa/[id]/recusar/route.ts lib/escale/massa/decisao-da-exportacao.ts app/api/v1/lista-de-contatos/[id]/route.ts hooks/escale/useAcoesEmMassa.ts hooks/escale/useExcluirContatoDaLista.ts tests/unit/escale-acoes-em-massa-rotas.test.ts tests/unit/escale-excluir-contato-da-lista-rota.test.ts"
corepack pnpm vitest run tests/unit/escale-acoes-em-massa-rotas.test.ts tests/unit/escale-excluir-contato-da-lista-rota.test.ts $(grep -rlF "lib/audit/actions" tests/unit --include='*.test.ts' | tr '\n' ' ')
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS lib/audit/actions.ts
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS lib/audit/actions.ts
git commit -m "feat(escale): rotas das ações em massa, aprovação da exportação, download e excluir da linha (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: A seleção na tabela (caixinhas, setinha e faixa)

**Files:**
- Create: `hooks/escale/useSelecaoDaLista.ts`, `components/escale/contatos/massa/MenuDaSelecao.tsx`, `components/escale/contatos/massa/FaixaDaSelecao.tsx`, `tests/unit/escale-selecao-na-tabela.test.tsx`
- Modify: `components/escale/contatos/TabelaDeContatos.tsx`, `components/escale/contatos/ListaDeContatos.tsx`, `tests/unit/escale-tabela-de-contatos.test.tsx` (L56–62)

**Interfaces:**
- Consumes: `lib/escale/contatos/selecao.ts` (Task 8); `CaixaDaCasca` (aceita `"indeterminada"`), `PainelSuspenso`, `CLASSE_DA_LINHA_DO_MENU`.
- Produces:
  - `useSelecaoDaLista({ linhas, total, primeiro, chaveDaConsulta })` → `{ selecao, estado, quantidade, modoDaFaixa, marcada(id, i), alternar(id, i, marcar), marcarPagina(marcar), selecionarTodos(), selecionarQuantidade(n), limpar() }` (`i` é o índice na página; o hook soma `primeiro`).
  - `MenuDaSelecao({ estado, podeSelecionar, total, naPagina, aoMarcarPagina, aoSelecionarTodos, aoSelecionarQuantidade })`.
  - `FaixaDaSelecao({ modo: "pagina" | "todos" | null, naPagina, total, aoSelecionarTodos, aoLimpar })`.
  - `TabelaDeContatos` ganha `cabecalhoDaSelecao?: ReactNode` e `selecao?: { podeSelecionar: boolean; marcada: (id: string, i: number) => boolean; aoAlternar: (id: string, i: number, marcar: boolean) => void }` (sem eles, a caixinha fica desligada com "Disponível para gerente ou acima.").

Abra antes: 03-001 (caixinha de 16px + chevron de 12px no cabeçalho; caixinha na linha) e 18b (o menu "Selecionar todos..." e "Selecione [0]" com o (?) roxo).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-selecao-na-tabela.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { FaixaDaSelecao } from "@/components/escale/contatos/massa/FaixaDaSelecao";
import { MenuDaSelecao } from "@/components/escale/contatos/massa/MenuDaSelecao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

describe("MenuDaSelecao (03-001, 18b)", () => {
  const props = {
    estado: false as const,
    total: 64001,
    naPagina: 10,
    aoMarcarPagina: vi.fn(),
    aoSelecionarTodos: vi.fn(),
    aoSelecionarQuantidade: vi.fn(),
  };

  it("a caixinha marca a página; a setinha oferece página, todos e 'Selecionar [N]'", () => {
    envolver(<MenuDaSelecao {...props} podeSelecionar />);
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar todos" }));
    expect(props.aoMarcarPagina).toHaveBeenCalledWith(true);
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todos os 64.001 contatos" }));
    expect(props.aoSelecionarTodos).toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar" }));
    expect(screen.getByRole("button", { name: "Selecionar esta página (10)" })).toBeInTheDocument();
    fireEvent.change(screen.getByRole("spinbutton", { name: "Quantidade de contatos" }), { target: { value: "25" } });
    expect(props.aoSelecionarQuantidade).toHaveBeenLastCalledWith(25);
  });

  it("sem permissão: desligada, com a dica", () => {
    envolver(<MenuDaSelecao {...props} podeSelecionar={false} />);
    expect(screen.getByRole("checkbox", { name: "Selecionar todos" })).toHaveAttribute("aria-disabled", "true");
    expect(screen.getAllByTitle("Disponível para gerente ou acima.").length).toBeGreaterThan(0);
  });
});

describe("FaixaDaSelecao (B3)", () => {
  it("página marcada: oferece todos; todos marcados: só limpar", () => {
    const aoSelecionarTodos = vi.fn();
    const aoLimpar = vi.fn();
    const { rerender } = render(
      <FaixaDaSelecao modo="pagina" naPagina={10} total={64001} aoSelecionarTodos={aoSelecionarTodos} aoLimpar={aoLimpar} />,
    );
    expect(screen.getByText("Os 10 contatos desta página estão selecionados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Selecionar todos os 64.001 contatos" }));
    expect(aoSelecionarTodos).toHaveBeenCalled();
    rerender(<FaixaDaSelecao modo="todos" naPagina={10} total={64001} aoSelecionarTodos={aoSelecionarTodos} aoLimpar={aoLimpar} />);
    expect(screen.getByText("Todos os 64.001 contatos estão selecionados.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Limpar seleção" }));
    expect(aoLimpar).toHaveBeenCalled();
  });

  it("sem modo, nada", () => {
    const { container } = render(
      <FaixaDaSelecao modo={null} naPagina={10} total={64001} aoSelecionarTodos={vi.fn()} aoLimpar={vi.fn()} />,
    );
    expect(container).toBeEmptyDOMElement();
  });
});
```

Confira antes de rodar: o `CaixaDaCasca` desligada marca `aria-disabled="true"` (ou `disabled`)? Ajuste a primeira expectativa do teste "sem permissão" ao que ela faz (`grep -n "disabled" components/escale/ui/CaixaDaCasca.tsx`).

Run: `corepack pnpm vitest run tests/unit/escale-selecao-na-tabela.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O hook**

Create `hooks/escale/useSelecaoDaLista.ts`:

```ts
"use client";
import { useEffect, useState } from "react";

import {
  SELECIONAR_TODOS,
  SEM_SELECAO,
  alternarLinha,
  estadoDaPagina,
  linhaMarcada,
  marcarPagina,
  selecionarQuantidade,
  todosMarcados,
  totalSelecionado,
  type Selecao,
} from "@/lib/escale/contatos/selecao";

/**
 * A seleção da lista de contatos (fork Escale, Fase 2B; decisão B3). Mudar
 * busca, visão ou filtro (`chaveDaConsulta`) limpa; mudar de página não.
 */
export function useSelecaoDaLista({
  linhas,
  total,
  primeiro,
  chaveDaConsulta,
}: {
  linhas: ReadonlyArray<{ id: string }>;
  total: number;
  primeiro: number;
  chaveDaConsulta: string;
}) {
  const [selecao, setSelecao] = useState<Selecao>(SEM_SELECAO);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- a seleção é da consulta: outra busca, outro conjunto
  useEffect(() => setSelecao(SEM_SELECAO), [chaveDaConsulta]);

  const estado = estadoDaPagina(selecao, linhas, primeiro);
  const modoDaFaixa: "pagina" | "todos" | null = todosMarcados(selecao)
    ? "todos"
    : selecao.tipo === "ids" && estado === true && total > linhas.length
      ? "pagina"
      : null;

  return {
    selecao,
    estado,
    quantidade: totalSelecionado(selecao, total),
    modoDaFaixa,
    marcada: (id: string, i: number) => linhaMarcada(selecao, id, primeiro + i),
    alternar: (id: string, i: number, marcar: boolean) =>
      setSelecao((s) => alternarLinha(s, id, primeiro + i, marcar)),
    marcarPagina: (marcar: boolean) => setSelecao((s) => marcarPagina(s, linhas, primeiro, marcar)),
    selecionarTodos: () => setSelecao(SELECIONAR_TODOS),
    selecionarQuantidade: (n: number) => setSelecao(selecionarQuantidade(n, total)),
    limpar: () => setSelecao(SEM_SELECAO),
  };
}
```

- [ ] **Step 3: O menu da caixinha do cabeçalho**

Create `components/escale/contatos/massa/MenuDaSelecao.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU } from "@/components/escale/filtros/controles";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, HelpCircle } from "@/lib/ui/icons-da-casca";

/**
 * A CAIXINHA DO CABEÇALHO E A SETINHA (03-001; menu como o 18b; decisão B3): a
 * caixinha marca ou desmarca SÓ a página; a setinha ("Selecionar") abre
 * "Selecionar esta página (N)", "Selecionar todos os {total} contatos" e
 * "Selecionar [N]" com o (?) — o campo aplica a cada número, como na Clint.
 */
export function MenuDaSelecao({
  estado,
  podeSelecionar,
  total,
  naPagina,
  aoMarcarPagina,
  aoSelecionarTodos,
  aoSelecionarQuantidade,
}: {
  estado: boolean | "indeterminada";
  podeSelecionar: boolean;
  total: number;
  naPagina: number;
  aoMarcarPagina: (marcar: boolean) => void;
  aoSelecionarTodos: () => void;
  aoSelecionarQuantidade: (n: number) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const semPermissao = t("Disponível para gerente ou acima.");
  return (
    <span className="flex items-center gap-1" title={podeSelecionar ? undefined : semPermissao}>
      <CaixaDaCasca
        marcada={estado}
        aoMudar={(m) => aoMarcarPagina(m)}
        aria-label={t("Selecionar todos")}
        desabilitada={!podeSelecionar}
      />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!podeSelecionar}
            title={podeSelecionar ? t("Selecionar") : semPermissao}
            aria-label={t("Selecionar")}
            className="grid size-5 place-items-center text-casca-meta hover:text-casca-texto disabled:cursor-not-allowed"
          >
            <ChevronDown size={12} aria-hidden />
          </button>
        </PopoverTrigger>
        <PainelSuspenso align="start" className="w-[240px] p-1">
          <button
            type="button"
            className={CLASSE_DA_LINHA_DO_MENU}
            onClick={() => {
              aoMarcarPagina(true);
              setAberto(false);
            }}
          >
            {t("Selecionar esta página ({n})").replace("{n}", String(naPagina))}
          </button>
          <button
            type="button"
            className={CLASSE_DA_LINHA_DO_MENU}
            onClick={() => {
              aoSelecionarTodos();
              setAberto(false);
            }}
          >
            {t("Selecionar todos os {total} contatos").replace("{total}", total.toLocaleString("pt-BR"))}
          </button>
          <div className="flex h-[34px] items-center gap-2 px-3 text-[11px] font-medium text-casca-texto">
            {t("Selecionar")}
            <input
              type="number"
              min={0}
              max={total}
              value={quantidade}
              placeholder="0"
              aria-label={t("Quantidade de contatos")}
              onChange={(e) => {
                setQuantidade(e.target.value);
                aoSelecionarQuantidade(Number(e.target.value));
              }}
              className="h-6 w-16 rounded-[5px] border border-casca-borda bg-casca-busca px-1 text-[12px] text-casca-texto"
            />
            <span title={t("Escolha quantos contatos você quer selecionar")} className="text-casca-marca">
              <HelpCircle size={14} aria-hidden />
            </span>
          </div>
        </PainelSuspenso>
      </Popover>
    </span>
  );
}
```

- [ ] **Step 4: A faixa da seleção**

Create `components/escale/contatos/massa/FaixaDaSelecao.tsx`:

```tsx
"use client";

import { useT } from "@/hooks/i18n/useT";

/**
 * A FAIXA DA SELEÇÃO (decisão B3 do usuário; textos nossos no tom da Clint):
 * página toda marcada → "Os N contatos desta página estão selecionados.
 * Selecionar todos os {total} contatos · Limpar seleção"; tudo marcado →
 * "Todos os {total} contatos estão selecionados. · Limpar seleção".
 */
export function FaixaDaSelecao({
  modo,
  naPagina,
  total,
  aoSelecionarTodos,
  aoLimpar,
}: {
  modo: "pagina" | "todos" | null;
  naPagina: number;
  total: number;
  aoSelecionarTodos: () => void;
  aoLimpar: () => void;
}) {
  const t = useT();
  if (!modo) return null;
  const totalBr = total.toLocaleString("pt-BR");
  const link = "font-medium text-casca-marca hover:underline";
  return (
    <div role="status" className="flex h-9 shrink-0 items-center justify-center gap-2 bg-casca-marca-suave px-6 text-[13px] text-casca-texto">
      {modo === "pagina" ? (
        <>
          <span>{t("Os {n} contatos desta página estão selecionados.").replace("{n}", String(naPagina))}</span>
          <button type="button" onClick={aoSelecionarTodos} className={link}>
            {t("Selecionar todos os {total} contatos").replace("{total}", totalBr)}
          </button>
        </>
      ) : (
        <span>{t("Todos os {total} contatos estão selecionados.").replace("{total}", totalBr)}</span>
      )}
      <span aria-hidden>·</span>
      <button type="button" onClick={aoLimpar} className={link}>
        {t("Limpar seleção")}
      </button>
    </div>
  );
}
```

- [ ] **Step 5: As caixinhas da tabela**

Em `components/escale/contatos/TabelaDeContatos.tsx`:

1. Imports: troque `import Link from "next/link";` por

```tsx
import Link from "next/link";
import type { ReactNode } from "react";
```

2. Logo depois de `const TD = "px-3 align-middle";`:

```tsx
/** Fase 2B: a seleção. Sem ela (ou sem permissão), a caixinha fica desligada, como na Clint. */
export type SelecaoDaTabela = {
  podeSelecionar: boolean;
  marcada: (id: string, indice: number) => boolean;
  aoAlternar: (id: string, indice: number, marcar: boolean) => void;
};
const SELECAO_DESLIGADA: SelecaoDaTabela = { podeSelecionar: false, marcada: () => false, aoAlternar: () => {} };
```

3. No comentário do componente, troque "A caixinha aparece desligada (a seleção é da 2B), como a Clint mostra a quem não tem `CONTACT_BULK_ACTIONS`." por "A caixinha marca a linha (2B); sem permissão, aparece desligada, como a Clint mostra a quem não tem `CONTACT_BULK_ACTIONS`.".

4. Nas props, acrescente `cabecalhoDaSelecao,` e `selecao = SELECAO_DESLIGADA,` na desestruturação, e no tipo:

```tsx
  cabecalhoDaSelecao?: ReactNode;
  selecao?: SelecaoDaTabela;
```

5. Logo depois de `const t = useT();`: `const semPermissao = t("Disponível para gerente ou acima.");`

6. Troque `return linhas.map((linha) => {` por `return linhas.map((linha, indice) => {` e a célula da caixinha da linha por:

```tsx
          <td className={`${TD} w-10`} title={selecao.podeSelecionar ? undefined : semPermissao}>
            <CaixaDaCasca
              marcada={selecao.marcada(linha.id, indice)}
              aoMudar={(m) => selecao.aoAlternar(linha.id, indice, m)}
              aria-label={t("Selecionar contato")}
              desabilitada={!selecao.podeSelecionar}
            />
          </td>
```

7. Troque o `<th>` da caixinha do cabeçalho por:

```tsx
          <th className={`${TH} w-10`} title={cabecalhoDaSelecao ? undefined : semPermissao}>
            {cabecalhoDaSelecao ?? (
              <span className="flex items-center gap-1">
                <CaixaDaCasca marcada={false} aoMudar={() => {}} aria-label={t("Selecionar todos")} desabilitada />
                <ChevronDown size={12} aria-hidden className="text-casca-meta" />
              </span>
            )}
          </th>
```

8. Em `tests/unit/escale-tabela-de-contatos.test.tsx`, no `it("cabeçalho NOME, CONTATO, TAGS, NEGÓCIOS e a caixinha desligada 'Em breve'", …)` (L56–62): troque o nome do `it` por `"cabeçalho NOME, CONTATO, TAGS, NEGÓCIOS e a caixinha desligada sem permissão"` e `getAllByTitle("Em breve")` por `getAllByTitle("Disponível para gerente ou acima.")`. Acrescente no mesmo arquivo:

```tsx
  it("com a seleção ligada, a caixinha da linha marca pelo índice da página", () => {
    const aoAlternar = vi.fn();
    envolver(
      <TabelaDeContatos
        {...props}
        linhas={[linha({})]}
        selecao={{ podeSelecionar: true, marcada: () => false, aoAlternar }}
      />,
    );
    fireEvent.click(screen.getByRole("checkbox", { name: "Selecionar contato" }));
    expect(aoAlternar).toHaveBeenCalledWith("c1", 0, true);
  });
```

(e acrescente `fireEvent` ao import de `@testing-library/react`).

- [ ] **Step 6: A lista com a seleção**

Em `components/escale/contatos/ListaDeContatos.tsx` (a versão da Task 5):

1. Imports, junto dos outros:

```tsx
import { useSelecaoDaLista } from "@/hooks/escale/useSelecaoDaLista";
import { FaixaDaSelecao } from "./massa/FaixaDaSelecao";
import { MenuDaSelecao } from "./massa/MenuDaSelecao";
```

2. Logo depois de `const podeMesclar = …;`:

```tsx
  // FORK ESCALE · Fase 2B: selecionar e agir em massa é de gerente ou acima (PRD §5).
  const podeSelecionar = ROLE_RANK[papel] >= ROLE_RANK.manager;
```

3. Logo depois de `const falhou = …;`:

```tsx
  const linhas = dados?.linhas ?? [];
  const sel = useSelecaoDaLista({
    linhas,
    total,
    primeiro: (pagina - 1) * porPagina,
    chaveDaConsulta: JSON.stringify([buscaDaUrl, visao, f]),
  });
```

(o `total` precisa estar declarado antes: ele já está, em `const total = dados?.total ?? 0;`).

4. Logo antes de `<div className="min-h-0 flex-1 overflow-auto px-6">`:

```tsx
      <FaixaDaSelecao
        modo={sel.modoDaFaixa}
        naPagina={linhas.length}
        total={total}
        aoSelecionarTodos={sel.selecionarTodos}
        aoLimpar={sel.limpar}
      />
```

5. Na `<TabelaDeContatos …>`, troque `linhas={dados?.linhas ?? []}` por `linhas={linhas}` e acrescente:

```tsx
          cabecalhoDaSelecao={
            <MenuDaSelecao
              estado={sel.estado}
              podeSelecionar={podeSelecionar}
              total={total}
              naPagina={linhas.length}
              aoMarcarPagina={sel.marcarPagina}
              aoSelecionarTodos={sel.selecionarTodos}
              aoSelecionarQuantidade={sel.selecionarQuantidade}
            />
          }
          selecao={{ podeSelecionar, marcada: sel.marcada, aoAlternar: sel.alternar }}
```

- [ ] **Step 7: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-selecao-na-tabela.test.tsx tests/unit/escale-tabela-de-contatos.test.tsx tests/unit/escale-lista-de-contatos-pagina.test.tsx
```

Expected: PASS.

- [ ] **Step 8: Typecheck, eslint, prettier e commit**

```bash
NOVOS="hooks/escale/useSelecaoDaLista.ts components/escale/contatos/massa/MenuDaSelecao.tsx components/escale/contatos/massa/FaixaDaSelecao.tsx tests/unit/escale-selecao-na-tabela.test.tsx"
ALTERADOS="components/escale/contatos/TabelaDeContatos.tsx components/escale/contatos/ListaDeContatos.tsx tests/unit/escale-tabela-de-contatos.test.tsx"
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS $ALTERADOS
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS $ALTERADOS
git commit -m "feat(escale): seleção da lista de contatos — página, todos e os N primeiros (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: A barra de lote, as janelas, o aviso de fim e o "Excluir" da linha

**Files:**
- Create: `components/escale/contatos/massa/textosDasAcoes.ts`, `BarraDeLote.tsx`, `JanelaCriarNegocios.tsx`, `PainelDeTag.tsx`, `JanelaExcluirContatos.tsx`, `AcoesEmMassa.tsx`, `hooks/escale/useAcompanharAcoes.ts`, `tests/unit/escale-barra-e-acoes-em-massa.test.tsx`, `tests/unit/escale-menu-da-linha-excluir.test.tsx`
- Modify: `components/escale/contatos/ListaDeContatos.tsx`, `components/escale/contatos/MenuDaLinha.tsx` (o "Excluir" da linha leva os negócios, Q5)

**Interfaces:**
- Consumes: `usePedirAcaoEmMassa`, `useAcoesEmMassa`, `useExcluirContatoDaLista` (Task 9); `AlvoDaAcao`, `alvoDaSelecao`, `StatusDaAcao`, `StatusVisivel`, `ResumoDaAcao` (Task 8); `useSelecaoDaLista` (Task 10); `JanelaDeConfirmacao` (com `iconeDoConfirmar`, Task 5); `BotaoVoltar` não (o "← Incluir Tag" tem rótulo próprio); `JanelaDaCasca` e peças, `CamposDaOportunidade`, `OrigemParaCriar` (2A); `ChipDaTag`; `numeroDoValor`; `normalizarTags`; do original, `useContact`, `EditContactDialog`, `mensagemDeBloqueioPorVinculo`.
- Produces: `AcoesEmMassa({ quantidade, alvo, origens, aoLimpar, aoPedir })`; `useAcompanharAcoes(): { acompanhar(id, acao) }`; `BarraDeLote`, `JanelaCriarNegocios`, `PainelDeTag`, `JanelaExcluirContatos`; `avisoNaFila(t, acao, total, status)`, `falhaDoPedido(t, acao)`, `avisoDoFim(t, resumo)`, `terminou(status)`, `rodando(status)`; `MenuDaLinha` com a exclusão pela rota do fork.

Abra antes: os prints 2b-29, 2b-30, 2b-37 e 2b-39 (a barra), 2b-31 (criar negócio), 2b-34 a 2b-36 (o "Tag"), 2b-38 (excluir) e o v2-03 (a confirmação). Detalhes: barra fixa, centralizada, 12px acima da borda de baixo; 52px; fundo da marca; raio 8; "×", o número em branco sem selo, "SELECIONADOS", a divisória e "Criar negócio", "Campos", "Tag", "Exportar" e a lixeira (dica "Excluir selecionados"); botões de 36px, 13px/500, raio 6. O "Tag" abre "Alterar tag" com X e as linhas "Incluir" (ícone de tag) e "Remover" (lixeira); depois "← Incluir Tag" e o seletor "Adicione uma tag" com a lista de chips abrindo para cima. A exclusão em massa tem a ilustração no topo (nossa composição de ícones, N19), as linhas com ⓧ vermelho e "Excluir" vermelho no "Digite Excluir para confirmar.".

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-barra-e-acoes-em-massa.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { toast } from "sonner";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { AcoesEmMassa } from "@/components/escale/contatos/massa/AcoesEmMassa";
import { apiClient } from "@/lib/api/client";
import type { AlvoDaAcao } from "@/lib/escale/contatos/selecao";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn(), warning: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip"], isLoading: false }),
}));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({ useAssignableMembers: () => ({ data: [] }) }));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const ALVO: AlvoDaAcao = { tipo: "filtro", v: "todos", quantidade: null, excluidos: [] };
const ORIGENS = [{ id: "o1", nome: "Leads INSS", etapas: [{ id: "e1", nome: "Entrada" }] }];

function montar() {
  const aoLimpar = vi.fn();
  const aoPedir = vi.fn();
  render(
    <QueryClientProvider client={new QueryClient()}>
      <AcoesEmMassa quantidade={3} alvo={ALVO} origens={ORIGENS} aoLimpar={aoLimpar} aoPedir={aoPedir} />
    </QueryClientProvider>,
  );
  return { aoLimpar, aoPedir };
}

const pedidoEnviado = () => vi.mocked(apiClient.post).mock.lastCall;

beforeEach(() => {
  vi.mocked(toast.success).mockReset();
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: { id: "a1", total: 3, status: "na_fila" } } as never);
});

describe("AcoesEmMassa (prints 2b-29 a 2b-39)", () => {
  it("a barra: número, SELECIONADOS, as ações e 'Campos' em breve", () => {
    montar();
    expect(screen.getByText("3")).toBeInTheDocument();
    expect(screen.getByText("selecionados")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Campos" })).toHaveAttribute("title", "Em breve");
  });

  it("Exportar: confirma, pede, limpa a seleção, acompanha e avisa que foi para aprovação (Q4)", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { id: "a1", total: 3, status: "aguardando_aprovacao" } } as never);
    const { aoLimpar, aoPedir } = montar();
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    expect(screen.getByText("Tem certeza que deseja exportar 3 contatos?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(aoPedir).toHaveBeenCalledWith("a1", "exportar"));
    expect(pedidoEnviado()).toEqual(["/api/v1/acoes-em-massa", { lista: "contatos", acao: "exportar", alvo: ALVO, parametros: {} }]);
    expect(aoLimpar).toHaveBeenCalled();
    expect(toast.success).toHaveBeenCalledWith("A exportação foi enviada para aprovação de um administrador.");
  });

  it("Exportar do único admin: o aviso da Clint de que a exportação começou", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Exportar" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() =>
      expect(toast.success).toHaveBeenCalledWith("A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado."),
    );
  });

  it("Excluir: a frase dos negócios da Clint, e só liga depois de digitar 'Excluir' (Q5)", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Excluir selecionados" }));
    expect(screen.getByText("Os negócios associados aos contatos serão excluídos")).toBeInTheDocument();
    const apagar = screen.getByRole("button", { name: "Apagar Contatos" });
    expect(apagar).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText("Digite aqui..."), { target: { value: "Excluir" } });
    expect(apagar).not.toBeDisabled();
    fireEvent.click(apagar);
    await waitFor(() => expect(pedidoEnviado()?.[1]).toMatchObject({ acao: "excluir", parametros: {} }));
  });

  it("Criar negócio: origem, etapa e 'Adicionar negócio'", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Criar negócio" }));
    expect(screen.getByDisplayValue("3 Contatos selecionados")).toBeDisabled();
    fireEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Etapa" }));
    fireEvent.click(screen.getByRole("option", { name: "Entrada" }));
    fireEvent.change(screen.getByPlaceholderText("Clique aqui para adicionar"), { target: { value: "1.500,00" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    await waitFor(() =>
      expect(pedidoEnviado()?.[1]).toMatchObject({
        acao: "criar_negocios",
        parametros: { pipeline_id: "o1", stage_id: "e1", owner_user_id: null, valor_centavos: 150000 },
      }),
    );
  });

  it("Tag › Incluir: 'Alterar tag', '← Incluir Tag' e escolher a tag já aplica (prints 2b-34 a 2b-36)", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    expect(screen.getByText("Alterar tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Incluir" }));
    expect(screen.getByRole("button", { name: "Incluir Tag" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Adicione uma tag")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vip" }));
    await waitFor(() => expect(pedidoEnviado()?.[1]).toMatchObject({ acao: "incluir_tag", parametros: { tag: "vip" } }));
  });

  it("Tag › Remover: escolher a tag pede a confirmação da Clint", async () => {
    montar();
    fireEvent.click(screen.getByRole("button", { name: "Tag" }));
    fireEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(screen.getByPlaceholderText("Selecione a tag para remover")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "vip" }));
    expect(screen.getByText("Tem certeza que deseja remover a tag selecionada?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Confirmar" }));
    await waitFor(() => expect(pedidoEnviado()?.[1]).toMatchObject({ acao: "remover_tag", parametros: { tag: "vip" } }));
  });
});
```

Create `tests/unit/escale-menu-da-linha-excluir.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { MenuDaLinha } from "@/components/escale/contatos/MenuDaLinha";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), delete: vi.fn() } }));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => ({ data: undefined }) }));
vi.mock("@/components/contacts/EditContactDialog", () => ({ EditContactDialog: () => null }));
vi.mock("@/components/feedback/ApiErrorToast", () => ({ showApiError: vi.fn() }));

describe("MenuDaLinha › Excluir (Q5)", () => {
  it("o balão da Clint avisa dos negócios e a exclusão vai pela rota do fork", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient.get).mockResolvedValue({ data: { vinculos: [], por_tabela: {} } } as never);
    vi.mocked(apiClient.delete).mockResolvedValue({ data: { id: "c1", negocios: 2 } } as never);
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MenuDaLinha linha={{ id: "c1" } as never} podeExcluir />
      </QueryClientProvider>,
    );
    await user.click(screen.getByRole("button", { name: "Mais ações" }));
    await user.click(screen.getByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("Tem certeza que deseja excluir o contato selecionado?")).toBeInTheDocument();
    expect(screen.getByText("Os negócios associados ao contato também serão excluídos.")).toBeInTheDocument();
    await waitFor(() => expect(screen.getByRole("button", { name: "Excluir" })).not.toBeDisabled());
    await user.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() => expect(apiClient.delete).toHaveBeenCalledWith("/api/v1/lista-de-contatos/c1"));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-barra-e-acoes-em-massa.test.tsx tests/unit/escale-menu-da-linha-excluir.test.tsx`
Expected: FAIL.

- [ ] **Step 2: Os textos das ações**

Create `components/escale/contatos/massa/textosDasAcoes.ts`:

```ts
import type { AcaoEmMassa, ResumoDaAcao, StatusDaAcao, StatusVisivel } from "@/lib/escale/massa/tipos";

type Traduzir = (texto: string) => string;

/** Acima disto a Clint avisa que a exclusão vai para o segundo plano. */
export const EXCLUSAO_GRANDE = 5000;

/** Ainda andando na fila (o aviso de fim pergunta a cada 3 s). */
export const rodando = (s: StatusVisivel): boolean => s === "preparando" || s === "na_fila" || s === "processando";
/** Já tem desfecho para avisar. "aguardando_aprovacao" NÃO é fim (Q4). */
export const terminou = (s: StatusVisivel): boolean =>
  s === "concluida" || s === "falhou" || s === "recusada" || s === "expirada";

/** O toast logo depois do pedido (Clint, `payload.queue`). A exportação que espera admin tem o seu (nosso, Q4). */
export function avisoNaFila(t: Traduzir, acao: AcaoEmMassa, total: number, status: StatusDaAcao): string | null {
  switch (acao) {
    case "criar_negocios":
      return t("Os negócios foram enviados para criação!");
    case "incluir_tag":
      return t("Contatos com novas tags estão na fila de atualização. O processo pode levar alguns segundos.");
    case "remover_tag":
      return t("Contato(s) com a remoção da tag estão na fila de atualização. O processo pode levar alguns segundos.");
    case "exportar":
      return status === "aguardando_aprovacao"
        ? t("A exportação foi enviada para aprovação de um administrador.")
        : t("A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado.");
    case "excluir":
      return total > EXCLUSAO_GRANDE
        ? t("Exclusão em massa de grandes quantidades ocorrem em segundo plano e podem levar alguns minutos.")
        : null;
  }
}

/** O toast quando o pedido nem entra (Clint). */
export function falhaDoPedido(t: Traduzir, acao: AcaoEmMassa): string {
  switch (acao) {
    case "criar_negocios":
      return t("Não foi possível criar os negócios. Tente novamente ou chame o suporte.");
    case "incluir_tag":
      return t("Falha ao adicionar tags aos contatos, tente novamente ou chame o suporte.");
    case "remover_tag":
      return t("Falha ao remover tag do(s) contato(s), tente novamente ou chame o suporte.");
    case "exportar":
      return t("Falha ao exportar os contatos, tente novamente ou chame o suporte.");
    case "excluir":
      return t("Falha ao remover os contatos, tente novamente ou chame o suporte.");
  }
}

/** O toast quando a ação termina na fila (Clint, mensagens de sucesso; recusa e vencimento são nossos, Q4). */
export function avisoDoFim(t: Traduzir, a: ResumoDaAcao): { ok: boolean; texto: string } {
  if (a.status === "falhou") return { ok: false, texto: falhaDoPedido(t, a.acao) };
  if (a.status === "recusada") return { ok: false, texto: t("A exportação foi recusada por um administrador.") };
  if (a.status === "expirada") return { ok: false, texto: t("O pedido de exportação expirou sem aprovação.") };
  switch (a.acao) {
    case "criar_negocios":
      return { ok: true, texto: t("Os negócios foram criados com sucesso!") };
    case "incluir_tag":
      return { ok: true, texto: t("As tags foram adicionadas aos contatos.") };
    case "remover_tag":
      return { ok: true, texto: t("A tag foi removida do(s) contato(s).") };
    case "exportar":
      return { ok: true, texto: t("Os contatos foram exportados com sucesso.") };
    case "excluir":
      return { ok: true, texto: t("Os contatos foram excluídos com sucesso.") };
  }
}
```

- [ ] **Step 3: A barra**

Create `components/escale/contatos/massa/BarraDeLote.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { Trash2, X } from "@/lib/ui/icons-da-casca";

export const BOTAO_DA_BARRA_DE_LOTE =
  "inline-flex h-9 items-center gap-1.5 rounded-[6px] px-3 text-[13px] font-medium text-white hover:bg-casca-marca-forte disabled:cursor-not-allowed disabled:opacity-60";

/**
 * A BARRA DE AÇÕES EM MASSA (prints 2b-29, 2b-30, 2b-37 e 2b-39; Clint
 * `index-aSHo0T15`): fixa no rodapé, centralizada, na cor da marca: "×" (Remover
 * selecionados), o número em branco (sem selo), a palavra SELECIONADOS, a divisória
 * e as ações. "Campos" espera a 2C (Q3).
 */
export function BarraDeLote({
  quantidade,
  aoLimpar,
  aoCriarNegocio,
  painelDeTag,
  aoExportar,
  aoExcluir,
}: {
  quantidade: number;
  aoLimpar: () => void;
  aoCriarNegocio: () => void;
  painelDeTag: ReactNode;
  aoExportar: () => void;
  aoExcluir: () => void;
}) {
  const t = useT();
  return (
    <div
      role="toolbar"
      aria-label={t("Ações em massa")}
      className="fixed bottom-3 left-1/2 z-40 flex h-[52px] -translate-x-1/2 items-center gap-1 rounded-[8px] bg-casca-marca px-4 text-white shadow-casca-painel"
    >
      <button
        type="button"
        aria-label={t("Remover selecionados")}
        title={t("Remover selecionados")}
        onClick={aoLimpar}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        <X size={16} aria-hidden />
      </button>
      <span className="ml-2 text-[13px] font-semibold">{quantidade.toLocaleString("pt-BR")}</span>
      <span className="mr-2 ml-3 text-[11px] font-medium uppercase">{t("selecionados")}</span>
      <span aria-hidden className="mx-1 h-full w-px bg-surface opacity-40" />
      <button type="button" onClick={aoCriarNegocio} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Criar negócio")}
      </button>
      <button type="button" disabled title={t("Em breve")} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Campos")}
      </button>
      {painelDeTag}
      <button type="button" onClick={aoExportar} className={BOTAO_DA_BARRA_DE_LOTE}>
        {t("Exportar")}
      </button>
      <button
        type="button"
        aria-label={t("Excluir selecionados")}
        title={t("Excluir selecionados")}
        onClick={aoExcluir}
        className={BOTAO_DA_BARRA_DE_LOTE}
      >
        <Trash2 size={18} aria-hidden />
      </button>
    </div>
  );
}
```

- [ ] **Step 4: As janelas e o painel da tag**

Create `components/escale/contatos/massa/JanelaCriarNegocios.tsx`:

```tsx
"use client";
import { useState } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { numeroDoValor } from "@/lib/escale/filtros/campos";

import { CamposDaOportunidade, type OrigemParaCriar } from "../CamposDaOportunidade";

export type NovoNegocioEmMassa = {
  pipeline_id: string;
  stage_id: string;
  owner_user_id: string | null;
  valor_centavos: number | null;
};

/**
 * "Adicionar um novo negócio" para os contatos marcados (Clint `DealAddModal`; print
 * 2b-31): Origem* e Etapa*, Dono e Valor, o Contato* desligado com "N Contatos
 * selecionados" e, no rodapé, só "Adicionar negócio" (fechar é pelo X).
 */
export function JanelaCriarNegocios({
  aberta,
  quantidade,
  origens,
  enviando,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  quantidade: number;
  origens: OrigemParaCriar[];
  enviando: boolean;
  aoFechar: () => void;
  aoConfirmar: (novo: NovoNegocioEmMassa) => void;
}) {
  const t = useT();
  const membros = useAssignableMembers(aberta);
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [dono, setDono] = useState("");
  const [valor, setValor] = useState("");
  const numero = valor.trim() ? numeroDoValor(valor) : null;
  const valorInvalido = valor.trim() !== "" && (numero === null || numero < 0);
  const pode = Boolean(destino.etapaId) && !valorInvalido;

  const fechar = () => {
    setDestino({ origemId: "", etapaId: "" });
    setDono("");
    setValor("");
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Adicionar um novo negócio")} />
      <div className="grid gap-4">
        <CamposDaOportunidade origens={origens} origemId={destino.origemId} etapaId={destino.etapaId} aoMudar={setDestino} />
        <Campo rotulo={t("Dono do negócio")}>
          <SeletorDaCasca
            aparencia="janela"
            valor={dono}
            opcoes={(membros.data ?? []).map((m) => ({ valor: m.user_id, rotulo: m.full_name ?? t("Sem nome") }))}
            aoMudar={setDono}
            aria-label={t("Dono do negócio")}
            vazio={t("Escolher dono do negócio")}
          />
        </Campo>
        <Campo rotulo={t("Valor do negócio")}>
          <CampoDeTexto
            value={valor}
            inputMode="decimal"
            placeholder={t("Clique aqui para adicionar")}
            aria-label={t("Valor do negócio")}
            onChange={(e) => setValor(e.target.value)}
          />
        </Campo>
        <Campo rotulo={t("Contato")} obrigatorio>
          <CampoDeTexto
            value={t("{n} Contatos selecionados").replace("{n}", quantidade.toLocaleString("pt-BR"))}
            readOnly
            disabled
            aria-label={t("Contato")}
            title={t("Os contatos marcados na lista")}
          />
        </Campo>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela
          variante="salvar"
          disabled={!pode || enviando}
          title={!pode ? t("Escolha a origem e a etapa.") : enviando ? t("Aguarde…") : undefined}
          onClick={() =>
            aoConfirmar({
              pipeline_id: destino.origemId,
              stage_id: destino.etapaId,
              owner_user_id: dono || null,
              valor_centavos: numero === null ? null : Math.round(numero * 100),
            })
          }
        >
          {t("Adicionar negócio")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

Create `components/escale/contatos/massa/PainelDeTag.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU, CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import { ArrowLeft, ChevronDown, ChevronUp, Tag, Trash2, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Passo = "escolher" | "incluir" | "remover";

/**
 * O "TAG" DA BARRA (Clint `index-DCKImOq3`; prints 2b-34 a 2b-36): "Alterar tag" com
 * X e as linhas "Incluir" e "Remover"; depois "← Incluir Tag" (ou "← Remover Tag") e
 * o seletor "Adicione uma tag" (ou "Selecione a tag para remover"), com a lista de
 * chips abrindo para cima. Na inclusão, escolher a tag já aplica (com "Criar" quando
 * ela não existe); na remoção, escolher pede "Tem certeza que deseja remover a tag
 * selecionada?".
 */
export function PainelDeTag({
  classeDoGatilho,
  aoAplicar,
}: {
  classeDoGatilho: string;
  aoAplicar: (acao: "incluir_tag" | "remover_tag", tag: string) => Promise<boolean>;
}) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null);
  const [aberto, setAberto] = useState(false);
  const [passo, setPasso] = useState<Passo>("escolher");
  const [texto, setTexto] = useState("");
  const [listaAberta, setListaAberta] = useState(true);
  const [removendo, setRemovendo] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const termo = texto.trim().toLowerCase();
  const todas = vocabulario.data ?? [];
  const opcoes = todas.filter((x) => x.toLowerCase().includes(termo)).slice(0, 50);
  const nova =
    passo === "incluir" && termo && !todas.some((x) => x.toLowerCase() === termo)
      ? (normalizarTags([termo])[0] ?? null)
      : null;

  const fechar = () => {
    setAberto(false);
    setPasso("escolher");
    setTexto("");
    setListaAberta(true);
    setRemovendo(null);
  };

  async function aplicar(acao: "incluir_tag" | "remover_tag", tag: string) {
    setEnviando(true);
    const deuCerto = await aoAplicar(acao, tag);
    setEnviando(false);
    if (deuCerto) fechar();
  }

  function escolher(tag: string) {
    if (passo === "incluir") void aplicar("incluir_tag", tag);
    else setRemovendo(tag);
  }

  const conteudo = () => {
    if (passo === "escolher") {
      return (
        <div>
          <div className="flex h-11 items-center justify-between border-b border-casca-borda px-4">
            <p className="text-[13px] text-casca-texto">{t("Alterar tag")}</p>
            <button
              type="button"
              aria-label={t("Fechar")}
              onClick={fechar}
              className="grid size-6 place-items-center text-casca-suave hover:text-casca-texto"
            >
              <X size={14} aria-hidden />
            </button>
          </div>
          <div className="p-1">
            <button type="button" onClick={() => setPasso("incluir")} className={CLASSE_DA_LINHA_DO_MENU}>
              <Tag size={14} aria-hidden className="fill-current" />
              {t("Incluir")}
            </button>
            <button type="button" onClick={() => setPasso("remover")} className={CLASSE_DA_LINHA_DO_MENU}>
              <Trash2 size={14} aria-hidden />
              {t("Remover")}
            </button>
          </div>
        </div>
      );
    }
    if (removendo) {
      return (
        <div className="space-y-3 p-4">
          <ChipDaTag tag={removendo} />
          <p role="alert" className="text-[13px] text-casca-texto">
            {t("Tem certeza que deseja remover a tag selecionada?")}
          </p>
          <div className="flex justify-end gap-2">
            <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={() => setRemovendo(null)}>
              {t("Cancelar")}
            </BotaoDaCasca>
            <BotaoDaCasca
              type="button"
              variante="marca"
              tamanho="sm"
              disabled={enviando}
              title={enviando ? t("Aguarde…") : undefined}
              onClick={() => void aplicar("remover_tag", removendo)}
            >
              {t("Confirmar")}
            </BotaoDaCasca>
          </div>
        </div>
      );
    }
    return (
      <div className="space-y-2 p-4">
        <button
          type="button"
          onClick={() => {
            setPasso("escolher");
            setTexto("");
          }}
          className="inline-flex items-center gap-1.5 text-[13px] font-medium text-casca-texto"
        >
          <ArrowLeft size={14} aria-hidden />
          {passo === "incluir" ? t("Incluir Tag") : t("Remover Tag")}
        </button>
        {listaAberta ? (
          <div className="max-h-60 overflow-y-auto rounded-[6px] border border-casca-borda bg-surface p-1">
            {opcoes.length === 0 && !nova ? (
              <p className="px-2 py-1.5 text-[12px] text-casca-suave">{t("Nenhuma tag correspondente")}</p>
            ) : null}
            <ul>
              {opcoes.map((o) => (
                <li key={o}>
                  <button type="button" aria-label={o} onClick={() => escolher(o)} className={CLASSE_DA_LINHA_DO_MENU}>
                    <ChipDaTag tag={o} />
                  </button>
                </li>
              ))}
              {nova ? (
                <li>
                  <button type="button" onClick={() => escolher(nova)} className={CLASSE_DA_LINHA_DO_MENU}>
                    {t("Criar")} <ChipDaTag tag={nova} />
                  </button>
                </li>
              ) : null}
            </ul>
          </div>
        ) : null}
        <div className="relative">
          <input
            role="combobox"
            aria-expanded={listaAberta}
            aria-label={t("Tag")}
            value={texto}
            onFocus={() => setListaAberta(true)}
            onChange={(e) => {
              setTexto(e.target.value);
              setListaAberta(true);
            }}
            placeholder={passo === "incluir" ? t("Adicione uma tag") : t("Selecione a tag para remover")}
            className={cn(CLASSE_DO_CAMPO, "border-casca-marca pr-9")}
          />
          <button
            type="button"
            aria-label={t("Mostrar tags")}
            onClick={() => setListaAberta((v) => !v)}
            className="absolute top-1/2 right-2 grid size-6 -translate-y-1/2 place-items-center text-casca-suave"
          >
            {listaAberta ? <ChevronUp size={14} aria-hidden /> : <ChevronDown size={14} aria-hidden />}
          </button>
        </div>
      </div>
    );
  };

  return (
    <Popover open={aberto} onOpenChange={(a) => (a ? setAberto(true) : fechar())}>
      <PopoverTrigger asChild>
        <button type="button" className={classeDoGatilho}>
          {t("Tag")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso side="top" align="center" sideOffset={12} className="w-[300px] p-0">
        {conteudo()}
      </PainelSuspenso>
    </Popover>
  );
}
```

Create `components/escale/contatos/massa/JanelaExcluirContatos.tsx`:

```tsx
"use client";
import { useState } from "react";

import { CLASSE_DO_CAMPO } from "@/components/escale/filtros/controles";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";
import { CircleX, Trash2, TriangleAlert } from "@/lib/ui/icons-da-casca";

/**
 * A ilustração do topo (print 2b-38). Não temos a imagem da Clint: é a nossa
 * composição de ícones (diferença conhecida, N19).
 */
function IlustracaoDaExclusao() {
  return (
    <div aria-hidden className="flex justify-center">
      <div className="relative grid size-24 place-items-center rounded-full bg-casca-marca-suave">
        <Trash2 size={44} className="text-casca-marca" />
        <span className="absolute right-2 bottom-2 grid size-9 place-items-center rounded-full bg-surface">
          <TriangleAlert size={28} className="fill-current text-casca-alerta" />
        </span>
      </div>
    </div>
  );
}

/**
 * A CONFIRMAÇÃO DE EXCLUIR EM MASSA (Clint `index-B5tmttGQ`, componente `zs`; print
 * 2b-38): a ilustração, o número em negrito, "Ao continuar, eu entendo que:", as
 * linhas com ⓧ vermelho (inclusive "Os negócios associados aos contatos serão
 * excluídos", Q5), "Digite **Excluir** para confirmar." com "Excluir" em vermelho e
 * "Apagar Contatos 🗑" vermelho, que só liga com a palavra certa. A linha da Agenda é
 * nossa (a trava do original continua).
 */
export function JanelaExcluirContatos({
  aberta,
  quantidade,
  enviando,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  quantidade: number;
  enviando: boolean;
  aoFechar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState("");
  const palavra = t("Excluir");
  const fechar = () => {
    setTexto("");
    aoFechar();
  };
  const linhas = [
    t("A exclusão é irreversível"),
    t("Os negócios associados aos contatos serão excluídos"),
    t("Os chats de WhatsApp e Instagram serão excluídos"),
    t("Contato com compromisso na agenda não é excluído"),
  ];
  return (
    <JanelaDeConfirmacao
      aberta={aberta}
      aoFechar={fechar}
      perigo
      ocupado={enviando}
      rotuloDoConfirmar={t("Apagar Contatos")}
      iconeDoConfirmar={<Trash2 size={14} aria-hidden />}
      desabilitado={texto.trim() !== palavra}
      dica={t("Digite Excluir para confirmar.")}
      aoConfirmar={aoConfirmar}
    >
      <IlustracaoDaExclusao />
      <p className="text-[14px] font-semibold text-casca-texto">
        {quantidade === 1
          ? t("Esta ação excluirá 1 contato selecionado. Deseja Continuar?")
          : t("Esta ação excluirá {n} contatos selecionados. Deseja Continuar?").replace(
              "{n}",
              quantidade.toLocaleString("pt-BR"),
            )}
      </p>
      <p className="text-[12px] font-semibold text-casca-texto">{t("Ao continuar, eu entendo que:")}</p>
      <ul className="space-y-2">
        {linhas.map((linha) => (
          <li key={linha} className="flex items-center gap-2 text-[12px] text-casca-texto">
            <CircleX size={16} aria-hidden className="shrink-0 text-casca-alerta" />
            {linha}
          </li>
        ))}
      </ul>
      <label className="grid gap-1.5">
        <span className="text-[12px] font-semibold text-casca-texto">
          {t("Digite **Excluir** para confirmar.")
            .split("**")
            .map((parte, i) =>
              i === 1 ? (
                <strong key={i} className="text-casca-alerta">
                  {parte}
                </strong>
              ) : (
                <span key={i}>{parte}</span>
              ),
            )}
        </span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Digite aqui...")}
          aria-label={t("Confirmação")}
          className={CLASSE_DO_CAMPO}
        />
      </label>
    </JanelaDeConfirmacao>
  );
}
```

- [ ] **Step 5: O conjunto e o aviso de fim**

Create `components/escale/contatos/massa/AcoesEmMassa.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { usePedirAcaoEmMassa } from "@/hooks/escale/useAcoesEmMassa";
import { useT } from "@/hooks/i18n/useT";
import type { AlvoDaAcao } from "@/lib/escale/contatos/selecao";
import type { AcaoEmMassa, PedidoDeAcao } from "@/lib/escale/massa/tipos";

import type { OrigemParaCriar } from "../CamposDaOportunidade";
import { BOTAO_DA_BARRA_DE_LOTE, BarraDeLote } from "./BarraDeLote";
import { JanelaCriarNegocios, type NovoNegocioEmMassa } from "./JanelaCriarNegocios";
import { JanelaExcluirContatos } from "./JanelaExcluirContatos";
import { PainelDeTag } from "./PainelDeTag";
import { avisoNaFila, falhaDoPedido } from "./textosDasAcoes";

type Janela = "negocio" | "exportar" | "excluir" | null;

/**
 * AS AÇÕES EM MASSA DA LISTA (fork Escale, Fase 2B): a barra e as janelas. Todo
 * pedido vai para a fila (`POST /api/v1/acoes-em-massa`); aqui só o toast da
 * Clint "na fila" (ou o de "enviada para aprovação", na exportação, Q4), a seleção
 * limpa e o id entregue a quem acompanha o fim.
 */
export function AcoesEmMassa({
  quantidade,
  alvo,
  origens,
  aoLimpar,
  aoPedir,
}: {
  quantidade: number;
  alvo: AlvoDaAcao;
  origens: OrigemParaCriar[];
  aoLimpar: () => void;
  aoPedir: (id: string, acao: AcaoEmMassa) => void;
}) {
  const t = useT();
  const pedir = usePedirAcaoEmMassa();
  const [janela, setJanela] = useState<Janela>(null);

  async function enviar(acao: AcaoEmMassa, parametros: Record<string, unknown>): Promise<boolean> {
    try {
      const r = await pedir.mutateAsync({ lista: "contatos", acao, alvo, parametros } as PedidoDeAcao);
      const aviso = avisoNaFila(t, acao, r.total, r.status);
      if (aviso) toast.success(aviso);
      aoPedir(r.id, acao);
      setJanela(null);
      aoLimpar();
      return true;
    } catch (e) {
      toast.error(e instanceof Error && e.message ? e.message : falhaDoPedido(t, acao));
      return false;
    }
  }

  return (
    <>
      <BarraDeLote
        quantidade={quantidade}
        aoLimpar={aoLimpar}
        aoCriarNegocio={() => setJanela("negocio")}
        painelDeTag={<PainelDeTag classeDoGatilho={BOTAO_DA_BARRA_DE_LOTE} aoAplicar={(acao, tag) => enviar(acao, { tag })} />}
        aoExportar={() => setJanela("exportar")}
        aoExcluir={() => setJanela("excluir")}
      />
      <JanelaCriarNegocios
        aberta={janela === "negocio"}
        quantidade={quantidade}
        origens={origens}
        enviando={pedir.isPending}
        aoFechar={() => setJanela(null)}
        aoConfirmar={(novo: NovoNegocioEmMassa) => void enviar("criar_negocios", novo)}
      />
      <JanelaDeConfirmacao
        aberta={janela === "exportar"}
        aoFechar={() => setJanela(null)}
        ocupado={pedir.isPending}
        aoConfirmar={() => void enviar("exportar", {})}
      >
        <p>{t("Tem certeza que deseja exportar {n} contatos?").replace("{n}", quantidade.toLocaleString("pt-BR"))}</p>
      </JanelaDeConfirmacao>
      <JanelaExcluirContatos
        aberta={janela === "excluir"}
        quantidade={quantidade}
        enviando={pedir.isPending}
        aoFechar={() => setJanela(null)}
        aoConfirmar={() => void enviar("excluir", {})}
      />
    </>
  );
}
```

Create `hooks/escale/useAcompanharAcoes.ts`:

```ts
"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { avisoDoFim, rodando, terminou } from "@/components/escale/contatos/massa/textosDasAcoes";
import { useT } from "@/hooks/i18n/useT";
import type { AcaoEmMassa } from "@/lib/escale/massa/tipos";

import { useAcoesEmMassa } from "./useAcoesEmMassa";

const CHAVE = "escale:contatos:acoes";
const INTERVALO_RODANDO_MS = 3000;
const INTERVALO_ESPERANDO_MS = 30_000;
type Acompanhada = { id: string; acao: AcaoEmMassa };

function ler(): Acompanhada[] {
  try {
    const lido: unknown = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lido) ? (lido as Acompanhada[]) : [];
  } catch {
    return [];
  }
}
function gravar(lista: Acompanhada[]) {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(lista));
  } catch {
    // o navegador pode recusar; o aviso vale só enquanto a página estiver aberta
  }
}

/**
 * O AVISO DE FIM DAS AÇÕES EM MASSA (fork Escale, Fase 2B; Q6): acompanha as
 * ações pedidas nesta aba e, quando terminam, mostra o toast da Clint, refaz a
 * lista e, na exportação, oferece "Baixar exportação". "Aguardando aprovação" não
 * é fim (Q4): enquanto só há exportação esperando admin, pergunta a cada 30 s.
 */
export function useAcompanharAcoes() {
  const t = useT();
  const qc = useQueryClient();
  const [lista, setLista] = useState<Acompanhada[]>([]);

  // eslint-disable-next-line react-hooks/set-state-in-effect -- o navegador só é lido depois de montar (SSR)
  useEffect(() => setLista(ler()), []);

  const [intervalo, setIntervalo] = useState(INTERVALO_RODANDO_MS);
  const consulta = useAcoesEmMassa(lista.length > 0, intervalo);

  useEffect(() => {
    const minhas = consulta.data?.minhas ?? [];
    const algumaRodando = lista.some((x) => {
      const a = minhas.find((m) => m.id === x.id);
      return !a || rodando(a.status);
    });
    // eslint-disable-next-line react-hooks/set-state-in-effect -- o ritmo da pergunta segue a resposta
    setIntervalo(algumaRodando ? INTERVALO_RODANDO_MS : INTERVALO_ESPERANDO_MS);

    const terminadas = minhas.filter((a) => lista.some((x) => x.id === a.id) && terminou(a.status));
    if (terminadas.length === 0) return;
    for (const a of terminadas) {
      const { ok, texto } = avisoDoFim(t, a);
      if (!ok) {
        toast.error(texto);
        continue;
      }
      const baixar =
        a.acao === "exportar" && a.tem_arquivo
          ? {
              action: {
                label: t("Baixar exportação"),
                onClick: () => window.open(`/api/v1/acoes-em-massa/${a.id}/arquivo`, "_blank", "noopener"),
              },
              duration: 15_000,
            }
          : undefined;
      toast.success(texto, baixar);
      if (a.falhas > 0) toast.warning(t("{n} contatos não foram alterados.").replace("{n}", String(a.falhas)));
    }
    void qc.invalidateQueries({ queryKey: ["contacts"] });
    const resto = lista.filter((x) => !terminadas.some((a) => a.id === x.id));
    setLista(resto);
    gravar(resto);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a resposta nova dispara
  }, [consulta.data]);

  return {
    acompanhar: (id: string, acao: AcaoEmMassa) => {
      const nova = [...lista.filter((x) => x.id !== id), { id, acao }];
      setLista(nova);
      gravar(nova);
      setIntervalo(INTERVALO_RODANDO_MS);
    },
  };
}
```

- [ ] **Step 6: O "Excluir" da linha leva os negócios (Q5)**

Troque o conteúdo de `components/escale/contatos/MenuDaLinha.tsx` (2A) por:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { useContact } from "@/hooks/contacts/useContact";
import { mensagemDeBloqueioPorVinculo } from "@/hooks/contacts/useDeleteContact";
import { useExcluirContatoDaLista } from "@/hooks/escale/useExcluirContatoDaLista";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { EllipsisVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DA LINHA (Clint `bt-row-menu-v2`): "Editar" e, para quem pode excluir,
 * "Excluir" em vermelho com a confirmação em balão da Clint. Antes de confirmar,
 * a checagem de Agenda do original (`/vinculos`): contato com compromisso não
 * se exclui, e o aviso do original explica. Fase 2B (Q5): a exclusão leva os
 * negócios do contato, pela rota do fork (`DELETE /api/v1/lista-de-contatos/[id]`),
 * e o balão ganha a linha que avisa disso.
 */
export function MenuDaLinha({
  linha,
  podeExcluir,
}: {
  linha: LinhaDeContato;
  podeExcluir: boolean;
}) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const excluir = useExcluirContatoDaLista();
  // O contato completo só é buscado quando "Editar" é escolhido.
  const contato = useContact(editando ? linha.id : "");
  const vinculos = useQuery({
    queryKey: ["contato-vinculos-para-excluir", linha.id],
    enabled: confirmando,
    retry: false,
    queryFn: async () => {
      const corpo = await apiClient.get<{
        data?: { vinculos: string[]; por_tabela: Record<string, number> };
      }>(`/api/v1/contacts/${linha.id}/vinculos`);
      return corpo.data ?? { vinculos: [], por_tabela: {} };
    },
  });
  const bloqueio = confirmando ? mensagemDeBloqueioPorVinculo(vinculos.data, t) : null;
  const ocupado = excluir.isPending || vinculos.isLoading;

  const confirmar = () =>
    excluir.mutate(linha.id, {
      onSuccess: () => {
        setConfirmando(false);
        toast.success(t("Contato excluído."));
      },
    });

  return (
    <>
      <Popover open={confirmando} onOpenChange={setConfirmando}>
        <DropdownMenu>
          {/* Âncora, não gatilho: o clique abre só o menu; a confirmação abre por "Excluir". */}
          <PopoverAnchor asChild>
            <DropdownMenuTrigger
              aria-label={t("Mais ações")}
              className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia hover:text-casca-texto"
            >
              <EllipsisVertical size={18} aria-hidden />
            </DropdownMenuTrigger>
          </PopoverAnchor>
          <DropdownMenuContent side="left" align="start" className={CONTEUDO_DO_MENU}>
            <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setEditando(true)}>
              <Pencil size={14} aria-hidden />
              {t("Editar")}
            </DropdownMenuItem>
            {podeExcluir && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className={cn(ITEM_DO_MENU, "text-casca-alerta")}
                  onSelect={() => setConfirmando(true)}
                >
                  <Trash2 size={14} aria-hidden />
                  {t("Excluir")}
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>
        <PopoverContent
          side="top"
          className="w-72 rounded-[8px] p-4 text-[13px] text-casca-texto shadow-casca-painel"
        >
          {bloqueio ? (
            <p>{bloqueio}</p>
          ) : (
            <>
              <p>{t("Tem certeza que deseja excluir o contato selecionado?")}</p>
              <p className="mt-1 text-[12px] text-casca-suave">
                {t("Os negócios associados ao contato também serão excluídos.")}
              </p>
              <div className="mt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setConfirmando(false)}
                  className="h-8 rounded-[4px] border border-casca-borda px-3 font-medium hover:bg-casca-raia"
                >
                  {t("Cancelar")}
                </button>
                <button
                  type="button"
                  onClick={confirmar}
                  disabled={ocupado}
                  title={ocupado ? t("Aguarde…") : undefined}
                  className="h-8 rounded-[4px] bg-casca-alerta px-3 font-medium text-white hover:brightness-95 disabled:opacity-60"
                >
                  {t("Excluir")}
                </button>
              </div>
            </>
          )}
        </PopoverContent>
      </Popover>
      {editando && contato.data && (
        <EditContactDialog
          contact={contato.data.data}
          open
          onOpenChange={(v) => !v && setEditando(false)}
        />
      )}
    </>
  );
}
```

Repare: só mudam o hook (`useExcluirContatoDaLista` no lugar do `useDeleteContact`), a linha dos negócios e o `title` do botão ocupado (cerca `controle-decorativo`). O resto é o arquivo da 2A como está na `main`; se ele tiver mudado desde então, aplique só essas três mudanças em cima do que estiver lá.

- [ ] **Step 7: A lista com a barra**

Em `components/escale/contatos/ListaDeContatos.tsx`:

1. Imports, junto dos outros:

```tsx
import { useAcompanharAcoes } from "@/hooks/escale/useAcompanharAcoes";
import { alvoDaSelecao } from "@/lib/escale/contatos/selecao";
import { AcoesEmMassa } from "./massa/AcoesEmMassa";
```

2. Logo depois do `useSelecaoDaLista(...)` da Task 10: `const acompanhamento = useAcompanharAcoes();`

3. Logo antes de `<JanelaNovoNegocio …/>`:

```tsx
      {podeSelecionar && sel.quantidade > 0 ? (
        <AcoesEmMassa
          quantidade={sel.quantidade}
          alvo={alvoDaSelecao(sel.selecao, { q: buscaDaUrl, v: visao, f })}
          origens={origens}
          aoLimpar={sel.limpar}
          aoPedir={acompanhamento.acompanhar}
        />
      ) : null}
```

- [ ] **Step 8: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-barra-e-acoes-em-massa.test.tsx tests/unit/escale-menu-da-linha-excluir.test.tsx tests/unit/escale-selecao-na-tabela.test.tsx tests/unit/escale-tabela-de-contatos.test.tsx tests/unit/escale-lista-de-contatos-pagina.test.tsx
```

Expected: PASS. No teste "Criar negócio", o `JanelaDaCasca` abre num portal: as buscas por `screen` o alcançam. Se `CircleX` ou `TriangleAlert` não saírem de `lib/ui/icons-da-casca.ts` na `main` (saem desde a 1E e a 1F), acrescente-os na linha da Fase 2B.

- [ ] **Step 9: Revisor (subagente) das janelas que gravam**

Pontos: nenhuma ação sai sem a confirmação da Clint (exportar, excluir com a palavra, remover tag); incluir tag aplica ao escolher (print 2b-36) e não manda tag vazia; o pedido manda o alvo pela seleção (filtro, nunca a lista inteira de ids no modo "todos"); toasts e textos da Clint, e o de "enviada para aprovação" na exportação que espera admin; a barra só existe para gerente ou acima; o aviso de fim não trata "aguardando_aprovacao" como fim, não repete e não vaza (só as ações desta aba); o download abre em aba nova com `noopener`; o ⋮ da linha exclui pela rota do fork e avisa dos negócios.

- [ ] **Step 10: Typecheck, eslint, prettier e commit**

```bash
NOVOS="components/escale/contatos/massa/textosDasAcoes.ts components/escale/contatos/massa/BarraDeLote.tsx components/escale/contatos/massa/JanelaCriarNegocios.tsx components/escale/contatos/massa/PainelDeTag.tsx components/escale/contatos/massa/JanelaExcluirContatos.tsx components/escale/contatos/massa/AcoesEmMassa.tsx hooks/escale/useAcompanharAcoes.ts tests/unit/escale-barra-e-acoes-em-massa.test.tsx tests/unit/escale-menu-da-linha-excluir.test.tsx"
ALTERADOS="components/escale/contatos/ListaDeContatos.tsx components/escale/contatos/MenuDaLinha.tsx"
corepack pnpm vitest run tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts
for f in $ALTERADOS; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u | xargs -r corepack pnpm vitest run
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS $ALTERADOS
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS $ALTERADOS
git commit -m "feat(escale): barra de ações em massa, janelas, aviso de fim e excluir da linha com os negócios (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 12: O botão "Exportações" (minhas exportações e a aprovação do admin)

**Files:**
- Create: `components/escale/contatos/massa/PainelDeExportacoes.tsx`, `tests/unit/escale-painel-de-exportacoes.test.tsx`
- Modify: `components/escale/contatos/ListaDeContatos.tsx` (o botão no cabeçalho)

**Interfaces:**
- Consumes: `useAcoesEmMassa`, `useDecidirExportacao` (Task 9); `ResumoDaAcao`, `PedidoParaAprovar` (Task 8); `useAssignableMembers` (o original: o nome de quem pediu); `PainelSuspenso`.
- Produces: `PainelDeExportacoes({ ehAdmin })`; `estadoDaExportacao(a)`.

Não há print da Clint para isto (Q4 é nosso; item 2 dos prints que faltam). Siga o tom dos menus suspensos da Clint (prints 2b-02 e 2b-34): título 13px num cabeçalho de 44px com borda embaixo, rótulos de grupo 10px/600 maiúsculos `casca-meta`, linhas de 12px com borda entre elas, botões de 28px. O botão fica no cabeçalho da lista, logo depois do selo de mescla: quadrado de 32px com a borda `casca-borda`, o ícone de download e um selo redondo na cor da marca com quantos itens pedem atenção (pedidos para aprovar, para o admin, mais as minhas exportações prontas).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-painel-de-exportacoes.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { PainelDeExportacoes } from "@/components/escale/contatos/massa/PainelDeExportacoes";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));
vi.mock("@/hooks/inbox/useAssignableMembers", () => ({
  useAssignableMembers: () => ({ data: [{ user_id: "u2", full_name: "Bia", role: "manager" }] }),
}));

const QUANDO = "2026-10-17T15:00:00Z";
const resumo = (id: string, status: string, extra: object = {}) => ({
  id,
  acao: "exportar",
  status,
  total: 10,
  feitos: 0,
  falhas: 0,
  tem_arquivo: false,
  created_at: QUANDO,
  ...extra,
});
const MINHAS = [
  resumo("a1", "aguardando_aprovacao"),
  resumo("a2", "concluida", { tem_arquivo: true }),
  resumo("a3", "recusada"),
  resumo("a4", "expirada"),
  resumo("a5", "na_fila"),
  { ...resumo("a6", "concluida"), acao: "incluir_tag" },
];
const PARA_APROVAR = [{ id: "p1", solicitante_id: "u2", total: 120, created_at: QUANDO }];

function montar(ehAdmin: boolean) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PainelDeExportacoes ehAdmin={ehAdmin} />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset().mockResolvedValue({ data: { minhas: MINHAS, para_aprovar: PARA_APROVAR } } as never);
  vi.mocked(apiClient.post).mockReset().mockResolvedValue({ data: { id: "p1", status: "na_fila" } } as never);
});

describe("PainelDeExportacoes (Q4)", () => {
  it("o selo conta as prontas; o painel mostra só as exportações, com o estado e o 'Baixar exportação' da pronta", async () => {
    montar(false);
    const botao = screen.getByRole("button", { name: "Ver exportações" });
    await waitFor(() => expect(botao).toHaveTextContent("1"));
    fireEvent.click(botao);
    expect(screen.getByText("Exportações")).toBeInTheDocument();
    for (const estado of ["Aguardando aprovação", "Pronta", "Recusada", "Expirada", "Gerando"]) {
      expect(screen.getByText(estado)).toBeInTheDocument();
    }
    expect(screen.getAllByRole("listitem")).toHaveLength(5);
    expect(screen.getByRole("link", { name: "Baixar exportação" })).toHaveAttribute(
      "href",
      "/api/v1/acoes-em-massa/a2/arquivo",
    );
    expect(screen.queryByText("Para aprovar")).not.toBeInTheDocument();
  });

  it("admin: 'Para aprovar' com quem pediu e quantos; Aprovar e Recusar chamam as rotas", async () => {
    montar(true);
    const botao = screen.getByRole("button", { name: "Ver exportações" });
    await waitFor(() => expect(botao).toHaveTextContent("2"));
    fireEvent.click(botao);
    expect(screen.getByText("Para aprovar")).toBeInTheDocument();
    expect(screen.getByText("Bia pediu 120 contatos")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Aprovar" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/api/v1/acoes-em-massa/p1/aprovar", {}));
    await waitFor(() => expect(screen.getByRole("button", { name: "Recusar" })).not.toBeDisabled());
    fireEvent.click(screen.getByRole("button", { name: "Recusar" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledWith("/api/v1/acoes-em-massa/p1/recusar", {}));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-exportacoes.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O painel**

Create `components/escale/contatos/massa/PainelDeExportacoes.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useAcoesEmMassa, useDecidirExportacao } from "@/hooks/escale/useAcoesEmMassa";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import type { PedidoParaAprovar, ResumoDaAcao } from "@/lib/escale/massa/tipos";
import { Download } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

type Estado = "aguardando" | "gerando" | "pronta" | "recusada" | "expirada" | "falhou";

/** O estado de uma exportação como a pessoa entende (nosso, Q4). O arquivo vencido (24 h) também é "Expirada". */
export function estadoDaExportacao(a: ResumoDaAcao): Estado {
  if (a.status === "aguardando_aprovacao") return "aguardando";
  if (a.status === "recusada") return "recusada";
  if (a.status === "expirada") return "expirada";
  if (a.status === "falhou") return "falhou";
  if (a.status === "concluida") return a.tem_arquivo ? "pronta" : "expirada";
  return "gerando";
}

const ROTULO_DO_ESTADO: Record<Estado, string> = {
  aguardando: "Aguardando aprovação",
  gerando: "Gerando",
  pronta: "Pronta",
  recusada: "Recusada",
  expirada: "Expirada",
  falhou: "Falhou",
};
const CLASSE_DO_ESTADO: Record<Estado, string> = {
  aguardando: "bg-casca-marca-suave text-casca-marca",
  gerando: "bg-casca-raia text-casca-texto",
  pronta: "bg-casca-marca text-white",
  recusada: "border border-casca-alerta text-casca-alerta",
  expirada: "border border-casca-borda text-casca-meta",
  falhou: "border border-casca-alerta text-casca-alerta",
};
const ROTULO_DO_GRUPO = "px-4 pt-3 pb-1 text-[10px] font-semibold tracking-[0.06em] text-casca-meta uppercase";
const BOTAO = "h-7 rounded-[5px] px-2.5 text-[12px] font-medium disabled:cursor-not-allowed disabled:opacity-60";

/** "17/10/2026 12:00" (formato brasileiro, 24 h, no fuso do navegador). */
function quando(iso: string): string {
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  })
    .format(new Date(iso))
    .replace(", ", " ");
}

/**
 * O BOTÃO "EXPORTAÇÕES" DO CABEÇALHO (fork Escale, Fase 2B; Q4 — sem equivalente na
 * Clint, que manda um código em vez de pedir aprovação). Para gerente ou acima: as
 * minhas exportações dos últimos 8 dias, com o estado ("Aguardando aprovação",
 * "Gerando", "Pronta" com "Baixar exportação", "Recusada", "Expirada"); para o admin,
 * também "Para aprovar" (quem pediu, quantos contatos, quando, "Aprovar" e "Recusar").
 * Pergunta a cada 30 s; aberto, a cada 5 s.
 */
export function PainelDeExportacoes({ ehAdmin }: { ehAdmin: boolean }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const acoes = useAcoesEmMassa(true, aberto ? 5000 : 30_000);
  const membros = useAssignableMembers(ehAdmin);
  const decidir = useDecidirExportacao();
  const exportacoes = (acoes.data?.minhas ?? []).filter((a) => a.acao === "exportar");
  const paraAprovar: PedidoParaAprovar[] = ehAdmin ? (acoes.data?.para_aprovar ?? []) : [];
  const prontas = exportacoes.filter((a) => estadoDaExportacao(a) === "pronta").length;
  const selo = paraAprovar.length + prontas;
  const nome = (id: string) => membros.data?.find((m) => m.user_id === id)?.full_name ?? t("Alguém da equipe");
  const contatos = (n: number) => t("{n} contatos").replace("{n}", n.toLocaleString("pt-BR"));

  function decidirPedido(p: PedidoParaAprovar, aprovar: boolean) {
    decidir.mutate(
      { id: p.id, aprovar },
      {
        onSuccess: () => toast.success(aprovar ? t("Exportação aprovada.") : t("Exportação recusada.")),
        onError: (e) =>
          toast.error(e instanceof Error && e.message ? e.message : t("Não consegui completar essa ação. Tente de novo.")),
      },
    );
  }

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Ver exportações")}
          title={t("Ver exportações")}
          className="relative grid size-8 place-items-center rounded-casca-gatilho border border-casca-borda text-casca-texto hover:bg-casca-raia"
        >
          <Download size={16} aria-hidden />
          {selo > 0 ? (
            <span className="absolute -top-1.5 -right-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-casca-marca px-1 text-[10px] font-semibold text-white">
              {selo}
            </span>
          ) : null}
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[360px] p-0">
        <div className="flex h-11 items-center border-b border-casca-borda px-4 text-[13px] font-medium text-casca-texto">
          {t("Exportações")}
        </div>
        <div className="max-h-[60vh] overflow-y-auto pb-1">
          {ehAdmin ? (
            <section aria-label={t("Para aprovar")}>
              <p className={ROTULO_DO_GRUPO}>{t("Para aprovar")}</p>
              {paraAprovar.length === 0 ? (
                <p className="px-4 py-2 text-[12px] text-casca-suave">{t("Nenhum pedido aguardando aprovação.")}</p>
              ) : (
                <ul>
                  {paraAprovar.map((p) => (
                    <li key={p.id} className="flex items-center gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1 text-[12px]">
                        <p className="font-medium text-casca-texto">
                          {t("{nome} pediu {n} contatos")
                            .replace("{nome}", nome(p.solicitante_id))
                            .replace("{n}", p.total.toLocaleString("pt-BR"))}
                        </p>
                        <p className="text-casca-suave">{quando(p.created_at)}</p>
                      </div>
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        title={decidir.isPending ? t("Aguarde…") : undefined}
                        onClick={() => decidirPedido(p, false)}
                        className={cn(BOTAO, "border border-casca-borda text-casca-texto hover:bg-casca-raia")}
                      >
                        {t("Recusar")}
                      </button>
                      <button
                        type="button"
                        disabled={decidir.isPending}
                        title={decidir.isPending ? t("Aguarde…") : undefined}
                        onClick={() => decidirPedido(p, true)}
                        className={cn(BOTAO, "bg-casca-marca text-white hover:bg-casca-marca-forte")}
                      >
                        {t("Aprovar")}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </section>
          ) : null}
          <section aria-label={t("Minhas exportações")}>
            <p className={ROTULO_DO_GRUPO}>{t("Minhas exportações")}</p>
            {exportacoes.length === 0 ? (
              <p className="px-4 py-2 text-[12px] text-casca-suave">{t("Nenhuma exportação nos últimos dias.")}</p>
            ) : (
              <ul>
                {exportacoes.map((a) => {
                  const estado = estadoDaExportacao(a);
                  return (
                    <li key={a.id} className="flex items-center gap-3 border-b border-casca-borda px-4 py-3 last:border-b-0">
                      <div className="min-w-0 flex-1 text-[12px]">
                        <p className="font-medium text-casca-texto">{contatos(a.total)}</p>
                        <p className="text-casca-suave">{quando(a.created_at)}</p>
                      </div>
                      <span className={cn("rounded-full px-2 py-0.5 text-[11px] font-medium", CLASSE_DO_ESTADO[estado])}>
                        {t(ROTULO_DO_ESTADO[estado])}
                      </span>
                      {estado === "pronta" ? (
                        <a
                          href={`/api/v1/acoes-em-massa/${a.id}/arquivo`}
                          target="_blank"
                          rel="noopener"
                          className="text-[12px] font-medium text-casca-marca hover:underline"
                        >
                          {t("Baixar exportação")}
                        </a>
                      ) : null}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

- [ ] **Step 3: O botão no cabeçalho**

Em `components/escale/contatos/ListaDeContatos.tsx`:

1. Import, junto dos outros: `import { PainelDeExportacoes } from "./massa/PainelDeExportacoes";`
2. Troque `          {podeMesclar && <SeloDeMescla />}` por:

```tsx
          {podeMesclar && <SeloDeMescla />}
          {/* FORK ESCALE · Fase 2B (Q4): minhas exportações e, para o admin, os pedidos para aprovar. */}
          {podeSelecionar && <PainelDeExportacoes ehAdmin={papel === "admin"} />}
```

(`podeSelecionar` é o gerente ou acima da Task 10.)

- [ ] **Step 4: Rodar, revisor e commit**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-exportacoes.test.tsx tests/unit/escale-lista-de-contatos-pagina.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts
```

Expected: PASS. Revisor (subagente), junto com o da Task 11: o painel só aparece para gerente ou acima; "Para aprovar" só para o admin (o banco também só mostra os pedidos ao admin); os botões ficam desligados com `title` enquanto decidem; o download abre em aba nova com `noopener`; datas no formato brasileiro de 24 h.

```bash
NOVOS="components/escale/contatos/massa/PainelDeExportacoes.tsx tests/unit/escale-painel-de-exportacoes.test.tsx"
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint $NOVOS components/escale/contatos/ListaDeContatos.tsx
corepack pnpm exec prettier --write $NOVOS
git add $NOVOS components/escale/contatos/ListaDeContatos.tsx
git commit -m "feat(escale): botão Exportações — minhas exportações e a aprovação do admin (Fase 2B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 13: Espanhol, rodada cheia e o PR B

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco novo logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`)
- Modify (fora do repositório): o PRD, linha da 2B

- [ ] **Step 1: O espanhol**

Rode o mesmo script da Task 6 (Step 1), trocando o `TITULO` por `"  // ─── FORK ESCALE · Fase 2B (PR B): seleção, ações em massa e exportação com aprovação ───"` e o `ES` por:

```js
const ES = {
  "Disponível para gerente ou acima.": "Disponible para gerente o superior.",
  "Selecionar": "Seleccionar",
  "Selecionar todos": "Seleccionar todos",
  "Selecionar esta página ({n})": "Seleccionar esta página ({n})",
  "Selecionar todos os {total} contatos": "Seleccionar los {total} contactos",
  "Quantidade de contatos": "Cantidad de contactos",
  "Escolha quantos contatos você quer selecionar": "Elige cuántos contactos quieres seleccionar",
  "Os {n} contatos desta página estão selecionados.": "Los {n} contactos de esta página están seleccionados.",
  "Todos os {total} contatos estão selecionados.": "Los {total} contactos están seleccionados.",
  "Limpar seleção": "Limpiar selección",
  "Ações em massa": "Acciones masivas",
  "Remover selecionados": "Quitar seleccionados",
  "selecionados": "seleccionados",
  "Criar negócio": "Crear negocio",
  "Exportar": "Exportar",
  "Excluir selecionados": "Eliminar seleccionados",
  "Adicionar um novo negócio": "Agregar un nuevo negocio",
  "Escolher dono do negócio": "Elegir responsable del negocio",
  "Clique aqui para adicionar": "Haz clic aquí para agregar",
  "{n} Contatos selecionados": "{n} contactos seleccionados",
  "Os contatos marcados na lista": "Los contactos marcados en la lista",
  "Escolha a origem e a etapa.": "Elige el origen y la etapa.",
  "Adicionar negócio": "Agregar negocio",
  "Tag": "Etiqueta",
  "Alterar tag": "Cambiar etiqueta",
  "Incluir": "Incluir",
  "Remover": "Quitar",
  "Incluir Tag": "Incluir etiqueta",
  "Remover Tag": "Quitar etiqueta",
  "Adicione uma tag": "Agrega una etiqueta",
  "Selecione a tag para remover": "Selecciona la etiqueta para quitar",
  "Mostrar tags": "Mostrar etiquetas",
  "Criar": "Crear",
  "Tem certeza que deseja remover a tag selecionada?": "¿Seguro que quieres quitar la etiqueta seleccionada?",
  "Excluir": "Eliminar",
  "Apagar Contatos": "Borrar contactos",
  "Digite Excluir para confirmar.": "Escribe Eliminar para confirmar.",
  "Esta ação excluirá 1 contato selecionado. Deseja Continuar?": "Esta acción eliminará 1 contacto seleccionado. ¿Deseas continuar?",
  "Esta ação excluirá {n} contatos selecionados. Deseja Continuar?": "Esta acción eliminará {n} contactos seleccionados. ¿Deseas continuar?",
  "Ao continuar, eu entendo que:": "Al continuar, entiendo que:",
  "A exclusão é irreversível": "La eliminación es irreversible",
  "Os negócios associados aos contatos serão excluídos": "Los negocios asociados a los contactos serán eliminados",
  "Os negócios associados ao contato também serão excluídos.": "Los negocios asociados al contacto también serán eliminados.",
  "Os chats de WhatsApp e Instagram serão excluídos": "Los chats de WhatsApp e Instagram serán eliminados",
  "Contato com compromisso na agenda não é excluído": "El contacto con cita en la agenda no se elimina",
  "Digite **Excluir** para confirmar.": "Escribe **Eliminar** para confirmar.",
  "Digite aqui...": "Escribe aquí...",
  "Confirmação": "Confirmación",
  "Tem certeza que deseja exportar {n} contatos?": "¿Seguro que quieres exportar {n} contactos?",
  "Os negócios foram enviados para criação!": "¡Los negocios fueron enviados para su creación!",
  "Contatos com novas tags estão na fila de atualização. O processo pode levar alguns segundos.":
    "Los contactos con nuevas etiquetas están en la cola de actualización. El proceso puede tardar unos segundos.",
  "Contato(s) com a remoção da tag estão na fila de atualização. O processo pode levar alguns segundos.":
    "Los contactos con la etiqueta quitada están en la cola de actualización. El proceso puede tardar unos segundos.",
  "A exportação iniciou com sucesso, aguarde enquanto o arquivo é gerado.":
    "La exportación comenzó correctamente; espera mientras se genera el archivo.",
  "A exportação foi enviada para aprovação de um administrador.":
    "La exportación fue enviada para la aprobación de un administrador.",
  "Exclusão em massa de grandes quantidades ocorrem em segundo plano e podem levar alguns minutos.":
    "Las eliminaciones masivas grandes se hacen en segundo plano y pueden tardar algunos minutos.",
  "Não foi possível criar os negócios. Tente novamente ou chame o suporte.":
    "No fue posible crear los negocios. Inténtalo de nuevo o contacta al soporte.",
  "Falha ao adicionar tags aos contatos, tente novamente ou chame o suporte.":
    "Error al agregar etiquetas a los contactos; inténtalo de nuevo o contacta al soporte.",
  "Falha ao remover tag do(s) contato(s), tente novamente ou chame o suporte.":
    "Error al quitar la etiqueta de los contactos; inténtalo de nuevo o contacta al soporte.",
  "Falha ao exportar os contatos, tente novamente ou chame o suporte.":
    "Error al exportar los contactos; inténtalo de nuevo o contacta al soporte.",
  "Falha ao remover os contatos, tente novamente ou chame o suporte.":
    "Error al eliminar los contactos; inténtalo de nuevo o contacta al soporte.",
  "Os negócios foram criados com sucesso!": "¡Los negocios fueron creados correctamente!",
  "As tags foram adicionadas aos contatos.": "Las etiquetas fueron agregadas a los contactos.",
  "A tag foi removida do(s) contato(s).": "La etiqueta fue quitada de los contactos.",
  "Os contatos foram exportados com sucesso.": "Los contactos fueron exportados correctamente.",
  "Os contatos foram excluídos com sucesso.": "Los contactos fueron eliminados correctamente.",
  "A exportação foi recusada por um administrador.": "Un administrador rechazó la exportación.",
  "O pedido de exportação expirou sem aprovação.": "La solicitud de exportación venció sin aprobación.",
  "Baixar exportação": "Descargar exportación",
  "{n} contatos não foram alterados.": "{n} contactos no fueron modificados.",
  "Nenhum contato selecionado.": "Ningún contacto seleccionado.",
  "No máximo 100.000 contatos por ação.": "Como máximo 100.000 contactos por acción.",
  "A exportação expirou. Exporte de novo.": "La exportación expiró. Exporta de nuevo.",
  "Pedido de exportação não encontrado.": "Solicitud de exportación no encontrada.",
  "Só um administrador aprova exportações.": "Solo un administrador aprueba exportaciones.",
  "Outro administrador precisa decidir o seu pedido.": "Otro administrador debe decidir tu solicitud.",
  "Este pedido já foi decidido.": "Esta solicitud ya fue decidida.",
  "O pedido expirou: passou de 7 dias.": "La solicitud venció: pasaron más de 7 días.",
  "Ver exportações": "Ver exportaciones",
  "Exportações": "Exportaciones",
  "Para aprovar": "Por aprobar",
  "Minhas exportações": "Mis exportaciones",
  "Aguardando aprovação": "Esperando aprobación",
  "Gerando": "Generando",
  "Pronta": "Lista",
  "Recusada": "Rechazada",
  "Expirada": "Vencida",
  "Falhou": "Falló",
  "Aprovar": "Aprobar",
  "Recusar": "Rechazar",
  "{nome} pediu {n} contatos": "{nome} pidió {n} contactos",
  "{n} contatos": "{n} contactos",
  "Alguém da equipe": "Alguien del equipo",
  "Nenhum pedido aguardando aprovação.": "Ninguna solicitud esperando aprobación.",
  "Nenhuma exportação nos últimos dias.": "Ninguna exportación en los últimos días.",
  "Exportação aprovada.": "Exportación aprobada.",
  "Exportação recusada.": "Exportación rechazada.",
};
```

Repare: a palavra digitada na exclusão é `t("Excluir")`. Em espanhol, a pessoa digita "Eliminar", e as duas frases ("Digite Excluir…" e "Digite **Excluir**…") dizem "Eliminar". Mantenha as três traduções iguais.

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts
```

Expected: PASS. Se faltar texto, acrescente ao `ES` e rode de novo.

- [ ] **Step 2: Atualizar com a `main`, gates rápidos, rodada cheia e o PR B**

Siga os Steps 2 a 4 da Task 6, com estes nomes: logs `.superpowers/sdd/2b-b-*.log`, branch `feat/fase-2b-acoes-em-massa`, título "Fase 2B (PR B): seleção, ações em massa, exportação com aprovação e excluir com os negócios", corpo `.superpowers/sdd/2b-b-pr.md`. O corpo traz: a seleção (B3 do usuário: página, todos do filtro, os N primeiros; a faixa), a barra e as ações ligadas (Campos espera a 2C), a fila (`event_log`, consumidor `escale-acao-em-massa.v1`, lotes de 100, 20 s por rodada, no máximo uma vez, só ação "na_fila"), a exportação com aprovação (Q4: aguardando sem evento, outro admin aprova ou recusa, único admin não espera, 7 dias, a trava da decisão; bucket privado, 24 h, URL de 60 s, auditoria) e o botão "Exportações", a exclusão com os negócios (Q5, em massa e no ⋮ da linha, pela rota do fork), a migration 9103, as respostas de 17/10 que valem para o PR B (Q3 a Q8, Q11 e Q13), as diferenças conhecidas (prints que faltam 1 a 3; sem a verificação por código; a ilustração da exclusão em ícones, N19; a caixinha do cabeçalho marca a página, decisão B3; aviso de fim só na lista) e a verificação; termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

- [ ] **Step 3: O PRD**

Linha da 2B: `PR A (#…) e PR B (#…) abertos; importar contatos (B6) virou fase própria depois da 2D (Q7)`. Quando os dois forem mergeados e publicados (com o "pode fazer"), a linha vira "entregue (`v…-escale.N`)", e a conferência visual lado a lado (03-001, os prints 2b, 18b, v2-03) entra no LOG.md com a lista das diferenças que sobraram.

**PARE aqui.** Merge, tag, release e deploy só com o "pode fazer". **Antes do deploy do PR B**, confira na VPS que o worker está de pé (`docker compose ps` mostra o `worker` saudável): sem ele, as ações ficam "na fila" até o cron `event-log-drain` (a cada minuto) pegá-las.

---

## Self-review (refeita em 18/10, depois das respostas de 17/10 e dos prints 2b)

- **Cobertura do PRD:** B1 → Tasks 1, 2, 4, 5 (seções Contato, Negócio, Tags e Campos em grupos, no banco); B2 → Tasks 2, 3, 5 (salvos, renomear na linha, excluir, compartilhar); B3 → Tasks 8, 10 (página, setinha, faixa, todos do filtro, N primeiros, excluídos); B4 → Tasks 7, 8, 9, 11 (criar negócios, tag, excluir com os negócios em massa e no ⋮ da linha; "Campos" em breve, Q3); B5 → Tasks 7, 8, 9, 11, 12 (CSV no servidor, aprovação do admin, bucket privado, download auditado, botão "Exportações"). B6 saiu da fase (Q7, N17). Permissões da §5: seleção, massa, exportar e excluir da linha = gerente (Tasks 9, 10, 11); aprovar exportação = admin, outro que não quem pediu (Tasks 7, 9, 12); filtro salvo = quem criou, compartilhado para todos (Task 2).
- **Respostas de 17/10:** Q1/Q7 → dois PRs, PR C removido; Q2, Q3, Q6, Q9–Q13 mantidos como estavam; Q4 → 9103 (status, `fn_escale_admin_unico`, `fn_escale_decidir_exportacao`, policies do admin, trava), rotas aprovar/recusar, GET com `para_aprovar`, toasts, aviso de fim e botão "Exportações"; Q5 → `excluirContatoComNegocios` (Task 8), rota da linha (Task 9), `MenuDaLinha` e o texto da Clint no modal (Task 11); Q8 → N16 sem mexer no motor.
- **Prints 2b:** Tags em grupos (Tasks 1, 2, 4), seletor de Campos com grupos que abrem e "Empresa" em breve (Task 4), renomear na linha (Task 5), "Filtros" + ⇕ some com a faixa aberta (Task 5), "Tag" da barra em passos (Task 11), ilustração da exclusão (Task 11), barra sem selo (Task 11), "Criar negócio" sem "Cancelar" (Task 11).
- **Nomes que atravessam tasks:** `FiltrosDeContatos`, `TagsDoFiltro`/`CondicaoDeTag`/`GrupoDeTags`/`ROTULO_DA_OP_DE_TAG`, `contarCondicoes`, `compilarFiltros`, `FiltroCompilado`, `fn_escale_tags_passam`, `OpcoesDoFiltro`/`OPCOES_VAZIAS`, `fn_escale_contatos_do_filtro`, `GruposDoFiltro`/`BotaoVoltar`, `useFiltrosDaLista`, `useEstadoDaListaDeContatos`, `ControleDosFiltros`, `JanelaDeConfirmacao` (`iconeDoConfirmar`), `Selecao`/`AlvoDaAcao`/`alvoDaSelecao`, `pedidoDeAcaoSchema`, `StatusDaAcao`/`StatusVisivel`/`statusVisivel`/`VALIDADE_DO_PEDIDO_MS`, `AcoesDaPessoa`/`PedidoParaAprovar`, `excluirContatoComNegocios`, `processarAcaoEmMassa`, `fn_escale_decidir_exportacao`, `decidirExportacao`, `useAcoesEmMassa(ativo, intervalo)`/`useDecidirExportacao`/`CHAVE_DAS_ACOES`, `useExcluirContatoDaLista`, `useSelecaoDaLista`, `useAcompanharAcoes`, `terminou`/`rodando`, `AcoesEmMassa`, `PainelDeExportacoes` — conferidos entre as tasks que os produzem e as que os usam.
- **Numeração:** Tasks 1–13 contíguas (PR A 1–6, PR B 7–13); referências cruzadas ("Steps 2 a 4 da Task 6", "Task 8", "Task 10") conferidas.
- **Pontos de atenção do executor:** os "Confira antes de rodar" de cada task (nomes do original que o levantamento leu mas que podem ter mudado na `main`: códigos do `fail`, papel das opções do `SeletorMultiploDaCasca`, `aria-disabled` da `CaixaDaCasca`, a API da `AlternanciaDaCasca`, o `writeCountAs` com `with check` e com o `raise` do gatilho, o tipo de `actorUserId` no `audit`).
