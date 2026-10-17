# Fase 2A — Lista de contatos igual à Clint · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** A1 a A10 e C1 de `docs/modulos/2-contatos-e-empresas.md` (seção 4). A11 é "ignorar". B1–B6 (filtros, seleção, massa, exportar, importar) são da 2B; D1–D5 (campos) da 2C; E (empresas) da 2D; C2–C4 (ficha do contato e mescla) da 2E.
> **Frente B** (decisão 9 do roteiro): roda numa **worktree própria**, em paralelo com a Frente A (1G–1K). Migrations na faixa **9100–9199**.

## Perguntas em aberto (respostas do usuário antes do "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Visão "Pessoais".** A Clint tem só "Todos os contatos", "Com negócio" e "Sem negócio". O original esconde os contatos marcados como pessoais e tem um botão para vê-los. O plano põe "Pessoais" como quarta opção do mesmo seletor. Está bem? | N4 |
| Q2 | **Contagem de negócios.** Conta os negócios abertos, ganhos e perdidos das origens **não arquivadas**, só os que a pessoa enxerga (um atendente vê os seus e os sem dono). "Com negócio" e "Sem negócio" seguem a mesma conta. Está bem? | N3 |
| Q3 | **Enquanto a 2E não chega** (a ficha do contato por cima da lista): clicar no nome, em "Ver N negócios" (com 2 ou mais) e em "Editar" leva à página e à janela de editar do **original**. "Ver 1 negócio" abre a ficha do negócio (1G). Está bem? | N7, N8, N9 |
| Q4 | **"Importar contatos"** abre o importador do original até a 2B trazer o assistente. Está bem? | N11 |
| Q5 | **Instagram.** O original não tem campo de Instagram; tem o link em `custom_fields.link_instagram`. A janela grava o "@usuario" como `https://instagram.com/usuario` nesse link, e a coluna mostra o "@usuario". A Clint barra Instagram repetido; aqui não barra (não há trava no banco). Está bem? | N11 |
| Q6 | **Telefone inválido.** A Clint pergunta "Criar mesmo assim?"; o nosso motor só grava telefone válido (E.164), então a janela recusa e explica. Está bem? | N11 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio e a conferência visual marca o ponto):
1. ❌ O menu do botão "Novo contato" aberto.
2. ❌ A janela "Novo contato" vazia, e com "Desejo criar uma oportunidade de negócio" marcado.
3. ❌ O seletor "Todos os contatos" aberto.
4. ❌ O ⋮ da linha aberto, e a confirmação de excluir.
5. ❌ A lista vazia (busca sem resultado) e com erro.
6. ❌ O "Adicionar negócio" clicado (o que abre).
7. ❌ O "Personalizar colunas" com o grupo "Colunas" aberto e com "Redefinir" visível.

**Goal:** Com a casca ligada, `/app/contacts` vira a lista de contatos da Clint (capturas 03-001 e 03-002): cabeçalho com o selo de mescla e o "Novo contato" com menu; barra com busca, visões prontas, "Filtros" (desligado até a 2B), contagem, atualizar e "Personalizar colunas"; tabela com Nome, Contato, Tags e Negócios; paginação numerada com "10 por página"; a janela "Novo contato" da Clint, que também cria o negócio. Sem a casca, nada muda.

**Architecture:**
- **Rota:** `app/app/contacts/page.tsx` (do original) ganha um encaixe: com a casca, lê as origens e etapas abertas com a sessão e entrega à `ListaDeContatos` (cliente, fork). Sem a casca, o `ContactsListClient` de sempre.
- **Dados:** rota nova do fork `GET /api/v1/lista-de-contatos` (`q`, `v`, `p`, `n`). Ela chama a função **`fn_escale_lista_de_contatos`** (migration 9101, *security invoker*: a RLS de quem olha decide os contatos e os negócios contados), que devolve os ids da página, o **total** e os **negócios por contato**; depois lê as colunas dos contatos e a conversa mais recente pelo PostgREST. A busca usa as mesmas réguas do original (`padraoRegexDeBusca`, variantes de telefone, CPF), mais o link do Instagram.
- **Colunas por pessoa:** tabela nova `crm_colunas_das_listas` (migration 9101), com `lista` (`contatos` agora, `empresas` na 2D), e a rota `GET/PUT /api/v1/colunas-das-listas`, no molde da capa do card (1E).
- **Escrita:** criar contato e negócio, editar, excluir e mesclar usam as rotas e hooks do original. Nenhuma rota de escrita nova, fora a das colunas.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix (Popover, DropdownMenu, Dialog), `@hello-pangea/dnd` (já no projeto), Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (função SQL invoker).

## Referência visual (abrir o PNG antes de cada task de tela)

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 03-001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\03-contatos\imagens\03-001-lista-contatos.png | cabeçalho, barra, tabela, linha, rodapé e paginação | 5, 8 |
| 03-002 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\03-contatos\imagens\03-002-personalizacao-colunas.png | o painel "Personalizar colunas" | 6 |
| 1g-02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-02-aba-contato.jpg | rótulos dos campos do contato ("Nome", "Whatsapp", "Email", "Telefone" com país) | 7 |

Os caminhos de imagem ficam **sem crase**: o guarda `tests/unit/evidencia-citada.test.ts` reprova o plano copiado para o repositório quando ele cita, entre crases ou em link, imagem que o git não versiona.

### Medidas (as capturas 03-001 e 03-002 estão em zoom de 125%: medida do print ÷ 1,25 = CSS px)

A régua: a linha da tabela mede 80px no print, e o código da Clint diz `h:"64px"` (80 ÷ 1,25 = 64).

| Peça | Print | CSS |
|---|---|---|
| Cabeçalho da página (título + ações) | 62px de altura | 50px; título "Contatos" 16px/500 `text-casca-texto`, a 24px da borda |
| "Novo contato +" | 173×38 | `BotaoDaCasca variante="marca"` (31px), texto 13px, "+" 15px à direita |
| Selo "N sugestões de mescla" | 254×38 | 31px de altura, borda e fundo laranja claros, ícone de alerta laranja 15px, texto 13px |
| Barra (busca, visão, filtros) | 40px de altura, começa a 30px da borda | 32px; 24px de margem |
| Busca | 350×40 | 280×32, fundo `bg-casca-busca`, lupa à direita, texto 13px |
| "Todos os contatos" | 220×40 | 176×32, ícone de pessoas 15px + rótulo 13px/500 + chevron |
| "Filtros" + ⇕ | 110 + 44 × 40 | 88 + 35 × 32, borda, mesmo grupo |
| Contagem + atualizar + colunas | — | número 14px/600 `text-casca-texto` + "contatos" 14px `text-casca-suave`; ícone de atualizar 17px; botão de colunas (sliders 17px + selo redondo 20px com o número) |
| Cabeçalho da tabela | 65px | 52px; rótulos 11px/600, maiúsculos, espaçamento de letra 0,08em |
| Linha | 80px | 64px, borda de baixo `border-casca-borda`; hover `bg-casca-raia` |
| Caixinha | 24px | 16px (a da casca, `CaixaDaCasca`) + chevron 12px no cabeçalho |
| Foto | 40px | 32px, redonda |
| Nome | — | 14px/500 `text-casca-texto` |
| Contato | — | ícone 12px `text-casca-meta` + texto 12px/500; segunda linha a 4px; ações do hover 14px na cor da marca |
| Chip da tag | 16px | o chip da casca (15px de altura, texto 10px), como no card |
| "Ver 1 negócio" / "Adicionar negócio" | 117×30 | 24px de altura, `px-2.5`, texto 12px/500, raio 6, contorno: "Ver" na cor da marca, "Adicionar" cinza |
| ⋮ | — | 18px, coluna de 40px |
| Rodapé | 62px | 50px; "10 por página" 180×32; páginas 32×32 com borda, a atual cheia na cor da marca, "Anterior"/"Próximo" sem borda |
| Painel "Personalizar colunas" | 418px de largura | 334px; cabeçalho 14px/500 + selo da contagem + X; busca 32px `bg-casca-busca`; grupos 11px/600 maiúsculos; linhas de 32px com alça ⠿, ícone 15px, rótulo 13px e interruptor da casca |

### Textos da Clint usados nesta fase

Do código `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\index-C8mLn7Gp.js.txt` (lista) e `index-nevret7g.js.txt` (novo contato): "Importar contatos", "Atualizar", "Personalizar colunas", "Buscar coluna ou campo", "Na tabela · {count}", "arraste para reordenar", "Colunas", "Campos do contato", "Redefinir", "Nada encontrado.", "Fechar", "Nome", "Contato", "Tags", "Negócios", "Ver {n} negócio(s)", "Chamar", "Abrir WhatsApp", "Abrir em Conversas", "Tem certeza que deseja excluir o contato selecionado?", "Contato excluído.", "Não foi possível excluir o contato.", "Não foram encontrados contatos.", "Tente ajustar a busca ou os filtros.", "Não foi possível carregar os contatos.", "Tente novamente em instantes.", "{count} sugestão(ões) de mescla"; janela: "Informações do contato", "Digite o nome do contato", "Desejo criar uma oportunidade de negócio", "Adicionar contato", "Contato criado com sucesso!", "Ver novo negócio", "Email já cadastrado", "Telefone já cadastrado", "E-mail deve ser válido". Da captura: "Contatos", "Novo contato", "Buscar por contato ou Empresa", "Todos os contatos", "Filtros", "{n} contatos", "Adicionar negócio", "10 por página", "Anterior", "Próximo". Da engenharia reversa (`ContactFilterPresets`): "Com negócio", "Sem negócio".

O placeholder do Instagram na Clint usa a marca dela ("Ex: @clint.digital"); aqui é "Ex: @escaleia" (regra da marca do `CLAUDE.md`).

### Comportamento da Clint conferido no código (`index-C8mLn7Gp.js.txt`)

- **Linha** (`contact-row-v2`, `h:"64px"`): caixinha desligada sem `CONTACT_BULK_ACTIONS`; nome com foto `xs` redonda (o nome da empresa aparece em cima, em 2xs — é da 2D); clicar no nome abre o contato.
- **Contato:** telefone (ícone 12, texto `xs`/500); ações aparecem no hover da linha (`opacity 0 → 1`): "Chamar" (ícone 14 na cor da marca) e WhatsApp ("Abrir em Conversas" quando o contato já tem conversa, senão "Abrir WhatsApp"); depois e-mail e Instagram, cada um com o seu ícone.
- **Tags:** até 6 chips e o resto contado.
- **Negócios** (coluna de 160px): com negócios, botão contorno roxo "Ver {n} negócio(s)" que abre o contato na aba de negócios; sem, botão contorno cinza "Adicionar negócio" que abre a criação do negócio. Só com a permissão `DEAL`. A contagem usa só os negócios das origens que a pessoa enxerga (`To(y.deals, oa)`).
- **⋮** (`bt-row-menu-v2`, à esquerda): "Editar"; separador e "Excluir" em vermelho, só com `CONTACT_DELETE`, com a confirmação em balão por cima "Tem certeza que deseja excluir o contato selecionado?".
- **"Novo contato"**: botão roxo que abre um menu (abaixo, à direita) com "Novo contato" (+) e "Importar contatos".
- **Contagem:** número em negrito + "contato(s)" cinza; "Atualizar" é um botão de ícone com dica.
- **Paginação:** `offset`/`limit`, 10 por padrão, guardado no navegador (`contacts-list:pagination`); se a página atual fica vazia, volta para a primeira.
- **Personalizar colunas:** popover abaixo, à direita; grupos "Na tabela · N" (arrastar), "Colunas" e "Campos do contato"; "Redefinir" só quando mudou do padrão; a preferência fica no servidor.

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Encaixe em `app/app/contacts/page.tsx`:** com a casca (`lerPreferenciaDeMenu(cookie) === "topo"`), a página lê as origens e etapas abertas e renderiza a `ListaDeContatos`; sem a casca, o `ContactsListClient` de sempre. O menu do topo não muda (já aponta para `/app/contacts`) | Regra 7 do roteiro (encaixe de poucas linhas); a `navegacao-completude` não ganha rota nova |
| N2 | **Total, página e negócios numa função SQL invoker** (`fn_escale_lista_de_contatos`, 9101), com a busca do original (mesmo padrão regex, variantes de telefone e CPF) mais o link do Instagram. As colunas dos contatos e a conversa vêm depois, pelo PostgREST, só para os ids da página | O original pagina por cursor e não sabe o total; contar no banco com a sessão de quem olha mantém a RLS |
| N3 | **Negócios contados:** abertos, ganhos e perdidos, de origens não arquivadas, só os que a pessoa enxerga (a RLS de `crm_leads`). "Com negócio" e "Sem negócio" usam a mesma conta (Q2) | Clint `To(y.deals, oa)` |
| N4 | **Visões:** "Todos os contatos" (padrão), "Com negócio", "Sem negócio" e "Pessoais" (do original, Q1). Pessoais só aparecem na visão "Pessoais", como hoje | O original esconde os pessoais da operação (spec 21) |
| N5 | **Paginação numerada:** 10, 25, 50 ou 100 por página, padrão 10, lembrado no navegador (`escale:contatos:por-pagina`, com `try/catch`); busca, visão e página na URL (`q`, `v`, `p`). Página vazia além da primeira volta para a 1. Sem ordenação pelo usuário: atividade mais recente primeiro (A11) | Clint + "URL como estado" |
| N6 | **Colunas:** "Nome" fixa. Padrão: Contato, Tags, Negócios. Grupo "Colunas": Status, Última atividade, Criado em, Origem (do original). Grupo "Campos do contato": Data de nascimento e os links (Instagram, site e os outros de `TIPOS_DE_LINK`). Os campos personalizados entram na 2C. Preferência por pessoa em `crm_colunas_das_listas` | 03-002 + "não pode quebrar" do PRD |
| N7 | **Linha:** nome e foto levam à página do contato do original (`/app/contacts/[id]`) até a 2E (Q3); telefone no formato brasileiro "(64) 99944-6816"; ligar (`tel:`, dica "Chamar") e WhatsApp no hover; e-mail e "@instagram" abaixo. Sem o ícone de "Telefone inválido": o motor só grava E.164 | Clint; o motor do original |
| N8 | **Negócios:** "Ver 1 negócio" abre `/app/leads/[id]` (a ficha da 1G, com a casca); com 2 ou mais, a página do contato (Q3). "Adicionar negócio" abre a janela "Novo negócio" (origem e etapa) e grava pelo `POST /api/v1/leads` com o contato. A coluna só aparece para agent ou acima | Clint (`DEAL`); o motor do original |
| N9 | **⋮:** "Editar" abre o `EditContactDialog` do original (Q3); "Excluir" (só gerente ou acima, `usePermission("contact.delete")`) abre a confirmação da Clint e, antes, faz a checagem de Agenda do original (`/vinculos`) | Clint + a regra do original |
| N10 | **Caixinha, "Filtros" e ⇕** aparecem no lugar, desligados com "Em breve" (a 2B liga) | A Clint mostra a caixinha mesmo sem permissão; 2B é a seleção |
| N11 | **"Novo contato":** menu com "Novo contato" e "Importar contatos" (o importador do original, Q4). A janela é a da Clint: Nome*, Email, Telefone (país + número → E.164), Instagram (→ link, Q5) e "Desejo criar uma oportunidade de negócio" (Origem*, Etapa*). Telefone repetido: o 409 `contact_exists` vira "Telefone já cadastrado"; e-mail repetido é checado antes de gravar ("Email já cadastrado"); telefone inválido é recusado (Q6). Sucesso: "Contato criado com sucesso!" e, com negócio, "Ver novo negócio" | C1 do PRD |
| N12 | **Selo de mescla:** número de grupos do `useContactDuplicates` (o mesmo do botão "Duplicados" de hoje), só para gerente ou acima (juntar exige gerente); abre o `MergeDialog` do original até a 2E | A2 do PRD |
| N13 | **Origens das janelas:** lidas no servidor pela página, com a sessão: origens não arquivadas, etapas não arquivadas e que não são de ganho nem de perda, na ordem do quadro | `GET /api/v1/pipelines` exige gerente; a página é aberta a todo papel |
| N14 | **Uma migration (9101)** com a tabela das colunas e a função. Mesmo SQL no `supabase/baseline.sql`, logo depois do bloco da 9007 | Regra 7 do roteiro; a faixa 9100–9199 é da Frente B |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`. **A pasta `repo` é da Frente A** (está na branch da 1G, com arquivos alterados): **não troque de branch nela, não faça stash, não mexa nos arquivos dela.**
- **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`, branch `feat/fase-2a-lista-de-contatos`, criada de `escale-crm/main` (Task 1). Todo comando desta fase roda dentro da worktree.
- **Base:** `escale-crm/main` com a 1F mergeada (a última migration é a 9007; a Task 1 prova). A 1G não precisa estar mergeada: "Ver 1 negócio" usa `/app/leads/[id]`, que sem a 1G leva ao quadro e com a 1G leva à ficha.
- **Migration:** **9101**, arquivo `supabase/migrations/20261030120000_9101_lista_de_contatos.sql`. Se outra branch já tiver 9101, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` (Postgres no Docker): `corepack pnpm test:db -- <arquivos>`; só na Task 2.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2A`. Sem a casca, nenhum deles muda o comportamento.

| Arquivo | Mudança |
|---|---|
| `app/app/contacts/page.tsx` | com a casca, lê as origens e renderiza a `ListaDeContatos` (Task 8) |
| `supabase/baseline.sql` | bloco da 9101 logo depois do bloco da 9007 (Task 2) |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D`, depois do último bloco do fork que estiver acima dele (Task 8) |

Os do fork que mudam: `components/escale/quadro/PecasDoCard.tsx` (exporta o `ChipDaTag`, Task 5), `lib/ui/icons-da-casca.ts` (ícones novos, Task 5).

**Conflito esperado com a Frente A:** `baseline.sql` e `dicionario.ts` recebem blocos das duas frentes no mesmo ponto. Antes do PR, atualize a branch com a `escale-crm/main` (Task 8) e resolva mantendo os dois blocos.

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title` (as peças "Em breve" têm).
- `tailwind-tokens`: cores só por token da casca (`casca-*`, `surface`, `warning*`) ou `var(--escale-*)`; nada de `rounded` puro, `shadow` puro, `outline-none`; texto sem alfa.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto` e o teste novo da Task 8: sem a casca, a página de contatos é a do original.
- `navegacao-completude`: nenhuma `page.tsx` nova.
- `i18n-espanhol-cobre-a-tela`: todo texto novo passa por `t()` com literal e tem espanhol (Task 8).
- `rls-completude`, `rbac` e as varreduras de definer/invoker do `test:db`: a tabela nova tem RLS e policies; a função é invoker (Task 2).

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** só na Task 2, com o arquivo novo e as varreduras que leem tabela e função (`rls-completude`, `rbac-config-ia-canais`, `travas-de-suporte` e as três de definer).
3. **Revisor (subagente) só** na Task 2 (migration e RLS), na Task 3 (rotas) e na Task 7 (janelas que gravam). As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia no fim** (Task 8), em segundo plano enquanto o texto do PR é escrito. Sem worktree da `main`: as falhas são comparadas com `.superpowers/sdd/falhas-conhecidas.txt` (copie o arquivo da pasta `repo` para a worktree; ele é ignorado pelo git). Falha nova = rodar sozinha; se persistir, é regressão.
5. **Conferência visual** só no fim (Task 8): cada parte contra a captura citada, com a lista escrita das diferenças que sobram.
6. **Comandos longos sempre em segundo plano** (a suíte cheia e o `test:db`).

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` e o PRD para `docs/escale/modulos/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas e números no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | Responsabilidade |
|---|---|---|
| `lib/escale/contatos/regras.ts` | novo | visões, por página, páginas visíveis, telefone BR, Instagram, colunas (tipos, padrão, leitura) |
| `supabase/migrations/20261030120000_9101_lista_de_contatos.sql`, `supabase/baseline.sql` | novo / alterado | tabela `crm_colunas_das_listas` e função `fn_escale_lista_de_contatos` |
| `lib/escale/contatos/lista.ts` | novo | parâmetros da busca e a leitura da página (servidor) |
| `lib/escale/colunas/banco.ts` | novo | ler e gravar as colunas da pessoa |
| `app/api/v1/lista-de-contatos/route.ts`, `app/api/v1/colunas-das-listas/route.ts` | novos | as duas rotas |
| `hooks/escale/useListaDeContatos.ts`, `hooks/escale/useColunasDaLista.ts` | novos | leitura e gravação no cliente |
| `components/escale/ui/PaginacaoDaCasca.tsx` | novo | paginação numerada e "N por página" (a 2D reaproveita) |
| `components/escale/contatos/FotoDaLinha.tsx`, `CelulasDoContato.tsx`, `MenuDaLinha.tsx`, `TabelaDeContatos.tsx` | novos | a tabela |
| `components/escale/contatos/PainelDeColunas.tsx` | novo | "Personalizar colunas" |
| `components/escale/contatos/CamposDaOportunidade.tsx`, `JanelaNovoContato.tsx`, `JanelaNovoNegocio.tsx`, `MenuNovoContato.tsx`, `SeloDeMescla.tsx` | novos | criar contato e negócio, mescla |
| `components/escale/contatos/ListaDeContatos.tsx` | novo | a página (cabeçalho, barra, tabela, rodapé, estados) |
| `app/app/contacts/page.tsx` | alterado (encaixe) | a porta |
| `components/escale/quadro/PecasDoCard.tsx`, `lib/ui/icons-da-casca.ts`, `lib/i18n/dicionario.ts` | alterados | chip exportado, ícones, espanhol |
| Testes: `tests/unit/escale-contatos-regras.test.ts`, `escale-lista-de-contatos-migration.test.ts`, `escale-lista-de-contatos-rotas.test.ts`, `escale-paginacao-da-casca.test.tsx`, `escale-tabela-de-contatos.test.tsx`, `escale-painel-de-colunas.test.tsx`, `escale-janela-novo-contato.test.tsx`, `escale-lista-de-contatos-pagina.test.tsx`; `tests/invariants/escale-lista-de-contatos.test.ts` | novos | |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` | alterado (fora do repositório) | a linha da 2A na seção 8 |

---

### Task 1: Worktree, base e as regras puras

**Files:**
- Create: `lib/escale/contatos/regras.ts`, `tests/unit/escale-contatos-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`; o PRD para `docs/escale/modulos/2-contatos-e-empresas.md`

**Interfaces (Produces):** `VISOES_DE_CONTATOS`, `VisaoDeContatos`, `ROTULO_DA_VISAO`, `POR_PAGINA`, `POR_PAGINA_PADRAO`, `CHAVE_DO_POR_PAGINA`, `totalDePaginas`, `paginasVisiveis`, `formatarTelefone`, `instagramDoLink`, `linkDoInstagram`, `telefoneE164`, `PAISES_DO_TELEFONE`, `COLUNAS_NATIVAS`, `ColunaNativa`, `ROTULO_DA_COLUNA`, `CAMPOS_DO_CONTATO_2A`, `ItemDeColuna`, `COLUNAS_PADRAO`, `MAXIMO_DE_COLUNAS`, `colunasSchema`, `lerColunas`, `chaveDoItem`, `mesmasColunas`.

- [ ] **Step 1: A worktree e a base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm
git worktree add ../wt-frente-b -b feat/fase-2a-lista-de-contatos escale-crm/main
cd ../wt-frente-b
ls supabase/migrations | grep -E "_9[0-9]{3}_" | sort | tail -3
git log --all --name-only --format= | grep -E "_91[0-9]{2}_" | sort -u
corepack pnpm install --frozen-lockfile
cp ../repo/.superpowers/sdd/falhas-conhecidas.txt .superpowers/sdd/ 2>/dev/null || (mkdir -p .superpowers/sdd && cp ../repo/.superpowers/sdd/falhas-conhecidas.txt .superpowers/sdd/)
```

Expected: a última migration listada é a `9007`; o `git log --all` não acha nenhuma `91xx`. Se aparecer 9101 em alguma branch, PARE e pergunte.

- [ ] **Step 2: Copiar o plano e o PRD**

```bash
mkdir -p docs/escale/modulos
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/superpowers/plans/2026-10-17-fase-2a-lista-de-contatos.md" docs/superpowers/plans/
cp "/c/Documentos/projetos claude/Deskcom CRM/docs/modulos/2-contatos-e-empresas.md" docs/escale/modulos/
```

- [ ] **Step 3: O teste das regras (falha)**

`tests/unit/escale-contatos-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  COLUNAS_PADRAO,
  MAXIMO_DE_COLUNAS,
  chaveDoItem,
  formatarTelefone,
  instagramDoLink,
  lerColunas,
  linkDoInstagram,
  mesmasColunas,
  paginasVisiveis,
  telefoneE164,
  totalDePaginas,
} from "@/lib/escale/contatos/regras";

describe("paginação", () => {
  it("total de páginas nunca é zero", () => {
    expect(totalDePaginas(0, 10)).toBe(1);
    expect(totalDePaginas(64001, 10)).toBe(6401);
    expect(totalDePaginas(10, 10)).toBe(1);
  });

  it("no começo mostra 1–4, reticências e a última (captura 03-001)", () => {
    expect(paginasVisiveis(1, 6401)).toEqual([1, 2, 3, 4, "…", 6401]);
  });

  it("no meio mostra a primeira, os vizinhos e a última", () => {
    expect(paginasVisiveis(50, 6401)).toEqual([1, "…", 49, 50, 51, "…", 6401]);
  });

  it("no fim mostra a primeira e as quatro últimas", () => {
    expect(paginasVisiveis(6401, 6401)).toEqual([1, "…", 6398, 6399, 6400, 6401]);
  });

  it("poucas páginas aparecem todas", () => {
    expect(paginasVisiveis(1, 1)).toEqual([1]);
    expect(paginasVisiveis(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });
});

describe("telefone", () => {
  it("celular e fixo do Brasil no formato da Clint", () => {
    expect(formatarTelefone("+5564999446816")).toBe("(64) 99944-6816");
    expect(formatarTelefone("+554833809958")).toBe("(48) 3380-9958");
  });

  it("outro país fica com o código e o número", () => {
    expect(formatarTelefone("+351912345678")).toBe("+351 912345678");
  });

  it("vazio é vazio", () => {
    expect(formatarTelefone(null)).toBe("");
  });

  it("país + número viram E.164; número curto ou longo é recusado", () => {
    expect(telefoneE164("55", "(64) 99944-6816")).toBe("+5564999446816");
    expect(telefoneE164("55", "123")).toBeNull();
    expect(telefoneE164("55", "")).toBeNull();
    expect(telefoneE164("1", "2025550123")).toBe("+12025550123");
  });
});

describe("Instagram", () => {
  it("@usuario, usuario e o link viram o mesmo link", () => {
    expect(linkDoInstagram("@dapenhamaria")).toBe("https://instagram.com/dapenhamaria");
    expect(linkDoInstagram("dapenhamaria")).toBe("https://instagram.com/dapenhamaria");
    expect(linkDoInstagram("https://www.instagram.com/dapenhamaria/")).toBe("https://instagram.com/dapenhamaria");
  });

  it("vazio é null; usuário com caractere proibido é recusado", () => {
    expect(linkDoInstagram("  ")).toBeNull();
    expect(linkDoInstagram("@nome com espaço")).toBe(false);
  });

  it("o link vira o @ da coluna", () => {
    expect(instagramDoLink("https://instagram.com/dapenhamaria")).toBe("dapenhamaria");
    expect(instagramDoLink("https://www.instagram.com/dapenhamaria/?hl=pt")).toBe("dapenhamaria");
    expect(instagramDoLink("https://exemplo.com/x")).toBeNull();
    expect(instagramDoLink(null)).toBeNull();
  });
});

describe("colunas", () => {
  it("padrão: Contato, Tags e Negócios", () => {
    expect(COLUNAS_PADRAO.map(chaveDoItem)).toEqual(["nativa:contato", "nativa:tags", "nativa:negocios"]);
  });

  it("lê a preferência guardada, sem repetir e sem chave desconhecida", () => {
    const lidas = lerColunas({
      itens: [
        { tipo: "nativa", chave: "tags" },
        { tipo: "nativa", chave: "tags" },
        { tipo: "nativa", chave: "inventada" },
        { tipo: "campo", chave: "link_instagram" },
        { tipo: "campo", chave: "nascimento" },
      ],
    });
    expect(lidas.map(chaveDoItem)).toEqual(["nativa:tags", "campo:link_instagram", "campo:nascimento"]);
  });

  it("preferência ausente ou estragada volta ao padrão", () => {
    expect(lerColunas(null)).toEqual(COLUNAS_PADRAO);
    expect(lerColunas({ itens: "x" })).toEqual(COLUNAS_PADRAO);
  });

  it("lista vazia é válida (a pessoa desligou tudo)", () => {
    expect(lerColunas({ itens: [] })).toEqual([]);
  });

  it("corta no máximo", () => {
    const muitas = Array.from({ length: MAXIMO_DE_COLUNAS + 5 }, (_, i) => ({ tipo: "campo", chave: `c${i}` }));
    expect(lerColunas({ itens: muitas })).toHaveLength(MAXIMO_DE_COLUNAS);
  });

  it("compara duas listas pela ordem", () => {
    expect(mesmasColunas(COLUNAS_PADRAO, [...COLUNAS_PADRAO])).toBe(true);
    expect(mesmasColunas(COLUNAS_PADRAO, [...COLUNAS_PADRAO].reverse())).toBe(false);
  });
});
```

- [ ] **Step 4: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-contatos-regras.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 5: As regras**

`lib/escale/contatos/regras.ts`:

```ts
import { z } from "zod";

import { TIPOS_DE_LINK, chaveDoLink } from "@/lib/leads/links-de-contato";

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fase 2A) — regras puras.
 * A tela é a da Clint (capturas 03-001 e 03-002); estas regras não leem banco.
 */

// ─── Visões prontas (Clint `ContactFilterPresets` + "Pessoais" do original) ───
export const VISOES_DE_CONTATOS = ["todos", "com_negocio", "sem_negocio", "pessoais"] as const;
export type VisaoDeContatos = (typeof VISOES_DE_CONTATOS)[number];
/** Rótulos em português; quem mostra passa por `t()` com o literal. */
export const ROTULO_DA_VISAO: Record<VisaoDeContatos, string> = {
  todos: "Todos os contatos",
  com_negocio: "Com negócio",
  sem_negocio: "Sem negócio",
  pessoais: "Pessoais",
};

// ─── Paginação ────────────────────────────────────────────────────────────────
export const POR_PAGINA = [10, 25, 50, 100] as const;
export const POR_PAGINA_PADRAO = 10;
/** Onde o "N por página" fica lembrado (a Clint guarda no navegador). */
export const CHAVE_DO_POR_PAGINA = "escale:contatos:por-pagina";

export function totalDePaginas(total: number, porPagina: number): number {
  return Math.max(1, Math.ceil(total / porPagina));
}

/** As páginas do rodapé: 1–4 no começo, vizinhos no meio, as quatro últimas no fim. */
export function paginasVisiveis(atual: number, total: number): Array<number | "…"> {
  if (total <= 5) return Array.from({ length: total }, (_, i) => i + 1);
  if (atual <= 3) return [1, 2, 3, 4, "…", total];
  if (atual >= total - 2) return [1, "…", total - 3, total - 2, total - 1, total];
  return [1, "…", atual - 1, atual, atual + 1, "…", total];
}

// ─── Telefone ───────────────────────────────────────────────────────────────
/** "+5564999446816" → "(64) 99944-6816"; outro país → "+351 912345678". */
export function formatarTelefone(e164: string | null | undefined): string {
  if (!e164) return "";
  const brasil = /^\+55(\d{2})(\d{4,5})(\d{4})$/.exec(e164);
  if (brasil) return `(${brasil[1]}) ${brasil[2]}-${brasil[3]}`;
  const outro = /^\+(\d{1,3})(\d+)$/.exec(e164);
  if (!outro) return e164;
  const pais = PAISES_DO_TELEFONE.find((p) => e164.startsWith(`+${p.ddi}`));
  const ddi = pais?.ddi ?? outro[1];
  return `+${ddi} ${e164.slice(ddi.length + 1)}`;
}

/** Os países do seletor da janela (Brasil primeiro, como a Clint). */
export const PAISES_DO_TELEFONE = [
  { sigla: "BR", ddi: "55" },
  { sigla: "PT", ddi: "351" },
  { sigla: "US", ddi: "1" },
  { sigla: "AR", ddi: "54" },
  { sigla: "CL", ddi: "56" },
  { sigla: "CO", ddi: "57" },
  { sigla: "MX", ddi: "52" },
  { sigla: "PY", ddi: "595" },
  { sigla: "UY", ddi: "598" },
  { sigla: "ES", ddi: "34" },
] as const;

/** País + número digitado → E.164 (o que o motor aceita), ou null se não fecha 8–15 dígitos. */
export function telefoneE164(ddi: string, numero: string): string | null {
  const digitos = numero.replace(/\D/g, "");
  if (!digitos) return null;
  const completo = `${ddi}${digitos}`;
  if (completo.length < 8 || completo.length > 15) return null;
  if (digitos.length < 8) return null;
  return `+${completo}`;
}

// ─── Instagram (o original guarda o link em custom_fields.link_instagram) ───
const USUARIO_DO_INSTAGRAM = /^[A-Za-z0-9._]{1,30}$/;

/** "@usuario", "usuario" ou o link → "https://instagram.com/usuario"; vazio = null; inválido = false. */
export function linkDoInstagram(entrada: string): string | null | false {
  const bruto = entrada.trim();
  if (!bruto) return null;
  const doLink = /instagram\.com\/([^/?#]+)/i.exec(bruto);
  const usuario = (doLink ? doLink[1] : bruto).replace(/^@/, "");
  return USUARIO_DO_INSTAGRAM.test(usuario) ? `https://instagram.com/${usuario}` : false;
}

/** O link guardado → "usuario" para a coluna; null se não é do Instagram. */
export function instagramDoLink(href: string | null | undefined): string | null {
  if (!href) return null;
  const m = /instagram\.com\/([^/?#]+)/i.exec(href);
  return m && USUARIO_DO_INSTAGRAM.test(m[1]) ? m[1] : null;
}

// ─── Colunas (03-002) ─────────────────────────────────────────────────────────
export const COLUNAS_NATIVAS = [
  "contato",
  "tags",
  "negocios",
  "status",
  "ultima_atividade",
  "criado_em",
  "origem",
] as const;
export type ColunaNativa = (typeof COLUNAS_NATIVAS)[number];

export const ROTULO_DA_COLUNA: Record<ColunaNativa, string> = {
  contato: "Contato",
  tags: "Tags",
  negocios: "Negócios",
  status: "Status",
  ultima_atividade: "Última atividade",
  criado_em: "Criado em",
  origem: "Origem",
};

/** "Campos do contato" nesta fase: o nascimento e os links. A 2C traz os personalizados. */
export const CAMPOS_DO_CONTATO_2A: ReadonlyArray<{ chave: string; rotulo: string }> = [
  { chave: "nascimento", rotulo: "Data de nascimento" },
  ...TIPOS_DE_LINK.map((l) => ({ chave: chaveDoLink(l.id), rotulo: l.rotulo })),
];

export type ItemDeColuna = { tipo: "nativa"; chave: ColunaNativa } | { tipo: "campo"; chave: string };

export const COLUNAS_PADRAO: ItemDeColuna[] = [
  { tipo: "nativa", chave: "contato" },
  { tipo: "nativa", chave: "tags" },
  { tipo: "nativa", chave: "negocios" },
];
export const MAXIMO_DE_COLUNAS = 40;

const itemSchema = z.union([
  z.object({ tipo: z.literal("nativa"), chave: z.string() }),
  z.object({ tipo: z.literal("campo"), chave: z.string().regex(/^[a-z0-9_]{1,40}$/) }),
]);
/** O corpo guardado em `crm_colunas_das_listas.colunas`. */
export const colunasSchema = z.object({ itens: z.array(itemSchema).max(MAXIMO_DE_COLUNAS) }).strict();

export function chaveDoItem(item: ItemDeColuna): string {
  return `${item.tipo}:${item.chave}`;
}

/** A preferência guardada → lista limpa; ausente ou estragada → o padrão. */
export function lerColunas(guardado: unknown): ItemDeColuna[] {
  if (!guardado || typeof guardado !== "object") return COLUNAS_PADRAO;
  const itens = (guardado as { itens?: unknown }).itens;
  if (!Array.isArray(itens)) return COLUNAS_PADRAO;
  const vistos = new Set<string>();
  const saida: ItemDeColuna[] = [];
  for (const bruto of itens) {
    const lido = itemSchema.safeParse(bruto);
    if (!lido.success) continue;
    const item = lido.data;
    if (item.tipo === "nativa" && !(COLUNAS_NATIVAS as readonly string[]).includes(item.chave)) continue;
    const chave = `${item.tipo}:${item.chave}`;
    if (vistos.has(chave)) continue;
    vistos.add(chave);
    saida.push(item as ItemDeColuna);
    if (saida.length === MAXIMO_DE_COLUNAS) break;
  }
  return saida;
}

export function mesmasColunas(a: readonly ItemDeColuna[], b: readonly ItemDeColuna[]): boolean {
  return a.length === b.length && a.every((item, i) => chaveDoItem(item) === chaveDoItem(b[i]));
}
```

Confira antes de rodar: `TIPOS_DE_LINK` e `chaveDoLink` são exportados por `lib/leads/links-de-contato.ts` (`grep -n "export" lib/leads/links-de-contato.ts`). Se `chaveDoLink` tiver outro nome, use o que existir para montar `link_<tipo>`.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-contatos-regras.test.ts`
Expected: PASS.

- [ ] **Step 7: Typecheck, eslint, prettier e commit**

```bash
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint lib/escale/contatos/regras.ts tests/unit/escale-contatos-regras.test.ts
corepack pnpm exec prettier --write lib/escale/contatos/regras.ts tests/unit/escale-contatos-regras.test.ts
git add lib/escale/contatos/regras.ts tests/unit/escale-contatos-regras.test.ts docs/superpowers/plans/2026-10-17-fase-2a-lista-de-contatos.md docs/escale/modulos/2-contatos-e-empresas.md
git commit -m "feat(escale): regras da lista de contatos (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration 9101 — colunas por pessoa e a função da lista

**Files:**
- Create: `supabase/migrations/20261030120000_9101_lista_de_contatos.sql`, `tests/invariants/escale-lista-de-contatos.test.ts`, `tests/unit/escale-lista-de-contatos-migration.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo logo depois do bloco da 9007)

**Interfaces (Produces):** tabela `public.crm_colunas_das_listas (organization_id, user_id, lista, colunas)`; função `public.fn_escale_lista_de_contatos(p_org uuid, p_visao text, p_padrao text, p_digitos text[], p_cpf_hash text, p_limite integer, p_deslocamento integer) returns table (contact_id uuid, total bigint, negocios integer, negocio_unico uuid)`.

- [ ] **Step 1: Conferir as cercas de migration**

```bash
grep -rlE "supabase/migrations|_9[0-9]{3}_" tests/unit tests/invariants | sort
```

Leia cada arquivo listado procurando regra de numeração contínua (por exemplo "o próximo número é o maior + 1"). Se alguma exigir que a 9101 venha logo depois da 9007, PARE e pergunte (a faixa 9100–9199 é decisão do roteiro). A `populacao-do-proximo-nnnn` já falha no Windows (está em `falhas-conhecidas.txt`).

- [ ] **Step 2: O teste do banco (falha)**

`tests/invariants/escale-lista-de-contatos.test.ts`:

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
 * LISTA DE CONTATOS DA CASCA (fork Escale, migration 9101) — prova contra
 * Postgres real: a função conta o total e os negócios com a RLS de quem olha
 * (o agent vê os seus e os sem dono), ignora origem arquivada, separa os
 * pessoais, busca pelo padrão, pelos dígitos e pelo Instagram, e pagina; a
 * tabela de colunas só deixa a pessoa ler e gravar a sua. Roda via `pnpm test:db`.
 */
const P = "e5ca1e00-9101-4000-8000-0000000000a1";
const P_ARQ = "e5ca1e00-9101-4000-8000-0000000000a2";
const S = "e5ca1e00-9101-4000-8000-0000000000b1";
const S_ARQ = "e5ca1e00-9101-4000-8000-0000000000b2";
const C_DOIS = "e5ca1e00-9101-4000-8000-0000000000c1"; // 1 negócio do agent B + 1 sem dono
const C_UM = "e5ca1e00-9101-4000-8000-0000000000c2"; // 1 negócio sem dono
const C_NADA = "e5ca1e00-9101-4000-8000-0000000000c3"; // só negócio em origem arquivada
const C_PESSOAL = "e5ca1e00-9101-4000-8000-0000000000c4";
const L_UM = "e5ca1e00-9101-4000-8000-0000000000d3";

const lista = (visao: string, padrao: string | null, extra = "") =>
  `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', '${visao}', ${
    padrao === null ? "null" : `'${padrao}'`
  }, null, null, 100, 0) ${extra}`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_leads where id::text like 'e5ca1e00-9101-%';
    delete from public.contacts where id::text like 'e5ca1e00-9101-%';
    delete from public.crm_stages where id::text like 'e5ca1e00-9101-%';
    delete from public.crm_pipelines where id::text like 'e5ca1e00-9101-%';
    insert into public.crm_pipelines (id, organization_id, name, slug) values
      ('${P}', '${GOV_ORG}', 'Lista 2A', 'escale-lista-2a'),
      ('${P_ARQ}', '${GOV_ORG}', 'Lista 2A arquivada', 'escale-lista-2a-arq');
    update public.crm_pipelines set is_archived = true where id = '${P_ARQ}';
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position) values
      ('${S}', '${GOV_ORG}', '${P}', 'Entrada', 'entrada', 0),
      ('${S_ARQ}', '${GOV_ORG}', '${P_ARQ}', 'Entrada', 'entrada', 0);
    insert into public.contacts (id, organization_id, display_name, phone_number, custom_fields, is_personal, last_activity_at) values
      ('${C_DOIS}', '${GOV_ORG}', 'Listadois Ana', '+5564999446816', '{}'::jsonb, false, now()),
      ('${C_UM}', '${GOV_ORG}', 'Listadois Bruno', null, '{"link_instagram":"https://instagram.com/listadoisbruno"}'::jsonb, false, now() - interval '1 day'),
      ('${C_NADA}', '${GOV_ORG}', 'Listadois Carla', null, '{}'::jsonb, false, now() - interval '2 days'),
      ('${C_PESSOAL}', '${GOV_ORG}', 'Listadois Pessoal', null, '{}'::jsonb, true, now());
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, title, contact_id, owner_user_id) values
      ('e5ca1e00-9101-4000-8000-0000000000d1', '${GOV_ORG}', '${P}', '${S}', 'Do B', '${C_DOIS}', '${GOV_AGENT_B}'),
      ('e5ca1e00-9101-4000-8000-0000000000d2', '${GOV_ORG}', '${P}', '${S}', 'Sem dono', '${C_DOIS}', null),
      ('${L_UM}', '${GOV_ORG}', '${P}', '${S}', 'Do Bruno', '${C_UM}', null),
      ('e5ca1e00-9101-4000-8000-0000000000d4', '${GOV_ORG}', '${P_ARQ}', '${S_ARQ}', 'Arquivada', '${C_NADA}', null);
  `);
});

describe("fn_escale_lista_de_contatos", () => {
  it("o gerente vê os dois negócios da Ana; o agent A vê só o sem dono (RLS de crm_leads)", () => {
    expect(countAs(GOV_MANAGER, lista("todos", "listadois", `where contact_id = '${C_DOIS}' and negocios = 2`))).toBe(1);
    expect(countAs(GOV_AGENT_A, lista("todos", "listadois", `where contact_id = '${C_DOIS}' and negocios = 1`))).toBe(1);
  });

  it("negócio de origem arquivada não conta", () => {
    expect(countAs(GOV_MANAGER, lista("todos", "listadois", `where contact_id = '${C_NADA}' and negocios = 0`))).toBe(1);
  });

  it("com um negócio só, devolve o id dele", () => {
    expect(
      countAs(GOV_MANAGER, lista("todos", "listadois", `where contact_id = '${C_UM}' and negocio_unico = '${L_UM}'`)),
    ).toBe(1);
  });

  it("visões: todos (sem o pessoal), com negócio, sem negócio, pessoais", () => {
    expect(countAs(GOV_MANAGER, lista("todos", "listadois"))).toBe(3);
    expect(countAs(GOV_MANAGER, lista("com_negocio", "listadois"))).toBe(2);
    expect(countAs(GOV_MANAGER, lista("sem_negocio", "listadois"))).toBe(1);
    expect(countAs(GOV_MANAGER, lista("pessoais", "listadois"))).toBe(1);
  });

  it("o total vem em toda linha e não depende do limite", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'listadois', null, null, 1, 0) where total = 3`,
      ),
    ).toBe(1);
  });

  it("pagina: a segunda página de 2 tem 1 contato, na ordem da última atividade", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', 'listadois', null, null, 2, 2) where contact_id = '${C_NADA}'`,
      ),
    ).toBe(1);
  });

  it("acha pelos dígitos do telefone e pelo Instagram", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from public.fn_escale_lista_de_contatos('${GOV_ORG}', 'todos', null, array['64999446816'], null, 100, 0) where contact_id = '${C_DOIS}'`,
      ),
    ).toBe(1);
    expect(countAs(GOV_MANAGER, lista("todos", "listadoisbruno", `where contact_id = '${C_UM}'`))).toBe(1);
  });

  it("é invoker e o anon não executa", () => {
    expect(sql(`select prosecdef from pg_proc where proname = 'fn_escale_lista_de_contatos';`)).toBe("f");
    expect(
      sql(`select has_function_privilege('anon', 'public.fn_escale_lista_de_contatos(uuid,text,text,text[],text,integer,integer)', 'execute');`),
    ).toBe("f");
  });
});

describe("crm_colunas_das_listas", () => {
  const COLUNAS = `'{"itens":[]}'::jsonb`;

  it("a pessoa grava e lê a sua; outra pessoa não lê nem muda", () => {
    sql(`delete from public.crm_colunas_das_listas where organization_id = '${GOV_ORG}';`);
    expect(
      writeCountAs(
        GOV_VIEWER,
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'contatos', ${COLUNAS})`,
      ),
    ).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_colunas_das_listas where user_id = '${GOV_VIEWER}'`)).toBe(1);
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_colunas_das_listas where user_id = '${GOV_VIEWER}'`)).toBe(0);
    expect(
      writeCountAs(GOV_MANAGER, `update public.crm_colunas_das_listas set colunas = '{}'::jsonb where user_id = '${GOV_VIEWER}'`),
    ).toBe(0);
  });

  it("uma por pessoa e lista; nome de lista e tamanho validados; FK em cascata", () => {
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'contatos', ${COLUNAS});`,
      ),
    ).toThrow(/uq_crm_colunas_das_listas_pessoa/);
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'Contatos!', ${COLUNAS});`,
      ),
    ).toThrow(/crm_colunas_das_listas_lista_valida/);
    expect(() =>
      sql(
        `insert into public.crm_colunas_das_listas (organization_id, user_id, lista, colunas) values ('${GOV_ORG}', '${GOV_VIEWER}', 'empresas', jsonb_build_object('x', repeat('a', 5000)));`,
      ),
    ).toThrow(/crm_colunas_das_listas_colunas_tamanho/);
    expect(sql(`select confdeltype from pg_constraint where conname = 'crm_colunas_das_listas_pessoa_fk';`)).toBe("c");
  });
});
```

Antes de rodar, confira em `tests/invariants/escale-configuracoes-da-origem.test.ts` (linhas ~53–70) que os `insert` de `crm_pipelines`, `crm_stages` e `crm_leads` usam as mesmas colunas obrigatórias; se lá houver coluna a mais (por exemplo `settings` ou `group_id`), acrescente-a aqui. Confira também que `crm_pipelines.is_archived` existe (`grep -n "is_archived" supabase/baseline.sql | head`). O primeiro caso depende da regra de visibilidade da organização ser a padrão (`own_and_unassigned`): se o `seedGov` deixar `organizations.settings->>'visibility_mode'` como `'all'`, acrescente ao `beforeAll` um `update public.organizations set settings = coalesce(settings, '{}'::jsonb) || '{"visibility_mode":"own_and_unassigned"}'::jsonb where id = '${GOV_ORG}';` e devolva o valor antigo num `afterAll`.

- [ ] **Step 3: Rodar e ver falhar (em segundo plano)**

```bash
corepack pnpm test:db -- tests/invariants/escale-lista-de-contatos.test.ts > /tmp/2a-db.log 2>&1 &
```

Expected (ao terminar): FAIL — a função e a tabela não existem.

- [ ] **Step 4: A migration**

`supabase/migrations/20261030120000_9101_lista_de_contatos.sql`:

```sql
-- manifest: **Lista de contatos da casca (fork Escale, Fase 2A).** Tabela nova `crm_colunas_das_listas`: as colunas que cada PESSOA escolheu em "Personalizar colunas" de uma lista (`lista` = `contatos`; `empresas` na Fase 2D), como as preferências `contacts_table_columns` e `organizations_table_columns` da Clint; `colunas` é jsonb validado pela rota. Uma linha por pessoa, organização e lista. RLS: a pessoa vê e escreve só a sua, e escrever exige papel viewer ou acima (`fn_role_at_least`, cerca de RBAC da 0150). FK composta com `on delete cascade` para `user_organizations`. Função `fn_escale_lista_de_contatos` (security invoker): uma página da lista de contatos com o total e os negócios de cada contato, contados com a RLS de quem olha (origens não arquivadas), com a mesma busca da lista do original (padrão regex, dígitos do telefone, CPF) mais o link do Instagram.
-- 9101: lista de contatos da casca (fork Escale, Frente B).

create table if not exists public.crm_colunas_das_listas (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  lista text not null,
  colunas jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- Nome de lista curto e minúsculo; o conjunto (contatos, empresas) é da rota.
  constraint crm_colunas_das_listas_lista_valida check (lista ~ '^[a-z_]{1,30}$'),
  constraint crm_colunas_das_listas_colunas_objeto check (jsonb_typeof(colunas) = 'object'),
  constraint crm_colunas_das_listas_colunas_tamanho check (octet_length(colunas::text) <= 4096),
  constraint crm_colunas_das_listas_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create unique index if not exists uq_crm_colunas_das_listas_pessoa
  on public.crm_colunas_das_listas (organization_id, user_id, lista);
create index if not exists idx_crm_colunas_das_listas_pessoa
  on public.crm_colunas_das_listas (user_id, organization_id);

alter table public.crm_colunas_das_listas enable row level security;

drop policy if exists crm_colunas_das_listas_select on public.crm_colunas_das_listas;
drop policy if exists crm_colunas_das_listas_pessoa_write on public.crm_colunas_das_listas;

create policy crm_colunas_das_listas_select on public.crm_colunas_das_listas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids())) and user_id = auth.uid())
  );

create policy crm_colunas_das_listas_pessoa_write on public.crm_colunas_das_listas
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

revoke all on public.crm_colunas_das_listas from anon;
grant select, insert, update, delete on public.crm_colunas_das_listas to authenticated;
grant all on public.crm_colunas_das_listas to service_role;

drop trigger if exists trg_crm_colunas_das_listas_updated_at on public.crm_colunas_das_listas;
create trigger trg_crm_colunas_das_listas_updated_at
  before update on public.crm_colunas_das_listas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_colunas_das_listas is
  'Colunas de cada lista da casca por pessoa (fork Escale, migration 9101), como contacts_table_columns da Clint. Só a pessoa lê e escreve a sua.';

-- A página da lista: ids na ordem, o total e os negócios que QUEM OLHA enxerga.
-- Invoker de propósito: a RLS de contacts e de crm_leads (fn_can_view_lead) vale
-- como numa leitura comum; o agent conta só os seus negócios e os sem dono.
create or replace function public.fn_escale_lista_de_contatos(
  p_org uuid,
  p_visao text,
  p_padrao text,
  p_digitos text[],
  p_cpf_hash text,
  p_limite integer,
  p_deslocamento integer
)
returns table (contact_id uuid, total bigint, negocios integer, negocio_unico uuid)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  with visiveis as (
    select l.id, l.contact_id
      from public.crm_leads l
      join public.crm_pipelines p on p.id = l.pipeline_id
     where l.organization_id = p_org
       and l.contact_id is not null
       and not p.is_archived
  ),
  filtrados as (
    select c.id, c.last_activity_at
      from public.contacts c
     where c.organization_id = p_org
       and c.kind = 'person'
       and c.is_merged_into is null
       and c.is_personal = (p_visao = 'pessoais')
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
       and (
         p_visao in ('todos', 'pessoais')
         or (p_visao = 'com_negocio' and exists (select 1 from visiveis v where v.contact_id = c.id))
         or (p_visao = 'sem_negocio' and not exists (select 1 from visiveis v where v.contact_id = c.id))
       )
  ),
  pagina as (
    select f.id, f.last_activity_at, count(*) over () as total
      from filtrados f
     order by f.last_activity_at desc nulls last, f.id desc
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

revoke all on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) from public, anon;
grant execute on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) to authenticated, service_role;

comment on function public.fn_escale_lista_de_contatos(uuid, text, text, text[], text, integer, integer) is
  'Fork Escale (9101): uma página da lista de contatos da casca, com o total e os negócios (origens não arquivadas) que quem olha enxerga. Invoker.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

- [ ] **Step 5: O mesmo SQL no `baseline.sql`**

Ache o fim do bloco da 9007:

```bash
grep -n "^-- ---- " supabase/baseline.sql | grep -A1 "configurações da origem (migration 9007)"
```

A segunda linha impressa é o cabeçalho do bloco seguinte. Insira, **logo antes dela**, uma linha em branco, o cabeçalho `-- ---- FORK ESCALE · lista de contatos da casca (migration 9101) ----` e o conteúdo da migration **sem** a linha `-- manifest:` e **sem** o `notify pgrst` (siga o que os blocos 9005–9007 fazem: abra o bloco da 9005 com `sed -n '/FORK ESCALE · capa do card/,/FORK ESCALE · campos do CRM/p' supabase/baseline.sql | tail -15` e repita o mesmo fechamento).

- [ ] **Step 6: O teste de texto da migration**

`tests/unit/escale-lista-de-contatos-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const MIGRATION = readFileSync("supabase/migrations/20261030120000_9101_lista_de_contatos.sql", "utf8");
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");

describe("migration 9101 (lista de contatos da casca)", () => {
  it("a função é invoker, com search_path, e fechada ao anon", () => {
    expect(MIGRATION).toMatch(/fn_escale_lista_de_contatos[\s\S]*security invoker[\s\S]*set search_path = public, pg_temp/);
    expect(MIGRATION).toMatch(/revoke all on function public\.fn_escale_lista_de_contatos\([^)]*\) from public, anon;/);
  });

  it("a tabela tem RLS, as duas policies e as travas do suporte", () => {
    expect(MIGRATION).toContain("alter table public.crm_colunas_das_listas enable row level security;");
    expect(MIGRATION).toContain("create policy crm_colunas_das_listas_select");
    expect(MIGRATION).toContain("create policy crm_colunas_das_listas_pessoa_write");
    expect(MIGRATION).toContain("fn_aplicar_travas_de_suporte");
  });

  it("o baseline traz o mesmo bloco, depois do da 9007", () => {
    const i9007 = BASELINE.indexOf("FORK ESCALE · configurações da origem (migration 9007)");
    const i9101 = BASELINE.indexOf("FORK ESCALE · lista de contatos da casca (migration 9101)");
    expect(i9007).toBeGreaterThan(-1);
    expect(i9101).toBeGreaterThan(i9007);
    expect(BASELINE).toContain("create or replace function public.fn_escale_lista_de_contatos(");
    expect(BASELINE).toContain("create table if not exists public.crm_colunas_das_listas (");
  });
});
```

- [ ] **Step 7: Rodar e ver passar**

```bash
corepack pnpm vitest run tests/unit/escale-lista-de-contatos-migration.test.ts
corepack pnpm test:db -- tests/invariants/escale-lista-de-contatos.test.ts tests/invariants/rls-completude.test.ts tests/invariants/rbac-config-ia-canais.test.ts tests/invariants/travas-de-suporte.test.ts > /tmp/2a-db.log 2>&1 &
```

Para as três varreduras de definer, ache os arquivos com `ls tests/invariants | grep -i definer` e acrescente-os ao mesmo comando. Expected: PASS em todos. Se a `rls-completude` pedir a tabela numa lista de exceções ou de donos, siga o que a 9005 fez (`grep -rn "crm_capas_do_card" tests/invariants`).

- [ ] **Step 8: Revisor (subagente) e commit**

Peça ao revisor: RLS da tabela igual à da 9005, função invoker sem vazamento entre organizações, os índices usados (`idx_crm_leads_org_contact`, `idx_contacts_org_last_activity`), e o custo do `count(*) over ()` numa organização grande. Corrija o que ele achar e:

```bash
git add supabase/migrations/20261030120000_9101_lista_de_contatos.sql supabase/baseline.sql tests/invariants/escale-lista-de-contatos.test.ts tests/unit/escale-lista-de-contatos-migration.test.ts
git commit -m "feat(escale): migration 9101 — colunas das listas e função da lista de contatos (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: As rotas — página da lista e colunas da pessoa

**Files:**
- Create: `lib/escale/contatos/lista.ts`, `lib/escale/colunas/banco.ts`, `app/api/v1/lista-de-contatos/route.ts`, `app/api/v1/colunas-das-listas/route.ts`, `tests/unit/escale-lista-de-contatos-rotas.test.ts`

**Interfaces:**
- Consumes: `VISOES_DE_CONTATOS`, `POR_PAGINA`, `POR_PAGINA_PADRAO`, `colunasSchema`, `lerColunas`, `ItemDeColuna` (Task 1); a função e a tabela da Task 2.
- Produces:
  - `consultaDaListaSchema` (`q?`, `v`, `p`, `n`), `ConsultaDaLista`;
  - `parametrosDaBusca(busca?: string): { padrao: string | null; digitos: string[]; cpfHash: string | null; vazia: boolean }`;
  - `LinhaDeContato = { id; nome: string | null; display_name: string | null; telefone: string | null; email: string | null; instagram: string | null; tags: string[]; tem_foto: boolean; conversa_id: string | null; negocios: number; negocio_unico: string | null; status: "anonimizado" | "bloqueado" | "pessoal" | "ativo"; ultima_atividade: string | null; criado_em: string; origem: string; nascimento: string | null; links: Record<string, string> }`;
  - `PaginaDeContatos = { linhas: LinhaDeContato[]; total: number; pagina: number; porPagina: number }`;
  - `listarContatos(supabase, orgId, consulta): Promise<PaginaDeContatos>`;
  - `LISTAS_COM_COLUNAS = ["contatos", "empresas"] as const`, `ListaComColunas`;
  - `lerColunasDaPessoa(supabase, orgId, userId, lista): Promise<ItemDeColuna[]>`, `gravarColunasDaPessoa(supabase, orgId, userId, lista, itens): Promise<{ error: { code?: string; message?: string } | null }>`;
  - `GET /api/v1/lista-de-contatos?q&v&p&n` → `{ data: PaginaDeContatos }`;
  - `GET /api/v1/colunas-das-listas?lista=contatos` → `{ data: { itens: ItemDeColuna[] } }`; `PUT` com `{ lista, itens }` → o mesmo.

- [ ] **Step 1: O teste das rotas (falha)**

`tests/unit/escale-lista-de-contatos-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { GET as GET_COLUNAS, PUT as PUT_COLUNAS } from "@/app/api/v1/colunas-das-listas/route";
import { GET as GET_LISTA } from "@/app/api/v1/lista-de-contatos/route";
import { requireRole } from "@/lib/auth/require-role";
import { parametrosDaBusca } from "@/lib/escale/contatos/lista";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";
import { ORG_ID, USER_ID, authOk } from "@/tests/helpers/stages-db-double";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn() }));
vi.mock("@/lib/contacts/cpf", () => ({ hashCpf: (d: string) => `hash-${d}` }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));

type Resposta = { data: unknown; error: { code?: string; message: string } | null };

/** Um supabase de mentira: `rpc` devolve a página; `from(tabela)` devolve as linhas daquela tabela. */
function banco(opts: { rpc?: Resposta; tabelas?: Record<string, Resposta>; gravado?: unknown[] }) {
  const rpc = vi.fn().mockResolvedValue(opts.rpc ?? { data: [], error: null });
  const from = vi.fn((tabela: string) => {
    const resposta = opts.tabelas?.[tabela] ?? { data: [], error: null };
    const cadeia: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "order", "limit"]) cadeia[m] = vi.fn(() => cadeia);
    cadeia.maybeSingle = vi.fn().mockResolvedValue(resposta);
    cadeia.then = (ok: (r: Resposta) => unknown) => Promise.resolve(resposta).then(ok);
    cadeia.update = vi.fn((corpo: unknown) => {
      opts.gravado?.push({ update: corpo });
      return cadeia;
    });
    cadeia.insert = vi.fn((corpo: unknown) => {
      opts.gravado?.push({ insert: corpo });
      return Promise.resolve({ data: null, error: null });
    });
    return cadeia;
  });
  vi.mocked(createClient).mockResolvedValue({ rpc, from } as never);
  return { rpc, from };
}

const pedido = (url: string, init?: RequestInit) => new NextRequest(new URL(url, "http://x"), init as never);

beforeEach(() => {
  vi.mocked(requireRole).mockReset();
  vi.mocked(createClient).mockReset();
  vi.mocked(requireSupportWrite).mockResolvedValue(null as never);
  authOk("manager");
});

describe("parametrosDaBusca", () => {
  it("sem busca, tudo nulo", () => {
    expect(parametrosDaBusca(undefined)).toEqual({ padrao: null, digitos: [], cpfHash: null, vazia: false });
  });
  it("termo curto demais não consulta", () => {
    expect(parametrosDaBusca("a").vazia).toBe(true);
  });
  it("telefone de 11 dígitos gera variantes e o hash do CPF", () => {
    const p = parametrosDaBusca("64999446816");
    expect(p.padrao).not.toBeNull();
    expect(p.digitos.length).toBeGreaterThan(0);
    expect(p.cpfHash).toBe("hash-64999446816");
  });
});

describe("GET /api/v1/lista-de-contatos", () => {
  it("chama a função com a visão, a página e o tamanho, e monta as linhas na ordem dela", async () => {
    const { rpc } = banco({
      rpc: {
        data: [
          { contact_id: "c2", total: 12, negocios: 1, negocio_unico: "l9" },
          { contact_id: "c1", total: 12, negocios: 0, negocio_unico: null },
        ],
        error: null,
      },
      tabelas: {
        contacts: {
          data: [
            { id: "c1", name: "Ana", display_name: null, email: "a@x.com", phone_number: "+5564999446816", tags: ["vip"], custom_fields: { link_instagram: "https://instagram.com/ana" }, avatar_storage_path: "p/1.jpg", is_blocked: false, is_anonymized: false, is_personal: false, last_activity_at: null, created_at: "2026-10-01T10:00:00Z", source: "manual", birthdate: null },
            { id: "c2", name: null, display_name: "Bruno", email: null, phone_number: null, tags: [], custom_fields: {}, avatar_storage_path: null, is_blocked: true, is_anonymized: false, is_personal: false, last_activity_at: "2026-10-02T10:00:00Z", created_at: "2026-10-01T10:00:00Z", source: "whatsapp", birthdate: "1990-05-01" },
          ],
          error: null,
        },
        conversations: { data: [{ id: "cv1", contact_id: "c2" }], error: null },
      },
    });
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos?v=com_negocio&p=2&n=10"));
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("fn_escale_lista_de_contatos", {
      p_org: ORG_ID,
      p_visao: "com_negocio",
      p_padrao: null,
      p_digitos: [],
      p_cpf_hash: null,
      p_limite: 10,
      p_deslocamento: 10,
    });
    const corpo = (await res.json()) as { data: { total: number; linhas: Array<Record<string, unknown>> } };
    expect(corpo.data.total).toBe(12);
    expect(corpo.data.linhas.map((l) => l.id)).toEqual(["c2", "c1"]);
    expect(corpo.data.linhas[0]).toMatchObject({ negocio_unico: "l9", conversa_id: "cv1", status: "bloqueado", tem_foto: false });
    expect(corpo.data.linhas[1]).toMatchObject({ instagram: "ana", tem_foto: true, status: "ativo" });
    expect(JSON.stringify(corpo)).not.toContain("avatar_storage_path");
    expect(vi.mocked(requireRole).mock.calls.at(-1)?.[0]).toBe("viewer");
  });

  it("tamanho de página fora da lista é 422", async () => {
    banco({});
    expect((await GET_LISTA(pedido("/api/v1/lista-de-contatos?n=7"))).status).toBe(422);
  });

  it("busca curta demais devolve vazio sem chamar o banco", async () => {
    const { rpc } = banco({});
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos?q=a"));
    expect(rpc).not.toHaveBeenCalled();
    const corpo = (await res.json()) as { data: { total: number } };
    expect(corpo.data.total).toBe(0);
  });

  it("erro do banco é 500 sem a mensagem crua", async () => {
    banco({ rpc: { data: null, error: { code: "XX000", message: "falha em fn_escale_lista_de_contatos" } } });
    const res = await GET_LISTA(pedido("/api/v1/lista-de-contatos"));
    expect(res.status).toBe(500);
    expect(await res.text()).not.toContain("fn_escale");
  });
});

describe("/api/v1/colunas-das-listas", () => {
  it("GET sem preferência devolve o padrão", async () => {
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } } });
    const res = await GET_COLUNAS(pedido("/api/v1/colunas-das-listas?lista=contatos"));
    const corpo = (await res.json()) as { data: { itens: Array<{ chave: string }> } };
    expect(corpo.data.itens.map((i) => i.chave)).toEqual(["contato", "tags", "negocios"]);
  });

  it("GET com lista desconhecida é 422", async () => {
    banco({});
    expect((await GET_COLUNAS(pedido("/api/v1/colunas-das-listas?lista=leads"))).status).toBe(422);
  });

  it("PUT grava para a pessoa da sessão (insert quando não há linha)", async () => {
    const gravado: unknown[] = [];
    banco({ tabelas: { crm_colunas_das_listas: { data: null, error: null } }, gravado });
    const res = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", {
        method: "PUT",
        body: JSON.stringify({ lista: "contatos", itens: [{ tipo: "nativa", chave: "tags" }] }),
      }),
    );
    expect(res.status).toBe(200);
    expect(gravado).toEqual([
      { insert: { organization_id: ORG_ID, user_id: USER_ID, lista: "contatos", colunas: { itens: [{ tipo: "nativa", chave: "tags" }] } } },
    ]);
  });

  it("PUT com corpo inválido é 422; suporte somente leitura é barrado antes", async () => {
    banco({});
    const ruim = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", { method: "PUT", body: JSON.stringify({ lista: "contatos", itens: "x" }) }),
    );
    expect(ruim.status).toBe(422);
    vi.mocked(requireSupportWrite).mockResolvedValue(new Response(null, { status: 403 }) as never);
    const barrado = await PUT_COLUNAS(
      pedido("/api/v1/colunas-das-listas", { method: "PUT", body: JSON.stringify({ lista: "contatos", itens: [] }) }),
    );
    expect(barrado.status).toBe(403);
  });
});
```

Confira antes de rodar: `ORG_ID` e `USER_ID` são exportados por `tests/helpers/stages-db-double.ts` (`grep -n "export const ORG_ID\|export const USER_ID" tests/helpers/stages-db-double.ts`); se não forem, importe as constantes que o `authOk` usa.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-contatos-rotas.test.ts`
Expected: FAIL (os módulos não existem).

- [ ] **Step 3: A leitura da página**

`lib/escale/contatos/lista.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { z } from "zod";

import { phoneLookupVariants } from "@/lib/channels/phone-variants";
import { padraoRegexDeBusca } from "@/lib/contacts/busca-regex";
import { hashCpf } from "@/lib/contacts/cpf";
import { buscaValeConsulta } from "@/lib/inbox/termo-de-busca";
import { lerLinks } from "@/lib/leads/links-de-contato";

import { POR_PAGINA, POR_PAGINA_PADRAO, VISOES_DE_CONTATOS, instagramDoLink } from "./regras";

/**
 * A PÁGINA DA LISTA DE CONTATOS (fork Escale, Fase 2A) — servidor.
 *
 * A função `fn_escale_lista_de_contatos` (9101, invoker) devolve os ids da
 * página, o total e os negócios que quem olha enxerga; aqui se lê o resto das
 * colunas e a conversa mais recente, só para esses ids. A busca é a MESMA da
 * lista do original (`app/api/v1/contacts/_handler.ts`, ~L124–241): parênteses
 * fora, piso de `buscaValeConsulta`, padrão regex sem acento, variantes do
 * telefone com o 55 implícito e o hash do CPF com 11 dígitos.
 */
export const consultaDaListaSchema = z.object({
  q: z.string().max(200).optional(),
  v: z.enum(VISOES_DE_CONTATOS).default("todos"),
  p: z.coerce.number().int().min(1).max(1_000_000).default(1),
  n: z.coerce
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(POR_PAGINA_PADRAO),
});
export type ConsultaDaLista = z.output<typeof consultaDaListaSchema>;

export function parametrosDaBusca(busca: string | undefined) {
  if (!busca?.trim()) return { padrao: null, digitos: [] as string[], cpfHash: null, vazia: false };
  const termo = busca.replace(/[()]/g, " ");
  if (!buscaValeConsulta(termo)) return { padrao: null, digitos: [] as string[], cpfHash: null, vazia: true };
  const digits = busca.replace(/\D/g, "");
  const digitos: string[] = [];
  if (digits.length >= 8) {
    const base = !digits.startsWith("55") && (digits.length === 10 || digits.length === 11) ? `55${digits}` : digits;
    for (const v of phoneLookupVariants(base)) {
      const d = v.replace(/\D/g, "");
      if (d && d !== digits && !digitos.includes(d)) digitos.push(d);
    }
  }
  return {
    padrao: padraoRegexDeBusca(termo),
    digitos,
    cpfHash: digits.length === 11 ? hashCpf(digits) : null,
    vazia: false,
  };
}

export type StatusDaLinha = "anonimizado" | "bloqueado" | "pessoal" | "ativo";

export type LinhaDeContato = {
  id: string;
  nome: string | null;
  display_name: string | null;
  telefone: string | null;
  email: string | null;
  instagram: string | null;
  tags: string[];
  tem_foto: boolean;
  conversa_id: string | null;
  negocios: number;
  negocio_unico: string | null;
  status: StatusDaLinha;
  ultima_atividade: string | null;
  criado_em: string;
  origem: string;
  nascimento: string | null;
  links: Record<string, string>;
};

export type PaginaDeContatos = { linhas: LinhaDeContato[]; total: number; pagina: number; porPagina: number };

type LinhaDaFuncao = { contact_id: string; total: number | string; negocios: number; negocio_unico: string | null };
type ContatoLido = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  tags: string[] | null;
  custom_fields: Record<string, unknown> | null;
  avatar_storage_path: string | null;
  is_blocked: boolean;
  is_anonymized: boolean;
  is_personal: boolean;
  last_activity_at: string | null;
  created_at: string;
  source: string;
  birthdate: string | null;
};

const COLUNAS =
  "id, name, display_name, email, phone_number, tags, custom_fields, avatar_storage_path, is_blocked, is_anonymized, is_personal, last_activity_at, created_at, source, birthdate";

function statusDe(c: ContatoLido): StatusDaLinha {
  if (c.is_anonymized) return "anonimizado";
  if (c.is_blocked) return "bloqueado";
  if (c.is_personal) return "pessoal";
  return "ativo";
}

/** Lança o erro do banco (`{ code, message }`) para a rota tratar. */
export async function listarContatos(
  supabase: SupabaseClient,
  orgId: string,
  consulta: ConsultaDaLista,
): Promise<PaginaDeContatos> {
  const vazio: PaginaDeContatos = { linhas: [], total: 0, pagina: consulta.p, porPagina: consulta.n };
  const busca = parametrosDaBusca(consulta.q);
  if (busca.vazia) return vazio;

  const { data: pagina, error } = await supabase.rpc("fn_escale_lista_de_contatos", {
    p_org: orgId,
    p_visao: consulta.v,
    p_padrao: busca.padrao,
    p_digitos: busca.digitos,
    p_cpf_hash: busca.cpfHash,
    p_limite: consulta.n,
    p_deslocamento: (consulta.p - 1) * consulta.n,
  });
  if (error) throw error;
  const ordem = (pagina ?? []) as LinhaDaFuncao[];
  if (ordem.length === 0) return vazio;
  const ids = ordem.map((l) => l.contact_id);

  const [contatos, conversas] = await Promise.all([
    supabase.from("contacts").select(COLUNAS).eq("organization_id", orgId).in("id", ids),
    supabase
      .from("conversations")
      .select("id, contact_id")
      .eq("organization_id", orgId)
      .in("contact_id", ids)
      .order("last_message_at", { ascending: false, nullsFirst: false }),
  ]);
  if (contatos.error) throw contatos.error;
  if (conversas.error) throw conversas.error;

  const porId = new Map(((contatos.data ?? []) as ContatoLido[]).map((c) => [c.id, c]));
  const conversaDe = new Map<string, string>();
  for (const cv of (conversas.data ?? []) as Array<{ id: string; contact_id: string }>) {
    if (!conversaDe.has(cv.contact_id)) conversaDe.set(cv.contact_id, cv.id);
  }

  const linhas: LinhaDeContato[] = [];
  for (const l of ordem) {
    const c = porId.get(l.contact_id);
    if (!c) continue;
    const links = lerLinks(c.custom_fields ?? {}) as Record<string, string>;
    linhas.push({
      id: c.id,
      nome: c.name,
      display_name: c.display_name,
      telefone: c.phone_number,
      email: c.email,
      instagram: instagramDoLink(links.instagram ?? null),
      tags: c.tags ?? [],
      tem_foto: Boolean(c.avatar_storage_path) && !c.is_anonymized,
      conversa_id: conversaDe.get(c.id) ?? null,
      negocios: l.negocios,
      negocio_unico: l.negocio_unico,
      status: statusDe(c),
      ultima_atividade: c.last_activity_at,
      criado_em: c.created_at,
      origem: c.source,
      nascimento: c.birthdate,
      links,
    });
  }
  return { linhas, total: Number(ordem[0].total), pagina: consulta.p, porPagina: consulta.n };
}
```

Confira `lerLinks` (`lib/leads/links-de-contato.ts`): se ele devolve `{ instagram: "https://…" }` (chave = tipo), está certo; se devolve outra forma, adapte as duas linhas que usam `links` para obter o `href` do tipo `instagram` e um mapa `tipo → href`. O nome da coluna de conversa (`last_message_at`) é o mesmo do `withConversas` do original (`_handler.ts` ~L319).

- [ ] **Step 4: As colunas no banco**

`lib/escale/colunas/banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { type ItemDeColuna, lerColunas } from "@/lib/escale/contatos/regras";

/** As listas da casca que têm "Personalizar colunas" (fork Escale, 9101). Empresas chega na 2D. */
export const LISTAS_COM_COLUNAS = ["contatos", "empresas"] as const;
export type ListaComColunas = (typeof LISTAS_COM_COLUNAS)[number];

type ErroDoBanco = { code?: string; message?: string };

export async function lerColunasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComColunas,
): Promise<ItemDeColuna[]> {
  const { data, error } = await supabase
    .from("crm_colunas_das_listas")
    .select("colunas")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("lista", lista)
    .maybeSingle();
  if (error) throw error;
  return lerColunas((data as { colunas?: unknown } | null)?.colunas ?? null);
}

/** Lê antes e atualiza ou insere; o índice único barra duas abas ao mesmo tempo (23505). */
export async function gravarColunasDaPessoa(
  supabase: SupabaseClient,
  orgId: string,
  userId: string,
  lista: ListaComColunas,
  itens: ItemDeColuna[],
): Promise<{ error: ErroDoBanco | null }> {
  const colunas = { itens };
  const { data, error } = await supabase
    .from("crm_colunas_das_listas")
    .select("id")
    .eq("organization_id", orgId)
    .eq("user_id", userId)
    .eq("lista", lista)
    .maybeSingle();
  if (error) return { error };
  if (data) {
    const r = await supabase
      .from("crm_colunas_das_listas")
      .update({ colunas })
      .eq("id", (data as { id: string }).id);
    return { error: r.error };
  }
  const r = await supabase
    .from("crm_colunas_das_listas")
    .insert({ organization_id: orgId, user_id: userId, lista, colunas });
  return { error: r.error };
}
```

- [ ] **Step 5: As duas rotas**

`app/api/v1/lista-de-contatos/route.ts`:

```ts
/**
 * GET /api/v1/lista-de-contatos — uma página da lista de contatos da casca
 * (fork Escale, Fase 2A; função 9101). `organization_id` sai da sessão; a RLS
 * de quem olha decide os contatos e os negócios contados.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { consultaDaListaSchema, listarContatos } from "@/lib/escale/contatos/lista";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = consultaDaListaSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: lido.error.flatten(),
    });
  }
  try {
    return ok(await listarContatos(await createClient(), authz.org.orgId, lido.data), { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/lista-de-contatos", operacao: "ler a lista de contatos" },
      t,
      requestId,
    );
  }
}
```

`app/api/v1/colunas-das-listas/route.ts`:

```ts
/**
 * GET/PUT /api/v1/colunas-das-listas — as colunas que a pessoa escolheu em
 * "Personalizar colunas" (fork Escale, Fase 2A; migration 9101), como
 * `contacts_table_columns` da Clint. `organization_id` e `user_id` saem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { LISTAS_COM_COLUNAS, gravarColunasDaPessoa, lerColunasDaPessoa } from "@/lib/escale/colunas/banco";
import { colunasSchema, lerColunas } from "@/lib/escale/contatos/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/colunas-das-listas";
const listaSchema = z.enum(LISTAS_COM_COLUNAS);
const corpoSchema = colunasSchema.extend({ lista: listaSchema }).strict();

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_colunas_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lista = listaSchema.safeParse(req.nextUrl.searchParams.get("lista"));
  if (!lista.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  try {
    const itens = await lerColunasDaPessoa(await createClient(), authz.org.orgId, authz.user.id, lista.data);
    return ok({ itens }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: `GET ${ROTA}`, operacao: "ler as colunas" },
      t,
      requestId,
    );
  }
}

export async function PUT(req: NextRequest): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;

  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_colunas_das_listas" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = corpoSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, {
      requestId,
      details: parsed.error.flatten(),
    });
  }
  const itens = lerColunas({ itens: parsed.data.itens });
  const { error } = await gravarColunasDaPessoa(
    await createClient(),
    authz.org.orgId,
    authz.user.id,
    parsed.data.lista,
    itens,
  );
  if (error) {
    if (error.code === "23505") {
      return fail("state_conflict", t("A preferência mudou em outra aba. Abra de novo e salve."), 409, { requestId });
    }
    return falhaInesperadaDoQuadro(error, { rota: `PUT ${ROTA}`, operacao: "gravar as colunas" }, t, requestId);
  }
  await audit({
    action: "list_columns.updated",
    organizationId: authz.org.orgId,
    actorUserId: authz.user.id,
    resource: { type: "crm_colunas_das_listas", id: parsed.data.lista },
    requestId,
  });
  return ok({ itens }, { requestId });
}
```

Antes de rodar, abra `app/api/v1/capas-do-card/route.ts` (o fim do `PUT`) e copie a chamada de `audit(...)` de lá, trocando só a ação e o recurso: a assinatura de `audit` desta rota tem de ser a mesma daquela. Se o `audit` de lá não existir ou tiver outros campos, siga o de lá. No teste, `audit` não está mockado: se ele tentar gravar, acrescente `vi.mock("@/lib/audit", () => ({ audit: vi.fn() }))`.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-contatos-rotas.test.ts`
Expected: PASS.

- [ ] **Step 7: Guardas, typecheck, eslint, prettier, revisor e commit**

```bash
for f in lib/escale/contatos/lista.ts lib/escale/colunas/banco.ts app/api/v1/lista-de-contatos/route.ts app/api/v1/colunas-das-listas/route.ts; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint lib/escale/contatos lib/escale/colunas app/api/v1/lista-de-contatos app/api/v1/colunas-das-listas tests/unit/escale-lista-de-contatos-rotas.test.ts
corepack pnpm exec prettier --write lib/escale/contatos/lista.ts lib/escale/colunas/banco.ts app/api/v1/lista-de-contatos/route.ts app/api/v1/colunas-das-listas/route.ts tests/unit/escale-lista-de-contatos-rotas.test.ts
```

Rode também as cercas de rota do projeto que leem `app/api/**` (`ls tests/unit | grep -iE "rota|route|api-" | head -40` e escolha as que varrem todas as rotas, por exemplo as de `requireRole`, `requireSupportWrite` e erro cru). Revisor (subagente): papel exigido, `organization_id` só da sessão, nenhuma coluna sensível na resposta (`avatar_storage_path`, `cpf_hash`), erro sem mensagem crua. Depois:

```bash
git add lib/escale/contatos/lista.ts lib/escale/colunas/banco.ts app/api/v1/lista-de-contatos/route.ts app/api/v1/colunas-das-listas/route.ts tests/unit/escale-lista-de-contatos-rotas.test.ts
git commit -m "feat(escale): rotas da lista de contatos e das colunas por pessoa (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: Hooks e a paginação da casca

**Files:**
- Create: `hooks/escale/useListaDeContatos.ts`, `hooks/escale/useColunasDaLista.ts`, `components/escale/ui/PaginacaoDaCasca.tsx`, `tests/unit/escale-paginacao-da-casca.test.tsx`

**Interfaces:**
- Consumes: `PaginaDeContatos`, `ConsultaDaLista` (Task 3); `paginasVisiveis`, `totalDePaginas`, `POR_PAGINA`, `ItemDeColuna` (Task 1).
- Produces:
  - `useListaDeContatos(consulta: { q?: string; v: VisaoDeContatos; p: number; n: number })` → `UseQueryResult<PaginaDeContatos>`; queryKey `["contacts", "lista-da-casca", consulta]` (cai no prefixo `["contacts"]` que toda escrita de contato invalida);
  - `useColunasDaLista(lista: ListaComColunas)` → `{ itens: ItemDeColuna[]; carregando: boolean }`; `useSalvarColunasDaLista(lista)` → `useMutation<ItemDeColuna[], Error, ItemDeColuna[]>`;
  - `PaginacaoDaCasca({ pagina, total, porPagina, aoMudarPagina, aoMudarPorPagina, opcoesPorPagina })`.

- [ ] **Step 1: O teste da paginação (falha)**

`tests/unit/escale-paginacao-da-casca.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const base = {
  total: 64001,
  porPagina: 10,
  opcoesPorPagina: [10, 25, 50, 100] as const,
  aoMudarPagina: vi.fn(),
  aoMudarPorPagina: vi.fn(),
};

describe("PaginacaoDaCasca (03-001)", () => {
  it("mostra 1–4, reticências e a última; a atual marcada", () => {
    render(<PaginacaoDaCasca {...base} pagina={1} />);
    for (const n of ["1", "2", "3", "4", "6401"]) expect(screen.getByRole("button", { name: n })).toBeInTheDocument();
    expect(screen.getByText("…")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "1" })).toHaveAttribute("aria-current", "page");
  });

  it("Anterior desligado na primeira; Próximo leva à 2", () => {
    const aoMudarPagina = vi.fn();
    render(<PaginacaoDaCasca {...base} pagina={1} aoMudarPagina={aoMudarPagina} />);
    expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Próximo" }));
    expect(aoMudarPagina).toHaveBeenCalledWith(2);
  });

  it("Próximo desligado na última", () => {
    render(<PaginacaoDaCasca {...base} pagina={6401} />);
    expect(screen.getByRole("button", { name: "Próximo" })).toBeDisabled();
  });

  it("o seletor mostra '10 por página' e troca o tamanho", () => {
    const aoMudarPorPagina = vi.fn();
    render(<PaginacaoDaCasca {...base} pagina={1} aoMudarPorPagina={aoMudarPorPagina} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Por página" }));
    fireEvent.click(screen.getByRole("option", { name: "25 por página" }));
    expect(aoMudarPorPagina).toHaveBeenCalledWith(25);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-paginacao-da-casca.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A paginação**

`components/escale/ui/PaginacaoDaCasca.tsx`:

```tsx
"use client";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { paginasVisiveis, totalDePaginas } from "@/lib/escale/contatos/regras";
import { cn } from "@/lib/utils";

/**
 * A PAGINAÇÃO DA CASCA (fork Escale, Fase 2A; captura 03-001): "N por página" à
 * esquerda; "Anterior", as páginas e "Próximo" à direita. Páginas de 32×32 com
 * borda; a atual cheia na cor da marca. Reaproveitada pela lista de empresas (2D).
 */
export function PaginacaoDaCasca({
  pagina,
  total,
  porPagina,
  opcoesPorPagina,
  aoMudarPagina,
  aoMudarPorPagina,
}: {
  pagina: number;
  total: number;
  porPagina: number;
  opcoesPorPagina: readonly number[];
  aoMudarPagina: (pagina: number) => void;
  aoMudarPorPagina: (porPagina: number) => void;
}) {
  const t = useT();
  const ultima = totalDePaginas(total, porPagina);
  const opcoes = opcoesPorPagina.map((n) => ({ valor: String(n), rotulo: `${n} ${t("por página")}` }));
  const passo = "inline-flex h-8 items-center rounded-casca-gatilho px-3 text-[13px] font-medium text-casca-texto transition-colors hover:bg-casca-raia disabled:pointer-events-none disabled:text-casca-meta";

  return (
    <div className="flex h-[50px] items-center justify-between gap-4">
      <SeletorDaCasca
        valor={String(porPagina)}
        opcoes={opcoes}
        aoMudar={(v) => v && aoMudarPorPagina(Number(v))}
        aria-label={t("Por página")}
        className="h-8 w-[180px]"
      />
      <nav aria-label={t("Paginação")} className="flex items-center gap-2">
        <button type="button" className={passo} disabled={pagina <= 1} onClick={() => aoMudarPagina(pagina - 1)}>
          {t("Anterior")}
        </button>
        {paginasVisiveis(pagina, ultima).map((item, i) =>
          item === "…" ? (
            <span key={`r${i}`} className="px-1 text-[13px] text-casca-suave">
              …
            </span>
          ) : (
            <button
              key={item}
              type="button"
              aria-current={item === pagina ? "page" : undefined}
              onClick={() => aoMudarPagina(item)}
              className={cn(
                "inline-flex h-8 min-w-8 items-center justify-center rounded-casca-gatilho border px-2 text-[13px] font-medium transition-colors",
                item === pagina
                  ? "border-casca-marca bg-casca-marca text-white"
                  : "border-casca-borda bg-surface text-casca-texto hover:bg-casca-raia",
              )}
            >
              {item}
            </button>
          ),
        )}
        <button type="button" className={passo} disabled={pagina >= ultima} onClick={() => aoMudarPagina(pagina + 1)}>
          {t("Próximo")}
        </button>
      </nav>
    </div>
  );
}
```

Confira no `SeletorDaCasca` que o gatilho tem `role="combobox"` com o `aria-label` e que as opções são `role="option"` com o rótulo como nome (o comentário do arquivo diz que sim). Se o teste não achar, ajuste o teste aos papéis que o componente expõe, sem mudar o componente.

- [ ] **Step 4: Os hooks**

`hooks/escale/useListaDeContatos.ts`:

```ts
"use client";
import { keepPreviousData, useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { PaginaDeContatos } from "@/lib/escale/contatos/lista";
import type { VisaoDeContatos } from "@/lib/escale/contatos/regras";

export type ConsultaDaTela = { q?: string; v: VisaoDeContatos; p: number; n: number };

/**
 * A página da lista de contatos da casca (fork Escale, Fase 2A). A chave começa
 * por `["contacts"]`: toda escrita de contato do original (criar, editar,
 * excluir, juntar) já invalida esse prefixo, e a lista se refaz sozinha.
 */
export function useListaDeContatos(consulta: ConsultaDaTela) {
  return useQuery({
    queryKey: ["contacts", "lista-da-casca", consulta],
    queryFn: async () => {
      const qs = new URLSearchParams({ v: consulta.v, p: String(consulta.p), n: String(consulta.n) });
      if (consulta.q?.trim()) qs.set("q", consulta.q.trim());
      const res = await apiClient.get<{ data: PaginaDeContatos }>(`/api/v1/lista-de-contatos?${qs}`);
      return res.data;
    },
    placeholderData: keepPreviousData,
    staleTime: 15_000,
  });
}
```

`hooks/escale/useColunasDaLista.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { ListaComColunas } from "@/lib/escale/colunas/banco";
import { COLUNAS_PADRAO, type ItemDeColuna } from "@/lib/escale/contatos/regras";

const chave = (lista: ListaComColunas) => ["colunas-da-lista", lista] as const;

/** As colunas que a pessoa escolheu (fork Escale, Fase 2A). Enquanto carrega, o padrão. */
export function useColunasDaLista(lista: ListaComColunas) {
  const q = useQuery({
    queryKey: chave(lista),
    queryFn: async () =>
      (await apiClient.get<{ data: { itens: ItemDeColuna[] } }>(`/api/v1/colunas-das-listas?lista=${lista}`)).data.itens,
    staleTime: 5 * 60_000,
  });
  return { itens: q.data ?? COLUNAS_PADRAO, carregando: q.isLoading };
}

export function useSalvarColunasDaLista(lista: ListaComColunas) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (itens: ItemDeColuna[]) =>
      (await apiClient.put<{ data: { itens: ItemDeColuna[] } }>("/api/v1/colunas-das-listas", { lista, itens })).data
        .itens,
    onMutate: (itens) => {
      const antes = qc.getQueryData<ItemDeColuna[]>(chave(lista));
      qc.setQueryData(chave(lista), itens);
      return { antes };
    },
    onError: (_e, _itens, ctx) => qc.setQueryData(chave(lista), ctx?.antes),
    onSuccess: (itens) => qc.setQueryData(chave(lista), itens),
  });
}
```

`lib/escale/colunas/banco.ts` importa `SupabaseClient` só como tipo, mas o hook importa `ListaComColunas` dele: confirme que o import é `import type` para não levar código de servidor ao cliente.

- [ ] **Step 5: Rodar, typecheck, eslint, prettier e commit**

```bash
corepack pnpm vitest run tests/unit/escale-paginacao-da-casca.test.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint hooks/escale/useListaDeContatos.ts hooks/escale/useColunasDaLista.ts components/escale/ui/PaginacaoDaCasca.tsx tests/unit/escale-paginacao-da-casca.test.tsx
corepack pnpm exec prettier --write hooks/escale/useListaDeContatos.ts hooks/escale/useColunasDaLista.ts components/escale/ui/PaginacaoDaCasca.tsx tests/unit/escale-paginacao-da-casca.test.tsx
git add hooks/escale/useListaDeContatos.ts hooks/escale/useColunasDaLista.ts components/escale/ui/PaginacaoDaCasca.tsx tests/unit/escale-paginacao-da-casca.test.tsx
git commit -m "feat(escale): hooks da lista de contatos e paginação da casca (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 5: A tabela — linha, células e o ⋮

**Files:**
- Create: `components/escale/contatos/FotoDaLinha.tsx`, `components/escale/contatos/CelulasDoContato.tsx`, `components/escale/contatos/MenuDaLinha.tsx`, `components/escale/contatos/TabelaDeContatos.tsx`, `tests/unit/escale-tabela-de-contatos.test.tsx`
- Modify: `components/escale/quadro/PecasDoCard.tsx` (exportar `ChipDaTag`), `lib/ui/icons-da-casca.ts` (ícones novos no fim: `AtSign`, `Instagram`, `GripVertical`, `TriangleAlert` se ainda não houver — confira a lista antes)

**Interfaces:**
- Consumes: `LinhaDeContato` (Task 3); `ItemDeColuna`, `ROTULO_DA_COLUNA`, `CAMPOS_DO_CONTATO_2A`, `formatarTelefone` (Task 1); do original: `nomeDoContato` (`lib/contacts/rotulo-do-contato`), `useConversaNovaComEscolhaDeCanal` (`components/channels/SeletorDeCanalParaConversa`), `EditContactDialog` (`components/contacts/EditContactDialog`), `useDeleteContact` e `mensagemDeBloqueioPorVinculo` (`hooks/contacts/useDeleteContact`), `useContact` (`hooks/contacts/useContact`); da casca: `CaixaDaCasca`, `corDoAvatar`, `inicialDoNome` (`lib/escale/quadro/aparencia`), `ChipDaTag`.
- Produces:
  - `TabelaDeContatos({ linhas, colunas, carregando, erro, aoTentarDeNovo, podeVerNegocios, podeExcluir, aoAdicionarNegocio })`;
  - `MenuDaLinha({ linha, podeExcluir })`.

- [ ] **Step 1: O teste da tabela (falha)**

`tests/unit/escale-tabela-de-contatos.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, within } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

import { TabelaDeContatos } from "@/components/escale/contatos/TabelaDeContatos";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/components/channels/SeletorDeCanalParaConversa", () => ({
  useConversaNovaComEscolhaDeCanal: () => ({ iniciarConversa: vi.fn(), abrindo: false, seletor: null }),
}));
vi.mock("@/components/tags/CoresDasEtiquetas", () => ({ useCorDaEtiqueta: () => null }));

const linha = (extra: Partial<LinhaDeContato>): LinhaDeContato => ({
  id: "c1",
  nome: "Karoll",
  display_name: null,
  telefone: "+5564999446816",
  email: "karoll@exemplo.com",
  instagram: null,
  tags: ["calculadora"],
  tem_foto: false,
  conversa_id: null,
  negocios: 1,
  negocio_unico: "l1",
  status: "ativo",
  ultima_atividade: null,
  criado_em: "2026-10-01T10:00:00Z",
  origem: "manual",
  nascimento: null,
  links: {},
  ...extra,
});

const envolver = (ui: ReactNode) =>
  render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

const props = {
  colunas: COLUNAS_PADRAO,
  carregando: false,
  erro: false,
  aoTentarDeNovo: vi.fn(),
  podeVerNegocios: true,
  podeExcluir: true,
  aoAdicionarNegocio: vi.fn(),
};

describe("TabelaDeContatos (03-001)", () => {
  it("cabeçalho NOME, CONTATO, TAGS, NEGÓCIOS e a caixinha desligada 'Em breve'", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({})]} />);
    for (const r of ["Nome", "Contato", "Tags", "Negócios"]) {
      expect(screen.getByRole("columnheader", { name: r })).toBeInTheDocument();
    }
    expect(screen.getAllByRole("checkbox")[0]).toBeDisabled();
    expect(screen.getAllByTitle("Em breve").length).toBeGreaterThan(0);
  });

  it("linha: nome leva ao contato, telefone no formato BR, e-mail, tag e 'Ver 1 negócio' leva ao negócio", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({})]} />);
    const row = screen.getByRole("row", { name: /Karoll/ });
    expect(within(row).getByRole("link", { name: "Karoll" })).toHaveAttribute("href", "/app/contacts/c1");
    expect(within(row).getByText("(64) 99944-6816")).toBeInTheDocument();
    expect(within(row).getByText("karoll@exemplo.com")).toBeInTheDocument();
    expect(within(row).getByText("calculadora")).toBeInTheDocument();
    expect(within(row).getByRole("link", { name: "Ver 1 negócio" })).toHaveAttribute("href", "/app/leads/l1");
    expect(within(row).getByRole("link", { name: "Chamar" })).toHaveAttribute("href", "tel:+5564999446816");
  });

  it("dois negócios levam à página do contato; nenhum mostra 'Adicionar negócio'", () => {
    envolver(
      <TabelaDeContatos
        {...props}
        linhas={[
          linha({ id: "c2", nome: "Bruno", negocios: 2, negocio_unico: null }),
          linha({ id: "c3", nome: "Carla", negocios: 0, negocio_unico: null }),
        ]}
      />,
    );
    expect(screen.getByRole("link", { name: "Ver 2 negócios" })).toHaveAttribute("href", "/app/contacts/c2");
    const carla = screen.getByRole("row", { name: /Carla/ });
    within(carla).getByRole("button", { name: "Adicionar negócio" }).click();
    expect(props.aoAdicionarNegocio).toHaveBeenCalledWith(expect.objectContaining({ id: "c3" }));
  });

  it("sem permissão de negócio, a coluna Negócios não tem botões", () => {
    envolver(<TabelaDeContatos {...props} podeVerNegocios={false} linhas={[linha({})]} />);
    expect(screen.queryByRole("link", { name: "Ver 1 negócio" })).not.toBeInTheDocument();
  });

  it("Instagram aparece com @; conversa existente vira 'Abrir em Conversas'", () => {
    envolver(<TabelaDeContatos {...props} linhas={[linha({ instagram: "dapenhamaria", conversa_id: "cv1" })]} />);
    expect(screen.getByText("dapenhamaria")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Abrir em Conversas" })).toHaveAttribute("href", "/app/inbox?id=cv1");
  });

  it("vazio e erro com os textos da Clint", () => {
    const { rerender } = envolver(<TabelaDeContatos {...props} linhas={[]} />);
    expect(screen.getByText("Não foram encontrados contatos.")).toBeInTheDocument();
    expect(screen.getByText("Tente ajustar a busca ou os filtros.")).toBeInTheDocument();
    rerender(
      <QueryClientProvider client={new QueryClient()}>
        <TabelaDeContatos {...props} linhas={[]} erro />
      </QueryClientProvider>,
    );
    expect(screen.getByText("Não foi possível carregar os contatos.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Tentar novamente" })).toBeInTheDocument();
  });

  it("colunas escolhidas: Status e um link aparecem, na ordem", () => {
    envolver(
      <TabelaDeContatos
        {...props}
        colunas={[
          { tipo: "nativa", chave: "status" },
          { tipo: "campo", chave: "link_site" },
        ]}
        linhas={[linha({ links: { site: "https://exemplo.com" } })]}
      />,
    );
    const titulos = screen.getAllByRole("columnheader").map((th) => th.textContent);
    expect(titulos.slice(1, 4)).toEqual(["Nome", "Status", expect.any(String)]);
  });
});
```

O rótulo do link do site sai de `TIPOS_DE_LINK` (por isso `expect.any(String)`); a chave `link_site` só vale se o tipo `site` existir lá — confira e troque pelo id real do tipo de site, se for outro.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-tabela-de-contatos.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Exportar o chip e os ícones**

Em `components/escale/quadro/PecasDoCard.tsx`, troque `function ChipDaTag(` por `export function ChipDaTag(` (o resto fica). Em `lib/ui/icons-da-casca.ts`, acrescente no fim uma linha `// Fase 2A` com os ícones que ainda não estão na lista (`grep -n "AtSign\|Instagram\|GripVertical\|TriangleAlert\|Users" lib/ui/icons-da-casca.ts` antes; não repita nome):

```ts
// Fase 2A (lista de contatos)
export { AtSign, Instagram, GripVertical } from "lucide-react";
```

- [ ] **Step 4: A foto, as células e o ⋮**

`components/escale/contatos/FotoDaLinha.tsx`:

```tsx
"use client";
import { useState } from "react";

import { corDoAvatar, inicialDoNome } from "@/lib/escale/quadro/aparencia";

/** A foto redonda de 32px da linha (03-001); sem foto, a inicial na cor do contato. */
export function FotoDaLinha({ id, nome, temFoto }: { id: string; nome: string; temFoto: boolean }) {
  const [falhou, setFalhou] = useState(false);
  if (temFoto && !falhou) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- a rota de avatar devolve um redirect assinado
      <img
        src={`/api/v1/contacts/${id}/avatar`}
        alt=""
        className="size-8 shrink-0 rounded-full object-cover"
        onError={() => setFalhou(true)}
      />
    );
  }
  return (
    <span
      aria-hidden
      className="grid size-8 shrink-0 place-items-center rounded-full text-[13px] font-medium text-white"
      style={{ backgroundColor: corDoAvatar(id) }}
    >
      {inicialDoNome(nome)}
    </span>
  );
}
```

`components/escale/contatos/CelulasDoContato.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { useConversaNovaComEscolhaDeCanal } from "@/components/channels/SeletorDeCanalParaConversa";
import { ChipDaTag } from "@/components/escale/quadro/PecasDoCard";
import { useT } from "@/hooks/i18n/useT";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { CAMPOS_DO_CONTATO_2A, type ItemDeColuna, formatarTelefone } from "@/lib/escale/contatos/regras";
import { AtSign, Mail, MessageCircle, Phone } from "@/lib/ui/icons-da-casca";

const MAXIMO_DE_TAGS = 6;
const dataBr = (iso: string | null) => (iso ? new Date(iso).toLocaleDateString("pt-BR") : "—");

/** Telefone com ligar e WhatsApp no hover da linha, e-mail e Instagram embaixo (Clint `n:contact`). */
export function CelulaContato({ linha }: { linha: LinhaDeContato }) {
  const t = useT();
  const router = useRouter();
  const { iniciarConversa, seletor } = useConversaNovaComEscolhaDeCanal({
    aoAbrir: (id) => router.push(`/app/inbox?id=${id}`),
  });
  const acao = "grid size-5 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-marca-suave";
  return (
    <div className="grid gap-1">
      {linha.telefone && (
        <div className="flex items-center gap-2">
          <Phone size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="text-[12px] font-medium text-casca-texto">{formatarTelefone(linha.telefone)}</span>
          <span className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
            <a href={`tel:${linha.telefone}`} aria-label={t("Chamar")} title={t("Chamar")} className={acao}>
              <Phone size={14} aria-hidden />
            </a>
            {linha.conversa_id ? (
              <Link
                href={`/app/inbox?id=${linha.conversa_id}`}
                aria-label={t("Abrir em Conversas")}
                title={t("Abrir em Conversas")}
                className={acao}
              >
                <MessageCircle size={14} aria-hidden />
              </Link>
            ) : (
              <button
                type="button"
                aria-label={t("Abrir WhatsApp")}
                title={t("Abrir WhatsApp")}
                className={acao}
                onClick={() => iniciarConversa({ contact_id: linha.id, phone_number: linha.telefone ?? undefined })}
              >
                <MessageCircle size={14} aria-hidden />
              </button>
            )}
          </span>
          {seletor}
        </div>
      )}
      {linha.email && (
        <div className="flex items-center gap-2">
          <Mail size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="truncate text-[12px] text-casca-texto">{linha.email}</span>
        </div>
      )}
      {linha.instagram && (
        <div className="flex items-center gap-2">
          <AtSign size={12} aria-hidden className="shrink-0 text-casca-meta" />
          <span className="text-[12px] text-casca-texto">{linha.instagram}</span>
        </div>
      )}
    </div>
  );
}

export function CelulaTags({ tags }: { tags: string[] }) {
  const resto = tags.length - MAXIMO_DE_TAGS;
  return (
    <div className="flex flex-wrap items-center gap-1">
      {tags.slice(0, MAXIMO_DE_TAGS).map((tag) => (
        <ChipDaTag key={tag} tag={tag} />
      ))}
      {resto > 0 && (
        <span title={tags.slice(MAXIMO_DE_TAGS).join(", ")} className="text-[11px] font-medium text-casca-suave">
          +{resto}
        </span>
      )}
    </div>
  );
}

/** "Ver N negócio(s)" (contorno na cor da marca) ou "Adicionar negócio" (contorno cinza). */
export function CelulaNegocios({
  linha,
  aoAdicionar,
}: {
  linha: LinhaDeContato;
  aoAdicionar: (linha: LinhaDeContato) => void;
}) {
  const t = useT();
  const botao = "inline-flex h-6 items-center rounded-casca-gatilho border px-2.5 text-[12px] font-medium transition-colors";
  if (linha.negocios > 0) {
    const rotulo = `${t("Ver")} ${linha.negocios} ${linha.negocios === 1 ? t("negócio") : t("negócios")}`;
    const href = linha.negocios === 1 && linha.negocio_unico ? `/app/leads/${linha.negocio_unico}` : `/app/contacts/${linha.id}`;
    return (
      <Link href={href} className={`${botao} border-casca-marca text-casca-marca hover:bg-casca-marca-suave`}>
        {rotulo}
      </Link>
    );
  }
  return (
    <button type="button" onClick={() => aoAdicionar(linha)} className={`${botao} border-casca-borda text-casca-texto hover:bg-casca-raia`}>
      {t("Adicionar negócio")}
    </button>
  );
}

const ROTULO_DO_STATUS = { anonimizado: "Anonimizado", bloqueado: "Bloqueado", pessoal: "Pessoal", ativo: "Ativo" } as const;

/** As colunas extras ("Colunas" e "Campos do contato" do 03-002). */
export function CelulaExtra({ item, linha }: { item: ItemDeColuna; linha: LinhaDeContato }) {
  const t = useT();
  const texto = (v: string) => <span className="text-[12px] text-casca-texto">{v}</span>;
  if (item.tipo === "nativa") {
    if (item.chave === "status") return texto(t(ROTULO_DO_STATUS[linha.status]));
    if (item.chave === "ultima_atividade") return texto(dataBr(linha.ultima_atividade));
    if (item.chave === "criado_em") return texto(dataBr(linha.criado_em));
    if (item.chave === "origem") return texto(linha.origem);
    return null;
  }
  if (item.chave === "nascimento") return texto(linha.nascimento ? dataBr(`${linha.nascimento}T12:00:00`) : "—");
  const tipo = item.chave.replace(/^link_/, "");
  const href = linha.links[tipo];
  return href ? (
    <a href={href} target="_blank" rel="noopener noreferrer" className="truncate text-[12px] text-casca-marca hover:underline">
      {href}
    </a>
  ) : (
    texto("—")
  );
}

export function rotuloDoItem(item: ItemDeColuna, t: (s: string) => string, rotulos: Record<string, string>): string {
  if (item.tipo === "nativa") return t(rotulos[item.chave]);
  const campo = CAMPOS_DO_CONTATO_2A.find((c) => c.chave === item.chave);
  return campo ? t(campo.rotulo) : item.chave;
}
```

Os rótulos de `TIPOS_DE_LINK` ("Instagram", "Site"…) já passam por `t()` no original? Confira com `grep -n "rotulo" lib/leads/links-de-contato.ts` e com o dicionário: se não tiverem espanhol, entram no bloco da Task 8.

`components/escale/contatos/MenuDaLinha.tsx`:

```tsx
"use client";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { EditContactDialog } from "@/components/contacts/EditContactDialog";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { Popover, PopoverAnchor, PopoverContent } from "@/components/ui/popover";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useContact } from "@/hooks/contacts/useContact";
import { mensagemDeBloqueioPorVinculo, useDeleteContact } from "@/hooks/contacts/useDeleteContact";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { EllipsisVertical, Pencil, Trash2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O ⋮ DA LINHA (Clint `bt-row-menu-v2`): "Editar" e, para quem pode excluir,
 * "Excluir" em vermelho com a confirmação em balão da Clint. Antes de confirmar,
 * a checagem de Agenda do original (`/vinculos`): contato com compromisso não
 * se exclui, e o aviso do original explica.
 */
export function MenuDaLinha({ linha, podeExcluir }: { linha: LinhaDeContato; podeExcluir: boolean }) {
  const t = useT();
  const [editando, setEditando] = useState(false);
  const [confirmando, setConfirmando] = useState(false);
  const excluir = useDeleteContact();
  const contato = useContact(editando ? linha.id : null);
  const vinculos = useQuery({
    queryKey: ["contato-vinculos-para-excluir", linha.id],
    queryFn: () =>
      apiClient.get<{ data: { vinculos: string[]; por_tabela: Record<string, number> } }>(
        `/api/v1/contacts/${linha.id}/vinculos`,
      ),
    enabled: confirmando,
  });
  const bloqueio = vinculos.data ? mensagemDeBloqueioPorVinculo(vinculos.data.data, t) : null;

  const confirmar = () =>
    excluir.mutate(linha.id, {
      onSuccess: () => {
        setConfirmando(false);
        toast.success(t("Contato excluído."));
      },
      onError: () => toast.error(t("Não foi possível excluir o contato.")),
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
        <PopoverContent side="top" className="w-72 rounded-[8px] p-4 text-[13px] text-casca-texto shadow-casca-painel">
          {bloqueio ? (
            <p>{bloqueio}</p>
          ) : (
            <>
              <p>{t("Tem certeza que deseja excluir o contato selecionado?")}</p>
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
                  disabled={excluir.isPending || vinculos.isLoading}
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
        <EditContactDialog contact={contato.data} open onOpenChange={(v) => !v && setEditando(false)} />
      )}
    </>
  );
}
```

Confira antes: (0) se `components/ui/popover` exporta `PopoverAnchor`; se não, use `import * as PopoverPrimitive from "@radix-ui/react-popover"` e `<PopoverPrimitive.Anchor asChild>` no mesmo lugar (não exporte nada novo do arquivo do original); (1) a assinatura de `useContact` (`hooks/contacts/useContact.ts`) — se ele não aceita `null` para desligar, passe o id e um `enabled` do jeito que ele aceita; o que importa é buscar o contato completo só quando "Editar" é escolhido; (2) `mensagemDeBloqueioPorVinculo(details, t)` — use o mesmo argumento que `components/contacts/ContactsTable.tsx` (~L145–178) passa; (3) se `useDeleteContact` já mostra o toast de sucesso ou de 409, não repita o toast aqui (siga o que o `ContactsTable` faz); (4) os nomes `CONTEUDO_DO_MENU` e `ITEM_DO_MENU` de `components/escale/menu/estilos.ts`.

- [ ] **Step 5: A tabela**

`components/escale/contatos/TabelaDeContatos.tsx`:

```tsx
"use client";
import Link from "next/link";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { type ItemDeColuna, ROTULO_DA_COLUNA, chaveDoItem } from "@/lib/escale/contatos/regras";
import { ChevronDown } from "@/lib/ui/icons-da-casca";

import { CelulaContato, CelulaExtra, CelulaNegocios, CelulaTags, rotuloDoItem } from "./CelulasDoContato";
import { FotoDaLinha } from "./FotoDaLinha";
import { MenuDaLinha } from "./MenuDaLinha";

const TH = "h-[52px] px-3 text-left text-[11px] font-semibold uppercase tracking-[0.08em] text-casca-texto";
const TD = "px-3 align-middle";

/**
 * A TABELA DE CONTATOS (Clint `ContactsTableV2`, captura 03-001). "Nome" é
 * fixa; as outras seguem as colunas da pessoa. A caixinha aparece desligada
 * (a seleção é da 2B), como a Clint mostra a quem não tem `CONTACT_BULK_ACTIONS`.
 */
export function TabelaDeContatos({
  linhas,
  colunas,
  carregando,
  erro,
  aoTentarDeNovo,
  podeVerNegocios,
  podeExcluir,
  aoAdicionarNegocio,
}: {
  linhas: LinhaDeContato[];
  colunas: ItemDeColuna[];
  carregando: boolean;
  erro: boolean;
  aoTentarDeNovo: () => void;
  podeVerNegocios: boolean;
  podeExcluir: boolean;
  aoAdicionarNegocio: (linha: LinhaDeContato) => void;
}) {
  const t = useT();
  const visiveis = colunas.filter((c) => !(c.tipo === "nativa" && c.chave === "negocios" && !podeVerNegocios));
  const largura = visiveis.length + 3;

  const corpo = () => {
    if (carregando && linhas.length === 0) {
      return Array.from({ length: 6 }, (_, i) => (
        <tr key={i} className="h-16 border-b border-casca-borda">
          <td colSpan={largura} className="px-3">
            <div className="h-4 w-1/3 animate-pulse rounded-casca-gatilho bg-casca-raia" />
          </td>
        </tr>
      ));
    }
    if (erro) {
      return (
        <tr>
          <td colSpan={largura} className="py-16 text-center">
            <p className="text-[14px] font-medium text-casca-texto">{t("Não foi possível carregar os contatos.")}</p>
            <p className="mt-1 text-[13px] text-casca-suave">{t("Tente novamente em instantes.")}</p>
            <button
              type="button"
              onClick={aoTentarDeNovo}
              className="mt-4 h-8 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              {t("Tentar novamente")}
            </button>
          </td>
        </tr>
      );
    }
    if (linhas.length === 0) {
      return (
        <tr>
          <td colSpan={largura} className="py-16 text-center">
            <p className="text-[14px] font-medium text-casca-texto">{t("Não foram encontrados contatos.")}</p>
            <p className="mt-1 text-[13px] text-casca-suave">{t("Tente ajustar a busca ou os filtros.")}</p>
          </td>
        </tr>
      );
    }
    return linhas.map((linha) => {
      const nome = nomeDoContato({ name: linha.nome, display_name: linha.display_name, phone_number: linha.telefone }) ?? t("Sem nome");
      return (
        <tr key={linha.id} aria-label={nome} className="group h-16 border-b border-casca-borda hover:bg-casca-raia">
          <td className={`${TD} w-10`}>
            <CaixaDaCasca marcada={false} aoMudar={() => {}} aria-label={t("Selecionar contato")} desabilitada />
          </td>
          <td className={`${TD} min-w-[240px]`}>
            <div className="flex items-center gap-3">
              <FotoDaLinha id={linha.id} nome={nome} temFoto={linha.tem_foto} />
              <Link href={`/app/contacts/${linha.id}`} className="truncate text-[14px] font-medium text-casca-texto hover:underline">
                {nome}
              </Link>
            </div>
          </td>
          {visiveis.map((item) => (
            <td key={chaveDoItem(item)} className={`${TD} ${item.tipo === "nativa" && item.chave === "negocios" ? "w-40" : "min-w-[200px]"}`}>
              {item.tipo === "nativa" && item.chave === "contato" ? (
                <CelulaContato linha={linha} />
              ) : item.tipo === "nativa" && item.chave === "tags" ? (
                <CelulaTags tags={linha.tags} />
              ) : item.tipo === "nativa" && item.chave === "negocios" ? (
                <CelulaNegocios linha={linha} aoAdicionar={aoAdicionarNegocio} />
              ) : (
                <CelulaExtra item={item} linha={linha} />
              )}
            </td>
          ))}
          <td className={`${TD} w-10 text-right`}>
            <MenuDaLinha linha={linha} podeExcluir={podeExcluir} />
          </td>
        </tr>
      );
    });
  };

  return (
    <table className="w-full border-collapse">
      <thead>
        <tr className="border-b border-casca-borda">
          <th className={`${TH} w-10`} title={t("Em breve")}>
            <span className="flex items-center gap-1">
              <CaixaDaCasca marcada={false} aoMudar={() => {}} aria-label={t("Selecionar todos")} desabilitada />
              <ChevronDown size={12} aria-hidden className="text-casca-meta" />
            </span>
          </th>
          <th className={TH}>{t("Nome")}</th>
          {visiveis.map((item) => (
            <th key={chaveDoItem(item)} className={TH}>
              {rotuloDoItem(item, t, ROTULO_DA_COLUNA)}
            </th>
          ))}
          <th className={`${TH} w-10`}>
            <span className="sr-only">{t("Ações")}</span>
          </th>
        </tr>
      </thead>
      <tbody>{corpo()}</tbody>
    </table>
  );
}
```

Confira que `CaixaDaCasca` aceita `desabilitada` e põe `disabled` no controle (o relatório da casca diz que sim). A cerca `controle-decorativo` lê `<Button>` do original; a caixinha desligada fica com o `title="Em breve"` do cabeçalho e, na linha, ganha o mesmo `title` se a cerca reclamar.

- [ ] **Step 6: Rodar, guardas, typecheck, eslint, prettier e commit**

```bash
corepack pnpm vitest run tests/unit/escale-tabela-de-contatos.test.tsx
for f in components/escale/quadro/PecasDoCard.tsx lib/ui/icons-da-casca.ts; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u | xargs corepack pnpm vitest run
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint components/escale/contatos components/escale/quadro/PecasDoCard.tsx lib/ui/icons-da-casca.ts tests/unit/escale-tabela-de-contatos.test.tsx
corepack pnpm exec prettier --write components/escale/contatos/FotoDaLinha.tsx components/escale/contatos/CelulasDoContato.tsx components/escale/contatos/MenuDaLinha.tsx components/escale/contatos/TabelaDeContatos.tsx tests/unit/escale-tabela-de-contatos.test.tsx
git add components/escale/contatos components/escale/quadro/PecasDoCard.tsx lib/ui/icons-da-casca.ts tests/unit/escale-tabela-de-contatos.test.tsx
git commit -m "feat(escale): tabela da lista de contatos com células e menu da linha (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 6: "Personalizar colunas"

**Files:**
- Create: `components/escale/contatos/PainelDeColunas.tsx`, `tests/unit/escale-painel-de-colunas.test.tsx`

**Interfaces:**
- Consumes: `ItemDeColuna`, `COLUNAS_NATIVAS`, `ROTULO_DA_COLUNA`, `CAMPOS_DO_CONTATO_2A`, `COLUNAS_PADRAO`, `chaveDoItem`, `mesmasColunas` (Task 1); `rotuloDoItem` (Task 5); `InterruptorDaCasca`, `PainelSuspenso`.
- Produces: `PainelDeColunas({ itens, aoMudar }: { itens: ItemDeColuna[]; aoMudar: (itens: ItemDeColuna[]) => void })` — o botão (sliders + selo com a contagem) e o painel.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-painel-de-colunas.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PainelDeColunas } from "@/components/escale/contatos/PainelDeColunas";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

const abrir = () => fireEvent.click(screen.getByRole("button", { name: "Personalizar colunas" }));

describe("PainelDeColunas (03-002)", () => {
  it("o botão mostra a contagem; o painel tem os três grupos", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} />);
    expect(screen.getByRole("button", { name: "Personalizar colunas" })).toHaveTextContent("3");
    abrir();
    expect(screen.getByText("Na tabela · 3")).toBeInTheDocument();
    expect(screen.getByText("arraste para reordenar")).toBeInTheDocument();
    expect(screen.getByText("Colunas")).toBeInTheDocument();
    expect(screen.getByText("Campos do contato")).toBeInTheDocument();
  });

  it("desligar Tags tira a coluna; ligar Status põe no fim", () => {
    const aoMudar = vi.fn();
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} />);
    abrir();
    fireEvent.click(screen.getByRole("switch", { name: "Tags" }));
    expect(aoMudar).toHaveBeenLastCalledWith([
      { tipo: "nativa", chave: "contato" },
      { tipo: "nativa", chave: "negocios" },
    ]);
    fireEvent.click(screen.getByRole("switch", { name: "Status" }));
    expect(aoMudar).toHaveBeenLastCalledWith([...COLUNAS_PADRAO, { tipo: "nativa", chave: "status" }]);
  });

  it("a busca filtra; sem resultado mostra 'Nada encontrado.'", () => {
    render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={vi.fn()} />);
    abrir();
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), { target: { value: "nasc" } });
    expect(screen.getByRole("switch", { name: "Data de nascimento" })).toBeInTheDocument();
    expect(screen.queryByRole("switch", { name: "Tags" })).not.toBeInTheDocument();
    fireEvent.change(screen.getByPlaceholderText("Buscar coluna ou campo"), { target: { value: "zzz" } });
    expect(screen.getByText("Nada encontrado.")).toBeInTheDocument();
  });

  it("'Redefinir' só aparece fora do padrão e volta ao padrão", () => {
    const aoMudar = vi.fn();
    const { rerender } = render(<PainelDeColunas itens={COLUNAS_PADRAO} aoMudar={aoMudar} />);
    abrir();
    expect(screen.queryByRole("button", { name: "Redefinir" })).not.toBeInTheDocument();
    rerender(<PainelDeColunas itens={[{ tipo: "nativa", chave: "tags" }]} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("button", { name: "Redefinir" }));
    expect(aoMudar).toHaveBeenLastCalledWith(COLUNAS_PADRAO);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-painel-de-colunas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O painel**

`components/escale/contatos/PainelDeColunas.tsx`:

```tsx
"use client";
import { DragDropContext, Draggable, Droppable, type DropResult } from "@hello-pangea/dnd";
import { type ReactNode, useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DO_CONTATO_2A,
  COLUNAS_NATIVAS,
  COLUNAS_PADRAO,
  type ItemDeColuna,
  ROTULO_DA_COLUNA,
  chaveDoItem,
  mesmasColunas,
} from "@/lib/escale/contatos/regras";
import { ChevronDown, GripVertical, Search, SlidersHorizontal, User, X } from "@/lib/ui/icons-da-casca";

import { rotuloDoItem } from "./CelulasDoContato";

/**
 * "PERSONALIZAR COLUNAS" (Clint `contactsColumnsPicker`, captura 03-002):
 * busca; "Na tabela · N" com alça para arrastar; "Colunas" (as nativas fora da
 * tabela); "Campos do contato"; "Redefinir" só fora do padrão. Cada mudança
 * chama `aoMudar` com a lista nova (quem chama grava).
 */
export function PainelDeColunas({ itens, aoMudar }: { itens: ItemDeColuna[]; aoMudar: (itens: ItemDeColuna[]) => void }) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [fechados, setFechados] = useState<Record<string, boolean>>({});
  const casa = (rotulo: string) => rotulo.toLocaleLowerCase("pt-BR").includes(busca.trim().toLocaleLowerCase("pt-BR"));
  const naTabela = new Set(itens.map(chaveDoItem));

  const nativasFora: ItemDeColuna[] = COLUNAS_NATIVAS.filter((c) => !naTabela.has(`nativa:${c}`)).map((chave) => ({
    tipo: "nativa",
    chave,
  }));
  const camposFora: ItemDeColuna[] = CAMPOS_DO_CONTATO_2A.filter((c) => !naTabela.has(`campo:${c.chave}`)).map((c) => ({
    tipo: "campo",
    chave: c.chave,
  }));
  const rotulo = (item: ItemDeColuna) => rotuloDoItem(item, t, ROTULO_DA_COLUNA);

  const tirar = (item: ItemDeColuna) => aoMudar(itens.filter((i) => chaveDoItem(i) !== chaveDoItem(item)));
  const por = (item: ItemDeColuna) => aoMudar([...itens, item]);
  const soltar = (r: DropResult) => {
    if (!r.destination || r.destination.index === r.source.index) return;
    const nova = [...itens];
    const [movido] = nova.splice(r.source.index, 1);
    nova.splice(r.destination.index, 0, movido);
    aoMudar(nova);
  };

  const cabecaDoGrupo = (id: string, titulo: string, extra?: string) => (
    <button
      type="button"
      onClick={() => setFechados((f) => ({ ...f, [id]: !f[id] }))}
      className="flex w-full items-center gap-2 px-1 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.06em] text-casca-texto"
    >
      <ChevronDown size={12} aria-hidden className={fechados[id] ? "-rotate-90" : ""} />
      {titulo}
      {extra && <span className="font-normal normal-case tracking-normal text-casca-suave">· {extra}</span>}
    </button>
  );
  const linha = (item: ItemDeColuna, ligado: boolean, alca?: ReactNode) => (
    <div className="flex h-8 items-center gap-2 px-1">
      {alca}
      <span className="flex-1 truncate text-[13px] text-casca-texto">{rotulo(item)}</span>
      <InterruptorDaCasca ligado={ligado} aoMudar={() => (ligado ? tirar(item) : por(item))} aria-label={rotulo(item)} />
    </div>
  );

  const fixasVisiveis = itens.filter((i) => casa(rotulo(i)));
  const nativasVisiveis = nativasFora.filter((i) => casa(rotulo(i)));
  const camposVisiveis = camposFora.filter((i) => casa(rotulo(i)));
  const nada = fixasVisiveis.length + nativasVisiveis.length + camposVisiveis.length === 0;

  return (
    <Popover>
      <PopoverTrigger
        aria-label={t("Personalizar colunas")}
        title={t("Personalizar colunas")}
        className="flex h-8 items-center gap-1.5 rounded-casca-gatilho px-1.5 text-casca-suave hover:bg-casca-raia"
      >
        <SlidersHorizontal size={17} aria-hidden />
        <span className="grid size-5 place-items-center rounded-full bg-casca-raia text-[11px] font-semibold text-casca-texto">
          {itens.length}
        </span>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[334px] p-0">
        <div className="flex items-center gap-2 border-b border-casca-borda px-4 py-3">
          <span className="text-[14px] font-medium text-casca-texto">{t("Personalizar colunas")}</span>
          <span className="grid size-5 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white">
            {itens.length}
          </span>
          {!mesmasColunas(itens, COLUNAS_PADRAO) && (
            <button type="button" onClick={() => aoMudar(COLUNAS_PADRAO)} className="ml-auto text-[12px] font-medium text-casca-marca hover:underline">
              {t("Redefinir")}
            </button>
          )}
        </div>
        <div className="p-3">
          <label className="flex h-8 items-center gap-2 rounded-casca-gatilho bg-casca-busca px-3">
            <Search size={14} aria-hidden className="text-casca-meta" />
            <input
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              placeholder={t("Buscar coluna ou campo")}
              className="w-full bg-transparent text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
            />
            {busca && (
              <button type="button" aria-label={t("Fechar")} onClick={() => setBusca("")}>
                <X size={12} aria-hidden />
              </button>
            )}
          </label>
        </div>
        <div className="max-h-[400px] overflow-y-auto px-3 pb-3">
          {nada && <p className="py-6 text-center text-[13px] text-casca-suave">{t("Nada encontrado.")}</p>}
          {fixasVisiveis.length > 0 && (
            <section>
              {cabecaDoGrupo("tabela", `${t("Na tabela")} · ${itens.length}`, t("arraste para reordenar"))}
              {!fechados.tabela && (
                <DragDropContext onDragEnd={soltar}>
                  <Droppable droppableId="colunas-na-tabela" isDropDisabled={busca.trim() !== ""}>
                    {(p) => (
                      <div ref={p.innerRef} {...p.droppableProps}>
                        {fixasVisiveis.map((item, i) => (
                          <Draggable key={chaveDoItem(item)} draggableId={chaveDoItem(item)} index={i} isDragDisabled={busca.trim() !== ""}>
                            {(d) => (
                              <div ref={d.innerRef} {...d.draggableProps}>
                                {linha(
                                  item,
                                  true,
                                  <span {...d.dragHandleProps} aria-label={t("arraste para reordenar")} className="cursor-grab text-casca-meta">
                                    <GripVertical size={14} aria-hidden />
                                  </span>,
                                )}
                              </div>
                            )}
                          </Draggable>
                        ))}
                        {p.placeholder}
                      </div>
                    )}
                  </Droppable>
                </DragDropContext>
              )}
            </section>
          )}
          {nativasVisiveis.length > 0 && (
            <section className="mt-2 border-t border-casca-borda pt-1">
              {cabecaDoGrupo("colunas", t("Colunas"))}
              {!fechados.colunas && nativasVisiveis.map((item) => <div key={chaveDoItem(item)}>{linha(item, false)}</div>)}
            </section>
          )}
          {camposVisiveis.length > 0 && (
            <section className="mt-2 border-t border-casca-borda pt-1">
              <div className="flex items-center gap-1">
                <User size={12} aria-hidden className="text-casca-meta" />
                {cabecaDoGrupo("campos", t("Campos do contato"))}
              </div>
              {!fechados.campos && camposVisiveis.map((item) => <div key={chaveDoItem(item)}>{linha(item, false)}</div>)}
            </section>
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
```

O índice do arraste usa a lista inteira (`itens`) porque, com a busca ligada, o arraste fica desligado. `InterruptorDaCasca` precisa expor `role="switch"` com o `aria-label`: confira; se ele usa outro papel, ajuste o teste ao papel real.

- [ ] **Step 4: Rodar, typecheck, eslint, prettier e commit**

```bash
corepack pnpm vitest run tests/unit/escale-painel-de-colunas.test.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint components/escale/contatos/PainelDeColunas.tsx tests/unit/escale-painel-de-colunas.test.tsx
corepack pnpm exec prettier --write components/escale/contatos/PainelDeColunas.tsx tests/unit/escale-painel-de-colunas.test.tsx
git add components/escale/contatos/PainelDeColunas.tsx tests/unit/escale-painel-de-colunas.test.tsx
git commit -m "feat(escale): personalizar colunas da lista de contatos (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: Novo contato, novo negócio e o selo de mescla

**Files:**
- Create: `components/escale/contatos/CamposDaOportunidade.tsx`, `components/escale/contatos/JanelaNovoContato.tsx`, `components/escale/contatos/JanelaNovoNegocio.tsx`, `components/escale/contatos/MenuNovoContato.tsx`, `components/escale/contatos/SeloDeMescla.tsx`, `tests/unit/escale-janela-novo-contato.test.tsx`

**Interfaces:**
- Consumes: `telefoneE164`, `linkDoInstagram`, `PAISES_DO_TELEFONE` (Task 1); `LinhaDeContato` (Task 3); do original: `useCreateContact` (`hooks/contacts/useCreateContact`), `useContactDuplicates` (`hooks/contacts/useContactDuplicates`), `MergeDialog` (`components/contacts/MergeDialog`), `ImportContactsDialog` (`components/contacts/ImportContactsDialog`), `apiClient`; da casca: `JanelaDaCasca`, `CabecaDaJanela`, `Campo`, `CampoDeTexto`, `BotaoDaJanela`, `RodapeDaJanela`, `SeletorDaCasca`, `CaixaDaCasca`, `BotaoDaCasca`.
- Produces:
  - `OrigemParaCriar = { id: string; nome: string; etapas: Array<{ id: string; nome: string }> }`;
  - `CamposDaOportunidade({ origens, origemId, etapaId, aoMudar })`;
  - `JanelaNovoContato({ aberta, aoFechar, origens })`;
  - `JanelaNovoNegocio({ contato, aoFechar, origens })` (`contato: LinhaDeContato | null`; aberta quando não é null);
  - `MenuNovoContato({ origens, podeCriar })`;
  - `SeloDeMescla()`.

- [ ] **Step 1: O teste (falha)**

`tests/unit/escale-janela-novo-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaNovoContato } from "@/components/escale/contatos/JanelaNovoContato";
import { apiClient } from "@/lib/api/client";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/lib/api/client", () => ({ apiClient: { get: vi.fn(), post: vi.fn() } }));

const ORIGENS = [{ id: "o1", nome: "Leads INSS", etapas: [{ id: "e1", nome: "Entrada" }] }];
const envolver = (ui: ReactNode) => render(<QueryClientProvider client={new QueryClient()}>{ui}</QueryClientProvider>);

beforeEach(() => {
  vi.mocked(apiClient.get).mockReset().mockResolvedValue({ data: [] } as never);
  vi.mocked(apiClient.post).mockReset();
});

describe("JanelaNovoContato (C1)", () => {
  it("título, campos e o botão da Clint", () => {
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    expect(screen.getByRole("heading", { name: "Informações do contato" })).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Digite o nome do contato")).toBeInTheDocument();
    expect(screen.getByPlaceholderText("Ex: @escaleia")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar contato" })).toBeInTheDocument();
  });

  it("sem nome não grava", async () => {
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Informe o nome do contato.")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("grava nome, telefone E.164, e-mail e Instagram como link", async () => {
    vi.mocked(apiClient.post).mockResolvedValue({ data: { contact: { id: "c9" }, action: "created" } } as never);
    const aoFechar = vi.fn();
    envolver(<JanelaNovoContato aberta aoFechar={aoFechar} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "(64) 99944-6816" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "maria@exemplo.com" } });
    fireEvent.change(screen.getByPlaceholderText("Ex: @escaleia"), { target: { value: "@mariap" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(1));
    expect(apiClient.post).toHaveBeenCalledWith("/api/v1/contacts", {
      source: "manual",
      name: "Maria",
      phone_number: "+5564999446816",
      email: "maria@exemplo.com",
      custom_fields: { link_instagram: "https://instagram.com/mariap" },
    });
    await waitFor(() => expect(aoFechar).toHaveBeenCalled());
  });

  it("e-mail já usado é barrado antes de gravar", async () => {
    vi.mocked(apiClient.get).mockResolvedValue({ data: [{ id: "c1", email: "maria@exemplo.com" }] } as never);
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Email"), { target: { value: "Maria@exemplo.com" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Email já cadastrado")).toBeInTheDocument();
    expect(apiClient.post).not.toHaveBeenCalled();
  });

  it("telefone repetido (409 contact_exists) vira 'Telefone já cadastrado'", async () => {
    vi.mocked(apiClient.post).mockRejectedValue(Object.assign(new Error("x"), { status: 409, code: "contact_exists" }));
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Maria" } });
    fireEvent.change(screen.getByLabelText("Telefone"), { target: { value: "64999446816" } });
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Telefone já cadastrado")).toBeInTheDocument();
  });

  it("com oportunidade marcada, exige origem e etapa e cria o negócio com o contato", async () => {
    vi.mocked(apiClient.post)
      .mockResolvedValueOnce({ data: { contact: { id: "c9" }, action: "created" } } as never)
      .mockResolvedValueOnce({ data: { id: "l9" } } as never);
    envolver(<JanelaNovoContato aberta aoFechar={vi.fn()} origens={ORIGENS} />);
    fireEvent.change(screen.getByPlaceholderText("Digite o nome do contato"), { target: { value: "Maria" } });
    fireEvent.click(screen.getByRole("checkbox", { name: "Desejo criar uma oportunidade de negócio" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    expect(await screen.findByText("Escolha a origem e a etapa.")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS" }));
    fireEvent.click(screen.getByRole("combobox", { name: "Etapa" }));
    fireEvent.click(screen.getByRole("option", { name: "Entrada" }));
    fireEvent.click(screen.getByRole("button", { name: "Adicionar contato" }));
    await waitFor(() => expect(apiClient.post).toHaveBeenCalledTimes(2));
    expect(apiClient.post).toHaveBeenLastCalledWith("/api/v1/leads", {
      pipeline_id: "o1",
      stage_id: "e1",
      title: "Maria",
      contact_id: "c9",
      source: "manual",
    });
  });
});
```

Antes de rodar, confira em `lib/api/client.ts` como um erro HTTP chega ao `catch` (o objeto lançado tem `status` e `code`? `body.error.code`?). Ajuste o `mockRejectedValue` e o teste de 409 da janela à forma real; o que importa é reconhecer `contact_exists`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-janela-novo-contato.test.tsx`
Expected: FAIL.

- [ ] **Step 3: Origem e etapa**

`components/escale/contatos/CamposDaOportunidade.tsx`:

```tsx
"use client";
import { Campo } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";

export type OrigemParaCriar = { id: string; nome: string; etapas: Array<{ id: string; nome: string }> };

/** Origem* e Etapa* (Clint `NewContactModal` com "Desejo criar uma oportunidade"; também a janela de novo negócio). */
export function CamposDaOportunidade({
  origens,
  origemId,
  etapaId,
  aoMudar,
}: {
  origens: OrigemParaCriar[];
  origemId: string;
  etapaId: string;
  aoMudar: (v: { origemId: string; etapaId: string }) => void;
}) {
  const t = useT();
  const origem = origens.find((o) => o.id === origemId);
  return (
    <>
      <Campo rotulo={t("Origem")} obrigatorio>
        <SeletorDaCasca
          aparencia="janela"
          valor={origemId}
          opcoes={origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(v) => aoMudar({ origemId: v, etapaId: "" })}
          aria-label={t("Origem")}
          vazio={t("Selecione")}
          vazioSoNoGatilho
        />
      </Campo>
      <Campo rotulo={t("Etapa")} obrigatorio>
        <SeletorDaCasca
          aparencia="janela"
          valor={etapaId}
          opcoes={(origem?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }))}
          aoMudar={(v) => aoMudar({ origemId, etapaId: v })}
          aria-label={t("Etapa")}
          vazio={t("Selecione")}
          vazioSoNoGatilho
          desabilitado={!origem}
          dica={origem ? undefined : t("Escolha a origem primeiro.")}
        />
      </Campo>
    </>
  );
}
```

- [ ] **Step 4: A janela de novo contato**

`components/escale/contatos/JanelaNovoContato.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { PAISES_DO_TELEFONE, linkDoInstagram, telefoneE164 } from "@/lib/escale/contatos/regras";

import { CamposDaOportunidade, type OrigemParaCriar } from "./CamposDaOportunidade";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function codigoDoErro(err: unknown): string | null {
  const e = err as { code?: string; body?: { error?: { code?: string } } };
  return e?.code ?? e?.body?.error?.code ?? null;
}

/**
 * A JANELA "NOVO CONTATO" DA CLINT (`NewContactModal`, Fase 2A, C1): Nome*,
 * Email, Telefone (país + número), Instagram e "Desejo criar uma oportunidade de
 * negócio" (Origem* e Etapa*). Grava pelas rotas do original: o contato em
 * `POST /api/v1/contacts` e, se marcado, o negócio em `POST /api/v1/leads`.
 * Sem print da janela: o desenho segue a `JanelaDaCasca` (01-013).
 */
export function JanelaNovoContato({
  aberta,
  aoFechar,
  origens,
}: {
  aberta: boolean;
  aoFechar: () => void;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const qc = useQueryClient();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [ddi, setDdi] = useState<string>(PAISES_DO_TELEFONE[0].ddi);
  const [numero, setNumero] = useState("");
  const [instagram, setInstagram] = useState("");
  const [comNegocio, setComNegocio] = useState(false);
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [erro, setErro] = useState<string | null>(null);
  const [gravando, setGravando] = useState(false);

  const limpar = () => {
    setNome("");
    setEmail("");
    setNumero("");
    setInstagram("");
    setComNegocio(false);
    setDestino({ origemId: "", etapaId: "" });
    setErro(null);
  };
  const fechar = () => {
    limpar();
    aoFechar();
  };

  async function adicionar() {
    setErro(null);
    const nomeLimpo = nome.trim();
    if (!nomeLimpo) return setErro(t("Informe o nome do contato."));
    const emailLimpo = email.trim();
    if (emailLimpo && !EMAIL.test(emailLimpo)) return setErro(t("E-mail deve ser válido"));
    const telefone = numero.trim() ? telefoneE164(ddi, numero) : null;
    if (numero.trim() && !telefone) return setErro(t("O telefone informado está inválido."));
    const link = linkDoInstagram(instagram);
    if (link === false) return setErro(t("Instagram inválido."));
    if (comNegocio && (!destino.origemId || !destino.etapaId)) return setErro(t("Escolha a origem e a etapa."));

    setGravando(true);
    try {
      if (emailLimpo) {
        const achados = await apiClient.get<{ data: Array<{ email: string | null }> }>(
          `/api/v1/contacts?search=${encodeURIComponent(emailLimpo)}&limit=5`,
        );
        if (achados.data.some((c) => c.email?.toLowerCase() === emailLimpo.toLowerCase())) {
          setErro(t("Email já cadastrado"));
          return;
        }
      }
      const corpo: Record<string, unknown> = { source: "manual", name: nomeLimpo };
      if (telefone) corpo.phone_number = telefone;
      if (emailLimpo) corpo.email = emailLimpo;
      if (link) corpo.custom_fields = { link_instagram: link };
      let contatoId: string;
      try {
        const criado = await apiClient.post<{ data: { contact: { id: string } } }>("/api/v1/contacts", corpo);
        contatoId = criado.data.contact.id;
      } catch (err) {
        setErro(codigoDoErro(err) === "contact_exists" ? t("Telefone já cadastrado") : t("Não foi possível criar o contato."));
        return;
      }
      let negocioId: string | null = null;
      if (comNegocio) {
        try {
          const negocio = await apiClient.post<{ data: { id: string } }>("/api/v1/leads", {
            pipeline_id: destino.origemId,
            stage_id: destino.etapaId,
            title: nomeLimpo,
            contact_id: contatoId,
            source: "manual",
          });
          negocioId = negocio.data.id;
        } catch {
          toast.error(t("O contato foi criado, mas o negócio não."));
        }
      }
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("Contato criado com sucesso!"), {
        description: negocioId ? (
          <Link href={`/app/leads/${negocioId}`} className="font-medium underline">
            {t("Ver novo negócio")}
          </Link>
        ) : undefined,
      });
      fechar();
    } finally {
      setGravando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Informações do contato")} />
      <form
        className="grid gap-4"
        onSubmit={(e) => {
          e.preventDefault();
          void adicionar();
        }}
      >
        <Campo rotulo={t("Nome")} obrigatorio>
          <CampoDeTexto value={nome} onChange={(e) => setNome(e.target.value)} placeholder={t("Digite o nome do contato")} />
        </Campo>
        <Campo rotulo={t("Email")}>
          <CampoDeTexto aria-label={t("Email")} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </Campo>
        <Campo rotulo={t("Telefone")}>
          <div className="flex gap-2">
            <SeletorDaCasca
              aparencia="janela"
              valor={ddi}
              opcoes={PAISES_DO_TELEFONE.map((p) => ({ valor: p.ddi, rotulo: `${p.sigla} +${p.ddi}` }))}
              aoMudar={(v) => v && setDdi(v)}
              aria-label={t("País")}
              className="w-[110px] shrink-0"
            />
            <CampoDeTexto aria-label={t("Telefone")} inputMode="tel" value={numero} onChange={(e) => setNumero(e.target.value)} />
          </div>
        </Campo>
        <Campo rotulo={t("Instagram")}>
          <CampoDeTexto value={instagram} onChange={(e) => setInstagram(e.target.value)} placeholder={t("Ex: @escaleia")} />
        </Campo>
        <CaixaDaCasca
          marcada={comNegocio}
          aoMudar={(v) => setComNegocio(v === true)}
          rotulo={t("Desejo criar uma oportunidade de negócio")}
        />
        {comNegocio && (
          <CamposDaOportunidade
            origens={origens}
            origemId={destino.origemId}
            etapaId={destino.etapaId}
            aoMudar={setDestino}
          />
        )}
        {erro && (
          <p role="alert" className="text-[13px] text-casca-alerta">
            {erro}
          </p>
        )}
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={fechar}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela variante="salvar" enviar disabled={gravando}>
            {t("Adicionar contato")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </form>
    </JanelaDaCasca>
  );
}
```

Confira: (1) `CaixaDaCasca` com `rotulo` vira `role="checkbox"` com esse nome (o teste depende disso); (2) a forma da resposta de `GET /api/v1/contacts` (`{ data: Contact[] }`); (3) a forma da resposta de `POST /api/v1/leads` (`{ data: Lead }`, `data.id`); (4) a forma do erro do `apiClient` (ver o Step 1). O "Salvar" verde da `JanelaDaCasca` é o botão de confirmar das janelas da Clint (01-013); se o print 2 (que falta) mostrar o botão roxo, troque na conferência.

- [ ] **Step 5: A janela de novo negócio, o menu e o selo**

`components/escale/contatos/JanelaNovoNegocio.tsx`:

```tsx
"use client";
import Link from "next/link";
import { useState } from "react";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { nomeDoContato } from "@/lib/contacts/rotulo-do-contato";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { formatarTelefone } from "@/lib/escale/contatos/regras";

import { CamposDaOportunidade, type OrigemParaCriar } from "./CamposDaOportunidade";

/** "Adicionar negócio" da linha (Clint `bt-add-deal-row` → `DealAddModal`): origem e etapa, título = nome do contato. */
export function JanelaNovoNegocio({
  contato,
  aoFechar,
  origens,
}: {
  contato: LinhaDeContato | null;
  aoFechar: () => void;
  origens: OrigemParaCriar[];
}) {
  const t = useT();
  const qc = useQueryClient();
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [gravando, setGravando] = useState(false);
  const fechar = () => {
    setDestino({ origemId: "", etapaId: "" });
    aoFechar();
  };
  const titulo = contato
    ? (nomeDoContato({ name: contato.nome, display_name: contato.display_name, phone_number: contato.telefone }) ??
      formatarTelefone(contato.telefone))
    : "";

  async function criar() {
    if (!contato || !destino.origemId || !destino.etapaId) return;
    setGravando(true);
    try {
      const negocio = await apiClient.post<{ data: { id: string } }>("/api/v1/leads", {
        pipeline_id: destino.origemId,
        stage_id: destino.etapaId,
        title: titulo.length >= 2 ? titulo : t("Novo negócio"),
        contact_id: contato.id,
        source: "manual",
      });
      await qc.invalidateQueries({ queryKey: ["contacts"] });
      toast.success(t("Negócio criado."), {
        description: (
          <Link href={`/app/leads/${negocio.data.id}`} className="font-medium underline">
            {t("Ver novo negócio")}
          </Link>
        ),
      });
      fechar();
    } catch {
      toast.error(t("Não foi possível criar o negócio."));
    } finally {
      setGravando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={contato !== null} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Novo negócio")} descricao={titulo} />
      <div className="grid gap-4">
        <CamposDaOportunidade origens={origens} origemId={destino.origemId} etapaId={destino.etapaId} aoMudar={setDestino} />
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" onClick={() => void criar()} disabled={gravando || !destino.etapaId}>
          {t("Criar negócio")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
```

`components/escale/contatos/MenuNovoContato.tsx`:

```tsx
"use client";
import { useState } from "react";

import { ImportContactsDialog } from "@/components/contacts/ImportContactsDialog";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useT } from "@/hooks/i18n/useT";
import { Plus, Upload } from "@/lib/ui/icons-da-casca";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { JanelaNovoContato } from "./JanelaNovoContato";

/** "Novo contato +" com o menu da Clint (abaixo, à direita): "Novo contato" e "Importar contatos". */
export function MenuNovoContato({ origens, podeCriar }: { origens: OrigemParaCriar[]; podeCriar: boolean }) {
  const t = useT();
  const [novo, setNovo] = useState(false);
  const [importar, setImportar] = useState(false);
  if (!podeCriar) return null;
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <BotaoDaCasca variante="marca">
            {t("Novo contato")}
            <Plus size={15} aria-hidden className="ml-3" />
          </BotaoDaCasca>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className={CONTEUDO_DO_MENU}>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setNovo(true)}>
            <Plus size={14} aria-hidden />
            {t("Novo contato")}
          </DropdownMenuItem>
          <DropdownMenuItem className={ITEM_DO_MENU} onSelect={() => setImportar(true)}>
            <Upload size={14} aria-hidden />
            {t("Importar contatos")}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <JanelaNovoContato aberta={novo} aoFechar={() => setNovo(false)} origens={origens} />
      {importar && <ImportContactsDialog open onOpenChange={(v) => !v && setImportar(false)} />}
    </>
  );
}
```

Confira as props do `ImportContactsDialog` (`grep -n "interface Props" -A6 components/contacts/ImportContactsDialog.tsx`) e passe as que ele pede.

`components/escale/contatos/SeloDeMescla.tsx`:

```tsx
"use client";
import { useState } from "react";

import { MergeDialog } from "@/components/contacts/MergeDialog";
import { useContactDuplicates } from "@/hooks/contacts/useContactDuplicates";
import { useT } from "@/hooks/i18n/useT";
import { TriangleAlert } from "@/lib/ui/icons-da-casca";

/** O selo "{n} sugestões de mescla" (Clint `duplicate-contacts-alert`); abre o juntar do original. */
export function SeloDeMescla() {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const grupos = useContactDuplicates(true);
  const n = grupos.data?.data?.length ?? 0;
  if (n === 0) return null;
  return (
    <>
      <button
        type="button"
        onClick={() => setAberto(true)}
        title={t("Clique para revisar e mesclar as sugestões")}
        className="flex h-[31px] items-center gap-2 rounded-casca-gatilho border border-warning bg-warning-bg px-3 text-[13px] font-medium text-casca-texto hover:brightness-95"
      >
        <TriangleAlert size={15} aria-hidden className="text-warning" />
        {n} {n === 1 ? t("sugestão de mescla") : t("sugestões de mescla")}
      </button>
      <MergeDialog open={aberto} onOpenChange={setAberto} />
    </>
  );
}
```

Confira a forma do `useContactDuplicates(true).data` (o relatório diz `{ data: Grupo[], meta }`); se o hook já entrega o array, troque `grupos.data?.data?.length` por `grupos.data?.length`. Confira também que `border-warning`, `bg-warning-bg` e `text-warning` têm ponte em `@theme` (`grep -n "warning" app/globals.css`); sem ponte, use `var(--color-warning*)` por valor arbitrário, como a 1F faz com `--escale-*`.

- [ ] **Step 6: Rodar, typecheck, eslint, prettier, revisor e commit**

```bash
corepack pnpm vitest run tests/unit/escale-janela-novo-contato.test.tsx
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint components/escale/contatos tests/unit/escale-janela-novo-contato.test.tsx
corepack pnpm exec prettier --write components/escale/contatos/CamposDaOportunidade.tsx components/escale/contatos/JanelaNovoContato.tsx components/escale/contatos/JanelaNovoNegocio.tsx components/escale/contatos/MenuNovoContato.tsx components/escale/contatos/SeloDeMescla.tsx tests/unit/escale-janela-novo-contato.test.tsx
```

Revisor (subagente): validação antes de gravar, nenhum dado de outra organização no corpo, o 409 tratado, o negócio criado só depois do contato, e o que acontece quando o negócio falha (o contato fica; o aviso diz isso). Depois:

```bash
git add components/escale/contatos tests/unit/escale-janela-novo-contato.test.tsx
git commit -m "feat(escale): novo contato da Clint, novo negócio da linha e selo de mescla (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: A página, o encaixe, o espanhol, a rodada cheia e o PR

**Files:**
- Create: `components/escale/contatos/ListaDeContatos.tsx`, `tests/unit/escale-lista-de-contatos-pagina.test.tsx`
- Modify: `app/app/contacts/page.tsx` (encaixe), `lib/i18n/dicionario.ts` (bloco do fork)

**Interfaces:**
- Consumes: tudo das Tasks 1–7.
- Produces: `ListaDeContatos({ origens, papel }: { origens: OrigemParaCriar[]; papel: Role })`.

- [ ] **Step 1: O teste da página (falha)**

`tests/unit/escale-lista-de-contatos-pagina.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const cookie = { valor: undefined as string | undefined };
vi.mock("next/headers", () => ({
  cookies: async () => ({ get: () => (cookie.valor ? { value: cookie.valor } : undefined) }),
}));
vi.mock("@/app/app/contacts/_client", () => ({ ContactsListClient: () => <div>LISTA DO ORIGINAL</div> }));
vi.mock("@/components/escale/contatos/ListaDeContatos", () => ({
  ListaDeContatos: ({ origens }: { origens: unknown[] }) => <div>LISTA DA CASCA {origens.length}</div>,
}));
vi.mock("@/lib/escale/contatos/origens-da-pagina", () => ({
  origensDaPagina: async () => ({ origens: [{ id: "o1", nome: "A", etapas: [] }], papel: "agent" }),
}));

import ContactsPage from "@/app/app/contacts/page";

beforeEach(() => {
  cookie.valor = undefined;
});

describe("/app/contacts", () => {
  it("sem a casca, a lista do original, sem mudança", async () => {
    render(await ContactsPage());
    expect(screen.getByText("LISTA DO ORIGINAL")).toBeInTheDocument();
  });

  it("com a casca, a lista da Clint com as origens", async () => {
    cookie.valor = "topo";
    render(await ContactsPage());
    expect(screen.getByText("LISTA DA CASCA 1")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-contatos-pagina.test.tsx`
Expected: FAIL.

- [ ] **Step 3: As origens da página (servidor) e o encaixe**

Crie `lib/escale/contatos/origens-da-pagina.ts` (acrescente-o à tabela de arquivos do PR):

```ts
import { requireRole } from "@/lib/auth/require-role";
import type { Role } from "@/lib/auth/types";
import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { createClient } from "@/lib/supabase/server";

/**
 * As origens e etapas que as janelas de criar oferecem (fork Escale, Fase 2A,
 * N13): lidas com a sessão (a RLS decide), origens e etapas não arquivadas, sem
 * as etapas de ganho e perda, na ordem do quadro. `GET /api/v1/pipelines` exige
 * gerente; a lista de contatos é aberta a todo papel.
 */
export async function origensDaPagina(): Promise<{ origens: OrigemParaCriar[]; papel: Role }> {
  const authz = await requireRole("viewer", { resource: "contacts" });
  if (!authz.ok) return { origens: [], papel: "viewer" };
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_pipelines")
    .select("id, name, position, crm_stages(id, name, position, is_archived, is_won, is_lost)")
    .eq("organization_id", authz.org.orgId)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  const origens = ((data ?? []) as Array<{
    id: string;
    name: string;
    crm_stages: Array<{ id: string; name: string; position: number; is_archived: boolean; is_won: boolean; is_lost: boolean }>;
  }>).map((p) => ({
    id: p.id,
    nome: p.name,
    etapas: [...(p.crm_stages ?? [])]
      .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
      .sort((a, b) => a.position - b.position)
      .map((s) => ({ id: s.id, nome: s.name })),
  }));
  return { origens, papel: authz.org.role as Role };
}
```

Confira os nomes das colunas antes de rodar: `grep -n "is_won\|is_lost\|position" supabase/baseline.sql | grep -i "crm_stages\|crm_pipelines" | head`. Se a ordem das origens no painel da casca usa outra coluna (por exemplo a do grupo, da 1A), use a mesma do `ComOrigens`. Se o segundo argumento de `requireRole` exigir `requestId`, gere com `randomUUID()` como nas rotas.

`app/app/contacts/page.tsx` (o arquivo inteiro passa a ser):

```tsx
import type { Metadata } from "next";
import { cookies } from "next/headers";

import { ContactsListClient } from "./_client";
// ── FORK ESCALE · Fase 2A: com a casca, a lista de contatos da Clint ──
import { ListaDeContatos } from "@/components/escale/contatos/ListaDeContatos";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Contatos" };

export default async function ContactsPage() {
  // ── FORK ESCALE · Fase 2A ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const { origens, papel } = await origensDaPagina();
    return <ListaDeContatos origens={origens} papel={papel} />;
  }
  // ── fim FORK ESCALE ──
  return <ContactsListClient />;
}
```

Antes de trocar, abra o `page.tsx` atual e mantenha os imports e o `metadata` exatamente como estão (só some o que a casca acrescenta). A cerca `escale-casca-v2-original-intacto` proíbe o shell do original importar `@/components/escale/`; páginas podem (a `pipelines/[id]/page.tsx` já faz com `@/lib/escale/`). Se alguma cerca reclamar do import de `components/escale` numa página do original, mova o `<ListaDeContatos>` para uma página de servidor do fork em `app/app/escale/contatos/` não é possível (a `navegacao-completude`); nesse caso, PARE e pergunte.

- [ ] **Step 4: A página da lista**

`components/escale/contatos/ListaDeContatos.tsx`:

```tsx
"use client";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { useColunasDaLista, useSalvarColunasDaLista } from "@/hooks/escale/useColunasDaLista";
import { useListaDeContatos } from "@/hooks/escale/useListaDeContatos";
import { ROLE_RANK, type Role } from "@/lib/auth/types";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import {
  CHAVE_DO_POR_PAGINA,
  POR_PAGINA,
  POR_PAGINA_PADRAO,
  ROTULO_DA_VISAO,
  VISOES_DE_CONTATOS,
  type VisaoDeContatos,
} from "@/lib/escale/contatos/regras";
import { ChevronDown, ChevronsUpDown, Funnel, RefreshCw, Search, Users } from "@/lib/ui/icons-da-casca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { CONTEUDO_DO_MENU, ITEM_DO_MENU } from "@/components/escale/menu/estilos";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

import type { OrigemParaCriar } from "./CamposDaOportunidade";
import { JanelaNovoNegocio } from "./JanelaNovoNegocio";
import { MenuNovoContato } from "./MenuNovoContato";
import { PainelDeColunas } from "./PainelDeColunas";
import { SeloDeMescla } from "./SeloDeMescla";
import { TabelaDeContatos } from "./TabelaDeContatos";

function lerPorPagina(): number {
  try {
    const n = Number(window.localStorage.getItem(CHAVE_DO_POR_PAGINA));
    return (POR_PAGINA as readonly number[]).includes(n) ? n : POR_PAGINA_PADRAO;
  } catch {
    return POR_PAGINA_PADRAO;
  }
}

/**
 * A LISTA DE CONTATOS DA CASCA (fork Escale, Fase 2A; capturas 03-001 e
 * 03-002): cabeçalho, barra, tabela e rodapé. Busca, visão e página na URL
 * (`q`, `v`, `p`); o "N por página" no navegador.
 */
export function ListaDeContatos({ origens, papel }: { origens: OrigemParaCriar[]; papel: Role }) {
  const t = useT();
  const router = useRouter();
  const caminho = usePathname();
  const params = useSearchParams();
  const visao = (VISOES_DE_CONTATOS as readonly string[]).includes(params.get("v") ?? "")
    ? (params.get("v") as VisaoDeContatos)
    : "todos";
  const pagina = Math.max(1, Number(params.get("p")) || 1);
  const buscaDaUrl = params.get("q") ?? "";
  const [busca, setBusca] = useState(buscaDaUrl);
  const [porPagina, setPorPagina] = useState(POR_PAGINA_PADRAO);
  const [novoNegocio, setNovoNegocio] = useState<LinhaDeContato | null>(null);
  const [girando, setGirando] = useState(false);

  useEffect(() => setPorPagina(lerPorPagina()), []);

  const irPara = (mudar: Record<string, string | null>) => {
    const novo = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(mudar)) {
      if (v === null || v === "") novo.delete(k);
      else novo.set(k, v);
    }
    router.replace(`${caminho}?${novo.toString()}`, { scroll: false });
  };

  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== buscaDaUrl) irPara({ q: busca.trim() || null, p: null });
    }, 250);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);

  const consulta = useListaDeContatos({ q: buscaDaUrl, v: visao, p: pagina, n: porPagina });
  const colunas = useColunasDaLista("contatos");
  const salvarColunas = useSalvarColunasDaLista("contatos");
  const dados = consulta.data;

  useEffect(() => {
    if (dados && dados.linhas.length === 0 && pagina > 1) irPara({ p: null });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- volta à primeira quando a página esvazia (Clint)
  }, [dados, pagina]);

  const podeCriar = ROLE_RANK[papel] >= ROLE_RANK.agent;
  const podeExcluir = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const podeMesclar = ROLE_RANK[papel] >= ROLE_RANK.manager;
  const total = dados?.total ?? 0;

  const mudarPorPagina = (n: number) => {
    setPorPagina(n);
    try {
      window.localStorage.setItem(CHAVE_DO_POR_PAGINA, String(n));
    } catch {
      // o navegador pode recusar; o tamanho vale só nesta visita
    }
    irPara({ p: null });
  };

  const desligado = "flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-meta";

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-surface">
      <header className="flex h-[50px] items-center justify-between gap-4 border-b border-casca-borda px-6">
        <h1 className="text-[16px] font-medium text-casca-texto">{t("Contatos")}</h1>
        <div className="flex items-center gap-4">
          {podeMesclar && <SeloDeMescla />}
          <MenuNovoContato origens={origens} podeCriar={podeCriar} />
        </div>
      </header>

      <div className="flex items-center gap-3 border-b border-casca-borda px-6 py-3">
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
        <DropdownMenu>
          <DropdownMenuTrigger className="flex h-8 items-center gap-2 rounded-casca-gatilho border border-casca-borda px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia">
            <Users size={15} aria-hidden className="text-casca-marca" />
            {t(ROTULO_DA_VISAO[visao])}
            <ChevronDown size={14} aria-hidden />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className={CONTEUDO_DO_MENU}>
            {VISOES_DE_CONTATOS.map((v) => (
              <DropdownMenuItem key={v} className={ITEM_DO_MENU} onSelect={() => irPara({ v: v === "todos" ? null : v, p: null })}>
                {t(ROTULO_DA_VISAO[v])}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>
        <span className="flex">
          <button type="button" disabled title={t("Em breve")} className={`${desligado} rounded-r-none`}>
            <Funnel size={15} aria-hidden />
            {t("Filtros")}
          </button>
          <button type="button" disabled title={t("Em breve")} className={`${desligado} rounded-l-none border-l-0 px-2`}>
            <ChevronsUpDown size={14} aria-hidden />
          </button>
        </span>
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

      <footer className="border-t border-casca-borda px-6">
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

`ChevronsUpDown` pode não estar em `icons-da-casca`: se não estiver, acrescente-o na linha da Fase 2A (Task 5). A coluna "Negócios" usa `podeVerNegocios = podeCriar` (agent ou acima), o equivalente do `DEAL` da Clint. A altura: se a página precisar ocupar a tela inteira como o quadro, copie a classe de altura de `app/app/pipelines/[id]/_client.tsx` (~L188), que lê `--rodape-ocupado` (cerca `altura-fixa-le-a-reserva-do-rodape`).

- [ ] **Step 5: Rodar o teste da página**

Run: `corepack pnpm vitest run tests/unit/escale-lista-de-contatos-pagina.test.tsx`
Expected: PASS.

- [ ] **Step 6: O espanhol**

Rode a cerca para ver o que falta:

```bash
corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts 2>&1 | tail -40
```

Acrescente, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D` em `lib/i18n/dicionario.ts`, um bloco `  // ─── FORK ESCALE · lista de contatos (Fase 2A) ───` **só com as chaves que ainda não existem** (confira cada uma com `grep -n '^  "<texto>":\|^  <texto>:' lib/i18n/dicionario.ts`). As traduções:

| Português | Espanhol |
|---|---|
| Importar contatos | Importar contactos |
| sugestão de mescla | sugerencia de fusión |
| sugestões de mescla | sugerencias de fusión |
| Clique para revisar e mesclar as sugestões | Haz clic para revisar y fusionar las sugerencias |
| Buscar por contato ou Empresa | Buscar por contacto o Empresa |
| Todos os contatos | Todos los contactos |
| Com negócio | Con negocio |
| Sem negócio | Sin negocio |
| Pessoais | Personales |
| contato | contacto |
| contatos | contactos |
| Atualizar | Actualizar |
| Personalizar colunas | Personalizar columnas |
| Buscar coluna ou campo | Buscar columna o campo |
| Na tabela | En la tabla |
| arraste para reordenar | arrastra para reordenar |
| Colunas | Columnas |
| Campos do contato | Campos del contacto |
| Redefinir | Restablecer |
| Nada encontrado. | Nada encontrado. |
| Ver | Ver |
| negócio | negocio |
| negócios | negocios |
| Adicionar negócio | Agregar negocio |
| Chamar | Llamar |
| Abrir WhatsApp | Abrir WhatsApp |
| Abrir em Conversas | Abrir en Conversaciones |
| Mais ações | Más acciones |
| Tem certeza que deseja excluir o contato selecionado? | ¿Seguro que deseas eliminar el contacto seleccionado? |
| Contato excluído. | Contacto eliminado. |
| Não foi possível excluir o contato. | No fue posible eliminar el contacto. |
| Não foram encontrados contatos. | No se encontraron contactos. |
| Tente ajustar a busca ou os filtros. | Intenta ajustar la búsqueda o los filtros. |
| Não foi possível carregar os contatos. | No fue posible cargar los contactos. |
| Tente novamente em instantes. | Inténtalo de nuevo en unos instantes. |
| Selecionar contato | Seleccionar contacto |
| Selecionar todos | Seleccionar todos |
| por página | por página |
| Por página | Por página |
| Paginação | Paginación |
| Anterior | Anterior |
| Próximo | Siguiente |
| Informações do contato | Información del contacto |
| Digite o nome do contato | Escribe el nombre del contacto |
| Ex: @escaleia | Ej: @escaleia |
| Desejo criar uma oportunidade de negócio | Deseo crear una oportunidad de negocio |
| Adicionar contato | Agregar contacto |
| Contato criado com sucesso! | ¡Contacto creado con éxito! |
| Ver novo negócio | Ver nuevo negocio |
| Email já cadastrado | Email ya registrado |
| Telefone já cadastrado | Teléfono ya registrado |
| E-mail deve ser válido | El e-mail debe ser válido |
| O telefone informado está inválido. | El teléfono informado no es válido. |
| Instagram inválido. | Instagram no válido. |
| Informe o nome do contato. | Informa el nombre del contacto. |
| Escolha a origem e a etapa. | Elige el origen y la etapa. |
| Escolha a origem primeiro. | Elige el origen primero. |
| Não foi possível criar o contato. | No fue posible crear el contacto. |
| O contato foi criado, mas o negócio não. | El contacto fue creado, pero el negocio no. |
| Criar negócio | Crear negocio |
| Negócio criado. | Negocio creado. |
| Não foi possível criar o negócio. | No fue posible crear el negocio. |
| Última atividade | Última actividad |
| Criado em | Creado el |
| Data de nascimento | Fecha de nacimiento |
| País | País |

Siga o formato das linhas vizinhas (`"Texto": { es: "Texto" },`). Rode a cerca de novo até passar.

- [ ] **Step 7: Guardas, typecheck, eslint, prettier e commit**

```bash
for f in app/app/contacts/page.tsx lib/i18n/dicionario.ts components/escale/contatos/ListaDeContatos.tsx lib/escale/contatos/origens-da-pagina.ts; do grep -rlF "${f%.*}" tests/unit --include='*.test.ts' --include='*.test.tsx'; done | sort -u
corepack pnpm vitest run tests/unit/escale-lista-de-contatos-pagina.test.tsx tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/navegacao-completude.test.ts tests/unit/altura-fixa-le-a-reserva-do-rodape.test.ts
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm exec eslint app/app/contacts components/escale/contatos lib/escale/contatos tests/unit/escale-lista-de-contatos-pagina.test.tsx
corepack pnpm exec prettier --write components/escale/contatos/ListaDeContatos.tsx lib/escale/contatos/origens-da-pagina.ts tests/unit/escale-lista-de-contatos-pagina.test.tsx
git add app/app/contacts/page.tsx components/escale/contatos/ListaDeContatos.tsx lib/escale/contatos/origens-da-pagina.ts lib/i18n/dicionario.ts lib/ui/icons-da-casca.ts tests/unit/escale-lista-de-contatos-pagina.test.tsx
git commit -m "feat(escale): lista de contatos da casca em /app/contacts (Fase 2A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

- [ ] **Step 8: Atualizar com a main e a rodada cheia (em segundo plano)**

```bash
git fetch escale-crm
git merge escale-crm/main
```

Se houver conflito em `supabase/baseline.sql` ou `lib/i18n/dicionario.ts` (blocos da Frente A no mesmo ponto), mantenha os dois blocos, um depois do outro, e rode de novo os testes das Tasks 2 e 8. Depois:

```bash
export NODE_OPTIONS=--max-old-space-size=6144
nohup corepack pnpm test:unit > /tmp/2a-unit.log 2>&1 &
nohup corepack pnpm test:db > /tmp/2a-db-cheio.log 2>&1 &
corepack pnpm exec tsc --noEmit -p tsconfig.typecheck.json
corepack pnpm lint
```

Enquanto rodam, escreva o texto do PR. Ao terminarem, compare as falhas com `.superpowers/sdd/falhas-conhecidas.txt`; falha nova roda sozinha; se persistir, é regressão e se corrige antes do PR.

- [ ] **Step 9: Conferência visual (o contrato)**

Com o servidor de desenvolvimento e a casca ligada (`/app/escale/menu?usar=topo`), abra `/app/contacts` e compare **lado a lado** com 03-001 e 03-002 (zoom do navegador em 125% para bater com o print, ou divida as medidas por 1,25): cabeçalho, barra, cabeçalho da tabela, linha (com e sem hover), chips, "Ver 1 negócio"/"Adicionar negócio", rodapé, o painel de colunas, a janela "Novo contato" e o ⋮. Escreva a lista das diferenças que sobram, cada uma com o motivo (falta de print, decisão N*, ou a corrigir). As que forem "a corrigir" se corrigem antes do PR.

- [ ] **Step 10: Push e PR**

```bash
git push -u escale-crm feat/fase-2a-lista-de-contatos
gh pr create --repo rgisjr/escale-crm --base main --head feat/fase-2a-lista-de-contatos --title "Fase 2A — Lista de contatos igual à Clint" --body-file /tmp/2a-pr.md
```

O corpo do PR (`/tmp/2a-pr.md`) traz: o que muda (itens A1–A10 e C1), a migration 9101 (tabela e função, e que o deploy precisa do `update.sh` com backup), as decisões N1–N14 e as respostas Q1–Q6, a lista da conferência visual, o resultado da rodada cheia contra as falhas conhecidas, e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Não faça merge.**

- [ ] **Step 11: O PRD fora do repositório**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, seção 8, troque o estado da 2A de "proposta" para "PR aberto (aguarda o "pode fazer" do merge)", com o número do PR.

---

## Self-review (feito ao escrever)

- **Cobertura do PRD:** A1 (Task 7, menu; Task 8, cabeçalho), A2 (Task 7, selo), A3 (Tasks 2–3, busca com Instagram; a empresa é da 2D), A4 (Tasks 2, 8), A5 (Task 8), A6 (Task 5), A7 (Tasks 4, 8), A8 (Tasks 2, 3, 6), A9 (Task 5), A10 (Task 5), C1 (Task 7). A11 fica fora (decisão do PRD).
- **Nomes entre tasks:** `LinhaDeContato`, `PaginaDeContatos`, `ItemDeColuna`, `OrigemParaCriar`, `ListaComColunas`, `rotuloDoItem`, `useListaDeContatos`, `useColunasDaLista`/`useSalvarColunasDaLista` conferidos nas tasks que os usam.
- **Pontos que o executor confere no código antes de escrever** (estão marcados nos passos): `chaveDoLink`/`lerLinks`, `useContact`, `mensagemDeBloqueioPorVinculo`, a forma do erro do `apiClient`, as props do `ImportContactsDialog`, os papéis de `SeletorDaCasca`/`CaixaDaCasca`/`InterruptorDaCasca`, as colunas de `crm_stages`, o `audit` da rota de colunas e as pontes dos tokens `warning`.
