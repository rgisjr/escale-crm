# Fase 2E — Ficha do contato e mescla (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C2, C3 e C4 de `docs/modulos/2-contatos-e-empresas.md` (seção 4, tabela C), mais o que ficou "Em breve" para cá: o nome do contato na lista e o "Editar" do ⋮ da linha (2A, Q3), o "Ver N negócios" com mais de um negócio (2A) e o "Visualizar contato" do ⋮ da ficha do negócio (1G), que hoje levam à página do original. **Frente B**, worktree `wt-frente-b`, migration **9106**. **Dois PRs:** **A** = banco e rotas (mescla, notas do contato, negócios do contato; Tasks 1–5); **B** = telas (as abas da ficha servindo ao contato, a janela "Informações do contato" e a janela "Mesclar contatos duplicados"; Tasks 6–11).
> **Pré-requisito:** a 2C e a 2D mergeadas (migrations 9104 e 9105: o catálogo do contato e da empresa, `camposDoContatoComGrupos`, `useCatalogoDeCampos`, `AbaEmpresa` que vincula, `empresaDoContato`, `trocarEmpresaDoContato`). A Task 1 prova.

## Decisões delegadas (18/10: o usuário mandou o Claude decidir; valem as propostas abaixo, e o usuário pode trocar qualquer uma antes do "pode fazer")

| # | Pergunta | Decisão |
|---|---|---|
| Q1 | **Onde o contato abre (C3).** Na Clint, clicar no contato faz `pushState('/contacts/<id>')` e abre a janela "Informações do contato" por cima da lista; abrir `/contacts/<id>` direto mostra a lista com a janela aberta; fechar volta à URL de antes | **Igual à Clint:** com a casca, `/app/contacts/<id>` é a lista com a janela aberta (encaixe na `page.tsx` do `[id]`); dentro da lista, abrir e fechar usam `history.pushState` (o "Voltar" do navegador fecha). A página do original continua em `/app/contacts/<id>?pagina=completa` (N3) |
| Q2 | **O que o original tem e a Clint não tem** (LGPD, bloqueio, "pessoal", "sempre humano", propostas da IA, origem do anúncio): a janela da Clint não tem lugar para isso | Um **⋮ "Mais"** no cabeçalho da janela (não existe na Clint) com um item só: **"Abrir página completa"** → `/app/contacts/<id>?pagina=completa`. Nada do original some (PRD §3, "não pode quebrar") |
| Q3 | **Abas (C3).** O PRD citava "Contato, Empresa, Negócio, Atividades, Notas, Anexos, Histórico e Conversas", que são as **seções do painel de Conversas** (3A). O print 2b-10 e o código da Clint mostram a janela com **Contato, Empresa, Negócios, Conversas, Arquivos, Histórico** | **As seis do print**, nessa ordem; "Negócios" só aparece quando o contato tem negócio (Clint) |
| Q4 | **Conversas em três modos (C4).** A Clint define "Padrão chat", "Por canal" e "Timeline unificada", mas a versão atual liga **só "Padrão chat"** e esconde o seletor (`enabledVariants = ["chat"]`; o seletor some com menos de 2 modos; não há código de tela para os outros dois) | **Igual à Clint atual:** só "Padrão chat" (lista de sessões à esquerda, a conversa à direita), sem seletor. "Por canal" e "Timeline unificada" ficam fora, registrados no PRD (a F5 do PRD de Conversas perde o objeto). A conversa à direita é a **thread do original em leitura** (não marca como lida) com "Abrir em Conversas"; responder dali dentro é da **3E** (compositor da casca dentro da ficha) |
| Q5 | **Notas do contato.** A Clint grava a nota no contato ("Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato."). Nossa nota é do negócio (`crm_notas_do_negocio.lead_id` obrigatório) | A 9106 deixa `lead_id` **nulo quando a nota é do contato** (com a regra "negócio ou contato"); a nota feita pela janela do contato fica no contato; o Histórico do contato mostra as notas dele e as dos negócios que a pessoa enxerga (N8) |
| Q6 | **A tela de mescla (C2).** O PRD citava as abas Telefone, Instagram, ID WhatsApp e Sugestões; na Clint atual essas abas estão **mortas** (os textos existem, a tela não usa): a "Mesclar contatos duplicados" é **uma lista de sugestões** com confiança (Alta, Média, Baixa) à esquerda e a comparação campo a campo à direita, com mescla em massa. O "Dispensar sugestão" existe no código mas está **desligado** | **Igual à Clint atual:** a janela única com a lista de sugestões, busca, Filtros (critérios, confiança, tags, "Ignorar telefones inválidos"), Ordenar, a comparação com a escolha por campo, o "Contato resultante", a confirmação irreversível e a mescla em massa com o critério de prioridade. **Sem** as abas e **sem** "Dispensar" |
| Q7 | **De onde vêm as sugestões.** A Clint guarda as sugestões numa tabela (`merge_suggestion`) e calcula a confiança no servidor | **Calculadas na hora, sem tabela nova:** o banco devolve as chaves que repetem (telefone com o nono dígito, e-mail, ID do WhatsApp e Instagram), o servidor agrupa (união) e calcula a confiança com pesos fixos (N10). Nome e empresa só **somam** confiança; sozinhos não criam sugestão (evita "Maria" × "Maria" numa base de 64 mil). Sem histórico de mesclas na tela (é de Configurações, PRD §9) |
| Q8 | **Mescla em massa.** Na Clint ela vai para uma fila e roda em segundo plano | **Na hora, até 100 grupos por vez**, um grupo por transação, com o resultado de cada um. Acima de 100: "Seleção acima do limite" (texto da Clint) |
| Q9 | **Quem faz o quê** | Abrir a janela e ver tudo: todos. Editar campos, "Adicionar negócio", nota e arquivos: **atendente** ou acima (como na ficha do negócio). Mesclar (uma ou em massa) e o selo "Possível duplicado": **gerente** ou acima (PRD §5, como o original) |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código e os textos da Clint citados abaixo, e marca como provisório):
1. ❌ A janela do contato nas abas **Empresa, Negócios, Conversas, Arquivos e Histórico** (há só a aba Contato, 2b-10). Provisório: o miolo é o das abas da ficha do negócio, que já foram conferidas com os prints 1g (02, 03, 06, 07) e 1h.
2. ❌ O cabeçalho da janela **com empresa** (o nome da empresa em maiúsculas acima do nome do contato) e **com o selo "Possível duplicado"**.
3. ❌ **A tela de mescla inteira** (a lista, um grupo aberto, os Filtros, o Ordenar, a confirmação, o concluído, a mescla em massa). Provisório: a moldura da janela do contato (mesmo tamanho), a coluna da esquerda com 300px e os componentes da casca já usados (busca, `GatilhoDeFiltro`, `CaixaDaCasca`, `JanelaDeConfirmacao`).

**Goal:** Com a casca ligada, o contato abre como na Clint (2b-10): a janela "Informações do contato" por cima da lista, com foto, nome editável, ligar, conversa, nota, "Adicionar negócio" e as abas Contato, Empresa, Negócios, Conversas, Arquivos e Histórico; a aba Conversas mostra a conversa escolhida ao lado (também na ficha do negócio); e o selo "{n} sugestões de mescla" abre a "Mesclar contatos duplicados" da Clint: sugestões com confiança, comparação campo a campo, contato resultante, confirmação irreversível e mescla em massa. Sem a casca, nada muda.

**Architecture:**
- **Banco (9106):** `fn_escale_chave_do_telefone` (a chave do telefone com o nono dígito, espelho de `canonicalPhoneBR`); `fn_escale_chaves_de_mescla(p_org)` (invoker: as chaves que se repetem entre 2 e 50 contatos vivos); `fn_escale_mesclar_contatos(p_org, p_principal, p_secundarios, p_escolhas)` (invoker: chama o `fn_mesclar_contatos` do original, que confere o papel e reponta tudo, e grava no principal os valores escolhidos, na mesma transação); `crm_notas_do_negocio.lead_id` passa a aceitar nulo (nota do contato), com as policies refeitas.
- **Servidor:** `lib/escale/mescla/{regras,banco}.ts`, `lib/escale/ficha-do-contato/{regras,banco}.ts`; rotas do fork `GET /api/v1/mesclas/sugestoes`, `POST /api/v1/mesclas`, `POST /api/v1/mesclas/em-massa`, `GET /api/v1/contatos/[id]/negocios`, `GET/POST /api/v1/contatos/[id]/notas`, `PATCH/DELETE /api/v1/contatos/[id]/notas/[notaId]`.
- **Telas:** as abas da ficha do negócio passam a receber o **contato** (não o negócio) onde o dado é do contato (Contato, Empresa, Conversas, Arquivos) e um **alvo** (negócio ou contato) no Histórico e na nota; a `JanelaDoContato` monta essas abas com o cabeçalho da Clint; o `useContatoAberto` cuida da URL; a `JanelaDeMescla` substitui o `MergeDialog` do original no `SeloDeMescla` (sem a casca, o original fica como está).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix (Dialog, DropdownMenu, Popover), zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (RLS, funções invoker).

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 2b-10 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-10-ficha-do-contato-2e.jpg | a janela "Informações do contato": moldura, cabeçalho, abas, a aba Contato | 9 |
| 2b-01 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-01-lista.jpg | a lista por baixo e o selo laranja "{n} sugestões de mescla" | 9, 10 |
| 1g-02 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-02-aba-contato.jpg | a moldura "Campos de contato" (a mesma da ficha do negócio) | 6 |
| 1g-03 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\2026-10-17-03-aba-empresa.jpg | a aba Empresa | 6 |
| c20 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-conversas\2026-10-17-c20-secao-conversas.jpg | a linha da sessão ("Em aberto", hora, prévia) e a thread da Clint (bolhas, evento de sistema) | 7 |
| 1h-B-04 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1h\2026-10-18-ESCALE-B-04-conversas.png | a nossa aba Conversas hoje (a faixa do modo espião, "{n} sessões", o vazio da direita) | 7 |
| 1h-B-02b | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1h\2026-10-18-ESCALE-B-02b-historico-nota-aberta.png | o nosso Histórico com a nota aberta | 8 |

### Medidas da janela (2b-10 está em 1:1, CSS px, janela 1523×784)

| Peça | Medida |
|---|---|
| Fundo | o escurecido do `JanelaDaCasca` (`bg-black/55`) |
| Caixa | de x=40 a x=1468 (1428px) e de y=46 até a borda de baixo; `w-[calc(100vw-96px)] max-w-[1428px]`, `top-[46px]`, `h-[calc(100dvh-46px)]`, canto de cima 8px, fundo `bg-surface`, sombra `shadow-casca-painel` |
| Barra do título | 52px, borda de baixo `casca-borda`; "Informações do contato" 15px/500 `casca-texto` a 16px da esquerda; o ✕ 16px `casca-suave` a 20px da direita |
| Corpo | `px-[60px]`; o cabeçalho começa 26px abaixo da barra do título |
| Foto | 40px redonda (a `FotoDaLinha` com `tamanho="ficha"`) |
| Nome | 17px/500 `casca-texto`, 11px depois da foto; acima dele, quando há empresa, o nome da empresa em 11px/600 maiúsculas `casca-meta` (provisório, print 2) |
| Ícones | ligar, conversa e nota, 14px `casca-marca`, numa linha 6px abaixo do nome, 12px entre eles |
| "+ Adicionar negócio" | `BotaoDaCasca variante="marca"`, 158×32, ícone `Plus` 14px antes do texto, alinhado à direita |
| Abas | 22px abaixo do cabeçalho; texto 14px `casca-texto`, 24px entre elas; a ativa com o sublinhado de 2px `casca-marca`; a linha de baixo `casca-borda` |
| Conteúdo da aba | 20px abaixo das abas; a aba Contato é a moldura `CamposDaFicha` como está (1g-02); rola por dentro da caixa |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (L6921–6947, 9728–10030, 13273–13339) e dos bundles `raw-v2\js\index-BhVJ8kAx.js.txt` (a janela do contato e a `ContactConversations`), `index-C8mLn7Gp.js.txt` (a lista, abrir e fechar), `DuplicateContactsV2-D1Gt1EQS.js.txt` e `scoreTier-DlkwR1Qa.js.txt` (a mescla):

- **Janela do contato:** "Informações do contato"; "Chamar"; "Abrir em Conversas"; "Nova nota"; "Adicionar negócio"; abas "Contato", "Empresa", "Negócios", "Conversas", "Arquivos", "Histórico"; "Possível duplicado"; "Possível duplicado. Clique para revisar e unir os dados."; "Contato mesclado com {name}"; "Contato excluído".
- **Aba Negócios:** "Negócio"; "Origem"; "Etapa"; "Status"; "Motivo de perda"; "Ações"; "Dono: {nome}"; "Sem dono"; "Arquivado"; "Ir para o negócio"; "Excluir negócio"; "Tem certeza que deseja excluir o negócio selecionado?"; "Mostrar arquivados"; "Ocultar arquivados".
- **Nota:** "Adicionar nota interna"; "Salvar nota"; "Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato.".
- **Conversas:** "{count} sessões"; "Selecione uma conversa"; "Escolha uma conversa ao lado para ver as mensagens."; "Não foi possível carregar as conversas."; "Este contato não possui conversas no atendimento"; "Abra as conversas sem marcá-las como lidas."; "Ativar modo espião".
- **Mescla, lista:** "Mesclar contatos duplicados"; "sugestão de mescla" / "sugestões de mescla"; "Clique para revisar e mesclar as sugestões"; "Buscar telefone ou nome…"; "Filtros"; "Limpar"; "Ordenar"; "Maior confiança"; "Menor confiança"; "Mais recentes"; "Mais antigas"; "Critérios"; "Casou por"; "Conflito por"; "Qualquer critério"; "Confiança"; "até"; "Tags"; "Filtrar por tags"; "Outros"; "Ignorar telefones inválidos"; "Selecionar todos ({count})"; "{count} sugestão" / "{count} sugestões"; "{count} marcada" / "{count} marcadas"; "Nenhuma sugestão de mescla"; "Falha ao carregar sugestões de mescla."; "Alta"; "Média"; "Baixa"; "Confiança calculada a partir dos critérios que casaram e dos que conflitam entre os contatos."; critérios "Telefone", "E-mail", "Instagram", "Nome", "ID do WhatsApp", "Organização".
- **Mescla, comparação:** "Selecione uma sugestão para mesclar"; "Escolha uma sugestão na lista ao lado para revisar e confirmar a mescla."; "Comparar contatos e escolher por campo"; "campos a decidir"; "campos já resolvidos"; "igual em todos"; "único disponível"; "Ocultar campos já resolvidos"; "Mostrar todos os campos ({count})"; "Toque em uma célula para escolher o valor que prevalece."; "Desmarque uma coluna para excluir o contato da mescla."; "São necessários ao menos 2 contatos."; "Tags: sempre unidas"; "Contato resultante"; "Mesclar contatos para {value}"; "A mescla é definitiva e não pode ser desfeita."; "Atendimento ativo impede a mescla deste grupo.".
- **Mescla em massa:** "Mesclando em massa"; "Mesclar {n} grupo selecionado" / "Mesclar {n} grupos selecionados"; "Critério de priorização"; "Adicionado por último"; "Adicionado por primeiro"; "Atualizado por último"; "Atualizado por primeiro"; "Vencedores previstos"; "Remover da seleção"; "Seleção acima do limite"; "Refine o filtro: a seleção ({count}) passa do limite de {cap} por mescla.".
- **Confirmar e concluir:** "Confirmar mescla irreversível"; "Esta ação consolida os contatos em um único vencedor e não pode ser desfeita."; "Você está mesclando vários grupos de uma vez. Revise antes de confirmar."; "grupo" / "grupos"; "contatos absorvidos"; "Entendo que a mescla é definitiva e não pode ser desfeita."; "Voltar"; "Confirmar e mesclar ({count})"; "Mesclando contatos…"; "Consolidando os contatos, leva só alguns instantes. Mantenha esta janela aberta."; "Contatos mesclados"; "{n} contatos mesclados."; "Voltar para a lista"; "Ver contato"; "Concluir"; "Fechar"; "Tentar de novo"; "Falha ao mesclar contatos."; "Outro contato já usa este telefone"; "Estes contatos mudaram durante a mescla"; "Não foi possível mesclar os contatos".
- **Textos nossos** (a Clint não tem): "Mais"; "Abrir página completa"; "Não consegui carregar o contato."; "Disponível para gerente ou acima."; "Aberto"; "Ganho"; "Perdido" (os da `StatusDaFicha`).

### Comportamento da Clint conferido no código

- **Abrir e fechar** (`index-C8mLn7Gp` ~39990; `index-BhVJ8kAx` 477400–483600): clicar na linha abre na aba "CONTACT"; `pushState('/contacts/<id>')` guardando a URL anterior; fechar volta a ela (ou `/contacts`); montar a página em `/contacts/<id>` abre a janela. Carregando: esqueleto. Mesclado por fora: troca para o vencedor com o toast "Contato mesclado com {name}". Excluído: toast "Contato excluído" e fecha.
- **Cabeçalho:** foto; o nome da empresa em maiúsculas acima do nome; nome editável no lugar; o selo "Possível duplicado" (abre a mescla já na sugestão do contato); ligar ("Chamar"), conversa ("Abrir em Conversas") e nota ("Nova nota"); "Adicionar negócio" (fecha a janela do contato e abre o "novo negócio" com o contato preenchido). **Sem ⋮ e sem tags no cabeçalho**: as tags ficam na aba Contato.
- **Abas:** Contato e Empresa são a mesma moldura de campos da ficha do negócio; Negócios lista os negócios do contato (mais novos primeiro), com "Motivo de perda" só se houver perdido, "Arquivado", "Ir para o negócio" ("Você está aqui" no negócio atual), "Excluir negócio" com a confirmação, "Mostrar arquivados"; sem negócio a aba some e a ativa volta para Contato; Conversas é a `ContactConversations` (grade `340px | 1fr`, a faixa do modo espião, "{count} sessões", a conversa à direita); Arquivos é a mesma da ficha; Histórico filtra por `contact_id`.
- **Mescla** (`DuplicateContactsV2`, `scoreTier`): etapas lista → confirmar → mesclando → concluído/erro; coluna da esquerda 300px com busca (350 ms), Filtros, Ordenar, "Selecionar todos", lista de 20 em 20; cada sugestão com caixinha, fotos empilhadas (até 3 e "+N"), até 3 nomes separados por ", " e o selo "NN% · Alta"; à direita, o cabeçalho com os nomes e a confiança (o popover "Casou por / Conflito por"), a tabela com uma coluna por contato (desmarcar a coluna tira o contato; mínimo 2) e uma linha por campo (nome, e-mail, telefone, Instagram, organização); clicar na célula escolhe o valor que fica; o padrão é o primeiro contato que tem o valor; tags sempre unidas; faixas: ≥ 85 Alta (verde), ≥ 65 Média (laranja), abaixo Baixa (vermelho); grupo com dois atendimentos ativos fica bloqueado; em massa: sem escolha por campo, com o "Critério de priorização"; confirmar pede a caixinha "Entendo que…" e o botão vermelho "Confirmar e mesclar ({count})".

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **URL (Q1):** `/app/contacts/<id>` abre a janela; a aba vai em `?ca=` (`contato` some da URL); os parâmetros da lista (`q`, `v`, `p`, `f`, `fs`) continuam. Dentro da lista, abrir = `history.pushState`, trocar de aba e trocar de contato = `replaceState`, fechar = `pushState` para `/app/contacts?{parâmetros da lista}`. O `irPara` da lista passa a usar sempre `/app/contacts` e tira o `ca` | Clint; o App Router sincroniza `usePathname`/`useSearchParams` com o `pushState` |
| N2 | **Encaixe:** `app/app/contacts/[id]/page.tsx` com a casca **e sem** `pagina=completa` devolve `<ListaDeContatos {...await origensDaPagina()} />` (a lista lê o id do caminho). A conferência "o contato é da organização ativa" continua antes, nos dois caminhos | regra 7 do roteiro; `navegacao-completude` não muda (nenhuma `page.tsx` nova) |
| N3 | **Página do original:** `?pagina=completa` mostra o `ContactDetailClient` como hoje; o ⋮ "Mais" da janela leva a ela (Q2) | PRD §3 |
| N4 | **Quem abre a janela:** o nome na linha (link com `onClick` que abre sem recarregar; o clique do meio continua abrindo outra aba), o "Editar" do ⋮ da linha (aba Contato), o "Ver N negócios" com mais de um (aba Negócios). O "Ver 1 negócio" continua indo ao negócio. Links de outras telas para `/app/contacts/<id>` (ficha do negócio, ficha da empresa) já caem na janela pelo encaixe | Clint |
| N5 | **As abas servem aos dois:** `ContatoEditavel` (exportada) recebe `contatoId` e `pipeline: Pipeline \| null` (sem negócio, não há campos ocultos por origem); `AbaEmpresa` recebe `contatoId`; `AbaConversas` e `AbaArquivos` recebem `contatoId` (e o arquivo, `leadId \| null` para carimbar); `AbaHistorico` e `JanelaDeNota` recebem um `alvo` (`{ tipo: "negocio" \| "contato"; id }`); `useGravarContato(contatoId, pipelineId \| null)` só invalida o quadro quando há origem. A ficha do negócio passa os mesmos dados de antes | regra 4 do roteiro (reaproveitar); a ficha do negócio não muda de comportamento |
| N6 | **Tags na aba Contato:** a linha "Tags" no topo da moldura, com o mesmo popover da ficha (`TagsDaFicha` ganha a forma por contato, `TagsDoContato({ contatoId })`) | Clint: tags na aba Contato |
| N7 | **Conversas (Q4):** à direita, a `ChatThread` do original (`components/inbox/ChatThread.tsx`) com `conversationId` e `contatoId`, **sem** `onResponder` (sem responder) e sem o `useMarkAsRead` (não marca como lida); em cima dela, a barra 48px com o canal e o botão "Abrir em Conversas" (`/app/inbox?id=`). A primeira sessão já vem escolhida. A faixa do modo espião continua com "Ativar modo espião" "Em breve" (a 3C liga). Vale para a ficha do negócio também | Clint `ContactConversations`; a 3E põe o compositor |
| N8 | **Notas (Q5):** a nota da janela do contato é gravada com `lead_id` nulo. `GET /api/v1/contatos/[id]/notas` devolve as notas do contato (as soltas e as dos negócios que a RLS deixa ver). O Histórico do contato junta a linha do tempo do contato (rota do original `GET /api/v1/contacts/[id]/timeline`, que já soma os negócios) com as notas soltas, na ordem do tempo (`juntarNotasAoHistorico`) | as notas soltas não têm linha em `crm_lead_activities` (`lead_id` é obrigatório lá) |
| N9 | **Negócios do contato:** `GET /api/v1/contatos/[id]/negocios` lê com a sessão (a RLS da 1J decide quem vê) e devolve os negócios (título, origem, origem arquivada, etapa, status, motivo de perda, valor, moeda, dono) e os nomes das etapas das origens deles (o Histórico usa). "Arquivado" = a origem está arquivada (o negócio não arquiva no nosso modelo); sem "Desarquivar negócio". Excluir usa a ação em lote do original (`useBulkAction`), como o ⋮ da ficha | 1B (origem arquivada); 1G |
| N10 | **Confiança (Q7):** `confianca = 1 − Π(1 − peso)` dos critérios que casaram, menos a soma dos conflitos, entre 0 e 100. Pesos: ID do WhatsApp 0,95; telefone 0,90; e-mail 0,85; Instagram 0,70; nome 0,35; organização 0,20. Conflitos: telefone 0,30; e-mail 0,15; Instagram 0,15 (dois valores diferentes no grupo). Faixas da Clint: ≥ 85 Alta, ≥ 65 Média, abaixo Baixa. Grupo com mais de 20 contatos fica fora (o motor do original aceita até 20) | `scoreTier` (85/65); motor `fn_mesclar_contatos` |
| N11 | **Escolha por campo:** campos Nome, E-mail, Telefone, Instagram e Organização. O **principal** (o que fica) é o dono do nome escolhido. A tela manda **ids** ("o e-mail do contato X"), nunca valores; o servidor relê os contatos e monta os valores. Nome, e-mail, telefone e Instagram vão na `fn_escale_mesclar_contatos` (depois da mescla, os secundários viram lápide e saem dos índices únicos); a organização vai pela `trocarEmpresaDoContato` da 2D, logo depois | segurança; índices únicos parciais do original |
| N12 | **Bloqueio:** grupo em que dois ou mais contatos têm conversa ativa (`open`, `pending`, `claimed`, `ai_handling`) fica com "Atendimento ativo impede a mescla deste grupo." e sem o botão; o servidor confere de novo antes de mesclar | Clint; o índice `uniq_conversations_1to1_per_contact_session` deixaria conversa sem repontar |
| N13 | **A mescla do original fica:** `MergeDialog`, `/api/v1/contacts/duplicates` e `/api/v1/contacts/merge` não mudam (sem a casca). O `SeloDeMescla` (só da casca) passa a contar pelas sugestões novas e abre a `JanelaDeMescla` | regra 4 do roteiro |
| N14 | **Fora desta fase:** "Por canal" e "Timeline unificada" (Q4); "Dispensar sugestão" (Q6); histórico de mesclas e "Ver detalhes da mescla" (Configurações); o compositor dentro da aba Conversas (3E); a janela compacta (abaixo de 720px) da `ContactConversations`; "Desarquivar negócio" (N9) | Clint atual; PRD §9 |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo` (**da Frente A**: não troque de branch nele, não faça stash, não mexa nos arquivos). **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. Todo comando roda dentro dela.
- **Branches:** PR A `feat/fase-2e-ficha-e-mescla-banco`; PR B `feat/fase-2e-ficha-e-mescla-telas`. Cada uma de `escale-crm/main` (Tasks 1 e 6 provam).
- **Base:** `escale-crm/main` com a 2C e a 2D inteiras mergeadas (a última migration da Frente B é a 9105).
- **Migration:** **9106**, `supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql`. Antes de criar: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se 9106 já existir em outra branch, PARE e pergunte.
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
const authz = await requireRole("manager", { requestId, resource: "contacts" });
if (!authz.ok) return authz.response;
const t = (texto: string) => traduzir(texto, authz.user.idioma);
// erro de validação:   return fail("unprocessable_entity", t("..."), 422, { requestId });
// sucesso:             return ok(dados, { requestId });   ou   ok(dados, { requestId, status: 201 })
// auditoria:           void audit({ action, actorUserId: authz.user.id, organizationId: authz.org.orgId, resourceType, resourceId, requestId, metadata });
// erro inesperado:     return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "..." }, t, requestId);
```

Imports: `fail`, `ok` de `@/lib/api/wrappers`; `audit` de `@/lib/audit`; `requireRole` de `@/lib/auth/require-role`; `falhaInesperadaDoQuadro` de `@/lib/escale/capa/banco`; `lerJson` de `@/lib/escale/origens/respostas`; `traduzir` de `@/lib/i18n/dicionario`; `requireSupportWrite` de `@/lib/impersonate/support`; `createClient` de `@/lib/supabase/server`; `createAdminClient` de `@/lib/supabase/admin`.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2E`. Sem a casca, nenhum muda o comportamento.

| Arquivo | Mudança | PR |
|---|---|---|
| `supabase/baseline.sql` | bloco da 9106 logo depois do bloco da 9105 | A |
| `app/app/contacts/[id]/page.tsx` | com a casca e sem `pagina=completa`, `ListaDeContatos` | B |
| `lib/i18n/dicionario.ts` | blocos novos logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` | A, B |
| `lib/audit/actions.ts` | `"contact.note_added"`, `"contact.note_edited"`, `"contact.note_removed"` logo depois das ações da 2D (a mescla usa a `"contact.merged"` do original) | A |

Os do fork que mudam: `lib/escale/negocio/notas.ts`, `hooks/escale/{useNotasDoNegocio,useHistoricoDoNegocio,useGravarContato,useEstadoDaListaDeContatos}.ts`, `components/escale/negocio/{JanelaDeNota,AcoesDaFicha,MenuDaFicha,ConteudoDaAba,TagsDaFicha}.tsx`, `components/escale/negocio/abas/{AbasDeCampos,AbaConversas,AbaArquivos,AbaHistorico,CartaoDoHistorico}.tsx`, `components/escale/contatos/{ListaDeContatos,TabelaDeContatos,CelulasDoContato,MenuDaLinha,SeloDeMescla,FotoDaLinha}.tsx`.

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-ficha-janela-de-nota.test.tsx` | `<JanelaDeNota leadId="n1" …>` | a prop vira `alvo={{ tipo: "negocio", id: "n1" }}` (Task 6) |
| `tests/unit/escale-ficha-aba-historico.test.tsx` | `<AbaHistorico lead={…} stages={…}>` | vira `alvo` + `nomesDasEtapas` (Task 8) |
| `tests/unit/escale-ficha-aba-conversas.test.tsx`, `escale-ficha-abas-campos-conversas-arquivos.test.tsx` | `AbaConversas`/`AbaArquivos`/`AbaContato`/`AbaEmpresa` com `lead`; a direita vazia "Selecione uma conversa" sempre | recebem `contatoId`; a primeira sessão abre à direita (Tasks 6, 7) |
| `tests/unit/escale-lista-de-contatos-tela.test.tsx` (ou o arquivo da 2A que testa a `TabelaDeContatos`) | o nome com `href="/app/contacts/{id}"` | o `href` continua; o clique abre a janela (Task 9) |
| o teste do `SeloDeMescla` da 2A (procure `SeloDeMescla` em `tests/unit`) | conta os grupos do `useContactDuplicates` e abre o `MergeDialog` | conta as sugestões novas e abre a `JanelaDeMescla` (Task 10) |

### Cercas que precisam ficar verdes

`controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`, `evidencia-citada`, `escale-casca-v2-original-intacto` (as telas do original não importam `@/components/escale/`; o encaixe na `page.tsx` é permitido como na 2A), `navegacao-completude` (nenhuma `page.tsx` nova), `i18n-espanhol-cobre-a-tela` (Tasks 5 e 11), `rls-completude-varredura` (nenhuma tabela nova), `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura` (a 9106 não cria definer), `manifest-x-migrations`, `audit-lista-do-painel-e-derivada`.

### Verificação (regra de 18/10: executa tudo, testa tudo, publica tudo)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, typecheck e eslint dos arquivos alterados.
2. **`test:db`:** só na Task 2.
3. **Nenhuma rodada cheia e nenhum revisor por PR.** A bateria e a revisão (Opus 5.5) ficam para o fim da Frente B.
4. Comandos longos em segundo plano.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas, números e moeda no formato brasileiro (`formatarMoeda`/`Intl` com `pt-BR`).

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/mescla/regras.ts` | novo | A | critérios, pesos, confiança, faixas, agrupar, filtrar, ordenar, escolhas, prioridade, schemas |
| `supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql`, `supabase/baseline.sql` | novo / bloco | A | chave do telefone, chaves de mescla, mesclar com escolhas, nota do contato |
| `lib/escale/mescla/banco.ts` | novo | A | ler as sugestões, reler os contatos, montar os valores, mesclar um grupo, os erros |
| `app/api/v1/mesclas/sugestoes/route.ts`, `app/api/v1/mesclas/route.ts`, `app/api/v1/mesclas/em-massa/route.ts` | novos | A | rotas da mescla |
| `lib/escale/ficha-do-contato/regras.ts`, `lib/escale/ficha-do-contato/banco.ts` | novos | A | abas, URL, negócios do contato, notas no histórico |
| `lib/escale/negocio/notas.ts` | alterado | A | `AlvoDaNota`, `lead_id` nulo, a rota por alvo |
| `app/api/v1/contatos/[id]/negocios/route.ts`, `app/api/v1/contatos/[id]/notas/route.ts`, `app/api/v1/contatos/[id]/notas/[notaId]/route.ts` | novos | A | rotas da ficha do contato |
| `hooks/escale/{useNotasDoNegocio,useHistoricoDoNegocio,useGravarContato}.ts` | alterados | B | alvo; origem opcional |
| `components/escale/negocio/{JanelaDeNota,AcoesDaFicha,MenuDaFicha,ConteudoDaAba,TagsDaFicha}.tsx`, `components/escale/negocio/abas/{AbasDeCampos,AbaConversas,AbaArquivos,AbaHistorico,CartaoDoHistorico}.tsx` | alterados | B | abas por contato e por alvo |
| `components/escale/negocio/abas/ConversaEmLeitura.tsx` | novo | B | a conversa à direita (N7) |
| `hooks/escale/{useContatoAberto,useNegociosDoContato,useSugestoesDeMescla}.ts` | novos | B | URL, negócios, mescla (o histórico do contato é o `useHistorico` por alvo, em `useHistoricoDoNegocio.ts`) |
| `components/escale/contatos/ficha/{JanelaDoContato,CabecalhoDoContato,NomeDoContato,AbaNegociosDoContato}.tsx` | novos | B | a janela do contato |
| `components/escale/contatos/mescla/{JanelaDeMescla,ListaDeSugestoes,FiltrosDaMescla,ComparacaoDaMescla,MesclaEmMassa,EtapasDaMescla,SeloDaConfianca}.tsx` | novos | B | a janela de mescla |
| `components/escale/contatos/{ListaDeContatos,TabelaDeContatos,CelulasDoContato,MenuDaLinha,SeloDeMescla,FotoDaLinha}.tsx`, `hooks/escale/useEstadoDaListaDeContatos.ts` | alterados | B | abrir a janela; o selo abre a mescla |
| `app/app/contacts/[id]/page.tsx` | encaixe | B | a casca |
| `lib/audit/actions.ts`, `lib/i18n/dicionario.ts` | alterados | A, B | ação, espanhol |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md` | alterados (fora do repositório) | A, B | linha da 2E; F5 |

---

# PR A — Banco e rotas (C2, C3 no servidor)

### Task 1: Worktree, base e as regras puras da mescla

**Files:**
- Create: `lib/escale/mescla/regras.ts`, `tests/unit/escale-mescla-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-18-fase-2e-ficha-do-contato-e-mescla.md`

**Interfaces:**
- Consumes: `chaveDeTelefone(valor)` de `@/lib/contacts/duplicados` (a chave do telefone com o nono dígito, já usada pelo original).
- Produces: `REGRAS_DE_MESCLA`, `RegraDeMescla`, `ROTULO_DA_REGRA`, `PESO_DA_REGRA`, `PESO_DO_CONFLITO`, `confianca(casou, conflitos): number`, `FaixaDeConfianca`, `faixaDaConfianca(pct)`, `ROTULO_DA_FAIXA`, `ContatoDaMescla`, `ChaveDeMescla`, `Sugestao`, `MAX_CONTATOS_DO_GRUPO = 20`, `montarSugestoes(chaves, contatos): Sugestao[]`, `ORDENS_DA_MESCLA`, `OrdemDaMescla`, `ROTULO_DA_ORDEM`, `consultaDeSugestoesSchema`, `ConsultaDeSugestoes`, `filtrarSugestoes(lista, consulta)`, `ordenarSugestoes(lista, ordem)`, `CAMPOS_DA_MESCLA`, `CampoDaMescla`, `ROTULO_DO_CAMPO_DA_MESCLA`, `Escolhas`, `valorDoCampo(contato, campo)`, `escolhasPadrao(contatos)`, `estadoDoCampo(contatos, campo)`, `contatoResultante(contatos, escolhas)`, `principalDasEscolhas(contatos, escolhas)`, `PRIORIDADES`, `Prioridade`, `ROTULO_DA_PRIORIDADE`, `principalPorPrioridade(contatos, prioridade)`, `MAX_GRUPOS_EM_MASSA = 100`, `mesclarSchema`, `mesclarEmMassaSchema`.

- [ ] **Step 1: Worktree e base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git fetch escale-crm
git switch -c feat/fase-2e-ficha-e-mescla-banco escale-crm/main
ls supabase/migrations | grep -E "_910[0-9]_"
ls lib/escale/campos lib/escale/empresas
grep -n "export async function trocarEmpresaDoContato\|export async function empresaDoContato" lib/escale/empresas/banco.ts
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
```

Expected: 9101 a 9105 na lista, **nenhuma 9106**; `lib/escale/campos` com `da-ficha.ts` (2C); `lib/escale/empresas` com `regras.ts` e `banco.ts` (2D) e as duas funções. Sem a 2C ou a 2D, PARE. Copie este plano para `docs/superpowers/plans/`.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-mescla-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  confianca,
  consultaDeSugestoesSchema,
  contatoResultante,
  escolhasPadrao,
  estadoDoCampo,
  faixaDaConfianca,
  filtrarSugestoes,
  mesclarEmMassaSchema,
  mesclarSchema,
  montarSugestoes,
  ordenarSugestoes,
  principalDasEscolhas,
  principalPorPrioridade,
  type ContatoDaMescla,
  type Sugestao,
} from "@/lib/escale/mescla/regras";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const contato = (n: number, extra: Partial<ContatoDaMescla> = {}): ContatoDaMescla => ({
  id: ID(n),
  nome: `Contato ${n}`,
  telefone: null,
  email: null,
  instagram: null,
  whatsapp: null,
  empresa: null,
  tags: [],
  criado_em: `2026-10-0${n}T10:00:00Z`,
  atualizado_em: `2026-10-0${n}T10:00:00Z`,
  atendimento_ativo: false,
  ...extra,
});

describe("confiança (N10)", () => {
  it("um critério forte sozinho, combinados e com conflito", () => {
    expect(confianca(["telefone"], [])).toBe(90);
    expect(confianca(["email"], [])).toBe(85);
    expect(confianca(["instagram"], [])).toBe(70);
    expect(confianca(["telefone", "nome"], [])).toBe(94);
    expect(confianca(["instagram"], ["telefone"])).toBe(40);
    expect(confianca(["nome"], ["telefone", "email", "instagram"])).toBe(0);
  });

  it("faixas da Clint: 85 Alta, 65 Média, abaixo Baixa", () => {
    expect(faixaDaConfianca(85)).toBe("alta");
    expect(faixaDaConfianca(84)).toBe("media");
    expect(faixaDaConfianca(65)).toBe("media");
    expect(faixaDaConfianca(64)).toBe("baixa");
  });
});

describe("montarSugestoes", () => {
  it("une pelas chaves (encadeado), soma nome e empresa, marca conflito e bloqueio", () => {
    const contatos = new Map(
      [
        contato(1, { nome: "Ana Souza", telefone: "+5543998031566", atendimento_ativo: true }),
        contato(2, { nome: "ana  souza", telefone: "+554398031566", email: "ana@x.com" }),
        contato(3, { nome: "Ána Souza", email: "ana@x.com", telefone: "+5511999990000", atendimento_ativo: true }),
        contato(4, { nome: "Sozinho", telefone: "+5521988887777" }),
      ].map((c) => [c.id, c]),
    );
    const sugestoes = montarSugestoes(
      [
        { contato_id: ID(1), regra: "telefone", chave: "5543998031566" },
        { contato_id: ID(2), regra: "telefone", chave: "5543998031566" },
        { contato_id: ID(2), regra: "email", chave: "ana@x.com" },
        { contato_id: ID(3), regra: "email", chave: "ana@x.com" },
      ],
      contatos,
    );
    expect(sugestoes).toHaveLength(1);
    const s = sugestoes[0]!;
    expect(s.chave).toBe(ID(1));
    expect(s.contatos.map((c) => c.id)).toEqual([ID(1), ID(2), ID(3)]);
    expect(s.casou).toEqual(["telefone", "email", "nome"]);
    expect(s.conflitos).toEqual(["telefone"]);
    expect(s.bloqueada).toBe(true);
    expect(s.confianca).toBe(confianca(["telefone", "email", "nome"], ["telefone"]));
    expect(s.criada_em).toBe("2026-10-03T10:00:00Z");
  });

  it("grupo com mais de 20 contatos fica fora", () => {
    const muitos = Array.from({ length: 21 }, (_, i) => contato(i + 1));
    const sugestoes = montarSugestoes(
      muitos.map((c) => ({ contato_id: c.id, regra: "email" as const, chave: "igual@x.com" })),
      new Map(muitos.map((c) => [c.id, c])),
    );
    expect(sugestoes).toEqual([]);
  });
});

const sugestao = (n: number, extra: Partial<Sugestao> = {}): Sugestao => ({
  chave: ID(n),
  contatos: [contato(n, { nome: `Pessoa ${n}`, telefone: "+5543998031566", tags: ["vip"] }), contato(n + 10)],
  casou: ["telefone"],
  conflitos: [],
  confianca: 90,
  bloqueada: false,
  criada_em: `2026-10-0${n}T10:00:00Z`,
  ...extra,
});

describe("consulta, filtro e ordem", () => {
  it("o padrão: maior confiança, 0 a 100, página 1 de 20", () => {
    expect(consultaDeSugestoesSchema.parse({})).toEqual({
      q: "",
      ordem: "maior_confianca",
      regras: [],
      min: 0,
      max: 100,
      tags: [],
      validos: false,
      p: 1,
      n: 20,
    });
    expect(consultaDeSugestoesSchema.parse({ regras: "telefone,email", tags: "vip", validos: "1" })).toMatchObject({
      regras: ["telefone", "email"],
      tags: ["vip"],
      validos: true,
    });
    expect(consultaDeSugestoesSchema.safeParse({ regras: "cpf" }).success).toBe(false);
  });

  it("filtra por busca, critério, faixa, tag, contato e telefone válido", () => {
    const lista = [
      sugestao(1),
      sugestao(2, { casou: ["email"], confianca: 85 }),
      sugestao(3, { confianca: 40 }),
    ];
    const base = consultaDeSugestoesSchema.parse({});
    expect(filtrarSugestoes(lista, { ...base, q: "pessoa 2" }).map((s) => s.chave)).toEqual([ID(2)]);
    expect(filtrarSugestoes(lista, { ...base, q: "98031566" })).toHaveLength(3);
    expect(filtrarSugestoes(lista, { ...base, regras: ["email"] }).map((s) => s.chave)).toEqual([ID(2)]);
    expect(filtrarSugestoes(lista, { ...base, min: 50 })).toHaveLength(2);
    expect(filtrarSugestoes(lista, { ...base, tags: ["outra"] })).toHaveLength(0);
    expect(filtrarSugestoes(lista, { ...base, contato: ID(13) }).map((s) => s.chave)).toEqual([ID(3)]);
    const invalida = sugestao(4, { contatos: [contato(4, { telefone: "+55123" }), contato(14)] });
    expect(filtrarSugestoes([invalida], { ...base, validos: true })).toHaveLength(0);
  });

  it("ordena por confiança e por data", () => {
    const lista = [sugestao(1, { confianca: 70 }), sugestao(2, { confianca: 95 }), sugestao(3, { confianca: 70 })];
    expect(ordenarSugestoes(lista, "maior_confianca").map((s) => s.chave)).toEqual([ID(2), ID(1), ID(3)]);
    expect(ordenarSugestoes(lista, "menor_confianca").map((s) => s.chave)).toEqual([ID(1), ID(3), ID(2)]);
    expect(ordenarSugestoes(lista, "mais_recentes").map((s) => s.chave)).toEqual([ID(3), ID(2), ID(1)]);
    expect(ordenarSugestoes(lista, "mais_antigas").map((s) => s.chave)).toEqual([ID(1), ID(2), ID(3)]);
  });
});

describe("escolhas por campo (N11)", () => {
  const a = contato(1, { nome: "Ana", telefone: "+5543998031566", email: null, empresa: null });
  const b = contato(2, { nome: "Ana Souza", telefone: "+5543998031566", email: "ana@x.com", empresa: { id: ID(99), nome: "Atlas" } });

  it("o padrão é o primeiro que tem o valor", () => {
    expect(escolhasPadrao([a, b])).toEqual({ nome: ID(1), email: ID(2), telefone: ID(1), empresa: ID(2) });
  });

  it("o estado de cada campo", () => {
    expect(estadoDoCampo([a, b], "telefone")).toBe("igual");
    expect(estadoDoCampo([a, b], "email")).toBe("unico");
    expect(estadoDoCampo([a, b], "nome")).toBe("decidir");
    expect(estadoDoCampo([a, b], "instagram")).toBe("vazio");
  });

  it("o contato resultante e o principal (dono do nome)", () => {
    const escolhas = { ...escolhasPadrao([a, b]), nome: ID(2) };
    expect(contatoResultante([a, b], escolhas)).toEqual({
      nome: "Ana Souza",
      email: "ana@x.com",
      telefone: "+5543998031566",
      instagram: null,
      empresa: "Atlas",
    });
    expect(principalDasEscolhas([a, b], escolhas)).toBe(ID(2));
    expect(principalDasEscolhas([a, b], {})).toBe(ID(1));
  });

  it("prioridade da mescla em massa", () => {
    const novo = contato(3, { criado_em: "2026-10-09T00:00:00Z", atualizado_em: "2026-10-01T00:00:00Z" });
    const velho = contato(4, { criado_em: "2026-10-01T00:00:00Z", atualizado_em: "2026-10-09T00:00:00Z" });
    expect(principalPorPrioridade([velho, novo], "criado_por_ultimo")).toBe(novo.id);
    expect(principalPorPrioridade([velho, novo], "criado_por_primeiro")).toBe(velho.id);
    expect(principalPorPrioridade([velho, novo], "atualizado_por_ultimo")).toBe(velho.id);
    expect(principalPorPrioridade([velho, novo], "atualizado_por_primeiro")).toBe(novo.id);
  });
});

describe("schemas das rotas", () => {
  it("mesclar: principal fora dos secundários, sem repetidos, escolha só dos contatos do grupo", () => {
    const ok = { principal_id: ID(1), secundarios: [ID(2)], escolhas: { email: ID(2) } };
    expect(mesclarSchema.safeParse(ok).success).toBe(true);
    expect(mesclarSchema.safeParse({ ...ok, secundarios: [ID(1)] }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, secundarios: [ID(2), ID(2)] }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, escolhas: { email: ID(9) } }).success).toBe(false);
    expect(mesclarSchema.safeParse({ ...ok, escolhas: { cpf: ID(2) } }).success).toBe(false);
  });

  it("em massa: 1 a 100 grupos de 2 a 20, com a prioridade", () => {
    const grupo = [ID(1), ID(2)];
    expect(mesclarEmMassaSchema.safeParse({ grupos: [grupo], prioridade: "criado_por_ultimo" }).success).toBe(true);
    expect(mesclarEmMassaSchema.safeParse({ grupos: [], prioridade: "criado_por_ultimo" }).success).toBe(false);
    expect(mesclarEmMassaSchema.safeParse({ grupos: Array(101).fill(grupo), prioridade: "criado_por_ultimo" }).success).toBe(false);
    expect(mesclarEmMassaSchema.safeParse({ grupos: [[ID(1)]], prioridade: "criado_por_ultimo" }).success).toBe(false);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-mescla-regras.test.ts`
Expected: FAIL com "Failed to resolve import \"@/lib/escale/mescla/regras\"".

- [ ] **Step 4: A implementação**

Create `lib/escale/mescla/regras.ts`:

```ts
import { z } from "zod";

import { chaveDeTelefone } from "@/lib/contacts/duplicados";

/**
 * AS REGRAS DA MESCLA DA CASCA (fork Escale, Fase 2E; C2; Clint `DuplicateContactsV2`
 * e `scoreTier`). Puras: rodam igual no servidor e no teste. As sugestões são
 * calculadas na hora (Q7): o banco devolve as chaves que repetem, aqui se agrupa
 * (união), se pontua (N10), se filtra e se ordena. A escolha por campo manda ids,
 * nunca valores (N11).
 */

// ─── Critérios e confiança ───────────────────────────────────────────────────
export const REGRAS_DE_MESCLA = ["whatsapp", "telefone", "email", "instagram", "nome", "empresa"] as const;
export type RegraDeMescla = (typeof REGRAS_DE_MESCLA)[number];

export const ROTULO_DA_REGRA: Readonly<Record<RegraDeMescla, string>> = {
  whatsapp: "ID do WhatsApp",
  telefone: "Telefone",
  email: "E-mail",
  instagram: "Instagram",
  nome: "Nome",
  empresa: "Organização",
};

export const PESO_DA_REGRA: Readonly<Record<RegraDeMescla, number>> = {
  whatsapp: 0.95,
  telefone: 0.9,
  email: 0.85,
  instagram: 0.7,
  nome: 0.35,
  empresa: 0.2,
};

export const PESO_DO_CONFLITO: Readonly<Partial<Record<RegraDeMescla, number>>> = {
  telefone: 0.3,
  email: 0.15,
  instagram: 0.15,
};

/** 0 a 100: `1 − Π(1 − peso)` dos que casaram, menos a soma dos conflitos. */
export function confianca(casou: readonly RegraDeMescla[], conflitos: readonly RegraDeMescla[]): number {
  const junta = 1 - casou.reduce((acc, r) => acc * (1 - PESO_DA_REGRA[r]), 1);
  const menos = conflitos.reduce((acc, r) => acc + (PESO_DO_CONFLITO[r] ?? 0), 0);
  return Math.round(Math.min(1, Math.max(0, junta - menos)) * 100);
}

export const FAIXA_ALTA = 85;
export const FAIXA_MEDIA = 65;
export type FaixaDeConfianca = "alta" | "media" | "baixa";
export const ROTULO_DA_FAIXA: Readonly<Record<FaixaDeConfianca, string>> = {
  alta: "Alta",
  media: "Média",
  baixa: "Baixa",
};

export function faixaDaConfianca(pct: number): FaixaDeConfianca {
  if (pct >= FAIXA_ALTA) return "alta";
  if (pct >= FAIXA_MEDIA) return "media";
  return "baixa";
}

// ─── Sugestões ───────────────────────────────────────────────────────────────
export interface ContatoDaMescla {
  id: string;
  nome: string | null;
  telefone: string | null;
  email: string | null;
  /** O link do Instagram como está no contato (`custom_fields.link_instagram`). */
  instagram: string | null;
  whatsapp: string | null;
  empresa: { id: string; nome: string } | null;
  tags: string[];
  criado_em: string;
  atualizado_em: string;
  atendimento_ativo: boolean;
}

/** O que `fn_escale_chaves_de_mescla` devolve: só as chaves que repetem. */
export interface ChaveDeMescla {
  contato_id: string;
  regra: "whatsapp" | "telefone" | "email" | "instagram";
  chave: string;
}

export interface Sugestao {
  /** O menor id do grupo: estável entre chamadas. */
  chave: string;
  /** O mais antigo primeiro. */
  contatos: ContatoDaMescla[];
  casou: RegraDeMescla[];
  conflitos: RegraDeMescla[];
  confianca: number;
  /** Dois ou mais com atendimento ativo (N12). */
  bloqueada: boolean;
  /** O `criado_em` mais novo do grupo ("Mais recentes"). */
  criada_em: string;
}

export const MAX_CONTATOS_DO_GRUPO = 20;

const normalizarNome = (nome: string | null): string =>
  (nome ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();

const valoresDistintos = (valores: Array<string | null>): Set<string> =>
  new Set(valores.filter((v): v is string => !!v));

const ordemDasRegras = (regras: Set<RegraDeMescla>): RegraDeMescla[] =>
  REGRAS_DE_MESCLA.filter((r) => regras.has(r)).sort(
    (a, b) => PESO_DA_REGRA[b] - PESO_DA_REGRA[a],
  );

export function montarSugestoes(
  chaves: readonly ChaveDeMescla[],
  contatos: ReadonlyMap<string, ContatoDaMescla>,
): Sugestao[] {
  const pai = new Map<string, string>();
  const raiz = (id: string): string => {
    let atual = id;
    while (pai.get(atual) !== atual) {
      const acima = pai.get(atual)!;
      pai.set(atual, pai.get(acima)!);
      atual = pai.get(atual)!;
    }
    return atual;
  };
  const porChave = new Map<string, string[]>();
  for (const c of chaves) {
    if (!contatos.has(c.contato_id)) continue;
    pai.set(c.contato_id, c.contato_id);
    const k = `${c.regra}:${c.chave}`;
    porChave.set(k, [...(porChave.get(k) ?? []), c.contato_id]);
  }
  const regrasDoContato = new Map<string, Set<RegraDeMescla>>();
  for (const [k, ids] of porChave) {
    const regra = k.slice(0, k.indexOf(":")) as RegraDeMescla;
    for (let i = 1; i < ids.length; i++) {
      const ra = raiz(ids[0]!);
      const rb = raiz(ids[i]!);
      if (ra !== rb) pai.set(ra < rb ? rb : ra, ra < rb ? ra : rb);
    }
    for (const id of ids) regrasDoContato.set(id, (regrasDoContato.get(id) ?? new Set()).add(regra));
  }

  const grupos = new Map<string, ContatoDaMescla[]>();
  for (const id of pai.keys()) {
    const r = raiz(id);
    grupos.set(r, [...(grupos.get(r) ?? []), contatos.get(id)!]);
  }

  const lista: Sugestao[] = [];
  for (const membros of grupos.values()) {
    if (membros.length < 2 || membros.length > MAX_CONTATOS_DO_GRUPO) continue;
    const ordenados = [...membros].sort(
      (a, b) => a.criado_em.localeCompare(b.criado_em) || a.id.localeCompare(b.id),
    );
    const casou = new Set<RegraDeMescla>();
    for (const m of ordenados) for (const r of regrasDoContato.get(m.id) ?? []) casou.add(r);
    const nomes = ordenados.map((m) => normalizarNome(m.nome));
    if (nomes[0] && nomes.every((n) => n === nomes[0])) casou.add("nome");
    const empresas = ordenados.map((m) => m.empresa?.id ?? "");
    if (empresas[0] && empresas.every((e) => e === empresas[0])) casou.add("empresa");

    const conflitos = new Set<RegraDeMescla>();
    if (valoresDistintos(ordenados.map((m) => chaveDeTelefone(m.telefone) || null)).size > 1) conflitos.add("telefone");
    if (valoresDistintos(ordenados.map((m) => m.email?.trim().toLowerCase() || null)).size > 1) conflitos.add("email");
    if (valoresDistintos(ordenados.map((m) => m.instagram?.trim().toLowerCase() || null)).size > 1) conflitos.add("instagram");

    const regrasCasou = ordemDasRegras(casou);
    const regrasConflito = ordemDasRegras(conflitos);
    lista.push({
      chave: [...ordenados].map((m) => m.id).sort()[0]!,
      contatos: ordenados,
      casou: regrasCasou,
      conflitos: regrasConflito,
      confianca: confianca(regrasCasou, regrasConflito),
      bloqueada: ordenados.filter((m) => m.atendimento_ativo).length >= 2,
      criada_em: ordenados.reduce((max, m) => (m.criado_em > max ? m.criado_em : max), ordenados[0]!.criado_em),
    });
  }
  return lista;
}

// ─── Consulta, filtro e ordem ────────────────────────────────────────────────
export const ORDENS_DA_MESCLA = ["maior_confianca", "menor_confianca", "mais_recentes", "mais_antigas"] as const;
export type OrdemDaMescla = (typeof ORDENS_DA_MESCLA)[number];
export const ROTULO_DA_ORDEM: Readonly<Record<OrdemDaMescla, string>> = {
  maior_confianca: "Maior confiança",
  menor_confianca: "Menor confiança",
  mais_recentes: "Mais recentes",
  mais_antigas: "Mais antigas",
};

const listaDaUrl = <T extends string>(valores: readonly T[]) =>
  z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((v) => v.trim()).filter(Boolean) : []))
    .pipe(z.array(z.enum(valores as unknown as [T, ...T[]])));

export const consultaDeSugestoesSchema = z.object({
  q: z.string().trim().max(120).default(""),
  ordem: z.enum(ORDENS_DA_MESCLA).default("maior_confianca"),
  regras: listaDaUrl(REGRAS_DE_MESCLA),
  min: z.coerce.number().int().min(0).max(100).default(0),
  max: z.coerce.number().int().min(0).max(100).default(100),
  tags: z
    .string()
    .optional()
    .transform((s) => (s ? s.split(",").map((v) => v.trim()).filter(Boolean) : [])),
  validos: z
    .enum(["1"])
    .optional()
    .transform((v) => v === "1"),
  contato: z.string().uuid().optional(),
  p: z.coerce.number().int().min(1).default(1),
  n: z.coerce.number().int().min(0).max(50).default(20),
});
export type ConsultaDeSugestoes = z.infer<typeof consultaDeSugestoesSchema>;

const digitos = (s: string | null) => (s ?? "").replace(/\D/g, "");
const telefoneValido = (s: string | null) => {
  const d = digitos(s);
  return d.length >= 10 && d.length <= 15;
};

export function filtrarSugestoes(lista: readonly Sugestao[], c: ConsultaDeSugestoes): Sugestao[] {
  const termo = normalizarNome(c.q);
  const termoDigitos = digitos(c.q);
  return lista.filter((s) => {
    if (c.contato && !s.contatos.some((m) => m.id === c.contato)) return false;
    if (s.confianca < c.min || s.confianca > c.max) return false;
    if (c.regras.length > 0 && !c.regras.some((r) => s.casou.includes(r))) return false;
    if (c.tags.length > 0 && !s.contatos.some((m) => m.tags.some((t) => c.tags.includes(t)))) return false;
    if (c.validos && s.contatos.some((m) => m.telefone && !telefoneValido(m.telefone))) return false;
    if (!termo) return true;
    return s.contatos.some(
      (m) =>
        normalizarNome(m.nome).includes(termo) ||
        (termoDigitos.length >= 4 && digitos(m.telefone).includes(termoDigitos)),
    );
  });
}

export function ordenarSugestoes(lista: readonly Sugestao[], ordem: OrdemDaMescla): Sugestao[] {
  const desempate = (a: Sugestao, b: Sugestao) => a.chave.localeCompare(b.chave);
  const copia = [...lista];
  switch (ordem) {
    case "maior_confianca":
      return copia.sort((a, b) => b.confianca - a.confianca || desempate(a, b));
    case "menor_confianca":
      return copia.sort((a, b) => a.confianca - b.confianca || desempate(a, b));
    case "mais_recentes":
      return copia.sort((a, b) => b.criada_em.localeCompare(a.criada_em) || desempate(a, b));
    case "mais_antigas":
      return copia.sort((a, b) => a.criada_em.localeCompare(b.criada_em) || desempate(a, b));
  }
}

// ─── Escolha por campo (N11) ─────────────────────────────────────────────────
export const CAMPOS_DA_MESCLA = ["nome", "email", "telefone", "instagram", "empresa"] as const;
export type CampoDaMescla = (typeof CAMPOS_DA_MESCLA)[number];
export const ROTULO_DO_CAMPO_DA_MESCLA: Readonly<Record<CampoDaMescla, string>> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  instagram: "Instagram",
  empresa: "Organização",
};

/** Campo → id do contato cujo valor fica. */
export type Escolhas = Partial<Record<CampoDaMescla, string>>;

export function valorDoCampo(c: ContatoDaMescla, campo: CampoDaMescla): string | null {
  const bruto = campo === "empresa" ? (c.empresa?.nome ?? null) : c[campo];
  return bruto?.trim() ? bruto : null;
}

export function escolhasPadrao(contatos: readonly ContatoDaMescla[]): Escolhas {
  const escolhas: Escolhas = {};
  for (const campo of CAMPOS_DA_MESCLA) {
    const dono = contatos.find((c) => valorDoCampo(c, campo) !== null);
    if (dono) escolhas[campo] = dono.id;
  }
  return escolhas;
}

export type EstadoDoCampo = "igual" | "unico" | "decidir" | "vazio";

export function estadoDoCampo(contatos: readonly ContatoDaMescla[], campo: CampoDaMescla): EstadoDoCampo {
  const comValor = contatos.map((c) => valorDoCampo(c, campo)).filter((v): v is string => v !== null);
  if (comValor.length === 0) return "vazio";
  if (comValor.length === 1) return "unico";
  const chave = (v: string) => (campo === "telefone" ? chaveDeTelefone(v) : v.trim().toLowerCase());
  return new Set(comValor.map(chave)).size === 1 && comValor.length === contatos.length ? "igual" : "decidir";
}

export function contatoResultante(
  contatos: readonly ContatoDaMescla[],
  escolhas: Escolhas,
): Record<CampoDaMescla, string | null> {
  const resultado = {} as Record<CampoDaMescla, string | null>;
  for (const campo of CAMPOS_DA_MESCLA) {
    const dono = contatos.find((c) => c.id === escolhas[campo]);
    resultado[campo] = dono ? valorDoCampo(dono, campo) : null;
  }
  return resultado;
}

/** O principal (o registro que fica) é o dono do nome escolhido; sem escolha, o mais antigo. */
export function principalDasEscolhas(contatos: readonly ContatoDaMescla[], escolhas: Escolhas): string {
  return contatos.find((c) => c.id === escolhas.nome)?.id ?? contatos[0]!.id;
}

// ─── Mescla em massa ─────────────────────────────────────────────────────────
export const PRIORIDADES = [
  "criado_por_ultimo",
  "criado_por_primeiro",
  "atualizado_por_ultimo",
  "atualizado_por_primeiro",
] as const;
export type Prioridade = (typeof PRIORIDADES)[number];
export const ROTULO_DA_PRIORIDADE: Readonly<Record<Prioridade, string>> = {
  criado_por_ultimo: "Adicionado por último",
  criado_por_primeiro: "Adicionado por primeiro",
  atualizado_por_ultimo: "Atualizado por último",
  atualizado_por_primeiro: "Atualizado por primeiro",
};

export function principalPorPrioridade(contatos: readonly ContatoDaMescla[], prioridade: Prioridade): string {
  const campo = prioridade.startsWith("criado") ? "criado_em" : "atualizado_em";
  const maisNovo = prioridade.endsWith("ultimo");
  return [...contatos].sort((a, b) => {
    const ordem = a[campo].localeCompare(b[campo]);
    return (maisNovo ? -ordem : ordem) || a.id.localeCompare(b.id);
  })[0]!.id;
}

export const MAX_GRUPOS_EM_MASSA = 100;

export const mesclarSchema = z
  .object({
    principal_id: z.string().uuid(),
    secundarios: z.array(z.string().uuid()).min(1).max(MAX_CONTATOS_DO_GRUPO - 1),
    // zod 4: `z.record` com enum exige TODAS as chaves; `partialRecord` aceita só algumas.
    escolhas: z.partialRecord(z.enum(CAMPOS_DA_MESCLA), z.string().uuid()).default({}),
  })
  .strict()
  .refine((m) => !m.secundarios.includes(m.principal_id), { path: ["secundarios"] })
  .refine((m) => new Set(m.secundarios).size === m.secundarios.length, { path: ["secundarios"] })
  .refine(
    (m) => Object.values(m.escolhas).every((id) => id === m.principal_id || m.secundarios.includes(id)),
    { path: ["escolhas"] },
  );
export type PedidoDeMescla = z.infer<typeof mesclarSchema>;

export const mesclarEmMassaSchema = z
  .object({
    grupos: z
      .array(z.array(z.string().uuid()).min(2).max(MAX_CONTATOS_DO_GRUPO))
      .min(1)
      .max(MAX_GRUPOS_EM_MASSA),
    prioridade: z.enum(PRIORIDADES),
  })
  .strict();
export type PedidoDeMesclaEmMassa = z.infer<typeof mesclarEmMassaSchema>;
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-mescla-regras.test.ts`
Expected: PASS. Se o `toBe(94)` de "telefone + nome" der 93 ou 94 por arredondamento, confira a conta (`1 − 0,1 × 0,65 = 0,935` → `Math.round(93,5) = 94`).

- [ ] **Step 6: Typecheck, eslint e commit**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/mescla tests/unit/escale-mescla-regras.test.ts
git add lib/escale/mescla/regras.ts tests/unit/escale-mescla-regras.test.ts docs/superpowers/plans/2026-10-18-fase-2e-ficha-do-contato-e-mescla.md
git commit -m "feat(escale): regras da mescla da casca — sugestões, confiança e escolha por campo (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 2: Migration 9106 — chaves de mescla, mesclar com escolhas e a nota do contato

**Files:**
- Create: `supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql`, `tests/unit/escale-ficha-e-mescla-migration.test.ts`, `tests/invariants/escale-ficha-e-mescla.test.ts`
- Modify: `supabase/baseline.sql` (bloco logo depois do da 9105)

**Interfaces:**
- Produces (invoker, `authenticated` e `service_role`; fechadas a `public` e `anon`):
  - `fn_escale_chave_do_telefone(p_telefone text) returns text` (`immutable`);
  - `fn_escale_chaves_de_mescla(p_org uuid) returns table (contato_id uuid, regra text, chave text)`;
  - `fn_escale_mesclar_contatos(p_org uuid, p_principal uuid, p_secundarios uuid[], p_escolhas jsonb) returns jsonb` (devolve o jsonb do `fn_mesclar_contatos`; erro `identidade_em_uso` com `errcode 23505`).
- `crm_notas_do_negocio.lead_id` aceita nulo; regra `crm_notas_do_negocio_tem_dono` (`lead_id` ou `contact_id`); índice `idx_crm_notas_do_negocio_contato`; as quatro policies refeitas.

- [ ] **Step 1: O teste de forma (vai falhar)**

Create `tests/unit/escale-ficha-e-mescla-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const ARQUIVO = "supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql";
const BASELINE = readFileSync("supabase/baseline.sql", "utf8");
const MIGRATION = existsSync(ARQUIVO) ? readFileSync(ARQUIVO, "utf8") : "";

describe("migration 9106 (ficha do contato e mescla)", () => {
  it("existe, com a linha do manifesto, e está no baseline depois da 9105", () => {
    expect(MIGRATION.startsWith("-- manifest:")).toBe(true);
    const i9105 = BASELINE.indexOf("(migration 9105)");
    const i9106 = BASELINE.indexOf("-- ---- FORK ESCALE · ficha do contato e mescla (migration 9106) ----");
    expect(i9105).toBeGreaterThan(0);
    expect(i9106).toBeGreaterThan(i9105);
  });

  it("as três funções são invoker e fechadas ao anon; nenhuma definer", () => {
    for (const nome of ["fn_escale_chave_do_telefone", "fn_escale_chaves_de_mescla", "fn_escale_mesclar_contatos"]) {
      expect(MIGRATION).toMatch(new RegExp(`function public\\.${nome}\\([\\s\\S]*?security invoker`));
      expect(MIGRATION).toMatch(new RegExp(`revoke all on function public\\.${nome}\\([^)]*\\) from public, anon;`));
      expect(MIGRATION).toMatch(new RegExp(`grant execute on function public\\.${nome}\\([^)]*\\) to authenticated, service_role;`));
    }
    expect(MIGRATION).not.toMatch(/security definer/);
    expect(MIGRATION).toContain("public.fn_mesclar_contatos(p_org, p_principal, p_secundarios)");
  });

  it("as chaves: telefone (e o parkado), e-mail, WhatsApp e Instagram, de 2 a 50 contatos vivos", () => {
    expect(MIGRATION).toContain("telefone_em_conflito");
    expect(MIGRATION).toContain("wa_lid");
    expect(MIGRATION).toContain("link_instagram");
    expect(MIGRATION).toContain("n between 2 and 50");
    expect(MIGRATION).toContain("is_merged_into is null");
  });

  it("a nota do contato: lead_id nulo, a regra do dono, o índice e as quatro policies", () => {
    expect(MIGRATION).toContain("alter column lead_id drop not null");
    expect(MIGRATION).toContain("crm_notas_do_negocio_tem_dono");
    expect(MIGRATION).toContain("idx_crm_notas_do_negocio_contato");
    for (const p of [
      "crm_notas_do_negocio_select",
      "crm_notas_do_negocio_insert",
      "crm_notas_do_negocio_dono_ou_gerente_write",
      "crm_notas_do_negocio_dono_ou_gerente_delete",
    ]) {
      expect(MIGRATION).toContain(`create policy ${p} on public.crm_notas_do_negocio`);
    }
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-e-mescla-migration.test.ts`
Expected: FAIL (o arquivo não existe: o manifesto não casa).

- [ ] **Step 2: A migration**

Create `supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql`:

```sql
-- manifest: **Ficha do contato e mescla da casca (fork Escale, Fase 2E).** `fn_escale_chave_do_telefone` (a chave do telefone com o nono dígito, espelho de `canonicalPhoneBR`); `fn_escale_chaves_de_mescla(p_org)` (invoker: as chaves de telefone — também o parkado em `source_metadata.telefone_em_conflito` —, e-mail, ID do WhatsApp e Instagram que se repetem entre 2 e 50 contatos vivos; o servidor agrupa e pontua); `fn_escale_mesclar_contatos` (invoker: chama o `fn_mesclar_contatos` do original, que confere o papel de gerente e reponta tudo, e grava no principal o nome, o e-mail, o telefone e o Instagram escolhidos, na mesma transação); `crm_notas_do_negocio.lead_id` aceita nulo para a nota do contato, com as policies refeitas (nota solta: a organização vê; agente+ escreve como autor).
-- 9106: ficha do contato e mescla (fork Escale, Frente B).

-- ── 1. A chave do telefone ───────────────────────────────────────────────────
-- Espelha `canonicalPhoneBR` + só dígitos (lib/channels/phone-variants.ts): o celular
-- brasileiro de 12 dígitos (55 + DDD + 8 começando em 6-9) ganha o nono; o resto fica.
create or replace function public.fn_escale_chave_do_telefone(p_telefone text)
returns text
language sql
immutable
parallel safe
security invoker
set search_path = ''
as $$
  select case
    when d = '' then null
    when length(d) = 12 and d like '55%' and substr(d, 3, 2) ~ '^[1-9][0-9]$' and substr(d, 5, 1) ~ '^[6-9]$'
      then '55' || substr(d, 3, 2) || '9' || substr(d, 5)
    else d
  end
  from (select regexp_replace(coalesce(p_telefone, ''), '\D', '', 'g') as d) x;
$$;

revoke all on function public.fn_escale_chave_do_telefone(text) from public, anon;
grant execute on function public.fn_escale_chave_do_telefone(text) to authenticated, service_role;

-- ── 2. As chaves que repetem ─────────────────────────────────────────────────
-- Invoker: lê `contacts` com a RLS de quem pede. Grupos de mais de 50 ficam fora
-- (a Clint chama de "Grupo grande demais para exibir"; o motor aceita até 20).
create or replace function public.fn_escale_chaves_de_mescla(p_org uuid)
returns table (contato_id uuid, regra text, chave text)
language sql
stable
security invoker
set search_path = ''
as $$
  with vivos as (
    select c.id, c.phone_number, c.email_normalized, c.email, c.wa_lid, c.source_metadata, c.custom_fields
      from public.contacts c
     where c.organization_id = p_org
       and c.is_merged_into is null
       and not c.is_anonymized
  ),
  chaves as (
    select id, 'telefone'::text as regra, public.fn_escale_chave_do_telefone(phone_number) as chave from vivos
    union all
    select id, 'telefone', public.fn_escale_chave_do_telefone(source_metadata ->> 'telefone_em_conflito') from vivos
    union all
    select id, 'email', nullif(lower(btrim(coalesce(email_normalized, email))), '') from vivos
    union all
    select id, 'whatsapp', nullif(btrim(wa_lid::text), '') from vivos
    union all
    select id, 'instagram', lower(substring(custom_fields ->> 'link_instagram' from 'instagram\.com/([A-Za-z0-9._]+)')) from vivos
  ),
  validas as (
    select distinct id, regra, chave from chaves where chave is not null and chave <> ''
  ),
  contadas as (
    select id, regra, chave, count(*) over (partition by regra, chave) as n from validas
  )
  select id, regra, chave from contadas where n between 2 and 50;
$$;

revoke all on function public.fn_escale_chaves_de_mescla(uuid) from public, anon;
grant execute on function public.fn_escale_chaves_de_mescla(uuid) to authenticated, service_role;

-- ── 3. Mesclar com as escolhas ───────────────────────────────────────────────
-- Invoker: o `fn_mesclar_contatos` (definer do original) confere o suporte e o papel
-- de gerente pelo `auth.uid()` de quem chama. Depois dele os secundários são lápide
-- (`is_merged_into`) e saem dos índices únicos parciais, então o principal pode receber
-- o telefone ou o e-mail de um deles. Um terceiro contato VIVO com o mesmo valor faz o
-- bloco inteiro voltar (a mescla junto) com `identidade_em_uso`.
create or replace function public.fn_escale_mesclar_contatos(
  p_org uuid,
  p_principal uuid,
  p_secundarios uuid[],
  p_escolhas jsonb default '{}'::jsonb
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $$
declare
  v_resultado jsonb;
  v_escolhas jsonb := coalesce(p_escolhas, '{}'::jsonb);
begin
  begin
    v_resultado := public.fn_mesclar_contatos(p_org, p_principal, p_secundarios);

    if v_escolhas ?| array['nome', 'email', 'telefone', 'instagram'] then
      update public.contacts c
         set name = case when v_escolhas ? 'nome' then coalesce(nullif(btrim(v_escolhas ->> 'nome'), ''), c.name) else c.name end,
             email = case when v_escolhas ? 'email' then coalesce(nullif(btrim(v_escolhas ->> 'email'), ''), c.email) else c.email end,
             phone_number = case when v_escolhas ? 'telefone' then coalesce(nullif(btrim(v_escolhas ->> 'telefone'), ''), c.phone_number) else c.phone_number end,
             custom_fields = case
               when v_escolhas ? 'instagram' and nullif(btrim(v_escolhas ->> 'instagram'), '') is not null
                 then jsonb_set(coalesce(c.custom_fields, '{}'::jsonb), '{link_instagram}', to_jsonb(btrim(v_escolhas ->> 'instagram')))
               else c.custom_fields
             end,
             updated_at = now()
       where c.organization_id = p_org
         and c.id = p_principal;
    end if;
  exception when unique_violation then
    raise exception using errcode = '23505', message = 'identidade_em_uso';
  end;
  return v_resultado;
end;
$$;

revoke all on function public.fn_escale_mesclar_contatos(uuid, uuid, uuid[], jsonb) from public, anon;
grant execute on function public.fn_escale_mesclar_contatos(uuid, uuid, uuid[], jsonb) to authenticated, service_role;

-- ── 4. A nota do contato ─────────────────────────────────────────────────────
alter table public.crm_notas_do_negocio alter column lead_id drop not null;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'crm_notas_do_negocio_tem_dono') then
    alter table public.crm_notas_do_negocio
      add constraint crm_notas_do_negocio_tem_dono check (lead_id is not null or contact_id is not null);
  end if;
end $$;

create index if not exists idx_crm_notas_do_negocio_contato
  on public.crm_notas_do_negocio (organization_id, contact_id, created_at desc);

drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_insert on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio;

-- Nota do negócio: quem vê o negócio (como na 9008). Nota solta do contato: a
-- organização inteira, como o próprio contato (RLS de `contacts` é só por organização).
create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and (case
               when lead_id is null then contact_id is not null
               else exists (select 1 from public.crm_leads l
                             where l.id = crm_notas_do_negocio.lead_id
                               and l.organization_id = crm_notas_do_negocio.organization_id
                               and public.fn_can_view_lead(l.organization_id, l.owner_user_id))
             end))
  );

create policy crm_notas_do_negocio_insert on public.crm_notas_do_negocio
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and (case
               when lead_id is null then contact_id is not null
               else exists (select 1 from public.crm_leads l
                             where l.id = crm_notas_do_negocio.lead_id
                               and l.organization_id = crm_notas_do_negocio.organization_id)
             end))
  );

create policy crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio
  for update using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  );

create policy crm_notas_do_negocio_dono_ou_gerente_delete on public.crm_notas_do_negocio
  for delete using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager'))
        and (lead_id is null
             or exists (select 1 from public.crm_leads l
                         where l.id = crm_notas_do_negocio.lead_id
                           and l.organization_id = crm_notas_do_negocio.organization_id)))
  );

comment on column public.crm_notas_do_negocio.lead_id is
  'Negócio da nota (fork Escale 9008). Nulo desde a 9106: nota do contato, feita pela janela do contato da casca.';
```

**Confira antes de rodar:**
- `contacts.wa_lid` existe e é texto (`grep -n '"wa_lid"' supabase/baseline.sql`); se for outro tipo, o `::text` resolve.
- `contacts.email` tem um gatilho ou coluna gerada que refaz `email_normalized` (`grep -n "email_normalized" supabase/baseline.sql | head`). Se for preenchido só pela aplicação, acrescente no `update` do passo 3: `email_normalized = case when v_escolhas ? 'email' then lower(btrim(v_escolhas ->> 'email')) else c.email_normalized end`.
- As policies da 9008 que este bloco recria são as quatro de cima (`grep -n "create policy crm_notas_do_negocio" supabase/migrations/*9008*`). Se a 1J ou a 1K tiver recriado alguma depois, copie a condição nova e acrescente só o `lead_id is null`.

- [ ] **Step 3: O baseline**

Em `supabase/baseline.sql`, logo depois do fim do bloco da 9105, acrescente:

```sql
-- ---- FORK ESCALE · ficha do contato e mescla (migration 9106) ----
```

e, abaixo, o conteúdo da migration **sem** a linha `-- manifest:`. Rode o teste de forma:

Run: `corepack pnpm vitest run tests/unit/escale-ficha-e-mescla-migration.test.ts tests/unit/manifest-x-migrations.test.ts`
Expected: PASS. (Se o bloco da 9105 não usar o texto `(migration 9105)`, ajuste o `indexOf` do teste ao cabeçalho que a 2D gravou.)

- [ ] **Step 4: O teste contra o Postgres (vai falhar até a migration subir no banco de teste)**

Create `tests/invariants/escale-ficha-e-mescla.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_AGENT_A, GOV_MANAGER, GOV_ORG, GOV_VIEWER, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * FICHA DO CONTATO E MESCLA (fork Escale, migration 9106) — prova contra Postgres
 * real: a chave do telefone com o nono dígito, as chaves que repetem (só da
 * organização de quem pede), a mescla com as escolhas (só gerente+; o telefone do
 * secundário vai para o principal) e a nota solta do contato (organização vê;
 * agente+ escreve; sem negócio nem contato, recusa). Roda via `pnpm test:db`.
 */
const C1 = "e5ca1e00-9106-4000-8000-0000000000c1";
const C2 = "e5ca1e00-9106-4000-8000-0000000000c2";
const C3 = "e5ca1e00-9106-4000-8000-0000000000c3";
const C4 = "e5ca1e00-9106-4000-8000-0000000000c4";
const C5 = "e5ca1e00-9106-4000-8000-0000000000c5";

const chaves = (quem: string, filtro: string) =>
  countAs(quem, `select count(*) from public.fn_escale_chaves_de_mescla('${GOV_ORG}') k where k.contato_id::text like 'e5ca1e00-9106-%' and ${filtro}`);

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_notas_do_negocio where contact_id::text like 'e5ca1e00-9106-%';
    delete from public.contacts where id::text like 'e5ca1e00-9106-%';
    insert into public.contacts (id, organization_id, display_name, phone_number, email, custom_fields, created_at) values
      ('${C1}', '${GOV_ORG}', 'Mescla Um', '+5543998031566', null, '{}'::jsonb, now() - interval '3 days'),
      ('${C2}', '${GOV_ORG}', 'Mescla Dois', '+554398031566', 'mescla9106@x.com', '{"link_instagram":"https://instagram.com/mescla9106"}'::jsonb, now() - interval '2 days'),
      ('${C3}', '${GOV_ORG}', 'Mescla Tres', null, 'mescla9106@x.com', '{"link_instagram":"https://www.instagram.com/Mescla9106/"}'::jsonb, now() - interval '1 day'),
      ('${C4}', '${GOV_ORG}', 'Mescla Quatro', '+5521988887777', null, '{}'::jsonb, now()),
      ('${C5}', '${GOV_ORG}', 'Mescla Cinco', '+5521977776666', null, '{}'::jsonb, now());
  `);
});

describe("fn_escale_chave_do_telefone", () => {
  it("põe o nono no celular de 12 dígitos e mantém o resto", () => {
    expect(sql(`select public.fn_escale_chave_do_telefone('+554398031566');`)).toBe("5543998031566");
    expect(sql(`select public.fn_escale_chave_do_telefone('+5543998031566');`)).toBe("5543998031566");
    expect(sql(`select public.fn_escale_chave_do_telefone('+554332345678');`)).toBe("554332345678");
    expect(sql(`select public.fn_escale_chave_do_telefone('+14155550000');`)).toBe("14155550000");
    expect(sql(`select coalesce(public.fn_escale_chave_do_telefone(''), 'nulo');`)).toBe("nulo");
  });
});

describe("fn_escale_chaves_de_mescla", () => {
  it("telefone com e sem o nono, e-mail e Instagram repetidos; o sozinho fica fora", () => {
    expect(chaves(GOV_VIEWER, `k.regra = 'telefone'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.regra = 'email'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.regra = 'instagram' and k.chave = 'mescla9106'`)).toBe(2);
    expect(chaves(GOV_VIEWER, `k.contato_id = '${C4}'`)).toBe(0);
  });
});

describe("fn_escale_mesclar_contatos", () => {
  it("atendente não mescla", () => {
    expect(() =>
      countAs(GOV_AGENT_A, `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C1}', array['${C2}']::uuid[], '{}'::jsonb)) x`),
    ).toThrow(/insufficient_role/);
  });

  it("gerente mescla e o principal fica com o e-mail escolhido do secundário", () => {
    expect(
      countAs(
        GOV_MANAGER,
        `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C1}', array['${C2}']::uuid[], '{"email":"escolhido9106@x.com","nome":"Mescla Final"}'::jsonb)) x`,
      ),
    ).toBe(1);
    expect(sql(`select is_merged_into from public.contacts where id = '${C2}';`)).toBe(C1);
    expect(sql(`select name || '|' || email from public.contacts where id = '${C1}';`)).toBe("Mescla Final|escolhido9106@x.com");
  });

  it("o telefone de um terceiro contato vivo volta tudo, com identidade_em_uso", () => {
    expect(() =>
      countAs(
        GOV_MANAGER,
        `select count(*) from (select public.fn_escale_mesclar_contatos('${GOV_ORG}', '${C4}', array['${C3}']::uuid[], '{"telefone":"+5521977776666"}'::jsonb)) x`,
      ),
    ).toThrow(/identidade_em_uso/);
    expect(sql(`select coalesce(is_merged_into::text, 'vivo') from public.contacts where id = '${C3}';`)).toBe("vivo");
  });
});

describe("a nota do contato (lead_id nulo)", () => {
  it("atendente grava; a organização vê; sem dono, recusa", () => {
    expect(
      writeCountAs(
        GOV_AGENT_A,
        `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, '${C4}', '${GOV_AGENT_A}', 'nota solta 9106')`,
      ),
    ).toBe(1);
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_notas_do_negocio where contact_id = '${C4}'`)).toBe(1);
    expect(writeCountAs(GOV_VIEWER, `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, '${C4}', '${GOV_VIEWER}', 'leitor não')`)).toBe(0);
    expect(() =>
      sql(`insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', null, null, '${GOV_AGENT_A}', 'sem dono');`),
    ).toThrow(/crm_notas_do_negocio_tem_dono/);
  });
});
```

**Confira antes de rodar:** os nomes `GOV_AGENT_A`, `GOV_MANAGER`, `GOV_VIEWER` e `GOV_ORG` existem em `tests/invariants/gov-helpers.ts` (existem na 2B). Se `contacts.display_name` não bastar e o insert exigir `name`, troque `display_name` por `name` (o teste da 9103 usa `display_name`). Se a `GOV_ORG` tiver `+5521977776666` em outro contato do `seedGov`, troque o número de C5.

- [ ] **Step 5: `test:db`**

```bash
docker info >/dev/null 2>&1 || echo "SEM DOCKER: PARE e peça ao usuário para abrir o Docker Desktop"
corepack pnpm test:db -- tests/invariants/escale-ficha-e-mescla.test.ts tests/invariants/escale-notas-e-arquivos-rls.test.ts
```

Expected: PASS nos dois (o da 9008 continua verde: a nota do negócio não mudou de regra). Se o `test:db` não aceitar arquivo, rode inteiro em segundo plano e leia só esses dois.

- [ ] **Step 6: Commit**

```bash
git add supabase/migrations/20261106120000_9106_ficha_do_contato_e_mescla.sql supabase/baseline.sql tests/unit/escale-ficha-e-mescla-migration.test.ts tests/invariants/escale-ficha-e-mescla.test.ts
git commit -m "feat(escale): migration 9106 — chaves de mescla, mesclar com escolhas e a nota do contato (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 3: A mescla no servidor — `banco.ts` e as três rotas

**Files:**
- Create: `lib/escale/mescla/banco.ts`, `app/api/v1/mesclas/sugestoes/route.ts`, `app/api/v1/mesclas/route.ts`, `app/api/v1/mesclas/em-massa/route.ts`, `tests/unit/escale-mescla-rotas.test.ts`

**Interfaces:**
- Consumes: Task 1 (`montarSugestoes`, `filtrarSugestoes`, `ordenarSugestoes`, `consultaDeSugestoesSchema`, `mesclarSchema`, `mesclarEmMassaSchema`, `principalPorPrioridade`, `CampoDaMescla`, `Escolhas`, `ContatoDaMescla`, `Sugestao`); Task 2 (`fn_escale_chaves_de_mescla`, `fn_escale_mesclar_contatos`); 2D (`trocarEmpresaDoContato(sb, admin, orgId, autor, contatoId, { empresa_id })` de `@/lib/escale/empresas/banco`); `instagramDoLink` de `@/lib/escale/contatos/regras`.
- Produces:
  - `lerSugestoes(sb, orgId, consulta): Promise<{ data: Sugestao[]; total: number }>`;
  - `contatosDaMescla(sb, orgId, ids): Promise<Map<string, ContatoDaMescla>>`;
  - `ResultadoDaMescla = { contato_id: string; contatos_mesclados: string[] }`;
  - `mesclarGrupo(sb, admin, orgId, autor, principal, secundarios, escolhas): Promise<ResultadoDaMescla>` (lança `ErroDaMescla`);
  - `class ErroDaMescla extends Error { codigo: CodigoDoErroDaMescla }`, `respostaDoErroDaMescla(err, t, requestId): Response | null`;
  - rotas: `GET /api/v1/mesclas/sugestoes` → `{ data: Sugestao[], meta: { total } }`; `POST /api/v1/mesclas` → `ResultadoDaMescla`; `POST /api/v1/mesclas/em-massa` → `{ mesclados: ResultadoDaMescla[]; falhas: Array<{ grupo: string[]; erro: string }> }`.

- [ ] **Step 1: O teste das rotas (vai falhar)**

Create `tests/unit/escale-mescla-rotas.test.ts` (o banco mockado no nível de `banco.ts`, como nos testes de rota da 2B):

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = { atual: "manager" as "viewer" | "agent" | "manager" };
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async (minimo: string) => {
    const ordem = ["viewer", "agent", "manager", "admin"];
    if (ordem.indexOf(papel.atual) < ordem.indexOf(minimo)) {
      return { ok: false, response: new Response(JSON.stringify({ error: { code: "forbidden" } }), { status: 403 }) };
    }
    return { ok: true, user: { id: "u1", idioma: "pt-BR" }, org: { orgId: "o1", role: papel.atual } };
  }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));

const banco = vi.hoisted(() => ({
  lerSugestoes: vi.fn(),
  contatosDaMescla: vi.fn(),
  mesclarGrupo: vi.fn(),
}));
vi.mock("@/lib/escale/mescla/banco", async (importar) => {
  const real = await importar<typeof import("@/lib/escale/mescla/banco")>();
  return { ...real, ...banco };
});

import { GET } from "@/app/api/v1/mesclas/sugestoes/route";
import { POST as POST_MESCLAR } from "@/app/api/v1/mesclas/route";
import { POST as POST_EM_MASSA } from "@/app/api/v1/mesclas/em-massa/route";
import { ErroDaMescla } from "@/lib/escale/mescla/banco";

const ID = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, "0")}`;
const pedir = (url: string, corpo?: unknown) =>
  new NextRequest(`http://x${url}`, corpo === undefined ? undefined : { method: "POST", body: JSON.stringify(corpo) });

beforeEach(() => {
  papel.atual = "manager";
  vi.clearAllMocks();
});

describe("GET /api/v1/mesclas/sugestoes", () => {
  it("gerente lê a página com o total", async () => {
    banco.lerSugestoes.mockResolvedValue({ data: [{ chave: ID(1) }], total: 7 });
    const r = await GET(pedir("/api/v1/mesclas/sugestoes?ordem=mais_recentes&n=20"));
    expect(r.status).toBe(200);
    const corpo = await r.json();
    expect(corpo.data).toEqual([{ chave: ID(1) }]);
    expect(corpo.meta.total).toBe(7);
    expect(banco.lerSugestoes.mock.calls[0]![2]).toMatchObject({ ordem: "mais_recentes", n: 20 });
  });

  it("atendente não lê (403) e a consulta inválida dá 422", async () => {
    papel.atual = "agent";
    expect((await GET(pedir("/api/v1/mesclas/sugestoes"))).status).toBe(403);
    papel.atual = "manager";
    expect((await GET(pedir("/api/v1/mesclas/sugestoes?ordem=outra"))).status).toBe(422);
  });
});

describe("POST /api/v1/mesclas", () => {
  it("mescla o grupo com as escolhas", async () => {
    banco.mesclarGrupo.mockResolvedValue({ contato_id: ID(1), contatos_mesclados: [ID(2)] });
    const r = await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)], escolhas: { email: ID(2) } }));
    expect(r.status).toBe(200);
    expect(banco.mesclarGrupo.mock.calls[0]!.slice(2)).toEqual(["o1", "u1", ID(1), [ID(2)], { email: ID(2) }]);
  });

  it("o erro previsto vira a mensagem da Clint", async () => {
    banco.mesclarGrupo.mockRejectedValue(new ErroDaMescla("identidade_em_uso"));
    const r = await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)] }));
    expect(r.status).toBe(409);
    expect((await r.json()).error.message).toBe("Outro contato já usa este telefone");
  });

  it("escolha fora do grupo dá 422; atendente dá 403", async () => {
    expect((await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)], escolhas: { nome: ID(9) } }))).status).toBe(422);
    papel.atual = "agent";
    expect((await POST_MESCLAR(pedir("/api/v1/mesclas", { principal_id: ID(1), secundarios: [ID(2)] }))).status).toBe(403);
  });
});

describe("POST /api/v1/mesclas/em-massa", () => {
  it("cada grupo pela prioridade; a falha de um não para os outros", async () => {
    banco.contatosDaMescla.mockResolvedValue(
      new Map([
        [ID(1), { id: ID(1), criado_em: "2026-10-01", atualizado_em: "2026-10-01" }],
        [ID(2), { id: ID(2), criado_em: "2026-10-05", atualizado_em: "2026-10-01" }],
        [ID(3), { id: ID(3), criado_em: "2026-10-01", atualizado_em: "2026-10-01" }],
        [ID(4), { id: ID(4), criado_em: "2026-10-02", atualizado_em: "2026-10-01" }],
      ]),
    );
    banco.mesclarGrupo
      .mockResolvedValueOnce({ contato_id: ID(2), contatos_mesclados: [ID(1)] })
      .mockRejectedValueOnce(new ErroDaMescla("atendimento_ativo"));
    const r = await POST_EM_MASSA(
      pedir("/api/v1/mesclas/em-massa", { grupos: [[ID(1), ID(2)], [ID(3), ID(4)]], prioridade: "criado_por_ultimo" }),
    );
    expect(r.status).toBe(200);
    const { data } = await r.json();
    expect(banco.mesclarGrupo.mock.calls[0]!.slice(4, 6)).toEqual([ID(2), [ID(1)]]);
    expect(data.mesclados).toHaveLength(1);
    expect(data.falhas).toEqual([{ grupo: [ID(3), ID(4)], erro: "Atendimento ativo impede a mescla deste grupo." }]);
  });

  it("mais de 100 grupos: 'Seleção acima do limite'", async () => {
    const r = await POST_EM_MASSA(
      pedir("/api/v1/mesclas/em-massa", { grupos: Array(101).fill([ID(1), ID(2)]), prioridade: "criado_por_ultimo" }),
    );
    expect(r.status).toBe(422);
    expect((await r.json()).error.message).toBe("Seleção acima do limite");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-mescla-rotas.test.ts`
Expected: FAIL (as rotas não existem).

- [ ] **Step 2: `banco.ts`**

Create `lib/escale/mescla/banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { instagramDoLink } from "@/lib/escale/contatos/regras";
import { trocarEmpresaDoContato } from "@/lib/escale/empresas/banco";
import {
  filtrarSugestoes,
  montarSugestoes,
  ordenarSugestoes,
  type CampoDaMescla,
  type ChaveDeMescla,
  type ConsultaDeSugestoes,
  type ContatoDaMescla,
  type Escolhas,
  type Sugestao,
} from "./regras";

/**
 * A MESCLA DA CASCA NO SERVIDOR (fork Escale, Fase 2E; C2). As leituras usam a
 * sessão (RLS); a mescla chama `fn_escale_mesclar_contatos` com a sessão (o
 * `fn_mesclar_contatos` confere o papel pelo `auth.uid()`), e a empresa escolhida
 * vai pela função da 2D com o service role, logo depois (N11).
 */
type SB = SupabaseClient;

const ATENDIMENTO_ATIVO = ["open", "pending", "claimed", "ai_handling"] as const;
const LOTE = 500;

export type CodigoDoErroDaMescla =
  | "insufficient_role"
  | "contato_principal_indisponivel"
  | "contato_secundario_indisponivel"
  | "identidade_em_uso"
  | "atendimento_ativo"
  | "grupo_mudou"
  | "falhou";

export class ErroDaMescla extends Error {
  constructor(readonly codigo: CodigoDoErroDaMescla) {
    super(codigo);
  }
}

export const TEXTO_DO_ERRO_DA_MESCLA: Readonly<Record<CodigoDoErroDaMescla, string>> = {
  insufficient_role: "Disponível para gerente ou acima.",
  contato_principal_indisponivel: "Estes contatos mudaram durante a mescla",
  contato_secundario_indisponivel: "Estes contatos mudaram durante a mescla",
  identidade_em_uso: "Outro contato já usa este telefone",
  atendimento_ativo: "Atendimento ativo impede a mescla deste grupo.",
  grupo_mudou: "Estes contatos mudaram durante a mescla",
  falhou: "Não foi possível mesclar os contatos",
};

const STATUS_DO_ERRO: Readonly<Record<CodigoDoErroDaMescla, number>> = {
  insufficient_role: 403,
  contato_principal_indisponivel: 409,
  contato_secundario_indisponivel: 409,
  identidade_em_uso: 409,
  atendimento_ativo: 409,
  grupo_mudou: 409,
  falhou: 500,
};

export function statusDoErroDaMescla(codigo: CodigoDoErroDaMescla): number {
  return STATUS_DO_ERRO[codigo];
}

function erroDoBanco(mensagem: string | undefined): ErroDaMescla {
  const bruto = mensagem ?? "";
  const previsto = (Object.keys(TEXTO_DO_ERRO_DA_MESCLA) as CodigoDoErroDaMescla[]).find((c) => bruto.includes(c));
  return new ErroDaMescla(previsto ?? "falhou");
}

async function emLotes<T>(ids: readonly string[], ler: (lote: string[]) => Promise<T[]>): Promise<T[]> {
  const saida: T[] = [];
  for (let i = 0; i < ids.length; i += LOTE) saida.push(...(await ler(ids.slice(i, i + LOTE))));
  return saida;
}

type LinhaDoContato = {
  id: string;
  name: string | null;
  display_name: string | null;
  phone_number: string | null;
  email: string | null;
  wa_lid: string | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  person_id: string | null;
  created_at: string;
  updated_at: string;
};

/** As empresas dos contatos de uma vez: o vínculo principal da pessoa, senão o mais antigo (2D N4). */
async function empresasDasPessoas(sb: SB, orgId: string, pessoas: string[]) {
  const porPessoa = new Map<string, { id: string; nome: string }>();
  if (pessoas.length === 0) return porPessoa;
  const vinculos = await emLotes(pessoas, async (lote) => {
    const { data, error } = await sb
      .from("company_people")
      .select("person_id, company_id, is_primary, created_at, companies(trade_name, legal_name)")
      .eq("organization_id", orgId)
      .in("person_id", lote)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (error) throw error;
    return (data ?? []) as unknown as Array<{
      person_id: string;
      company_id: string;
      companies: { trade_name: string | null; legal_name: string | null } | null;
    }>;
  });
  for (const v of vinculos) {
    if (porPessoa.has(v.person_id)) continue;
    const nome = v.companies?.trade_name?.trim() || v.companies?.legal_name?.trim() || "";
    porPessoa.set(v.person_id, { id: v.company_id, nome });
  }
  return porPessoa;
}

export async function contatosDaMescla(sb: SB, orgId: string, ids: readonly string[]): Promise<Map<string, ContatoDaMescla>> {
  const unicos = [...new Set(ids)];
  const linhas = await emLotes(unicos, async (lote) => {
    const { data, error } = await sb
      .from("contacts")
      .select("id, name, display_name, phone_number, email, wa_lid, custom_fields, tags, person_id, created_at, updated_at")
      .eq("organization_id", orgId)
      .is("is_merged_into", null)
      .in("id", lote);
    if (error) throw error;
    return (data ?? []) as LinhaDoContato[];
  });
  const ativos = new Set(
    (
      await emLotes(unicos, async (lote) => {
        const { data, error } = await sb
          .from("conversations")
          .select("contact_id")
          .eq("organization_id", orgId)
          .in("status", [...ATENDIMENTO_ATIVO])
          .in("contact_id", lote);
        if (error) throw error;
        return (data ?? []) as Array<{ contact_id: string }>;
      })
    ).map((c) => c.contact_id),
  );
  const empresas = await empresasDasPessoas(
    sb,
    orgId,
    linhas.map((l) => l.person_id).filter((p): p is string => !!p),
  );
  return new Map(
    linhas.map((l) => {
      const link = typeof l.custom_fields?.link_instagram === "string" ? l.custom_fields.link_instagram : null;
      const contato: ContatoDaMescla = {
        id: l.id,
        nome: l.name?.trim() || l.display_name?.trim() || null,
        telefone: l.phone_number,
        email: l.email,
        instagram: instagramDoLink(link) ? link : null,
        whatsapp: l.wa_lid,
        empresa: (l.person_id && empresas.get(l.person_id)) || null,
        tags: l.tags ?? [],
        criado_em: l.created_at,
        atualizado_em: l.updated_at,
        atendimento_ativo: ativos.has(l.id),
      };
      return [l.id, contato] as const;
    }),
  );
}

export async function lerSugestoes(
  sb: SB,
  orgId: string,
  consulta: ConsultaDeSugestoes,
): Promise<{ data: Sugestao[]; total: number }> {
  const { data, error } = await sb.rpc("fn_escale_chaves_de_mescla", { p_org: orgId });
  if (error) throw error;
  const chaves = (data ?? []) as ChaveDeMescla[];
  const contatos = await contatosDaMescla(sb, orgId, chaves.map((c) => c.contato_id));
  const todas = ordenarSugestoes(filtrarSugestoes(montarSugestoes(chaves, contatos), consulta), consulta.ordem);
  const inicio = (consulta.p - 1) * consulta.n;
  return { data: todas.slice(inicio, inicio + consulta.n), total: todas.length };
}

export interface ResultadoDaMescla {
  contato_id: string;
  contatos_mesclados: string[];
}

/** Os valores escolhidos, lidos do banco (a tela manda ids, N11). */
function valoresDasEscolhas(contatos: ReadonlyMap<string, ContatoDaMescla>, escolhas: Escolhas) {
  const valores: Partial<Record<Exclude<CampoDaMescla, "empresa">, string>> = {};
  for (const campo of ["nome", "email", "telefone", "instagram"] as const) {
    const dono = escolhas[campo] ? contatos.get(escolhas[campo]!) : undefined;
    const valor = dono?.[campo];
    if (valor) valores[campo] = valor;
  }
  return valores;
}

export async function mesclarGrupo(
  sb: SB,
  admin: SB,
  orgId: string,
  autor: string,
  principal: string,
  secundarios: string[],
  escolhas: Escolhas,
): Promise<ResultadoDaMescla> {
  const contatos = await contatosDaMescla(sb, orgId, [principal, ...secundarios]);
  if (contatos.size !== secundarios.length + 1) throw new ErroDaMescla("grupo_mudou");
  if ([...contatos.values()].filter((c) => c.atendimento_ativo).length >= 2) {
    throw new ErroDaMescla("atendimento_ativo");
  }
  const { data, error } = await sb.rpc("fn_escale_mesclar_contatos", {
    p_org: orgId,
    p_principal: principal,
    p_secundarios: secundarios,
    p_escolhas: valoresDasEscolhas(contatos, escolhas),
  });
  if (error) throw erroDoBanco(error.message);

  const empresaEscolhida = escolhas.empresa ? contatos.get(escolhas.empresa)?.empresa : undefined;
  const empresaAtual = contatos.get(principal)?.empresa;
  if (empresaEscolhida && empresaEscolhida.id !== empresaAtual?.id) {
    await trocarEmpresaDoContato(sb, admin, orgId, autor, principal, { empresa_id: empresaEscolhida.id });
  }
  const resultado = data as { contato_id: string; contatos_mesclados: string[] };
  return { contato_id: resultado.contato_id, contatos_mesclados: resultado.contatos_mesclados };
}
```

**Confira antes de rodar:** a FK embutida `companies(trade_name, legal_name)` no `select` de `company_people` (o PostgREST precisa achar a relação; se der "Could not find a relationship", faça a segunda consulta em `companies` pelos `company_id`, como a 2D faz em `empresaDoContato`); a coluna `contacts.updated_at` existe (`lib/types/contacts.ts` L37); `conversations.organization_id` existe (`grep -n '"organization_id"' supabase/baseline.sql` no bloco de `conversations`).

- [ ] **Step 3: As três rotas**

Create `app/api/v1/mesclas/sugestoes/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerSugestoes } from "@/lib/escale/mescla/banco";
import { consultaDeSugestoesSchema } from "@/lib/escale/mescla/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (C2): as sugestões de mescla da casca, para gerente ou acima (PRD §5). */
export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = consultaDeSugestoesSchema.safeParse(Object.fromEntries(req.nextUrl.searchParams));
  if (!lido.success) {
    return fail("unprocessable_entity", t("Não consegui completar essa ação. Tente de novo."), 422, { requestId });
  }
  try {
    const supabase = await createClient();
    const { data, total } = await lerSugestoes(supabase, authz.org.orgId, lido.data);
    return ok(data, { requestId, meta: { total } });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/mesclas/sugestoes", operacao: "ler as sugestões de mescla" },
      t,
      requestId,
    );
  }
}
```

Create `app/api/v1/mesclas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaMescla, TEXTO_DO_ERRO_DA_MESCLA, mesclarGrupo, statusDoErroDaMescla } from "@/lib/escale/mescla/banco";
import { mesclarSchema } from "@/lib/escale/mescla/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (C2, N11): mescla um grupo com a escolha por campo. */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const pedido = mesclarSchema.safeParse(lido.json);
  if (!pedido.success) {
    return fail("unprocessable_entity", t("São necessários ao menos 2 contatos."), 422, { requestId });
  }
  const { principal_id, secundarios, escolhas } = pedido.data;
  try {
    const supabase = await createClient();
    const resultado = await mesclarGrupo(
      supabase,
      createAdminClient(),
      authz.org.orgId,
      authz.user.id,
      principal_id,
      secundarios,
      escolhas,
    );
    void audit({
      action: "contact.merged",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "contact",
      resourceId: principal_id,
      requestId,
      metadata: { merged_contact_ids: secundarios, campos_escolhidos: Object.keys(escolhas), origem: "casca" },
    });
    return ok(resultado, { requestId });
  } catch (err) {
    if (err instanceof ErroDaMescla) {
      return fail("conflict", t(TEXTO_DO_ERRO_DA_MESCLA[err.codigo]), statusDoErroDaMescla(err.codigo), { requestId });
    }
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "POST /api/v1/mesclas", operacao: "mesclar contatos" },
      t,
      requestId,
    );
  }
}
```

Create `app/api/v1/mesclas/em-massa/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import {
  ErroDaMescla,
  TEXTO_DO_ERRO_DA_MESCLA,
  contatosDaMescla,
  mesclarGrupo,
  type ResultadoDaMescla,
} from "@/lib/escale/mescla/banco";
import { MAX_GRUPOS_EM_MASSA, mesclarEmMassaSchema, principalPorPrioridade } from "@/lib/escale/mescla/regras";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * FORK ESCALE · Fase 2E (C2, Q8): a mescla em massa, na hora, até 100 grupos,
 * um por transação. O principal de cada grupo sai do critério de priorização;
 * sem escolha por campo (como na Clint).
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const bruto = lido.json as { grupos?: unknown[] } | null;
  if (Array.isArray(bruto?.grupos) && bruto.grupos.length > MAX_GRUPOS_EM_MASSA) {
    return fail("unprocessable_entity", t("Seleção acima do limite"), 422, { requestId });
  }
  const pedido = mesclarEmMassaSchema.safeParse(lido.json);
  if (!pedido.success) {
    return fail("unprocessable_entity", t("São necessários ao menos 2 contatos."), 422, { requestId });
  }
  try {
    const supabase = await createClient();
    const admin = createAdminClient();
    const orgId = authz.org.orgId;
    const contatos = await contatosDaMescla(supabase, orgId, pedido.data.grupos.flat());
    const mesclados: ResultadoDaMescla[] = [];
    const falhas: Array<{ grupo: string[]; erro: string }> = [];
    for (const grupo of pedido.data.grupos) {
      const membros = grupo.map((id) => contatos.get(id)).filter((c) => c !== undefined);
      if (membros.length < 2) {
        falhas.push({ grupo, erro: t(TEXTO_DO_ERRO_DA_MESCLA.grupo_mudou) });
        continue;
      }
      const principal = principalPorPrioridade(membros, pedido.data.prioridade);
      const secundarios = membros.map((m) => m.id).filter((id) => id !== principal);
      try {
        const feito = await mesclarGrupo(supabase, admin, orgId, authz.user.id, principal, secundarios, {});
        mesclados.push(feito);
        void audit({
          action: "contact.merged",
          actorUserId: authz.user.id,
          organizationId: orgId,
          resourceType: "contact",
          resourceId: principal,
          requestId,
          metadata: { merged_contact_ids: secundarios, em_massa: true, prioridade: pedido.data.prioridade, origem: "casca" },
        });
      } catch (err) {
        const codigo = err instanceof ErroDaMescla ? err.codigo : "falhou";
        falhas.push({ grupo, erro: t(TEXTO_DO_ERRO_DA_MESCLA[codigo]) });
      }
    }
    return ok({ mesclados, falhas }, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "POST /api/v1/mesclas/em-massa", operacao: "mesclar contatos em massa" },
      t,
      requestId,
    );
  }
}
```

**Confira antes de rodar:** `ok(data, { requestId, meta })` aceita `meta` (a 2A usa `meta` na lista; se a assinatura for outra, siga a de `app/api/v1/contacts/[id]/timeline/route.ts`, que devolve `meta: { cursor, has_more }`); o código `"conflict"` existe no tipo do `fail` (`grep -n "conflict" lib/api/wrappers.ts lib/api/types.ts`); se não existir, use o que a 2D usa para 409.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-mescla-rotas.test.ts tests/unit/escale-mescla-regras.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/mescla app/api/v1/mesclas tests/unit/escale-mescla-rotas.test.ts
git add lib/escale/mescla/banco.ts app/api/v1/mesclas tests/unit/escale-mescla-rotas.test.ts
git commit -m "feat(escale): sugestões de mescla, mesclar com escolhas e em massa no servidor (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 4: A ficha do contato no servidor — negócios e notas do contato

**Files:**
- Create: `lib/escale/ficha-do-contato/regras.ts`, `lib/escale/ficha-do-contato/banco.ts`, `app/api/v1/contatos/[id]/negocios/route.ts`, `app/api/v1/contatos/[id]/notas/route.ts`, `app/api/v1/contatos/[id]/notas/[notaId]/route.ts`, `tests/unit/escale-ficha-do-contato-regras.test.ts`, `tests/unit/escale-ficha-do-contato-rotas.test.ts`
- Modify: `lib/escale/negocio/notas.ts` (`AlvoDaNota`, `rotaDasNotasDoAlvo`, `Nota.lead_id: string | null`), `lib/audit/actions.ts`

**Interfaces:**
- Consumes: `COLUNAS_DA_NOTA`, `notaSchema`, `nomeDoAutor`, `ehPermissaoNegada` de `@/lib/escale/negocio/notas`; `TimelineItemView` de `@/lib/types/contacts`; `tiposDoGrupo`, `ChaveDoGrupo` de `@/lib/escale/negocio/historico`.
- Produces:
  - em `lib/escale/negocio/notas.ts`: `type AlvoDaNota = { tipo: "negocio" | "contato"; id: string }`, `rotaDasNotasDoAlvo(alvo)` (`/api/v1/leads/{id}/notas` ou `/api/v1/contatos/{id}/notas`), `Nota.lead_id: string | null`;
  - em `lib/escale/ficha-do-contato/regras.ts`: `ABAS_DO_CONTATO`, `AbaDoContato`, `ROTULO_DA_ABA_DO_CONTATO`, `PARAM_ABA_DO_CONTATO = "ca"`, `PARAM_PAGINA_COMPLETA = "pagina"`, `ROTA_DA_LISTA_DE_CONTATOS = "/app/contacts"`, `contatoDaRota(caminho)`, `abaDoContato(valor)`, `rotaDoContatoAberto(id, qs, aba)`, `rotaDaListaSemContato(qs)`, `rotaDaPaginaCompleta(id)`, `abasVisiveis(temNegocios)`, `NegocioDoContato`, `ROTULO_DO_STATUS_DO_NEGOCIO`, `negociosParaMostrar(negocios, mostrarArquivados)`, `temPerdido(negocios)`, `notaComoItem(nota)`, `juntarNotasAoHistorico(itens, notas, temMais, grupo)`;
  - em `lib/escale/ficha-do-contato/banco.ts`: `FichaDeNegociosDoContato = { negocios: NegocioDoContato[]; etapas: Record<string, string> }`, `negociosDoContato(sb, orgId, contatoId): Promise<FichaDeNegociosDoContato | null>` (`null` = contato não existe na organização);
  - rotas: `GET /api/v1/contatos/[id]/negocios` → `FichaDeNegociosDoContato`; `GET/POST /api/v1/contatos/[id]/notas` → `Nota[]` / `Nota`; `PATCH/DELETE /api/v1/contatos/[id]/notas/[notaId]`.

- [ ] **Step 1: O teste das regras (vai falhar)**

Create `tests/unit/escale-ficha-do-contato-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  abaDoContato,
  abasVisiveis,
  contatoDaRota,
  juntarNotasAoHistorico,
  negociosParaMostrar,
  rotaDaListaSemContato,
  rotaDaPaginaCompleta,
  rotaDoContatoAberto,
  temPerdido,
  type NegocioDoContato,
} from "@/lib/escale/ficha-do-contato/regras";
import { rotaDasNotasDoAlvo, type Nota } from "@/lib/escale/negocio/notas";
import type { TimelineItemView } from "@/lib/types/contacts";

const ID = "11111111-2222-4333-8444-555555555555";

describe("URL da janela do contato (N1)", () => {
  it("lê o id do caminho e a aba do parâmetro", () => {
    expect(contatoDaRota(`/app/contacts/${ID}`)).toBe(ID);
    expect(contatoDaRota("/app/contacts")).toBeNull();
    expect(contatoDaRota("/app/contacts/novo")).toBeNull();
    expect(abaDoContato("negocios")).toBe("negocios");
    expect(abaDoContato("outra")).toBe("contato");
    expect(abaDoContato(null)).toBe("contato");
  });

  it("abre e fecha mantendo os parâmetros da lista", () => {
    expect(rotaDoContatoAberto(ID, "q=ana&p=2&ca=arquivos", "contato")).toBe(`/app/contacts/${ID}?q=ana&p=2`);
    expect(rotaDoContatoAberto(ID, "q=ana", "negocios")).toBe(`/app/contacts/${ID}?q=ana&ca=negocios`);
    expect(rotaDaListaSemContato("q=ana&ca=negocios")).toBe("/app/contacts?q=ana");
    expect(rotaDaListaSemContato("")).toBe("/app/contacts");
    expect(rotaDaPaginaCompleta(ID)).toBe(`/app/contacts/${ID}?pagina=completa`);
  });

  it("a aba Negócios só com negócio (Q3)", () => {
    expect(abasVisiveis(true)).toEqual(["contato", "empresa", "negocios", "conversas", "arquivos", "historico"]);
    expect(abasVisiveis(false)).toEqual(["contato", "empresa", "conversas", "arquivos", "historico"]);
  });
});

const negocio = (n: number, extra: Partial<NegocioDoContato> = {}): NegocioDoContato => ({
  id: `n${n}`,
  titulo: `Negócio ${n}`,
  origem_id: "o1",
  origem_nome: "Pedidos",
  origem_arquivada: false,
  etapa_nome: "Novo",
  status: "open",
  motivo_de_perda: null,
  valor_cents: null,
  moeda: null,
  dono_id: null,
  dono_nome: null,
  criado_em: `2026-10-0${n}T10:00:00Z`,
  ...extra,
});

describe("negócios do contato (N9)", () => {
  it("arquivados só quando pedidos; 'Motivo de perda' só com perdido", () => {
    const lista = [negocio(1), negocio(2, { origem_arquivada: true }), negocio(3, { status: "lost", motivo_de_perda: "Preço" })];
    expect(negociosParaMostrar(lista, false).map((n) => n.id)).toEqual(["n1", "n3"]);
    expect(negociosParaMostrar(lista, true)).toHaveLength(3);
    expect(temPerdido(lista)).toBe(true);
    expect(temPerdido([negocio(1)])).toBe(false);
  });
});

const nota = (id: string, lead: string | null, quando: string): Nota => ({
  id,
  lead_id: lead,
  contact_id: "c1",
  user_id: "u1",
  user_nome: "Ana",
  texto: "x",
  created_at: quando,
  updated_at: quando,
});
const item = (id: string, quando: string) =>
  ({ id, type: "stage_change", performed_at: quando, payload: {}, metadata: {} }) as unknown as TimelineItemView;

describe("notas no histórico do contato (N8)", () => {
  it("junta só as soltas, em ordem, sem passar do fim da página carregada", () => {
    const itens = [item("a", "2026-10-10T10:00:00Z"), item("b", "2026-10-05T10:00:00Z")];
    const notas = [
      nota("n1", null, "2026-10-08T10:00:00Z"),
      nota("n2", "lead1", "2026-10-09T10:00:00Z"),
      nota("n3", null, "2026-10-01T10:00:00Z"),
    ];
    expect(juntarNotasAoHistorico(itens, notas, true, "todos").map((i) => i.id)).toEqual(["a", "nota-n1", "b"]);
    expect(juntarNotasAoHistorico(itens, notas, false, "todos").map((i) => i.id)).toEqual(["a", "nota-n1", "b", "nota-n3"]);
    const juntos = juntarNotasAoHistorico(itens, notas, false, "todos");
    expect(juntos[1]).toMatchObject({ type: "note", payload: { nota_id: "n1" }, actor_user_name: "Ana" });
  });

  it("um grupo sem notas não recebe nota", () => {
    const itens = [item("a", "2026-10-10T10:00:00Z")];
    expect(juntarNotasAoHistorico(itens, [nota("n1", null, "2026-10-11T10:00:00Z")], false, "automacoes")).toEqual(itens);
  });
});

describe("rota das notas por alvo", () => {
  it("negócio e contato", () => {
    expect(rotaDasNotasDoAlvo({ tipo: "negocio", id: "l1" })).toBe("/api/v1/leads/l1/notas");
    expect(rotaDasNotasDoAlvo({ tipo: "contato", id: "c1" })).toBe("/api/v1/contatos/c1/notas");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-do-contato-regras.test.ts`
Expected: FAIL (o módulo não existe).

- [ ] **Step 2: As notas por alvo**

Em `lib/escale/negocio/notas.ts`:
- troque `lead_id: string;` da interface `Nota` por `lead_id: string | null;` com o comentário `/** Nulo: nota do contato (9106, Fase 2E). */`;
- logo depois de `export const rotaDasNotas = …`, acrescente:

```ts
/** FORK ESCALE · Fase 2E (Q5): a nota é do negócio ou do contato. */
export type AlvoDaNota = { tipo: "negocio" | "contato"; id: string };

export const rotaDasNotasDoAlvo = (alvo: AlvoDaNota) =>
  alvo.tipo === "negocio" ? rotaDasNotas(alvo.id) : `/api/v1/contatos/${alvo.id}/notas`;
```

- [ ] **Step 3: As regras da ficha do contato**

Create `lib/escale/ficha-do-contato/regras.ts`:

```ts
import { tiposDoGrupo, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import type { Nota } from "@/lib/escale/negocio/notas";
import type { TimelineItemView } from "@/lib/types/contacts";

/**
 * A JANELA DO CONTATO (fork Escale, Fase 2E; C3; print 2b-10; Clint `index-BhVJ8kAx`).
 * Puras: abas, URL (N1), negócios (N9) e as notas soltas no histórico (N8).
 */
export const ABAS_DO_CONTATO = ["contato", "empresa", "negocios", "conversas", "arquivos", "historico"] as const;
export type AbaDoContato = (typeof ABAS_DO_CONTATO)[number];
export const ROTULO_DA_ABA_DO_CONTATO: Readonly<Record<AbaDoContato, string>> = {
  contato: "Contato",
  empresa: "Empresa",
  negocios: "Negócios",
  conversas: "Conversas",
  arquivos: "Arquivos",
  historico: "Histórico",
};

export const PARAM_ABA_DO_CONTATO = "ca";
export const PARAM_PAGINA_COMPLETA = "pagina";
export const ROTA_DA_LISTA_DE_CONTATOS = "/app/contacts";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function contatoDaRota(caminho: string): string | null {
  const resto = caminho.startsWith(`${ROTA_DA_LISTA_DE_CONTATOS}/`)
    ? caminho.slice(ROTA_DA_LISTA_DE_CONTATOS.length + 1).split("/")[0]!
    : "";
  return UUID.test(resto) ? resto : null;
}

export function abaDoContato(valor: string | null): AbaDoContato {
  return (ABAS_DO_CONTATO as readonly string[]).includes(valor ?? "") ? (valor as AbaDoContato) : "contato";
}

const semAba = (qs: string) => {
  const p = new URLSearchParams(qs);
  p.delete(PARAM_ABA_DO_CONTATO);
  p.delete(PARAM_PAGINA_COMPLETA);
  return p;
};

export function rotaDoContatoAberto(id: string, qs: string, aba: AbaDoContato): string {
  const p = semAba(qs);
  if (aba !== "contato") p.set(PARAM_ABA_DO_CONTATO, aba);
  const texto = p.toString();
  return `${ROTA_DA_LISTA_DE_CONTATOS}/${id}${texto ? `?${texto}` : ""}`;
}

export function rotaDaListaSemContato(qs: string): string {
  const texto = semAba(qs).toString();
  return `${ROTA_DA_LISTA_DE_CONTATOS}${texto ? `?${texto}` : ""}`;
}

export const rotaDaPaginaCompleta = (id: string) => `${ROTA_DA_LISTA_DE_CONTATOS}/${id}?${PARAM_PAGINA_COMPLETA}=completa`;

export function abasVisiveis(temNegocios: boolean): AbaDoContato[] {
  return ABAS_DO_CONTATO.filter((a) => a !== "negocios" || temNegocios);
}

// ─── Negócios do contato (N9) ────────────────────────────────────────────────
export interface NegocioDoContato {
  id: string;
  titulo: string;
  origem_id: string;
  origem_nome: string;
  /** A origem está arquivada (o "Arquivado" da Clint). */
  origem_arquivada: boolean;
  etapa_nome: string | null;
  status: "open" | "won" | "lost";
  motivo_de_perda: string | null;
  valor_cents: number | null;
  moeda: string | null;
  dono_id: string | null;
  dono_nome: string | null;
  criado_em: string;
}

/** Os rótulos da `StatusDaFicha` (1G). */
export const ROTULO_DO_STATUS_DO_NEGOCIO: Readonly<Record<NegocioDoContato["status"], string>> = {
  open: "Aberto",
  won: "Ganho",
  lost: "Perdido",
};

export function negociosParaMostrar(negocios: readonly NegocioDoContato[], mostrarArquivados: boolean): NegocioDoContato[] {
  return negocios.filter((n) => mostrarArquivados || !n.origem_arquivada);
}

export const temPerdido = (negocios: readonly NegocioDoContato[]) => negocios.some((n) => n.status === "lost");

// ─── Notas soltas no histórico (N8) ──────────────────────────────────────────
export function notaComoItem(nota: Nota): TimelineItemView {
  return {
    id: `nota-${nota.id}`,
    organization_id: "",
    lead_id: "",
    contact_id: nota.contact_id,
    source_module: "escale",
    source_id: nota.id,
    type: "note",
    payload: { nota_id: nota.id },
    metadata: {},
    performed_at: nota.created_at,
    performed_by_user_id: nota.user_id,
    actor_kind: "user",
    actor_user_name: nota.user_nome,
  };
}

/**
 * A linha do tempo do contato (rota do original, por cursor) mais as notas
 * SOLTAS (sem negócio, que não têm linha em `crm_lead_activities`). Com mais
 * páginas por vir, só entram as notas até o item mais antigo já carregado.
 */
export function juntarNotasAoHistorico(
  itens: readonly TimelineItemView[],
  notas: readonly Nota[],
  temMais: boolean,
  grupo: ChaveDoGrupo,
): TimelineItemView[] {
  const tipos = tiposDoGrupo(grupo);
  if (tipos !== null && !tipos.includes("note")) return [...itens];
  const piso = temMais && itens.length > 0 ? itens[itens.length - 1]!.performed_at : null;
  const extras = notas
    .filter((n) => n.lead_id === null && (piso === null || n.created_at >= piso))
    .map(notaComoItem);
  return [...itens, ...extras].sort(
    (a, b) => b.performed_at.localeCompare(a.performed_at) || b.id.localeCompare(a.id),
  );
}
```

**Confira antes de rodar:** `tiposDoGrupo` devolve `null` para "todos" e uma lista de tipos para os outros grupos (é assim que `useHistoricoDoNegocio` o usa); o grupo das notas inclui `"note"`; o teste usa a chave `"automacoes"` (existe: `useHistoricoDoNegocio` a cita). Os campos de `TimelineItemView` acima são os de `lib/types/contacts.ts` L72–107.

Run: `corepack pnpm vitest run tests/unit/escale-ficha-do-contato-regras.test.ts`
Expected: PASS.

- [ ] **Step 4: O teste das rotas (vai falhar)**

Create `tests/unit/escale-ficha-do-contato-rotas.test.ts`:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const papel = { atual: "agent" as "viewer" | "agent" | "manager" };
vi.mock("@/lib/auth/require-role", () => ({
  requireRole: vi.fn(async (minimo: string) => {
    const ordem = ["viewer", "agent", "manager", "admin"];
    if (ordem.indexOf(papel.atual) < ordem.indexOf(minimo)) {
      return { ok: false, response: new Response("{}", { status: 403 }) };
    }
    return { ok: true, user: { id: "u1", idioma: "pt-BR", full_name: "Ana" }, org: { orgId: "o1", role: papel.atual } };
  }),
}));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** Um Supabase falso: cada `from(tabela)` devolve a resposta programada. */
const respostas = new Map<string, { data: unknown; error: unknown }>();
const inseridos: unknown[] = [];
function consulta(tabela: string) {
  const q: Record<string, unknown> = {};
  const fim = () => Promise.resolve(respostas.get(tabela) ?? { data: null, error: null });
  for (const m of ["select", "eq", "is", "in", "order", "update", "delete"]) q[m] = () => q;
  q.insert = (linha: unknown) => {
    inseridos.push(linha);
    return q;
  };
  q.maybeSingle = fim;
  q.single = fim;
  q.then = (ok: (v: unknown) => unknown, erro: (e: unknown) => unknown) => fim().then(ok, erro);
  return q;
}
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({ from: consulta })) }));

const banco = vi.hoisted(() => ({ negociosDoContato: vi.fn() }));
vi.mock("@/lib/escale/ficha-do-contato/banco", () => banco);

import { GET as GET_NEGOCIOS } from "@/app/api/v1/contatos/[id]/negocios/route";
import { GET as GET_NOTAS, POST as POST_NOTA } from "@/app/api/v1/contatos/[id]/notas/route";

const C = "11111111-2222-4333-8444-555555555555";
const ctx = { params: Promise.resolve({ id: C }) };

beforeEach(() => {
  papel.atual = "agent";
  respostas.clear();
  inseridos.length = 0;
  vi.clearAllMocks();
});

describe("GET /api/v1/contatos/[id]/negocios", () => {
  it("devolve os negócios e as etapas; contato de fora dá 404", async () => {
    banco.negociosDoContato.mockResolvedValueOnce({ negocios: [{ id: "n1" }], etapas: { e1: "Novo" } });
    const r = await GET_NEGOCIOS(new NextRequest("http://x"), ctx);
    expect(r.status).toBe(200);
    expect((await r.json()).data).toEqual({ negocios: [{ id: "n1" }], etapas: { e1: "Novo" } });
    banco.negociosDoContato.mockResolvedValueOnce(null);
    expect((await GET_NEGOCIOS(new NextRequest("http://x"), ctx)).status).toBe(404);
  });
});

describe("notas do contato", () => {
  it("POST grava a nota solta (lead_id nulo) com o autor da sessão", async () => {
    respostas.set("contacts", { data: { id: C }, error: null });
    respostas.set("crm_notas_do_negocio", { data: { id: "nt1", lead_id: null, contact_id: C, texto: "oi" }, error: null });
    const r = await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: " oi " }) }), ctx);
    expect(r.status).toBe(201);
    expect(inseridos[0]).toMatchObject({ organization_id: "o1", lead_id: null, contact_id: C, user_id: "u1", texto: "oi" });
  });

  it("leitor não grava; texto vazio dá 422; GET lista", async () => {
    papel.atual = "viewer";
    expect((await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: "x" }) }), ctx)).status).toBe(403);
    papel.atual = "agent";
    respostas.set("contacts", { data: { id: C }, error: null });
    expect((await POST_NOTA(new NextRequest("http://x", { method: "POST", body: JSON.stringify({ texto: "  " }) }), ctx)).status).toBe(422);
    respostas.set("crm_notas_do_negocio", { data: [{ id: "nt1" }], error: null });
    const r = await GET_NOTAS(new NextRequest("http://x"), ctx);
    expect((await r.json()).data).toEqual([{ id: "nt1" }]);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-ficha-do-contato-rotas.test.ts`
Expected: FAIL (as rotas não existem).

- [ ] **Step 5: `banco.ts` e as rotas**

Create `lib/escale/ficha-do-contato/banco.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import type { NegocioDoContato } from "./regras";

/** OS NEGÓCIOS DO CONTATO (fork Escale, Fase 2E; N9): lidos com a sessão, a RLS da 1J decide. */
export interface FichaDeNegociosDoContato {
  negocios: NegocioDoContato[];
  /** id → nome das etapas das origens desses negócios (o Histórico usa). */
  etapas: Record<string, string>;
}

type LinhaDoNegocio = {
  id: string;
  title: string;
  status: "open" | "won" | "lost";
  lost_reason: string | null;
  value_cents: number | null;
  currency: string | null;
  owner_user_id: string | null;
  created_at: string;
  pipeline_id: string;
  stage_id: string;
};

export async function negociosDoContato(
  sb: SupabaseClient,
  orgId: string,
  contatoId: string,
): Promise<FichaDeNegociosDoContato | null> {
  const { data: contato } = await sb
    .from("contacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", contatoId)
    .maybeSingle();
  if (!contato) return null;

  const { data, error } = await sb
    .from("crm_leads")
    .select("id, title, status, lost_reason, value_cents, currency, owner_user_id, created_at, pipeline_id, stage_id")
    .eq("organization_id", orgId)
    .eq("contact_id", contatoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  const linhas = (data ?? []) as LinhaDoNegocio[];
  if (linhas.length === 0) return { negocios: [], etapas: {} };

  const origens = [...new Set(linhas.map((l) => l.pipeline_id))];
  const donos = [...new Set(linhas.map((l) => l.owner_user_id).filter((d): d is string => !!d))];
  const [pipelines, etapas, perfis] = await Promise.all([
    sb.from("crm_pipelines").select("id, name, archived_at").eq("organization_id", orgId).in("id", origens),
    sb.from("crm_stages").select("id, name").in("pipeline_id", origens),
    donos.length > 0
      ? sb.from("profiles").select("id, full_name").in("id", donos)
      : Promise.resolve({ data: [], error: null }),
  ]);
  for (const r of [pipelines, etapas, perfis]) if (r.error) throw r.error;

  const origemPorId = new Map(
    ((pipelines.data ?? []) as Array<{ id: string; name: string; archived_at: string | null }>).map((p) => [p.id, p]),
  );
  const etapaPorId = Object.fromEntries(
    ((etapas.data ?? []) as Array<{ id: string; name: string }>).map((e) => [e.id, e.name]),
  );
  const nomeDoDono = new Map(
    ((perfis.data ?? []) as Array<{ id: string; full_name: string | null }>).map((p) => [p.id, p.full_name]),
  );

  return {
    etapas: etapaPorId,
    negocios: linhas.map((l) => ({
      id: l.id,
      titulo: l.title,
      origem_id: l.pipeline_id,
      origem_nome: origemPorId.get(l.pipeline_id)?.name ?? "",
      origem_arquivada: !!origemPorId.get(l.pipeline_id)?.archived_at,
      etapa_nome: etapaPorId[l.stage_id] ?? null,
      status: l.status,
      motivo_de_perda: l.lost_reason,
      valor_cents: l.value_cents,
      moeda: l.currency,
      dono_id: l.owner_user_id,
      dono_nome: l.owner_user_id ? (nomeDoDono.get(l.owner_user_id) ?? null) : null,
      criado_em: l.created_at,
    })),
  };
}
```

**Confira antes de rodar:** o nome da coluna de arquivo da origem (a 1B gravou o arquivado do funil; `grep -n "archived" supabase/migrations/*9002* supabase/migrations/*9001*`; se for `is_archived boolean` ou ficar em `settings`, troque `archived_at` e a conversão); a tabela de etapas é `crm_stages` com `pipeline_id` e `name` (`grep -n 'CREATE TABLE IF NOT EXISTS "public"."crm_stages"' -A 8 supabase/baseline.sql`); o nome do perfil vem de `profiles.full_name` (é a fonte que `DonoDaFicha` usa; se for outra, use a mesma).

Create `app/api/v1/contatos/[id]/negocios/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { negociosDoContato } from "@/lib/escale/ficha-do-contato/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** FORK ESCALE · Fase 2E (N9): os negócios do contato que quem olha enxerga. */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "contacts" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!z.string().uuid().safeParse(id).success) {
    return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
  }
  try {
    const ficha = await negociosDoContato(await createClient(), authz.org.orgId, id);
    if (!ficha) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
    return ok(ficha, { requestId });
  } catch (err) {
    return falhaInesperadaDoQuadro(
      err as { code?: string; message?: string },
      { rota: "GET /api/v1/contatos/[id]/negocios", operacao: "ler os negócios do contato" },
      t,
      requestId,
    );
  }
}
```

Create `app/api/v1/contatos/[id]/notas/route.ts`:

```ts
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { COLUNAS_DA_NOTA, ehPermissaoNegada, nomeDoAutor, notaSchema, type Nota } from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * AS NOTAS DO CONTATO (fork Escale, Fase 2E; Q5, N8). GET: todas as notas do
 * contato que a RLS deixa ver (as soltas e as dos negócios visíveis). POST: a nota
 * solta (`lead_id` nulo), feita pela janela do contato.
 */
interface RouteCtx {
  params: Promise<{ id: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .select(COLUNAS_DA_NOTA)
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("notas-do-contato.ler", { requestId, error: error.message });
    return fail("internal_error", t("Ocorreu um erro ao carregar as notas."), 500, { requestId });
  }
  return ok((data ?? []) as Nota[], { requestId });
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = notaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("A nota precisa de texto, com até 4.000 caracteres."), 422, { requestId });
  }

  const supabase = await createClient();
  const { data: contato } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!contato) return fail("not_found", t("Não consegui carregar o contato."), 404, { requestId });

  const { data: nota, error } = await supabase
    .from("crm_notas_do_negocio")
    .insert({
      organization_id: authz.org.orgId,
      lead_id: null,
      contact_id: id,
      user_id: authz.user.id,
      user_nome: nomeDoAutor(authz.user),
      texto: parsed.data.texto,
    })
    .select(COLUNAS_DA_NOTA)
    .single();
  if (ehPermissaoNegada(error)) {
    return fail("forbidden", t("Você não tem permissão para anotar neste contato."), 403, { requestId });
  }
  if (error || !nota) {
    logger.error("notas-do-contato.criar", { requestId, error: error?.message });
    return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  }
  const criada = nota as Nota;
  void audit({
    action: "contact.note_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: criada.id,
    requestId,
    metadata: { contact_id: id },
  });
  return ok(criada, { requestId, status: 201 });
}
```

Create `app/api/v1/contatos/[id]/notas/[notaId]/route.ts`: **copie** `app/api/v1/leads/[id]/notas/[notaId]/route.ts` inteiro e troque, nele:
- todo `.eq("lead_id", id)` / `.eq("lead_id", leadId)` por `.eq("contact_id", id)` / `.eq("contact_id", contatoId)` (o parâmetro `leadId` de `recusaSemLinhas` vira `contatoId`);
- `"lead.note_edited"` por `"contact.note_edited"` e `"lead.note_removed"` por `"contact.note_removed"`;
- `metadata: { lead_id: id }` por `metadata: { contact_id: id }`;
- o comentário do topo por `/** FORK ESCALE · Fase 2E (Q5): editar e apagar uma nota do contato (soltas ou de negócio visível; a RLS decide). */`.

Em `lib/audit/actions.ts`, logo depois das ações da 2D, acrescente:

```ts
  // FORK ESCALE · Fase 2E: as notas do contato (migration 9106). O texto da nota nunca vai ao metadata.
  "contact.note_added",
  "contact.note_edited",
  "contact.note_removed",
```

**Confira antes de rodar:** se `lib/audit/actions.ts` tiver uma lista derivada para o painel (guarda `audit-lista-do-painel-e-derivada`), acrescente as três também lá, com o rótulo "Nota do contato adicionada/editada/removida", como a 1H fez com `lead.note_*`.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-do-contato-regras.test.ts tests/unit/escale-ficha-do-contato-rotas.test.ts tests/unit/escale-ficha-notas-rotas.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.ts`
Expected: PASS (o das notas do negócio continua verde: `rotaDasNotas` não mudou).

- [ ] **Step 7: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale/ficha-do-contato lib/escale/negocio/notas.ts "app/api/v1/contatos/[id]/negocios" "app/api/v1/contatos/[id]/notas" lib/audit/actions.ts
git add lib/escale/ficha-do-contato lib/escale/negocio/notas.ts "app/api/v1/contatos/[id]/negocios" "app/api/v1/contatos/[id]/notas" lib/audit/actions.ts tests/unit/escale-ficha-do-contato-regras.test.ts tests/unit/escale-ficha-do-contato-rotas.test.ts
git commit -m "feat(escale): negócios e notas do contato no servidor (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

O `tsc` pode acusar `lead_id: string | null` em quem lia `nota.lead_id` como `string` (procure `\.lead_id` em `components/escale/negocio`); onde a nota é sempre de negócio, use `nota.lead_id ?? ""` e anote `// nota de negócio: lead_id presente`.

---

### Task 5: Espanhol, PRD e o PR A

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`

- [ ] **Step 1: O espanhol dos textos do servidor**

Em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`, acrescente (pule as chaves que já existirem: `grep -n '"Estes contatos mudaram durante a mescla"\|"Seleção acima do limite"' lib/i18n/dicionario.ts`):

```ts
  // ─── FORK ESCALE · Fase 2E (PR A): mescla e notas do contato ───
  "Outro contato já usa este telefone": "Otro contacto ya usa este teléfono",
  "Estes contatos mudaram durante a mescla": "Estos contactos cambiaron durante la fusión",
  "Atendimento ativo impede a mescla deste grupo.": "Una atención activa impide fusionar este grupo.",
  "Não foi possível mesclar os contatos": "No fue posible fusionar los contactos",
  "Seleção acima do limite": "Selección por encima del límite",
  "São necessários ao menos 2 contatos.": "Se necesitan al menos 2 contactos.",
  "Disponível para gerente ou acima.": "Disponible para gerente o superior.",
  "Não consegui carregar o contato.": "No pude cargar el contacto.",
  "Ocorreu um erro ao carregar as notas.": "Ocurrió un error al cargar las notas.",
  "Você não tem permissão para anotar neste contato.": "No tienes permiso para agregar notas a este contacto.",
```

Run: `corepack pnpm vitest run tests/unit/i18n-dicionario.test.ts` (ou o teste do dicionário que existir: `ls tests/unit | grep -i dicionario`)
Expected: PASS (sem chave repetida).

- [ ] **Step 2: O PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, seção 8, linha `| 2E |`: troque o Estado por `PR A (#…) mergeado (banco e rotas: sugestões, mesclar, negócios e notas do contato); PR B em execução`.

- [ ] **Step 3: Gates e o PR A**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint lib/escale app/api/v1/mesclas "app/api/v1/contatos" lib/audit/actions.ts lib/i18n/dicionario.ts
corepack pnpm vitest run tests/unit/escale-mescla-regras.test.ts tests/unit/escale-mescla-rotas.test.ts tests/unit/escale-ficha-e-mescla-migration.test.ts tests/unit/escale-ficha-do-contato-regras.test.ts tests/unit/escale-ficha-do-contato-rotas.test.ts tests/unit/escale-ficha-notas-rotas.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/definer-nova-nasce-exposta.test.ts tests/unit/hardening-definer-varredura.test.ts tests/unit/audit-lista-do-painel-e-derivada.test.ts tests/unit/evidencia-citada.test.ts
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol da mescla e das notas do contato (Fase 2E, PR A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2e-ficha-e-mescla-banco
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2e-ficha-e-mescla-banco --title "Fase 2E (PR A): sugestões de mescla, mesclar com escolhas e as notas do contato" --body-file .superpowers/sdd/2e-a-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

O corpo (`.superpowers/sdd/2e-a-pr.md`) traz: a migration 9106 (as três funções invoker e a nota do contato), as rotas `/api/v1/mesclas/**` e `/api/v1/contatos/[id]/{negocios,notas}`, as decisões Q5–Q9 e N8–N12, o que **não** muda (a mescla do original e as notas do negócio), e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto.**

---

# PR B — Telas: a janela do contato e a janela de mescla (C2, C3, C4)

### Task 6: Branch do PR B e as abas servindo ao contato

**Files:**
- Modify: `hooks/escale/useGravarContato.ts`, `hooks/escale/useNotasDoNegocio.ts`, `components/escale/negocio/{JanelaDeNota,AcoesDaFicha,MenuDaFicha,ConteudoDaAba,TagsDaFicha}.tsx`, `components/escale/negocio/abas/{AbasDeCampos,AbaConversas,AbaArquivos,CartaoDoHistorico,AbaHistorico}.tsx`, `components/escale/contatos/FotoDaLinha.tsx`
- Modify (testes que pinavam a prop antiga): `tests/unit/escale-ficha-janela-de-nota.test.tsx`, `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, `tests/unit/escale-ficha-aba-conversas.test.tsx`, `tests/unit/escale-ficha-aba-arquivos.test.tsx`, `tests/unit/escale-ficha-gravar-contato.test.tsx`
- Create: `tests/unit/escale-abas-por-contato.test.tsx`

**Interfaces:**
- Consumes: `AlvoDaNota`, `rotaDasNotasDoAlvo` (Task 4); da 2C/2D: `ContatoEditavel` usa `useCatalogoDeCampos("contato")`, `camposDoContatoComGrupos`, `useOcultosDaOrigem(pipeline)`; `AbaEmpresa` usa `useEmpresaDoContato(contatoId)`.
- Produces:
  - `useGravarContato(contactId: string, pipelineId: string | null)` (sem origem, não invalida o quadro);
  - `useNotas(alvo: AlvoDaNota)`, `useCriarNota(alvo)`, `useEditarNota(alvo)`, `useExcluirNota(alvo)`, `chaveDasNotas(alvo)` = `["notas", alvo.tipo, alvo.id]`; `useNotasDoNegocio(leadId)` continua (atalho de `useNotas({ tipo: "negocio", id })`);
  - `JanelaDeNota({ alvo, aberta, onFechar, nota? })`;
  - `CartaoDoHistorico({ …, alvo, … })` no lugar de `leadId`;
  - `export function ContatoEditavel({ contatoId, pipeline }: { contatoId: string; pipeline: Pipeline | null })` em `AbasDeCampos.tsx` (`AbaContato({ lead, pipeline })` continua e a chama);
  - `AbaEmpresa({ contatoId }: { contatoId: string | null })`;
  - `AbaConversas({ contatoId, foto }: { contatoId: string | null; foto: ReactNode })`;
  - `AbaArquivos({ contatoId, leadId }: { contatoId: string | null; leadId: string | null })`;
  - `TagsDoContato({ contatoId, pipelineId, tagsDeReserva }: { contatoId: string; pipelineId: string | null; tagsDeReserva?: string[] })` exportada de `TagsDaFicha.tsx` (o `TagsDaFicha({ lead, pipelineId })` passa a só chamá-la);
  - `FotoDaLinha({ id, nome, temFoto, tamanho? }: { …; tamanho?: "linha" | "conversa" | "ficha" })` (32, 40, 40px; a de `conversa` sem a inicial grande).

- [ ] **Step 1: Branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
git fetch escale-crm
git switch -c feat/fase-2e-ficha-e-mescla-telas escale-crm/main
git log --oneline -3 | grep -i "2E" || echo "o PR A ainda não está na main: PARE"
```

Expected: o merge do PR A aparece nos últimos commits.

- [ ] **Step 2: O teste do contato sem negócio (vai falhar)**

Create `tests/unit/escale-abas-por-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "o1", role: "agent" }),
  usePermission: () => true,
}));
vi.mock("@/components/inbox/ChatThread", () => ({
  ChatThread: ({ conversationId }: { conversationId: string }) => <div data-testid="thread">{conversationId}</div>,
}));

const chamadas: Array<{ url: string; metodo: string; corpo?: unknown }> = [];
beforeEach(() => {
  chamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.startsWith("/api/v1/conversations")) {
        return Response.json({
          data: [
            { id: "cv1", status: "open", last_message_at: "2026-10-17T19:31:00Z", last_message_preview: "Olá", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
          ],
        });
      }
      if (url.includes("/arquivos")) return Response.json({ data: [] });
      return Response.json({ data: { id: "nt1" } }, { status: 201 });
    }),
  );
});

function comConsulta(ui: ReactNode) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={qc}>{ui}</QueryClientProvider>);
}

describe("as abas da ficha servem ao contato (Fase 2E, N5)", () => {
  it("nota do contato vai para a rota do contato", async () => {
    comConsulta(<JanelaDeNota alvo={{ tipo: "contato", id: "c1" }} aberta onFechar={() => undefined} />);
    fireEvent.change(screen.getByRole("textbox"), { target: { value: "ligar amanhã" } });
    fireEvent.click(screen.getByRole("button", { name: "Salvar" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({ url: "/api/v1/contatos/c1/notas", metodo: "POST", corpo: { texto: "ligar amanhã" } }),
    );
  });

  it("Conversas pelo contato: a primeira sessão abre à direita (N7)", async () => {
    comConsulta(<AbaConversas contatoId="c1" foto={null} />);
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv1");
    expect(screen.getByRole("link", { name: /Abrir em Conversas/ })).toHaveAttribute("href", "/app/inbox?id=cv1");
  });

  it("Arquivos pelo contato, sem negócio", async () => {
    comConsulta(<AbaArquivos contatoId="c1" leadId={null} />);
    await waitFor(() => expect(chamadas.some((c) => c.url === "/api/v1/contacts/c1/arquivos")).toBe(true));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx`
Expected: FAIL (as props `alvo`, `contatoId` e `foto` ainda não existem; o "Abrir em Conversas" é da Task 7 — este `it` só passa no fim da Task 7).

- [ ] **Step 3: Os hooks**

Em `hooks/escale/useGravarContato.ts`: a assinatura vira `useGravarContato(contactId: string, pipelineId: string | null)`, e a linha da invalidação do quadro vira:

```ts
          // FORK ESCALE · Fase 2E: sem origem (janela do contato), não há quadro a refazer.
          if (pipelineId) void qc.invalidateQueries({ queryKey: chaveDoQuadro(pipelineId) });
```

Em `hooks/escale/useNotasDoNegocio.ts`, troque o arquivo por:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDasNotasDoAlvo, type AlvoDaNota, type Nota } from "@/lib/escale/negocio/notas";

/**
 * NOTAS DO NEGÓCIO E DO CONTATO (fork Escale, Fases 1H e 2E; C15, Q5): ler,
 * criar, editar e apagar pelo alvo. O histórico do alvo é invalidado junto.
 */
export const chaveDasNotas = (alvo: AlvoDaNota) => ["notas", alvo.tipo, alvo.id] as const;

export function useNotas(alvo: AlvoDaNota) {
  return useQuery({
    queryKey: chaveDasNotas(alvo),
    queryFn: async () => (await apiClient.get<{ data: Nota[] }>(rotaDasNotasDoAlvo(alvo))).data,
  });
}

/** Atalho da ficha do negócio (1H). */
export const useNotasDoNegocio = (leadId: string) => useNotas({ tipo: "negocio", id: leadId });

function useInvalidarNotas(alvo: AlvoDaNota) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: ["notas"] }),
      qc.invalidateQueries({ queryKey: ["timeline", alvo.id] }),
    ]);
}

export function useCriarNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async (texto: string) =>
      (await apiClient.post<{ data: Nota }>(rotaDasNotasDoAlvo(alvo), { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useEditarNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async ({ notaId, texto }: { notaId: string; texto: string }) =>
      (await apiClient.patch<{ data: Nota }>(`${rotaDasNotasDoAlvo(alvo)}/${notaId}`, { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useExcluirNota(alvo: AlvoDaNota) {
  const invalidar = useInvalidarNotas(alvo);
  return useMutation({
    mutationFn: async (notaId: string) => apiClient.delete<void>(`${rotaDasNotasDoAlvo(alvo)}/${notaId}`),
    onSuccess: () => void invalidar(),
  });
}
```

(A chave mudou de `["notas-do-negocio", leadId]` para `["notas", "negocio", leadId]`: procure `notas-do-negocio` em `hooks/` e `components/` e troque onde alguém invalidava pela chave antiga.)

- [ ] **Step 4: Nota, cartão e as ações pelo alvo**

- `components/escale/negocio/JanelaDeNota.tsx`: a prop `leadId: string` vira `alvo: AlvoDaNota` (import de `@/lib/escale/negocio/notas`); `useCriarNota(alvo)` e `useEditarNota(alvo)`. Atualize o comentário do topo: `… (fork Escale, Fases 1H e 2E; C15, N7; NoteModal). O alvo é o negócio ou o contato (Q5).`
- `components/escale/negocio/AcoesDaFicha.tsx` L112 e `components/escale/negocio/MenuDaFicha.tsx` L153: `<JanelaDeNota alvo={{ tipo: "negocio", id: lead.id }} aberta={nota} onFechar={() => setNota(false)} />`.
- `components/escale/negocio/abas/CartaoDoHistorico.tsx`: a prop `leadId: string` vira `alvo: AlvoDaNota`; `useExcluirNota(alvo)`; o `<JanelaDeNota … leadId={leadId}` (L191) vira `alvo={alvo}`.
- `components/escale/negocio/abas/AbaHistorico.tsx`: `leadId={lead.id}` vira `alvo={{ tipo: "negocio", id: lead.id }}` (a Task 8 generaliza a aba).
- `tests/unit/escale-ficha-janela-de-nota.test.tsx`: `leadId="n1"` vira `alvo={{ tipo: "negocio", id: "n1" }}` nas duas montagens.

- [ ] **Step 5: As abas de campos pelo contato**

Em `components/escale/negocio/abas/AbasDeCampos.tsx`:

1. `ContatoEditavel` passa a ser exportada, com a assinatura nova (a 2C já trocou o corpo para o catálogo; mantenha o corpo dela e mude só o que segue):

```tsx
/**
 * FORK ESCALE · Fase 2E (N5): os campos do contato servem à ficha do negócio e à
 * janela do contato. Sem origem (`pipeline` nulo), nenhum campo fica oculto por
 * origem e a gravação não refaz o quadro.
 */
export function ContatoEditavel({ contatoId, pipeline }: { contatoId: string; pipeline: Pipeline | null }) {
```

   - `useGravarContato(contactId, pipeline.id)` → `useGravarContato(contatoId, pipeline?.id ?? null)`;
   - `useOcultosDaOrigem(pipeline)` (2C) → `useOcultosDaOrigem(pipeline)` aceitando `null` (no hook, `if (!pipeline) return null` antes de ler `settings`; se o hook já começar com `pipeline.settings`, faça essa guarda nele);
   - o que lia `lead` dentro dela (o nome, o telefone e o e-mail de reserva vindos de `dadosDeFiltro(lead)`, `lead.contact_phone`, `lead.contact_email`) passa a ler só o `contato` carregado (sem reserva: enquanto carrega, a moldura é só leitura, como já é);
   - toda ocorrência restante de `contactId` vira `contatoId`.
2. `AbaContato({ lead, pipeline })` continua e devolve `<ContatoEditavel contatoId={lead.contact_id} pipeline={pipeline} />` no lugar do `contactId`/`lead` antigos.
3. `AbaEmpresa`: a 2D a deixou como `AbaEmpresa({ lead }: { lead: Pick<Lead, "id" | "contact_id"> })`. Troque para `AbaEmpresa({ contatoId }: { contatoId: string | null })` e, dentro, `lead.contact_id` → `contatoId`. Em `ConteudoDaAba.tsx`: `<AbaEmpresa contatoId={ficha.lead.contact_id} />`. No teste `tests/unit/escale-aba-empresa-do-negocio.test.tsx` (2D), `lead={{ id: "l1", contact_id: "c1" } as never}` vira `contatoId="c1"`.

- [ ] **Step 6: Tags, foto, Conversas e Arquivos pelo contato**

`components/escale/negocio/TagsDaFicha.tsx`: extraia o corpo para

```tsx
/** FORK ESCALE · Fase 2E (N6): as tags do contato, na ficha do negócio e na aba Contato da janela do contato. */
export function TagsDoContato({
  contatoId,
  pipelineId,
  tagsDeReserva,
}: {
  contatoId: string;
  pipelineId: string | null;
  tagsDeReserva?: string[];
}) {
```

com o mesmo corpo de hoje, trocando `lead.contact_id ?? ""` por `contatoId`, `useGravarContato(contactId, pipelineId)` por `useGravarContato(contatoId, pipelineId)` e `lead.contact_tags` por `tagsDeReserva`. O `TagsDaFicha` vira:

```tsx
export function TagsDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  return <TagsDoContato contatoId={lead.contact_id ?? ""} pipelineId={pipelineId} tagsDeReserva={lead.contact_tags ?? undefined} />;
}
```

`components/escale/contatos/FotoDaLinha.tsx`: acrescente `tamanho = "linha"` com `const MEDIDA = { linha: "size-8 text-[13px]", conversa: "size-10 text-[15px]", ficha: "size-10 text-[15px]" } as const;` e use `MEDIDA[tamanho]` no lugar de `size-8` e `text-[13px]` (nos dois ramos).

`components/escale/negocio/abas/AbaConversas.tsx`: a assinatura vira

```tsx
export function AbaConversas({ contatoId, foto }: { contatoId: string | null; foto: ReactNode }) {
```

com `useConversasDoContato(contatoId)`, `!contatoId` no lugar de `!lead.contact_id`, e `{foto}` no lugar de `<FotoDaFicha lead={lead} tamanho="conversa" />` (tire o import de `FotoDaFicha` e o de `Lead`). Em `ConteudoDaAba.tsx`: `<AbaConversas contatoId={ficha.lead.contact_id} foto={<FotoDaFicha lead={ficha.lead} tamanho="conversa" />} />` (importe `FotoDaFicha` de `./FotoDaFicha`).

`components/escale/negocio/abas/AbaArquivos.tsx`: a assinatura vira `AbaArquivos({ contatoId, leadId }: { contatoId: string | null; leadId: string | null })`; dentro, `const contactId = contatoId;` e `useEnviarArquivos(contactId ?? "", leadId)` (se `useEnviarArquivos` exigir `string`, mude o parâmetro dele para `string | null`; o envio sem negócio grava `lead_id` nulo, que a 9008 já aceita). Em `ConteudoDaAba.tsx`: `<AbaArquivos contatoId={ficha.lead.contact_id} leadId={ficha.lead.id} />`.

Nos testes `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, `escale-ficha-aba-conversas.test.tsx` e `escale-ficha-aba-arquivos.test.tsx`, troque as montagens: `<AbaConversas lead={X} />` → `<AbaConversas contatoId={X.contact_id} foto={null} />`; `<AbaArquivos lead={X} />` → `<AbaArquivos contatoId={X.contact_id} leadId={X.id} />`; `<AbaEmpresa />` → `<AbaEmpresa contatoId={X.contact_id} />`. `escale-ficha-gravar-contato.test.tsx` não muda (a origem continua passada).

Acrescente ao `tests/unit/escale-abas-por-contato.test.tsx` (no topo, junto dos outros `vi.mock`, e um `describe` no fim):

```tsx
import { act, renderHook } from "@testing-library/react";
import { useGravarContato } from "@/hooks/escale/useGravarContato";

vi.mock("@/hooks/contacts/useUpdateContact", () => ({
  useUpdateContact: () => ({
    mutateAsync: vi.fn(async (patch: Record<string, unknown>) => ({ data: { id: "c1", ...patch } })),
  }),
}));

describe("useGravarContato sem origem (janela do contato)", () => {
  it("grava e não refaz quadro nenhum", async () => {
    const qc = new QueryClient();
    qc.setQueryData(["contact", "c1"], { data: { id: "c1", name: "A", tags: [], custom_fields: {} } });
    const espiao = vi.spyOn(qc, "invalidateQueries");
    const { result } = renderHook(() => useGravarContato("c1", null), {
      wrapper: ({ children }: { children: ReactNode }) => <QueryClientProvider client={qc}>{children}</QueryClientProvider>,
    });
    await act(async () => {
      await result.current.gravar({ name: "Ana" } as never);
    });
    const chaves = espiao.mock.calls.map(([f]) => (f as { queryKey?: readonly unknown[] } | undefined)?.queryKey?.[0]);
    expect(chaves).toContain("timeline");
    expect(chaves).not.toContain("board");
  });
});
```

(**Confira antes de rodar:** `chaveDoQuadro(id)` começa com `"board"` — `grep -n "export const chaveDoQuadro" hooks/kanban/useBoard.ts`; se for outra palavra, troque o `"board"` do teste por ela.)

- [ ] **Step 7: Rodar os testes da ficha**

Run:
```bash
corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-janela-de-nota.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx tests/unit/escale-ficha-aba-historico.test.tsx tests/unit/escale-ficha-gravar-contato.test.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/escale-aba-empresa-do-negocio.test.tsx
```
Expected: PASS em todos, **menos** o `it("Conversas pelo contato…")` de `escale-abas-por-contato` (fica para a Task 7). Para não deixar vermelho no commit, marque esse `it` com `it.todo` agora e troque de volta na Task 7.

- [ ] **Step 8: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/negocio components/escale/contatos/FotoDaLinha.tsx hooks/escale tests/unit/escale-abas-por-contato.test.tsx
git add -A components/escale/negocio components/escale/contatos/FotoDaLinha.tsx hooks/escale tests/unit
git commit -m "refactor(escale): abas da ficha recebem o contato e a nota recebe o alvo (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 7: A conversa à direita da aba Conversas (C4, N7)

**Files:**
- Create: `components/escale/negocio/abas/ConversaEmLeitura.tsx`
- Modify: `components/escale/negocio/abas/AbaConversas.tsx`, `tests/unit/escale-abas-por-contato.test.tsx` (o `it.todo` volta a `it`), `tests/unit/escale-ficha-aba-conversas.test.tsx`

**Interfaces:**
- Consumes: `ChatThread({ conversationId, provider?, contatoId? })` de `@/components/inbox/ChatThread`; `ChannelLogo({ channel, size })` de `@/components/inbox/ChannelLogo`; `ConversationWithContact` de `@/hooks/inbox/useConversationsRealtime` (`channel_sessions?: { provider; display_name }`).
- Produces: `ConversaEmLeitura({ conversa, contatoId }: { conversa: ConversationWithContact; contatoId: string })`; a `AbaConversas` com a sessão escolhida (a primeira por padrão), a linha escolhida com fundo `casca-raia` e a borda esquerda de 3px `casca-marca` (c20).

Abra c20 e 1h-B-04 antes.

- [ ] **Step 1: O teste (já escrito na Task 6)**

Troque o `it.todo("Conversas pelo contato…")` de volta para `it(...)` com o corpo do Step 2 da Task 6. No mesmo arquivo, o `fetch` falso passa a devolver **duas** sessões quando a URL tem `contact_id=c2`:

```tsx
      if (url.startsWith("/api/v1/conversations") && url.includes("contact_id=c2")) {
        return Response.json({
          data: [
            { id: "cv1", status: "open", last_message_at: "2026-10-17T19:31:00Z", last_message_preview: "Olá", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
            { id: "cv2", status: "closed", last_message_at: "2026-10-16T10:00:00Z", last_message_preview: "Olá de novo", unread_count_for_assignee: 0, assigned_to_user_name: null, channel_sessions: { provider: "waha", display_name: "Grupo" } },
          ],
        });
      }
```

(antes do `if` que devolve uma sessão só), e ganha o `it`:

```tsx
  it("clicar em outra sessão troca a conversa da direita", async () => {
    comConsulta(<AbaConversas contatoId="c2" foto={null} />);
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv1");
    fireEvent.click(screen.getByRole("button", { name: /Olá de novo/ }));
    expect(await screen.findByTestId("thread")).toHaveTextContent("cv2");
    expect(screen.getByRole("button", { name: /Olá de novo/ })).toHaveAttribute("aria-pressed", "true");
  });
```

Em `tests/unit/escale-ficha-aba-conversas.test.tsx`, o `it` que pinava "Selecione uma conversa" **com** sessões na lista passa a esperar a thread: acrescente no topo `vi.mock("@/components/inbox/ChatThread", () => ({ ChatThread: ({ conversationId }: { conversationId: string }) => <div data-testid="thread">{conversationId}</div> }))` e troque a asserção do vazio por `expect(await screen.findByTestId("thread")).toBeInTheDocument()`. O `it` sem sessões continua esperando "Este contato não possui conversas no atendimento" e "Selecione uma conversa".

Run: `corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx`
Expected: FAIL (a direita ainda é o vazio).

- [ ] **Step 2: `ConversaEmLeitura`**

Create `components/escale/negocio/abas/ConversaEmLeitura.tsx`:

```tsx
"use client";
import Link from "next/link";

import { ChannelLogo } from "@/components/inbox/ChannelLogo";
import { ChatThread } from "@/components/inbox/ChatThread";
import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { useT } from "@/hooks/i18n/useT";
import { ExternalLink } from "@/lib/ui/icons-da-casca";

/**
 * A CONVERSA DA DIREITA DA ABA CONVERSAS (fork Escale, Fase 2E; C4, N7; Clint
 * `ContactConversations` no modo "Padrão chat"). A thread do original em
 * leitura: sem `onResponder` (sem responder) e sem o `useMarkAsRead` (não marca
 * como lida). Responder daqui é da 3E; "Abrir em Conversas" leva ao Inbox.
 */
export function ConversaEmLeitura({
  conversa,
  contatoId,
}: {
  conversa: ConversationWithContact;
  contatoId: string;
}) {
  const t = useT();
  const canal = conversa.channel_sessions ?? null;
  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col">
      <div className="flex h-12 shrink-0 items-center justify-between gap-3 border-b border-casca-borda px-4">
        <span className="flex min-w-0 items-center gap-2 text-[13px] text-casca-texto">
          <ChannelLogo channel={canal} size={16} />
          <span className="truncate">{canal?.display_name ?? ""}</span>
        </span>
        <Link
          href={`/app/inbox?id=${conversa.id}`}
          className="flex shrink-0 items-center gap-1 text-[13px] font-medium text-casca-marca hover:underline"
        >
          {t("Abrir em Conversas")}
          <ExternalLink size={14} aria-hidden />
        </Link>
      </div>
      <div className="flex min-h-0 flex-1 flex-col">
        <ChatThread conversationId={conversa.id} provider={canal?.provider ?? null} contatoId={contatoId} />
      </div>
    </div>
  );
}
```

**Confira antes de rodar:** se o `ChatThread` exigir `dono` para o cartão de passagem, passe o que `ConversationHeader` passa (procure `<ChatThread` em `components/inbox/InboxLayout.tsx`); `contatoId` é opcional nele.

- [ ] **Step 3: A `AbaConversas` com a sessão escolhida**

Em `components/escale/negocio/abas/AbaConversas.tsx`:
- `const [escolhida, setEscolhida] = useState<string | null>(null);` e `const atual = sessoes.find((c) => c.id === escolhida) ?? sessoes[0] ?? null;`;
- cada linha deixa de ser `<Link href=/app/inbox…>` e vira `<button type="button" onClick={() => setEscolhida(c.id)} aria-pressed={atual?.id === c.id} className={cn("flex h-[72px] w-full items-center gap-3 border-b border-l-[3px] border-casca-borda border-l-transparent px-3 text-left hover:bg-casca-raia", atual?.id === c.id && "border-l-casca-marca bg-casca-raia")}>` com o mesmo miolo;
- a coluna da esquerda passa de `w-[337px]` para `w-[340px]` (grade `340px | 1fr` da Clint);
- a direita: `{atual && contatoId ? <ConversaEmLeitura conversa={atual} contatoId={contatoId} /> : <o vazio de hoje "Selecione uma conversa">}`;
- o comentário do topo: `… Clicar escolhe a sessão, que abre à direita em leitura (2E, N7); responder dali é da 3E, e o modo espião segue "Em breve" (Q6).`

Run: `corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`
Expected: PASS.

- [ ] **Step 4: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/negocio/abas
corepack pnpm vitest run tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
git add components/escale/negocio/abas tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-ficha-aba-conversas.test.tsx
git commit -m "feat(escale): aba Conversas mostra a conversa escolhida em leitura (Fase 2E, C4)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 8: O Histórico pelo alvo e a aba Negócios do contato

**Files:**
- Create: `hooks/escale/useNegociosDoContato.ts`, `components/escale/contatos/ficha/AbaNegociosDoContato.tsx`, `tests/unit/escale-aba-negocios-do-contato.test.tsx`, `tests/unit/escale-historico-do-contato.test.tsx`
- Modify: `hooks/escale/useHistoricoDoNegocio.ts` (`useHistorico(alvo, grupo)`), `components/escale/negocio/abas/AbaHistorico.tsx`, `components/escale/negocio/ConteudoDaAba.tsx`, `tests/unit/escale-ficha-aba-historico.test.tsx`

**Interfaces:**
- Consumes: `juntarNotasAoHistorico`, `NegocioDoContato`, `negociosParaMostrar`, `temPerdido`, `ROTULO_DO_STATUS_DO_NEGOCIO` (Task 4); `FichaDeNegociosDoContato` (Task 4); `useNotas`, `AlvoDaNota` (Task 6); `useBulkAction(pipelineId)` de `@/hooks/kanban/useBulkAction` (`{ action: "delete", lead_ids, params: {} }`); `JanelaDeConfirmacao` de `@/components/escale/ui/JanelaDeConfirmacao`; `CAIXA_DO_MENU`, `ITEM_DO_MENU` de `@/components/escale/quadro/estilos-do-menu`.
- Produces:
  - `useHistorico(alvo: AlvoDaNota, grupo: ChaveDoGrupo)` (rota `/api/v1/leads/{id}/timeline` ou `/api/v1/contacts/{id}/timeline`; tempo real por `lead_id` ou `contact_id`); `useHistoricoDoNegocio(leadId, grupo)` continua como atalho;
  - `AbaHistorico({ alvo, nomesDasEtapas }: { alvo: AlvoDaNota; nomesDasEtapas: Readonly<Record<string, string>> })` (no contato, junta as notas soltas);
  - `useNegociosDoContato(contatoId: string | null)` (chave `["negocios-do-contato", contatoId]`) → `FichaDeNegociosDoContato`;
  - `AbaNegociosDoContato({ contatoId, ficha }: { contatoId: string; ficha: FichaDeNegociosDoContato })`.

- [ ] **Step 1: O teste da aba Negócios (vai falhar)**

Create `tests/unit/escale-aba-negocios-do-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { AbaNegociosDoContato } from "@/components/escale/contatos/ficha/AbaNegociosDoContato";
import type { NegocioDoContato } from "@/lib/escale/ficha-do-contato/regras";

const lote = vi.hoisted(() => ({ mutate: vi.fn() }));
vi.mock("@/hooks/kanban/useBulkAction", () => ({ useBulkAction: () => ({ ...lote, isPending: false }) }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));

const negocio = (n: number, extra: Partial<NegocioDoContato> = {}): NegocioDoContato => ({
  id: `n${n}`,
  titulo: `Negócio ${n}`,
  origem_id: "o1",
  origem_nome: "Pedidos",
  origem_arquivada: false,
  etapa_nome: "Novo",
  status: "open",
  motivo_de_perda: null,
  valor_cents: null,
  moeda: null,
  dono_id: "u1",
  dono_nome: "Camilly",
  criado_em: "2026-10-01T10:00:00Z",
  ...extra,
});

function montar(negocios: NegocioDoContato[]) {
  const qc = new QueryClient();
  render(
    <QueryClientProvider client={qc}>
      <AbaNegociosDoContato contatoId="c1" ficha={{ negocios, etapas: {} }} />
    </QueryClientProvider>,
  );
}

describe("AbaNegociosDoContato (Fase 2E, N9)", () => {
  it("as colunas da Clint; 'Motivo de perda' só com perdido; o dono na dica", () => {
    montar([negocio(1), negocio(2, { status: "lost", motivo_de_perda: "Preço", dono_id: null, dono_nome: null })]);
    for (const c of ["Negócio", "Origem", "Etapa", "Status", "Motivo de perda", "Ações"]) {
      expect(screen.getByRole("columnheader", { name: c })).toBeInTheDocument();
    }
    expect(screen.getByTitle("Dono: Camilly")).toBeInTheDocument();
    expect(screen.getByTitle("Sem dono")).toBeInTheDocument();
    expect(screen.getByText("Preço")).toBeInTheDocument();
  });

  it("sem perdido, sem a coluna; arquivados escondidos até 'Mostrar arquivados'", () => {
    montar([negocio(1), negocio(3, { origem_arquivada: true })]);
    expect(screen.queryByRole("columnheader", { name: "Motivo de perda" })).toBeNull();
    expect(screen.queryByText("Negócio 3")).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: "Mostrar arquivados" }));
    expect(screen.getByText("Negócio 3")).toBeInTheDocument();
    expect(screen.getByText("Arquivado")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Ocultar arquivados" })).toBeInTheDocument();
  });

  it("⋮: 'Ir para o negócio' e 'Excluir negócio' com a confirmação", async () => {
    montar([negocio(1)]);
    const linha = screen.getByRole("row", { name: /Negócio 1/ });
    fireEvent.pointerDown(within(linha).getByRole("button", { name: "Ações" }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "Ir para o negócio" })).toHaveAttribute("href", "/app/negocios/n1");
    fireEvent.click(screen.getByRole("menuitem", { name: "Excluir negócio" }));
    expect(await screen.findByText("Tem certeza que deseja excluir o negócio selecionado?")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Excluir" }));
    await waitFor(() =>
      expect(lote.mutate).toHaveBeenCalledWith({ action: "delete", lead_ids: ["n1"], params: {} }, expect.anything()),
    );
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-aba-negocios-do-contato.test.tsx`
Expected: FAIL (o componente não existe).

- [ ] **Step 2: O hook e a aba Negócios**

Create `hooks/escale/useNegociosDoContato.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { FichaDeNegociosDoContato } from "@/lib/escale/ficha-do-contato/banco";

/** OS NEGÓCIOS DO CONTATO (fork Escale, Fase 2E; N9) e os nomes das etapas deles. */
export const chaveDosNegociosDoContato = (contatoId: string) => ["negocios-do-contato", contatoId] as const;

export function useNegociosDoContato(contatoId: string | null) {
  return useQuery({
    queryKey: chaveDosNegociosDoContato(contatoId ?? ""),
    enabled: !!contatoId,
    queryFn: async () =>
      (await apiClient.get<{ data: FichaDeNegociosDoContato }>(`/api/v1/contatos/${contatoId}/negocios`)).data,
  });
}
```

(`import type` de um arquivo de servidor não leva código ao cliente; se o eslint reclamar da fronteira, mova a interface `FichaDeNegociosDoContato` para `lib/escale/ficha-do-contato/regras.ts` e reexporte dela em `banco.ts`.)

Create `components/escale/contatos/ficha/AbaNegociosDoContato.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useQueryClient } from "@tanstack/react-query";
import Link from "next/link";
import { useState } from "react";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { chaveDosNegociosDoContato } from "@/hooks/escale/useNegociosDoContato";
import { useT } from "@/hooks/i18n/useT";
import { useBulkAction } from "@/hooks/kanban/useBulkAction";
import type { FichaDeNegociosDoContato } from "@/lib/escale/ficha-do-contato/banco";
import {
  ROTULO_DO_STATUS_DO_NEGOCIO,
  negociosParaMostrar,
  temPerdido,
  type NegocioDoContato,
} from "@/lib/escale/ficha-do-contato/regras";
import { ArrowRight, EllipsisVertical, Trash2, User } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const TH = "h-[50px] px-4 text-left text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase";
const TD = "px-4 text-[14px] text-casca-texto";

/**
 * A ABA NEGÓCIOS DA JANELA DO CONTATO (fork Escale, Fase 2E; C3, N9; Clint
 * `index-BhVJ8kAx`). Os negócios do contato, mais novos primeiro: o dono na foto
 * ("Dono: {nome}" / "Sem dono"), Negócio, Origem, Etapa, Status, "Motivo de perda"
 * só com perdido, e o ⋮ com "Ir para o negócio" e "Excluir negócio". "Arquivado" é
 * o negócio de origem arquivada, escondido até "Mostrar arquivados".
 */
export function AbaNegociosDoContato({ contatoId, ficha }: { contatoId: string; ficha: FichaDeNegociosDoContato }) {
  const t = useT();
  const [mostrarArquivados, setMostrarArquivados] = useState(false);
  const [excluindo, setExcluindo] = useState<NegocioDoContato | null>(null);
  const temArquivado = ficha.negocios.some((n) => n.origem_arquivada);
  const lista = negociosParaMostrar(ficha.negocios, mostrarArquivados);
  const comPerda = temPerdido(lista);

  return (
    <div className="py-5">
      {temArquivado ? (
        <div className="mb-3 flex justify-end">
          <button
            type="button"
            onClick={() => setMostrarArquivados((m) => !m)}
            className="text-[13px] font-medium text-casca-marca hover:underline"
          >
            {mostrarArquivados ? t("Ocultar arquivados") : t("Mostrar arquivados")}
          </button>
        </div>
      ) : null}
      <div className="overflow-x-auto rounded-lg border border-casca-borda">
        <table className="w-full border-collapse">
          <thead className="border-b border-casca-borda">
            <tr>
              <th className={cn(TH, "w-14")} aria-label={t("Dono")} />
              <th className={TH}>{t("Negócio")}</th>
              <th className={TH}>{t("Origem")}</th>
              <th className={TH}>{t("Etapa")}</th>
              <th className={TH}>{t("Status")}</th>
              {comPerda ? <th className={TH}>{t("Motivo de perda")}</th> : null}
              <th className={cn(TH, "w-16 text-right")}>{t("Ações")}</th>
            </tr>
          </thead>
          <tbody>
            {lista.map((n) => (
              <tr key={n.id} aria-label={n.titulo} className="h-16 border-b border-casca-borda last:border-0 hover:bg-casca-raia">
                <td className={TD}>
                  <span
                    title={n.dono_nome ? `${t("Dono:")} ${n.dono_nome}` : t("Sem dono")}
                    className="grid size-8 place-items-center rounded-full bg-casca-marca-suave text-[12px] font-semibold text-casca-marca"
                  >
                    {n.dono_nome ? n.dono_nome.charAt(0).toUpperCase() : <User size={14} aria-hidden />}
                  </span>
                </td>
                <td className={cn(TD, "font-medium")}>
                  <span className="flex items-center gap-2">
                    {n.titulo}
                    {n.origem_arquivada ? (
                      <span className="rounded-sm bg-casca-cinza-selo/20 px-1.5 text-[11px] text-casca-suave">{t("Arquivado")}</span>
                    ) : null}
                  </span>
                </td>
                <td className={cn(TD, "text-casca-suave")}>{n.origem_nome}</td>
                <td className={cn(TD, "text-casca-suave")}>{n.etapa_nome ?? "—"}</td>
                <td className={TD}>{t(ROTULO_DO_STATUS_DO_NEGOCIO[n.status])}</td>
                {comPerda ? <td className={cn(TD, "text-casca-suave")}>{n.motivo_de_perda ?? "—"}</td> : null}
                <td className={cn(TD, "text-right")}>
                  <MenuDoNegocio negocio={n} aoExcluir={() => setExcluindo(n)} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {excluindo ? <ConfirmarExclusao contatoId={contatoId} negocio={excluindo} aoFechar={() => setExcluindo(null)} /> : null}
    </div>
  );
}

function MenuDoNegocio({ negocio, aoExcluir }: { negocio: NegocioDoContato; aoExcluir: () => void }) {
  const t = useT();
  const podeExcluir = usePermission("pipeline.move_card");
  return (
    <MenuPrimitive.Root>
      <MenuPrimitive.Trigger
        aria-label={t("Ações")}
        className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
      >
        <EllipsisVertical size={16} aria-hidden />
      </MenuPrimitive.Trigger>
      <MenuPrimitive.Portal>
        <MenuPrimitive.Content align="end" className={CAIXA_DO_MENU}>
          <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
            <Link href={`/app/negocios/${negocio.id}`}>
              <ArrowRight size={14} aria-hidden />
              {t("Ir para o negócio")}
            </Link>
          </MenuPrimitive.Item>
          {podeExcluir ? (
            <MenuPrimitive.Item className={cn(ITEM_DO_MENU, "text-casca-alerta")} onSelect={aoExcluir}>
              <Trash2 size={14} aria-hidden />
              {t("Excluir negócio")}
            </MenuPrimitive.Item>
          ) : null}
        </MenuPrimitive.Content>
      </MenuPrimitive.Portal>
    </MenuPrimitive.Root>
  );
}

function ConfirmarExclusao({
  contatoId,
  negocio,
  aoFechar,
}: {
  contatoId: string;
  negocio: NegocioDoContato;
  aoFechar: () => void;
}) {
  const t = useT();
  const qc = useQueryClient();
  const lote = useBulkAction(negocio.origem_id);
  return (
    <JanelaDeConfirmacao
      aberta
      aoFechar={aoFechar}
      titulo={t("Excluir negócio")}
      rotuloDoConfirmar={t("Excluir")}
      perigo
      ocupado={lote.isPending}
      aoConfirmar={() =>
        lote.mutate(
          { action: "delete", lead_ids: [negocio.id], params: {} },
          {
            onSuccess: () => {
              void qc.invalidateQueries({ queryKey: chaveDosNegociosDoContato(contatoId) });
              aoFechar();
            },
          },
        )
      }
    >
      {t("Tem certeza que deseja excluir o negócio selecionado?")}
    </JanelaDeConfirmacao>
  );
}
```

**Confira antes de rodar:** `CAIXA_DO_MENU` e `ITEM_DO_MENU` existem em `components/escale/quadro/estilos-do-menu.ts` (o `MenuDaFicha` os importa); o "Dono:" está no dicionário (a 1E usou "Dono:" na capa; se não, entra no Step 1 da Task 11); o vermelho do item é `text-casca-alerta`, como o "Excluir" do ⋮ da linha (`MenuDaLinha`).

Run: `corepack pnpm vitest run tests/unit/escale-aba-negocios-do-contato.test.tsx`
Expected: PASS.

- [ ] **Step 3: O Histórico pelo alvo**

Em `hooks/escale/useHistoricoDoNegocio.ts`, troque o hook por um por alvo, mantendo o atalho:

```ts
export const chaveDoHistorico = (id: string, grupo: ChaveDoGrupo) => ["timeline", id, "historico", grupo] as const;

const rotaDoHistorico = (alvo: AlvoDaNota) =>
  alvo.tipo === "negocio" ? `/api/v1/leads/${alvo.id}/timeline` : `/api/v1/contacts/${alvo.id}/timeline`;

/** FORK ESCALE · Fases 1H e 2E: o histórico paginado do negócio ou do contato (N8). */
export function useHistorico(alvo: AlvoDaNota, grupo: ChaveDoGrupo) {
  const qc = useQueryClient();
  const tipos = tiposDoGrupo(grupo);
  const consulta = useInfiniteQuery({
    queryKey: chaveDoHistorico(alvo.id, grupo),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const busca = new URLSearchParams({ limit: String(PAGINA_DO_HISTORICO) });
      for (const tipo of tipos ?? []) busca.append("type", tipo);
      if (pageParam) busca.set("cursor", pageParam);
      return apiClient.get<Pagina>(`${rotaDoHistorico(alvo)}?${busca.toString()}`);
    },
    getNextPageParam: (ultima) => (ultima.meta?.has_more ? (ultima.meta.cursor ?? null) : null),
    enabled: tipos === null || tipos.length > 0,
  });

  useRealtimeChannel({
    name: `historico-${alvo.tipo}-${alvo.id}`,
    postgresChanges: {
      event: "INSERT",
      table: "crm_lead_activities",
      filter: `${alvo.tipo === "negocio" ? "lead_id" : "contact_id"}=eq.${alvo.id}`,
    },
    onChange: () => void qc.invalidateQueries({ queryKey: ["timeline", alvo.id] }),
  });
  // … o resto do corpo de hoje (o `useMemo` dos itens e o retorno), sem mudança
}

export const useHistoricoDoNegocio = (leadId: string, grupo: ChaveDoGrupo) =>
  useHistorico({ tipo: "negocio", id: leadId }, grupo);
```

(importe `type AlvoDaNota` de `@/lib/escale/negocio/notas`.)

Em `components/escale/negocio/abas/AbaHistorico.tsx`:
- a assinatura vira `export function AbaHistorico({ alvo, nomesDasEtapas }: { alvo: AlvoDaNota; nomesDasEtapas: Readonly<Record<string, string>> })` (sai o `useMemo` que montava `nomesDasEtapas` de `stages`, e saem os imports de `Stage` e `Lead`);
- `useHistoricoDoNegocio(lead.id, grupo)` → `useHistorico(alvo, grupo)`; `useNotasDoNegocio(lead.id).data` → `useNotas(alvo).data`;
- a lista que vai para a busca passa a ser a juntada:

```tsx
  const itens = useMemo(
    () =>
      alvo.tipo === "contato"
        ? juntarNotasAoHistorico(historico.itens, notasDoNegocio ?? [], historico.temMais, grupo)
        : historico.itens,
    [alvo.tipo, historico.itens, historico.temMais, notasDoNegocio, grupo],
  );
```

  e o `visiveis` filtra `itens` (no lugar de `historico.itens`);
- `alvo={{ tipo: "negocio", id: lead.id }}` do Step 4 da Task 6 vira `alvo={alvo}`;
- o comentário do topo ganha: `Fase 2E: o alvo é o negócio ou o contato; no contato, as notas soltas entram na ordem do tempo (N8).`

Em `components/escale/negocio/ConteudoDaAba.tsx`:

```tsx
    case "historico":
      return (
        <AbaHistorico
          alvo={{ tipo: "negocio", id: ficha.lead.id }}
          nomesDasEtapas={Object.fromEntries(ficha.stages.map((s) => [s.id, s.name]))}
        />
      );
```

Em `tests/unit/escale-ficha-aba-historico.test.tsx`:
- o `vi.mock("@/hooks/escale/useHistoricoDoNegocio", …)` passa a exportar `useHistorico: (_alvo: unknown, grupo: string) => { … }` com o **mesmo corpo** do `useHistoricoDoNegocio` mockado (deixe os dois);
- o `vi.mock("@/hooks/escale/useNotasDoNegocio", …)` passa a exportar também `useNotas` com o **mesmo retorno** do `useNotasDoNegocio` mockado;
- as montagens `<AbaHistorico lead={LEAD} stages={STAGES} />` viram `<AbaHistorico alvo={{ tipo: "negocio", id: LEAD.id }} nomesDasEtapas={Object.fromEntries(STAGES.map((s) => [s.id, s.name]))} />`;
- as montagens de `<CartaoDoHistorico … leadId="n1" …>` viram `alvo={{ tipo: "negocio", id: "n1" }}`.

Create `tests/unit/escale-historico-do-contato.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "o", role: "agent" }),
}));
const alvos = vi.hoisted(() => [] as unknown[]);
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistorico: (alvo: unknown) => {
    alvos.push(alvo);
    return {
      itens: [
        {
          id: "1",
          type: "stage_changed",
          performed_at: "2026-10-10T10:00:00Z",
          payload: { from_stage_id: "e1", to_stage_id: "e2" },
          metadata: {},
          source_module: "crm",
          actor_kind: "user",
          actor_user_name: "Henrique",
          reason: "",
        },
      ],
      isLoading: false,
      isError: false,
      temMais: false,
      carregarMais: vi.fn(),
      carregandoMais: false,
    };
  },
}));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useNotas: () => ({
    data: [
      {
        id: "ns",
        lead_id: null,
        contact_id: "c1",
        user_id: "u1",
        user_nome: "Ana",
        texto: "Ligar na segunda",
        created_at: "2026-10-12T10:00:00Z",
        updated_at: "2026-10-12T10:00:00Z",
      },
    ],
  }),
  useExcluirNota: () => ({ mutateAsync: vi.fn() }),
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";

describe("Histórico do contato (Fase 2E, N8)", () => {
  it("lê pelo contato e mostra a nota solta junto da linha do tempo", async () => {
    render(<AbaHistorico alvo={{ tipo: "contato", id: "c1" }} nomesDasEtapas={{ e1: "Novo", e2: "Qualificação" }} />);
    expect(alvos[0]).toEqual({ tipo: "contato", id: "c1" });
    expect(screen.getByText("Mudou de etapa")).toBeInTheDocument();
    expect(screen.getByText("Qualificação")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Ver nota" }));
    expect(screen.getByText("Ligar na segunda")).toBeInTheDocument();
  });
});
```

(**Confira antes de rodar:** o rótulo do botão que abre a nota no `CartaoDoHistorico` é "Ver nota" — é o que o print 1h-B-02 mostra; se for um link, troque o `getByRole("button"…)` por `getByText("Ver nota")`.)

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-historico.test.tsx tests/unit/escale-historico-do-contato.test.tsx tests/unit/escale-ficha-historico-regras.test.ts tests/unit/escale-ficha-do-negocio.test.tsx`
Expected: PASS.

- [ ] **Step 4: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/negocio components/escale/contatos/ficha hooks/escale
git add components/escale/negocio components/escale/contatos/ficha hooks/escale tests/unit/escale-aba-negocios-do-contato.test.tsx tests/unit/escale-ficha-aba-historico.test.tsx tests/unit/escale-historico-do-contato.test.tsx
git commit -m "feat(escale): histórico pelo alvo e a aba Negócios do contato (Fase 2E)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---
### Task 9: A janela "Informações do contato" e quem a abre (C3)

**Files:**
- Create: `hooks/escale/useContatoAberto.ts`, `hooks/escale/useSugestoesDeMescla.ts` (só o `useSugestaoDoContato` nesta task), `components/escale/contatos/ficha/JanelaDoContato.tsx`, `components/escale/contatos/ficha/CabecalhoDoContato.tsx`, `components/escale/contatos/ficha/NomeDoContato.tsx`, `tests/unit/escale-janela-do-contato.test.tsx`, `tests/unit/escale-lista-abre-o-contato.test.tsx`
- Modify: `app/app/contacts/[id]/page.tsx`, `components/escale/contatos/{ListaDeContatos,TabelaDeContatos,CelulasDoContato,MenuDaLinha,JanelaNovoNegocio}.tsx`, `hooks/escale/useEstadoDaListaDeContatos.ts`

**Interfaces:**
- Consumes: Task 4 (`contatoDaRota`, `abaDoContato`, `rotaDoContatoAberto`, `rotaDaListaSemContato`, `rotaDaPaginaCompleta`, `abasVisiveis`, `ROTULO_DA_ABA_DO_CONTATO`, `PARAM_ABA_DO_CONTATO`, `ROTA_DA_LISTA_DE_CONTATOS`, `AbaDoContato`); Tasks 6–8 (as abas, `TagsDoContato`, `FotoDaLinha` com `tamanho`, `JanelaDeNota` com `alvo`, `useNegociosDoContato`, `AbaNegociosDoContato`); `useContact(id)` de `@/hooks/contacts/useContact`; `useConversasDoContato`; `useEmpresaDoContato(contatoId)` (2D); `useGravarContato(id, null)`; `ApiError` de `@/lib/api/types` (`status`).
- Produces:
  - `useContatoAberto(): { contatoId: string | null; aba: AbaDoContato; abrir(id, aba?); mudarAba(aba); trocar(id); fechar() }`;
  - `useSugestaoDoContato(contatoId: string | null, habilitado: boolean)` → `Sugestao | null` (chave `["sugestoes-de-mescla", "do-contato", contatoId]`);
  - `ContatoParaNegocio = Pick<LinhaDeContato, "id" | "nome" | "display_name" | "telefone">` (a prop de `JanelaNovoNegocio` passa a ser esse tipo);
  - `JanelaDoContato({ contatoId, aba, aoMudarAba, aoTrocarContato, aoFechar, podeCriarNegocio, podeMesclar, aoAdicionarNegocio, aoRevisarDuplicado })`;
  - `CabecalhoDoContato({ contato, empresa, conversaId, duplicado, podeCriarNegocio, aoAdicionarNegocio, aoRevisarDuplicado })`;
  - `NomeDoContato({ contatoId, nome })`;
  - `TabelaDeContatos` ganha `aoAbrirContato?: (id: string, aba?: AbaDoContato) => void`; `CelulaNegocios` ganha `aoVerNegocios?: () => void`; `MenuDaLinha` ganha `aoEditar?: () => void`.

Abra 2b-10 e 2b-01 antes.

- [ ] **Step 1: O teste da janela (vai falhar)**

Create `tests/unit/escale-janela-do-contato.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => true }));

const estado = vi.hoisted(() => ({
  contato: { id: "c1", name: "Reginaldo Apolinario", display_name: null, phone_number: "+5543998031566", is_merged_into: null as string | null },
  negocios: [{ id: "n1" }] as unknown[],
  sugestao: null as unknown,
}));
vi.mock("@/hooks/contacts/useContact", () => ({
  useContact: () => ({ data: { data: estado.contato }, isLoading: false, isError: false, error: null }),
}));
vi.mock("@/hooks/escale/useNegociosDoContato", () => ({
  useNegociosDoContato: () => ({ data: { negocios: estado.negocios, etapas: {} } }),
}));
vi.mock("@/hooks/escale/useEmpresaDoContato", () => ({ useEmpresaDoContato: () => ({ data: { id: "e1", nome: "Atlas" } }) }));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({ useConversasDoContato: () => ({ data: [{ id: "cv1" }] }) }));
vi.mock("@/hooks/escale/useSugestoesDeMescla", () => ({ useSugestaoDoContato: () => estado.sugestao }));
vi.mock("@/components/escale/contatos/ficha/NomeDoContato", () => ({
  NomeDoContato: ({ nome }: { nome: string }) => <h2>{nome}</h2>,
}));
vi.mock("@/components/escale/negocio/abas/AbasDeCampos", () => ({
  ContatoEditavel: () => <div>aba-contato</div>,
  AbaEmpresa: () => <div>aba-empresa</div>,
}));
vi.mock("@/components/escale/negocio/TagsDaFicha", () => ({ TagsDoContato: () => <div>tags</div> }));
vi.mock("@/components/escale/negocio/abas/AbaConversas", () => ({ AbaConversas: () => <div>aba-conversas</div> }));
vi.mock("@/components/escale/negocio/abas/AbaArquivos", () => ({ AbaArquivos: () => <div>aba-arquivos</div> }));
vi.mock("@/components/escale/negocio/abas/AbaHistorico", () => ({ AbaHistorico: () => <div>aba-historico</div> }));
vi.mock("@/components/escale/contatos/ficha/AbaNegociosDoContato", () => ({ AbaNegociosDoContato: () => <div>aba-negocios</div> }));
vi.mock("@/components/escale/negocio/JanelaDeNota", () => ({
  JanelaDeNota: ({ aberta, alvo }: { aberta: boolean; alvo: { id: string } }) => (aberta ? <div>nota-de-{alvo.id}</div> : null),
}));

import { JanelaDoContato } from "@/components/escale/contatos/ficha/JanelaDoContato";

const props = {
  contatoId: "c1",
  aba: "contato" as const,
  aoMudarAba: vi.fn(),
  aoTrocarContato: vi.fn(),
  aoFechar: vi.fn(),
  podeCriarNegocio: true,
  podeMesclar: true,
  aoAdicionarNegocio: vi.fn(),
  aoRevisarDuplicado: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  estado.contato.is_merged_into = null;
  estado.negocios = [{ id: "n1" }];
  estado.sugestao = null;
});

describe("JanelaDoContato (Fase 2E, C3; print 2b-10)", () => {
  it("título, cabeçalho com a empresa, ligar, conversa e nota", () => {
    render(<JanelaDoContato {...props} />);
    expect(screen.getByRole("dialog", { name: "Informações do contato" })).toBeInTheDocument();
    expect(screen.getByText("Atlas")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Reginaldo Apolinario" })).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Chamar" })).toHaveAttribute("href", "tel:+5543998031566");
    expect(screen.getByRole("link", { name: "Abrir em Conversas" })).toHaveAttribute("href", "/app/inbox?id=cv1");
    fireEvent.click(screen.getByRole("button", { name: "Nova nota" }));
    expect(screen.getByText("nota-de-c1")).toBeInTheDocument();
  });

  it("as seis abas da Clint, na ordem; Negócios só com negócio", () => {
    const { unmount } = render(<JanelaDoContato {...props} />);
    expect(screen.getAllByRole("tab").map((a) => a.textContent)).toEqual([
      "Contato", "Empresa", "Negócios", "Conversas", "Arquivos", "Histórico",
    ]);
    expect(screen.getByText("aba-contato")).toBeInTheDocument();
    expect(screen.getByText("tags")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Histórico" }));
    expect(props.aoMudarAba).toHaveBeenCalledWith("historico");
    unmount();
    estado.negocios = [];
    render(<JanelaDoContato {...props} aba="negocios" />);
    expect(screen.queryByRole("tab", { name: "Negócios" })).toBeNull();
    expect(screen.getByText("aba-contato")).toBeInTheDocument();
  });

  it("'Adicionar negócio' entrega o contato; o ⋮ leva à página completa", async () => {
    render(<JanelaDoContato {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Adicionar negócio" }));
    expect(props.aoAdicionarNegocio).toHaveBeenCalledWith({
      id: "c1", nome: "Reginaldo Apolinario", display_name: null, telefone: "+5543998031566",
    });
    fireEvent.pointerDown(screen.getByRole("button", { name: "Mais" }), { button: 0, ctrlKey: false });
    expect(await screen.findByRole("menuitem", { name: "Abrir página completa" })).toHaveAttribute(
      "href", "/app/contacts/c1?pagina=completa",
    );
  });

  it("'Possível duplicado' só com sugestão e para quem mescla", () => {
    const { rerender } = render(<JanelaDoContato {...props} />);
    expect(screen.queryByRole("button", { name: "Possível duplicado" })).toBeNull();
    estado.sugestao = { chave: "c0" };
    rerender(<JanelaDoContato {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Possível duplicado" }));
    expect(props.aoRevisarDuplicado).toHaveBeenCalledWith("c1");
    rerender(<JanelaDoContato {...props} podeMesclar={false} />);
    expect(screen.queryByRole("button", { name: "Possível duplicado" })).toBeNull();
  });

  it("contato mesclado por fora troca para o vencedor; o ✕ fecha", () => {
    estado.contato.is_merged_into = "c9";
    render(<JanelaDoContato {...props} />);
    expect(props.aoTrocarContato).toHaveBeenCalledWith("c9");
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Fechar" }));
    expect(props.aoFechar).toHaveBeenCalled();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-janela-do-contato.test.tsx`
Expected: FAIL (o componente não existe).

- [ ] **Step 2: Os hooks da URL e da sugestão do contato**

Create `hooks/escale/useContatoAberto.ts`:

```ts
"use client";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

import {
  PARAM_ABA_DO_CONTATO,
  abaDoContato,
  contatoDaRota,
  rotaDaListaSemContato,
  rotaDoContatoAberto,
  type AbaDoContato,
} from "@/lib/escale/ficha-do-contato/regras";

/**
 * O CONTATO ABERTO POR CIMA DA LISTA (fork Escale, Fase 2E; Q1, N1). Como a
 * Clint: abrir faz `pushState('/app/contacts/<id>')` (o "Voltar" do navegador
 * fecha), trocar de aba ou de contato faz `replaceState`, fechar volta à lista
 * com os parâmetros dela. O App Router sincroniza `usePathname` e
 * `useSearchParams` com o `history`, então nada recarrega.
 */
export function useContatoAberto() {
  const caminho = usePathname();
  const params = useSearchParams();
  const qs = params.toString();
  const contatoId = contatoDaRota(caminho);
  const aba = abaDoContato(params.get(PARAM_ABA_DO_CONTATO));

  const abrir = useCallback(
    (id: string, nova: AbaDoContato = "contato") => window.history.pushState(null, "", rotaDoContatoAberto(id, qs, nova)),
    [qs],
  );
  const mudarAba = useCallback(
    (nova: AbaDoContato) => {
      if (contatoId) window.history.replaceState(null, "", rotaDoContatoAberto(contatoId, qs, nova));
    },
    [contatoId, qs],
  );
  const trocar = useCallback(
    (id: string) => window.history.replaceState(null, "", rotaDoContatoAberto(id, qs, "contato")),
    [qs],
  );
  const fechar = useCallback(() => window.history.pushState(null, "", rotaDaListaSemContato(qs)), [qs]);

  return { contatoId, aba, abrir, mudarAba, trocar, fechar };
}
```

Create `hooks/escale/useSugestoesDeMescla.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Sugestao } from "@/lib/escale/mescla/regras";

/** AS SUGESTÕES DE MESCLA DA CASCA (fork Escale, Fase 2E; C2). Só para gerente ou acima. */
export function useSugestaoDoContato(contatoId: string | null, habilitado: boolean): Sugestao | null {
  const consulta = useQuery({
    queryKey: ["sugestoes-de-mescla", "do-contato", contatoId],
    enabled: habilitado && !!contatoId,
    staleTime: 60_000,
    queryFn: async () =>
      (await apiClient.get<{ data: Sugestao[] }>(`/api/v1/mesclas/sugestoes?contato=${contatoId}&n=1`)).data,
  });
  return consulta.data?.[0] ?? null;
}
```

- [ ] **Step 3: O nome, o cabeçalho e a janela**

Create `components/escale/contatos/ficha/NomeDoContato.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { usePermission } from "@/hooks/auth/AuthProvider";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { Check, Pencil, X } from "@/lib/ui/icons-da-casca";

const MAX_NOME = 80;

/** O NOME EDITÁVEL NO LUGAR (fork Escale, Fase 2E; Clint `_r`; medidas do 1h-07: caixa 200×28, ✓ e ✕ de 24px). */
export function NomeDoContato({ contatoId, nome }: { contatoId: string; nome: string }) {
  const t = useT();
  const podeEditar = usePermission("contact.update");
  const { gravar } = useGravarContato(contatoId, null);
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(nome);

  async function salvar() {
    const limpo = valor.trim();
    setEditando(false);
    if (!limpo || limpo === nome) return;
    try {
      if (await gravar({ name: limpo })) toast.success(t("As alterações foram salvas com sucesso."));
    } catch {
      toast.error(t("Ocorreu um erro ao salvar o campo"));
    }
  }

  if (editando) {
    return (
      <span className="flex items-center gap-1">
        <input
          autoFocus
          aria-label={t("Nome")}
          maxLength={MAX_NOME}
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void salvar();
            if (e.key === "Escape") setEditando(false);
          }}
          className="h-7 w-[200px] rounded-md border border-casca-marca bg-surface px-2 text-[15px] text-casca-texto"
        />
        <button type="button" aria-label={t("Salvar")} onClick={() => void salvar()} className="grid size-6 place-items-center rounded-md text-casca-marca hover:bg-casca-raia">
          <Check size={14} aria-hidden />
        </button>
        <button type="button" aria-label={t("Cancelar")} onClick={() => setEditando(false)} className="grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
          <X size={14} aria-hidden />
        </button>
      </span>
    );
  }
  return (
    <span className="group flex items-center gap-1.5">
      <h2 className="text-[17px] font-medium text-casca-texto">{nome}</h2>
      {podeEditar ? (
        <button
          type="button"
          aria-label={t("Editar nome")}
          onClick={() => {
            setValor(nome);
            setEditando(true);
          }}
          className="grid size-6 place-items-center rounded-md text-casca-suave opacity-0 group-hover:opacity-100 hover:bg-casca-raia focus-visible:opacity-100"
        >
          <Pencil size={13} aria-hidden />
        </button>
      ) : null}
    </span>
  );
}
```

Create `components/escale/contatos/ficha/CabecalhoDoContato.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import Link from "next/link";
import { useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { rotaDaPaginaCompleta } from "@/lib/escale/ficha-do-contato/regras";
import { ExternalLink, Merge, MessageCircle, MoreVertical, Phone, Plus, StickyNote } from "@/lib/ui/icons-da-casca";

import { NomeDoContato } from "./NomeDoContato";

const ICONE = "grid size-6 place-items-center rounded-casca-gatilho text-casca-marca hover:bg-casca-raia [&_svg]:size-3.5";
const APAGADO = "grid size-6 place-items-center text-casca-marca opacity-40 [&_svg]:size-3.5";

/**
 * O CABEÇALHO DA JANELA DO CONTATO (fork Escale, Fase 2E; C3; print 2b-10):
 * foto 40px, o nome da empresa em maiúsculas acima do nome, o nome editável, o
 * selo "Possível duplicado", ligar, conversa e nota, e à direita "+ Adicionar
 * negócio" e o ⋮ "Mais" (Q2, nosso) com a página completa do original.
 */
export function CabecalhoDoContato({
  contato,
  empresa,
  conversaId,
  duplicado,
  podeCriarNegocio,
  aoAdicionarNegocio,
  aoRevisarDuplicado,
}: {
  contato: { id: string; nome: string; telefone: string | null };
  empresa: string | null;
  conversaId: string | null;
  duplicado: boolean;
  podeCriarNegocio: boolean;
  aoAdicionarNegocio: () => void;
  aoRevisarDuplicado: () => void;
}) {
  const t = useT();
  const podeAnotar = usePermission("pipeline.move_card");
  const [nota, setNota] = useState(false);
  return (
    <div className="flex items-start justify-between gap-4">
      <div className="flex items-start gap-[11px]">
        <FotoDaLinha id={contato.id} nome={contato.nome} temFoto tamanho="ficha" />
        <div className="flex flex-col gap-1.5">
          {empresa ? (
            <span className="text-[11px] font-semibold tracking-[0.04em] text-casca-meta uppercase">{empresa}</span>
          ) : null}
          <span className="flex items-center gap-2">
            <NomeDoContato contatoId={contato.id} nome={contato.nome} />
            {duplicado ? (
              <button
                type="button"
                aria-label={t("Possível duplicado")}
                title={t("Possível duplicado. Clique para revisar e unir os dados.")}
                onClick={aoRevisarDuplicado}
                className="flex h-6 items-center gap-1 rounded-full border border-warning bg-warning-bg px-2 text-[11px] font-medium text-casca-texto hover:brightness-95"
              >
                <Merge size={12} aria-hidden className="text-warning" />
                {t("Possível duplicado")}
              </button>
            ) : null}
          </span>
          <span className="flex items-center gap-3">
            {contato.telefone ? (
              <a href={`tel:${contato.telefone}`} aria-label={t("Chamar")} title={t("Chamar")} className={ICONE}>
                <Phone aria-hidden />
              </a>
            ) : (
              <span role="img" aria-label={t("Sem telefone")} title={t("Sem telefone")} className={APAGADO}>
                <Phone aria-hidden />
              </span>
            )}
            {conversaId ? (
              <Link href={`/app/inbox?id=${conversaId}`} aria-label={t("Abrir em Conversas")} title={t("Abrir em Conversas")} className={ICONE}>
                <MessageCircle aria-hidden />
              </Link>
            ) : (
              <span role="img" aria-label={t("Sem conversa")} title={t("Sem conversa")} className={APAGADO}>
                <MessageCircle aria-hidden />
              </span>
            )}
            <button
              type="button"
              aria-label={t("Nova nota")}
              title={podeAnotar ? t("Nova nota") : t("Sem permissão")}
              disabled={!podeAnotar}
              onClick={() => setNota(true)}
              className={podeAnotar ? ICONE : APAGADO}
            >
              <StickyNote aria-hidden />
            </button>
          </span>
        </div>
      </div>
      <div className="flex items-center gap-2">
        {podeCriarNegocio ? (
          <BotaoDaCasca variante="marca" tamanho="md" onClick={aoAdicionarNegocio} className="h-8 gap-1.5 px-4">
            <Plus size={14} aria-hidden />
            {t("Adicionar negócio")}
          </BotaoDaCasca>
        ) : null}
        <MenuPrimitive.Root>
          <MenuPrimitive.Trigger
            aria-label={t("Mais")}
            className="grid size-8 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
          >
            <MoreVertical size={16} aria-hidden />
          </MenuPrimitive.Trigger>
          <MenuPrimitive.Portal>
            <MenuPrimitive.Content align="end" className={CAIXA_DO_MENU}>
              <MenuPrimitive.Item asChild className={ITEM_DO_MENU}>
                <Link href={rotaDaPaginaCompleta(contato.id)}>
                  <ExternalLink size={14} aria-hidden />
                  {t("Abrir página completa")}
                </Link>
              </MenuPrimitive.Item>
            </MenuPrimitive.Content>
          </MenuPrimitive.Portal>
        </MenuPrimitive.Root>
      </div>
      <JanelaDeNota alvo={{ tipo: "contato", id: contato.id }} aberta={nota} onFechar={() => setNota(false)} />
    </div>
  );
}
```

Create `components/escale/contatos/ficha/JanelaDoContato.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect } from "react";
import { toast } from "sonner";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { TagsDoContato } from "@/components/escale/negocio/TagsDaFicha";
import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import { AbaEmpresa, ContatoEditavel } from "@/components/escale/negocio/abas/AbasDeCampos";
import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import { useContact } from "@/hooks/contacts/useContact";
import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useEmpresaDoContato } from "@/hooks/escale/useEmpresaDoContato";
import { useNegociosDoContato } from "@/hooks/escale/useNegociosDoContato";
import { useSugestaoDoContato } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { ROTULO_DA_ABA_DO_CONTATO, abasVisiveis, type AbaDoContato } from "@/lib/escale/ficha-do-contato/regras";
import { X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AbaNegociosDoContato } from "./AbaNegociosDoContato";
import { CabecalhoDoContato } from "./CabecalhoDoContato";

export type ContatoParaNegocio = Pick<LinhaDeContato, "id" | "nome" | "display_name" | "telefone">;

/**
 * A JANELA "INFORMAÇÕES DO CONTATO" (fork Escale, Fase 2E; C3; print 2b-10;
 * Clint `index-BhVJ8kAx`). Por cima da lista, com o cabeçalho da Clint e as
 * abas Contato, Empresa, Negócios (só com negócio), Conversas, Arquivos e
 * Histórico, que são as da ficha do negócio servindo ao contato (N5). Mesclado
 * por fora: troca para o vencedor; excluído: avisa e fecha.
 */
export function JanelaDoContato({
  contatoId,
  aba,
  aoMudarAba,
  aoTrocarContato,
  aoFechar,
  podeCriarNegocio,
  podeMesclar,
  aoAdicionarNegocio,
  aoRevisarDuplicado,
}: {
  contatoId: string;
  aba: AbaDoContato;
  aoMudarAba: (aba: AbaDoContato) => void;
  aoTrocarContato: (id: string) => void;
  aoFechar: () => void;
  podeCriarNegocio: boolean;
  podeMesclar: boolean;
  aoAdicionarNegocio: (contato: ContatoParaNegocio) => void;
  aoRevisarDuplicado: (contatoId: string) => void;
}) {
  const t = useT();
  const consulta = useContact(contatoId);
  const contato = consulta.data?.data ?? null;
  const negocios = useNegociosDoContato(contatoId);
  const empresa = useEmpresaDoContato(contatoId).data ?? null;
  const conversas = useConversasDoContato(contatoId).data ?? [];
  const sugestao = useSugestaoDoContato(contatoId, podeMesclar);

  const temNegocios = (negocios.data?.negocios.length ?? 0) > 0;
  const abas = abasVisiveis(temNegocios);
  const atual = abas.includes(aba) ? aba : "contato";
  const sumiu = consulta.isError && consulta.error instanceof ApiError && consulta.error.status === 404;
  const vencedor = contato?.is_merged_into ?? null;

  useEffect(() => {
    if (vencedor) {
      toast.success(t("Contato mesclado"));
      aoTrocarContato(vencedor);
    }
  }, [vencedor, aoTrocarContato, t]);
  useEffect(() => {
    if (sumiu) {
      toast.error(t("Contato excluído"));
      aoFechar();
    }
  }, [sumiu, aoFechar, t]);

  const nome = contato?.name?.trim() || contato?.display_name?.trim() || contato?.phone_number || "";

  return (
    <DialogPrimitive.Root open onOpenChange={(aberto) => !aberto && aoFechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[46px] left-1/2 z-50 flex h-[calc(100dvh-46px)] w-[calc(100vw-96px)] max-w-[1428px] -translate-x-1/2 flex-col rounded-t-[8px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <DialogPrimitive.Title className="text-[15px] font-medium text-casca-texto">
              {t("Informações do contato")}
            </DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="mr-1 grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-[60px] pt-[26px] pb-6">
            {!contato ? (
              <div aria-busy className="flex animate-pulse items-center gap-3">
                <span className="size-10 rounded-full bg-casca-raia" />
                <span className="h-5 w-48 rounded bg-casca-raia" />
              </div>
            ) : (
              <>
                <CabecalhoDoContato
                  contato={{ id: contato.id, nome, telefone: contato.phone_number }}
                  empresa={empresa?.nome ?? null}
                  conversaId={conversas[0]?.id ?? null}
                  duplicado={podeMesclar && sugestao !== null}
                  podeCriarNegocio={podeCriarNegocio}
                  aoAdicionarNegocio={() =>
                    aoAdicionarNegocio({ id: contato.id, nome: contato.name ?? nome, display_name: contato.display_name, telefone: contato.phone_number })
                  }
                  aoRevisarDuplicado={() => aoRevisarDuplicado(contato.id)}
                />
                <div role="tablist" aria-label={t("Informações do contato")} className="mt-[22px] flex shrink-0 gap-6 border-b border-casca-borda">
                  {abas.map((a) => (
                    <button
                      key={a}
                      type="button"
                      role="tab"
                      aria-selected={a === atual}
                      onClick={() => aoMudarAba(a)}
                      className={cn(
                        "relative px-[11px] pb-2.5 text-[14px] text-casca-texto",
                        a === atual && "after:absolute after:inset-x-0 after:-bottom-px after:h-[2px] after:bg-casca-marca",
                      )}
                    >
                      {t(ROTULO_DA_ABA_DO_CONTATO[a])}
                    </button>
                  ))}
                </div>
                <div role="tabpanel" className="mt-5 flex min-h-0 flex-1 flex-col">
                  {atual === "contato" ? (
                    <>
                      <div className="mb-4 flex items-center gap-3">
                        <span className="text-[13px] text-casca-suave">{t("Tags")}</span>
                        <TagsDoContato contatoId={contato.id} pipelineId={null} tagsDeReserva={contato.tags} />
                      </div>
                      <ContatoEditavel contatoId={contato.id} pipeline={null} />
                    </>
                  ) : atual === "empresa" ? (
                    <AbaEmpresa contatoId={contato.id} />
                  ) : atual === "negocios" && negocios.data ? (
                    <AbaNegociosDoContato contatoId={contato.id} ficha={negocios.data} />
                  ) : atual === "conversas" ? (
                    <AbaConversas contatoId={contato.id} foto={<FotoDaLinha id={contato.id} nome={nome} temFoto tamanho="conversa" />} />
                  ) : atual === "arquivos" ? (
                    <AbaArquivos contatoId={contato.id} leadId={null} />
                  ) : atual === "historico" ? (
                    <AbaHistorico alvo={{ tipo: "contato", id: contato.id }} nomesDasEtapas={negocios.data?.etapas ?? {}} />
                  ) : null}
                </div>
              </>
            )}
          </div>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

**Confira antes de rodar:** `DialogOverlay` e `DialogPortal` são exportados por `@/components/ui/dialog` (o `JanelaDaCasca` os usa); `useEmpresaDoContato` devolve `{ data: EmpresaDoContato | null }` com `nome` (2D Task 11); `contato.tags` existe no `Contact` (L32). A dica "Mais" do ⋮ e "Contato mesclado" entram no espanhol na Task 11.

Run: `corepack pnpm vitest run tests/unit/escale-janela-do-contato.test.tsx`
Expected: PASS.

- [ ] **Step 4: O teste de quem abre (vai falhar)**

Create `tests/unit/escale-lista-abre-o-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { readFileSync } from "node:fs";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { CelulaNegocios } from "@/components/escale/contatos/CelulasDoContato";
import { TabelaDeContatos } from "@/components/escale/contatos/TabelaDeContatos";
import type { LinhaDeContato } from "@/lib/escale/contatos/lista";
import { COLUNAS_PADRAO } from "@/lib/escale/contatos/regras";

const ID = "11111111-2222-4333-8444-555555555555";
const linha = {
  id: ID, nome: "Ana Souza", display_name: null, telefone: "+5543998031566", email: null, instagram: null,
  tags: [], tem_foto: false, conversa_id: null, negocios: 2, negocio_unico: null, status: "ativo",
  ultima_atividade: null, criado_em: "2026-10-01T10:00:00Z", origem: "manual", nascimento: null, links: {},
} as unknown as LinhaDeContato;

describe("a lista abre a janela do contato (Fase 2E, N4)", () => {
  it("o nome abre na aba Contato, sem recarregar, e o link continua", () => {
    const aoAbrir = vi.fn();
    // O ⋮ da linha usa o React Query (vínculos e excluir): a tabela precisa do provedor.
    render(
      <QueryClientProvider client={new QueryClient()}>
      <TabelaDeContatos
        linhas={[linha]}
        colunas={COLUNAS_PADRAO}
        carregando={false}
        erro={false}
        aoTentarDeNovo={() => undefined}
        podeVerNegocios
        podeExcluir={false}
        aoAdicionarNegocio={() => undefined}
        aoAbrirContato={aoAbrir}
      />
      </QueryClientProvider>,
    );
    const nome = screen.getByRole("link", { name: "Ana Souza" });
    expect(nome).toHaveAttribute("href", `/app/contacts/${ID}`);
    const evento = new MouseEvent("click", { bubbles: true, cancelable: true, button: 0 });
    nome.dispatchEvent(evento);
    expect(evento.defaultPrevented).toBe(true);
    expect(aoAbrir).toHaveBeenCalledWith(ID, "contato");
  });

  it("'Ver 2 negócios' abre na aba Negócios", () => {
    const aoVer = vi.fn();
    render(<CelulaNegocios linha={linha} aoAdicionar={() => undefined} aoVerNegocios={aoVer} />);
    fireEvent.click(screen.getByRole("link", { name: "Ver 2 negócios" }));
    expect(aoVer).toHaveBeenCalled();
  });

  it("a página do [id] tem o encaixe da casca e a saída para a página completa", () => {
    const pagina = readFileSync("app/app/contacts/[id]/page.tsx", "utf8");
    expect(pagina).toContain("FORK ESCALE · Fase 2E");
    expect(pagina).toContain("<ListaDeContatos");
    expect(pagina).toContain('"completa"');
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-lista-abre-o-contato.test.tsx`
Expected: FAIL.

- [ ] **Step 5: Ligar a lista**

`components/escale/contatos/TabelaDeContatos.tsx`: acrescente a prop `aoAbrirContato?: (id: string, aba?: AbaDoContato) => void` e, no `<Link href={`/app/contacts/${linha.id}`}>` do nome (L138), o `onClick`:

```tsx
                onClick={(e) => {
                  // FORK ESCALE · Fase 2E (N4): abre a janela por cima da lista; o clique do meio e o Ctrl continuam abrindo outra aba.
                  if (!aoAbrirContato || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey) return;
                  e.preventDefault();
                  aoAbrirContato(linha.id, "contato");
                }}
```

Passe `aoVerNegocios={aoAbrirContato ? () => aoAbrirContato(linha.id, "negocios") : undefined}` à `CelulaNegocios` e `aoEditar={aoAbrirContato ? () => aoAbrirContato(linha.id, "contato") : undefined}` ao `MenuDaLinha` (procure onde a tabela os monta).

`components/escale/contatos/CelulasDoContato.tsx` (`CelulaNegocios`): a prop nova `aoVerNegocios?: () => void`; no `Link` do "Ver N negócios", quando `linha.negocios > 1 && aoVerNegocios`, o mesmo `onClick` que previne e chama `aoVerNegocios()` (o "Ver 1 negócio" continua indo ao negócio).

`components/escale/contatos/MenuDaLinha.tsx`: a prop nova `aoEditar?: () => void`; no item "Editar", `onSelect={() => (aoEditar ? aoEditar() : setEditando(true))}`.

`components/escale/contatos/JanelaNovoNegocio.tsx`: a prop `contato: LinhaDeContato | null` vira `contato: ContatoParaNegocio | null` (import de `./ficha/JanelaDoContato`). No `ListaDeContatos`, o estado `novoNegocio` passa a `useState<ContatoParaNegocio | null>(null)`.

`hooks/escale/useEstadoDaListaDeContatos.ts`, no `irPara`:

```ts
    // FORK ESCALE · Fase 2E (N1): com a janela do contato aberta o caminho é /app/contacts/<id>; mexer na lista volta à lista.
    novo.delete(PARAM_ABA_DO_CONTATO);
    const base = caminho.startsWith(ROTA_DA_LISTA_DE_CONTATOS) ? ROTA_DA_LISTA_DE_CONTATOS : caminho;
    router.replace(`${base}?${novo.toString()}`, { scroll: false });
```

`components/escale/contatos/ListaDeContatos.tsx`:

```tsx
  const contatoAberto = useContatoAberto();
  const [mescla, setMescla] = useState<{ aberta: boolean; contatoInicial?: string }>({ aberta: false });
```

- `<TabelaDeContatos … aoAbrirContato={contatoAberto.abrir} />`;
- depois da tabela:

```tsx
      {contatoAberto.contatoId ? (
        <JanelaDoContato
          contatoId={contatoAberto.contatoId}
          aba={contatoAberto.aba}
          aoMudarAba={contatoAberto.mudarAba}
          aoTrocarContato={contatoAberto.trocar}
          aoFechar={contatoAberto.fechar}
          podeCriarNegocio={podeCriar}
          podeMesclar={podeMesclar}
          aoAdicionarNegocio={(c) => {
            contatoAberto.fechar();
            setNovoNegocio(c);
          }}
          aoRevisarDuplicado={(id) => setMescla({ aberta: true, contatoInicial: id })}
        />
      ) : null}
```

(a `JanelaDeMescla` entra aqui na Task 10; o estado `mescla` já fica pronto.)

`app/app/contacts/[id]/page.tsx`: a assinatura ganha `searchParams: Promise<Record<string, string | string[] | undefined>>`; depois do `if (!contact) notFound();`:

```tsx
  // ── FORK ESCALE · Fase 2E (Q1, N2, N3): com a casca, o contato abre por cima da lista; a página do original fica em ?pagina=completa ──
  const { pagina } = await searchParams;
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo" && pagina !== "completa") {
    return <ListaDeContatos {...(await origensDaPagina())} />;
  }
  // ── fim FORK ESCALE ──
```

com os imports no bloco do fork do topo (`cookies` de `next/headers`, `ListaDeContatos`, `origensDaPagina`, `COOKIE_DO_MENU`, `lerPreferenciaDeMenu`), iguais aos de `app/app/contacts/page.tsx`.

Run: `corepack pnpm vitest run tests/unit/escale-lista-abre-o-contato.test.tsx tests/unit/escale-janela-do-contato.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/navegacao-completude.test.ts`
e os testes da 2A/2B que montam a lista ou a tabela: `corepack pnpm vitest run tests/unit/escale-lista-de-contatos* tests/unit/escale-tabela* tests/unit/escale-selecao*`
Expected: PASS.

- [ ] **Step 6: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/contatos hooks/escale "app/app/contacts/[id]/page.tsx"
corepack pnpm vitest run tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/vocabulario-do-funil.test.ts
git add -A components/escale/contatos hooks/escale "app/app/contacts/[id]/page.tsx" tests/unit/escale-janela-do-contato.test.tsx tests/unit/escale-lista-abre-o-contato.test.tsx
git commit -m "feat(escale): janela Informações do contato por cima da lista (Fase 2E, C3)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 10: A janela "Mesclar contatos duplicados" (C2)

**Files:**
- Modify: `hooks/escale/useSugestoesDeMescla.ts` (a lista, o total, mesclar e em massa), `components/escale/contatos/SeloDeMescla.tsx`, `components/escale/contatos/ListaDeContatos.tsx`, o teste da 2A que pinava o `SeloDeMescla` (procure `SeloDeMescla` em `tests/unit`)
- Create: `components/escale/contatos/mescla/{JanelaDeMescla,ListaDeSugestoes,FiltrosDaMescla,ComparacaoDaMescla,MesclaEmMassa,EtapasDaMescla,SeloDaConfianca}.tsx`, `tests/unit/escale-janela-de-mescla.test.tsx`

**Interfaces:**
- Consumes: Task 1 (`Sugestao`, `ConsultaDeSugestoes`, `ORDENS_DA_MESCLA`, `ROTULO_DA_ORDEM`, `REGRAS_DE_MESCLA`, `ROTULO_DA_REGRA`, `faixaDaConfianca`, `ROTULO_DA_FAIXA`, `CAMPOS_DA_MESCLA`, `ROTULO_DO_CAMPO_DA_MESCLA`, `Escolhas`, `escolhasPadrao`, `estadoDoCampo`, `valorDoCampo`, `contatoResultante`, `principalDasEscolhas`, `PRIORIDADES`, `ROTULO_DA_PRIORIDADE`, `principalPorPrioridade`, `MAX_GRUPOS_EM_MASSA`); Task 3 (as rotas e `ResultadoDaMescla`); `CaixaDaCasca({ marcada, aoMudar, "aria-label", desabilitada })`; `SeletorDaCasca({ valor, opcoes, aoMudar, "aria-label" })`; `FotoDaLinha`.
- Produces:
  - `useSugestoesDeMescla(consulta: Omit<ConsultaDeSugestoes, "p" | "n">, habilitado)` (infinita, 20 por página, chave `["sugestoes-de-mescla", "lista", consulta]`) → `{ sugestoes: Sugestao[]; total: number; temMais; carregarMais; isLoading; isError }`;
  - `useTotalDeSugestoes(habilitado)` → `number` (`?n=0`, o `meta.total`);
  - `useMesclar()` (POST `/api/v1/mesclas`) e `useMesclarEmMassa()` (POST `/api/v1/mesclas/em-massa`), os dois invalidando todas as consultas no sucesso (`qc.invalidateQueries()`: a mescla mexe em contatos, negócios, conversas e notas);
  - `JanelaDeMescla({ aberta, contatoInicial, aoFechar, aoMesclar, aoVerContato })`; `SeloDeMescla({ aoAbrir })`; `SeloDaConfianca({ confianca })`.

Sem print (provisório, item 3 da lista de prints): a moldura é a da janela do contato; a coluna da esquerda tem 300px; os componentes são os da casca.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-janela-de-mescla.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { JanelaDeMescla } from "@/components/escale/contatos/mescla/JanelaDeMescla";
import type { ContatoDaMescla, Sugestao } from "@/lib/escale/mescla/regras";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

const c = (id: string, extra: Partial<ContatoDaMescla> = {}): ContatoDaMescla => ({
  id, nome: null, telefone: null, email: null, instagram: null, whatsapp: null, empresa: null, tags: [],
  criado_em: "2026-10-01T10:00:00Z", atualizado_em: "2026-10-01T10:00:00Z", atendimento_ativo: false, ...extra,
});
const ANA: Sugestao = {
  chave: "a1",
  contatos: [
    c("a1", { nome: "Ana", telefone: "+5543998031566" }),
    c("a2", { nome: "Ana Souza", telefone: "+5543998031566", email: "ana@x.com" }),
  ],
  casou: ["telefone"], conflitos: [], confianca: 90, bloqueada: false, criada_em: "2026-10-02T10:00:00Z",
};
const BETO: Sugestao = {
  chave: "b1",
  contatos: [c("b1", { nome: "Beto", atendimento_ativo: true }), c("b2", { nome: "Beto", atendimento_ativo: true })],
  casou: ["email", "nome"], conflitos: ["telefone"], confianca: 70, bloqueada: true, criada_em: "2026-10-03T10:00:00Z",
};

const chamadas: Array<{ url: string; metodo: string; corpo?: unknown }> = [];
beforeEach(() => {
  chamadas.length = 0;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (url: string, init?: RequestInit) => {
      chamadas.push({ url, metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (url.startsWith("/api/v1/mesclas/sugestoes")) return Response.json({ data: [ANA, BETO], meta: { total: 2 } });
      if (url === "/api/v1/mesclas") return Response.json({ data: { contato_id: "a2", contatos_mesclados: ["a1"] } });
      return Response.json({ data: { mesclados: [], falhas: [] } });
    }),
  );
});

function montar(extra: Partial<Parameters<typeof JanelaDeMescla>[0]> = {}) {
  const props = { aberta: true, aoFechar: vi.fn(), aoMesclar: vi.fn(), aoVerContato: vi.fn(), ...extra };
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={qc}><JanelaDeMescla {...props} /></QueryClientProvider>);
  return props;
}

describe("JanelaDeMescla (Fase 2E, C2)", () => {
  it("a lista com a confiança e o vazio da direita", async () => {
    montar();
    expect(screen.getByRole("dialog", { name: "Mesclar contatos duplicados" })).toBeInTheDocument();
    expect(await screen.findByText("90% · Alta")).toBeInTheDocument();
    expect(screen.getByText("70% · Média")).toBeInTheDocument();
    expect(screen.getByText("2 sugestões")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma sugestão para mesclar")).toBeInTheDocument();
  });

  it("escolher por campo, ver o resultante, confirmar e mesclar", async () => {
    const props = montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Ana, Ana Souza/ }));
    expect(screen.getByText("Comparar contatos e escolher por campo")).toBeInTheDocument();
    expect(screen.getByText(/1 campos a decidir/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Nome: Ana Souza" }));
    const resultante = screen.getByRole("region", { name: "Contato resultante" });
    expect(within(resultante).getByText("Ana Souza")).toBeInTheDocument();
    expect(within(resultante).getByText("ana@x.com")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mesclar contatos para Ana Souza" }));
    expect(screen.getByText("Confirmar mescla irreversível")).toBeInTheDocument();
    const confirmar = screen.getByRole("button", { name: "Confirmar e mesclar (2)" });
    expect(confirmar).toBeDisabled();
    fireEvent.click(screen.getByRole("checkbox", { name: "Entendo que a mescla é definitiva e não pode ser desfeita." }));
    fireEvent.click(confirmar);
    await waitFor(() =>
      expect(chamadas).toContainEqual({
        url: "/api/v1/mesclas",
        metodo: "POST",
        corpo: { principal_id: "a2", secundarios: ["a1"], escolhas: { nome: "a2", email: "a2", telefone: "a1" } },
      }),
    );
    expect(await screen.findByText("Contatos mesclados")).toBeInTheDocument();
    expect(screen.getByText("2 contatos mesclados.")).toBeInTheDocument();
    expect(props.aoMesclar).toHaveBeenCalledWith({ contato_id: "a2", contatos_mesclados: ["a1"] });
    fireEvent.click(screen.getByRole("button", { name: "Ver contato" }));
    expect(props.aoVerContato).toHaveBeenCalledWith("a2");
  });

  it("grupo com dois atendimentos ativos fica bloqueado", async () => {
    montar();
    fireEvent.click(await screen.findByRole("button", { name: /^Beto, Beto/ }));
    expect(screen.getByText("Atendimento ativo impede a mescla deste grupo.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Mesclar contatos para/ })).toBeDisabled();
  });

  it("aberta pelo contato, já vem na sugestão dele", async () => {
    montar({ contatoInicial: "a2" });
    await waitFor(() => expect(chamadas.some((ch) => ch.url.includes("contato=a2"))).toBe(true));
    expect(await screen.findByText("Comparar contatos e escolher por campo")).toBeInTheDocument();
  });

  it("em massa: duas marcadas, o critério e o pedido com os grupos", async () => {
    const outra: Sugestao = { ...ANA, chave: "c1", contatos: [c("c1", { nome: "Caio" }), c("c2", { nome: "Caio" })] };
    vi.mocked(fetch).mockImplementation(async (url, init) => {
      chamadas.push({ url: String(url), metodo: init?.method ?? "GET", corpo: init?.body ? JSON.parse(String(init.body)) : undefined });
      if (String(url).startsWith("/api/v1/mesclas/sugestoes")) return Response.json({ data: [ANA, outra], meta: { total: 2 } });
      return Response.json({ data: { mesclados: [{ contato_id: "a1", contatos_mesclados: ["a2"] }, { contato_id: "c1", contatos_mesclados: ["c2"] }], falhas: [] } });
    });
    montar();
    fireEvent.click(await screen.findByRole("checkbox", { name: "Selecionar todos (2)" }));
    expect(screen.getByText("Mesclando em massa")).toBeInTheDocument();
    expect(screen.getByText("2 marcadas")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Mesclar 2 grupos selecionados" }));
    fireEvent.click(screen.getByRole("checkbox", { name: "Entendo que a mescla é definitiva e não pode ser desfeita." }));
    fireEvent.click(screen.getByRole("button", { name: "Confirmar e mesclar (2)" }));
    await waitFor(() =>
      expect(chamadas).toContainEqual({
        url: "/api/v1/mesclas/em-massa",
        metodo: "POST",
        corpo: { grupos: [["a1", "a2"], ["c1", "c2"]], prioridade: "criado_por_ultimo" },
      }),
    );
    expect(await screen.findByText("2 contatos mesclados.")).toBeInTheDocument();
  });
});
```

Notas do teste: o nome da linha da sugestão é "nomes, confiança" (o `aria-label` do botão da linha: `"{até 3 nomes separados por ', '}, {NN}% · {faixa}"`); a célula da comparação tem `aria-label` "{Campo}: {valor}"; as escolhas padrão de ANA são nome `a1` (primeiro com nome), e-mail `a2` (único) e telefone `a1` (igual em todos: o primeiro); escolher "Nome: Ana Souza" troca o nome para `a2`, que vira o principal (N11); a confirmação em massa conta os grupos ("Confirmar e mesclar (2)") e o concluído soma os absorvidos mais os vencedores ("2 contatos mesclados." na única: 1 vencedor + 1 absorvido; na em massa, 2 grupos × 1 absorvido = 2).

Run: `corepack pnpm vitest run tests/unit/escale-janela-de-mescla.test.tsx`
Expected: FAIL (o componente não existe).

- [ ] **Step 2: Os hooks**

Em `hooks/escale/useSugestoesDeMescla.ts`, acrescente:

```ts
import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { ResultadoDaMescla } from "@/lib/escale/mescla/banco";
import type { ConsultaDeSugestoes, Escolhas, Prioridade } from "@/lib/escale/mescla/regras";

const POR_PAGINA = 20;
type Pagina = { data: Sugestao[]; meta?: { total?: number } };
export type FiltroDasSugestoes = Omit<ConsultaDeSugestoes, "p" | "n">;

function paraUrl(consulta: FiltroDasSugestoes, p: number, n: number): string {
  const busca = new URLSearchParams({ ordem: consulta.ordem, p: String(p), n: String(n) });
  if (consulta.q) busca.set("q", consulta.q);
  if (consulta.regras.length > 0) busca.set("regras", consulta.regras.join(","));
  if (consulta.min > 0) busca.set("min", String(consulta.min));
  if (consulta.max < 100) busca.set("max", String(consulta.max));
  if (consulta.tags.length > 0) busca.set("tags", consulta.tags.join(","));
  if (consulta.validos) busca.set("validos", "1");
  if (consulta.contato) busca.set("contato", consulta.contato);
  return `/api/v1/mesclas/sugestoes?${busca.toString()}`;
}

export function useSugestoesDeMescla(consulta: FiltroDasSugestoes, habilitado: boolean) {
  const q = useInfiniteQuery({
    queryKey: ["sugestoes-de-mescla", "lista", consulta],
    enabled: habilitado,
    initialPageParam: 1,
    queryFn: async ({ pageParam }) => apiClient.get<Pagina>(paraUrl(consulta, pageParam, POR_PAGINA)),
    getNextPageParam: (ultima, todas) =>
      todas.length * POR_PAGINA < (ultima.meta?.total ?? 0) ? todas.length + 1 : undefined,
  });
  return {
    sugestoes: q.data?.pages.flatMap((p) => p.data) ?? [],
    total: q.data?.pages[0]?.meta?.total ?? 0,
    temMais: !!q.hasNextPage,
    carregarMais: () => void q.fetchNextPage(),
    isLoading: q.isLoading,
    isError: q.isError,
  };
}

export function useTotalDeSugestoes(habilitado: boolean): number {
  const q = useQuery({
    queryKey: ["sugestoes-de-mescla", "total"],
    enabled: habilitado,
    staleTime: 60_000,
    queryFn: async () => apiClient.get<Pagina>("/api/v1/mesclas/sugestoes?n=0"),
  });
  return q.data?.meta?.total ?? 0;
}

export function useMesclar() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: { principal_id: string; secundarios: string[]; escolhas: Escolhas }) =>
      (await apiClient.post<{ data: ResultadoDaMescla }>("/api/v1/mesclas", pedido)).data,
    onSuccess: () => void qc.invalidateQueries(),
  });
}

export function useMesclarEmMassa() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (pedido: { grupos: string[][]; prioridade: Prioridade }) =>
      (
        await apiClient.post<{ data: { mesclados: ResultadoDaMescla[]; falhas: Array<{ grupo: string[]; erro: string }> } }>(
          "/api/v1/mesclas/em-massa",
          pedido,
        )
      ).data,
    onSuccess: () => void qc.invalidateQueries(),
  });
}
```

(junte os imports ao topo do arquivo; se o `import type` de `banco.ts` incomodar o eslint de fronteira, mova `ResultadoDaMescla` para `regras.ts` e reexporte em `banco.ts`.)

- [ ] **Step 3: As peças da janela**

Create `components/escale/contatos/mescla/SeloDaConfianca.tsx`:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DA_FAIXA, faixaDaConfianca } from "@/lib/escale/mescla/regras";
import { cn } from "@/lib/utils";

const COR = {
  alta: "bg-success-bg text-success",
  media: "bg-warning-bg text-warning",
  baixa: "bg-destructive/10 text-destructive",
} as const;

/** "NN% · Alta" (Clint `scoreTier`: ≥ 85 verde, ≥ 65 laranja, abaixo vermelho). */
export function SeloDaConfianca({ confianca }: { confianca: number }) {
  const t = useT();
  const faixa = faixaDaConfianca(confianca);
  return (
    <span className={cn("shrink-0 rounded-full px-2 py-0.5 text-[11px] font-semibold whitespace-nowrap", COR[faixa])}>
      {`${confianca}% · ${t(ROTULO_DA_FAIXA[faixa])}`}
    </span>
  );
}
```

Create `components/escale/contatos/mescla/FiltrosDaMescla.tsx`:

```tsx
"use client";
import * as Popover from "@radix-ui/react-popover";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { FiltroDasSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { REGRAS_DE_MESCLA, ROTULO_DA_REGRA, type RegraDeMescla } from "@/lib/escale/mescla/regras";
import { Funnel } from "@/lib/ui/icons-da-casca";

/** "Filtros" da lista de sugestões (Clint `SuggestionsMerge`): Critérios, Confiança, Tags e Outros. */
export function FiltrosDaMescla({
  filtro,
  aoMudar,
}: {
  filtro: FiltroDasSugestoes;
  aoMudar: (novo: FiltroDasSugestoes) => void;
}) {
  const t = useT();
  const ativos =
    (filtro.regras.length > 0 ? 1 : 0) + (filtro.min > 0 || filtro.max < 100 ? 1 : 0) + (filtro.tags.length > 0 ? 1 : 0) + (filtro.validos ? 1 : 0);
  const alternarRegra = (r: RegraDeMescla, marcada: boolean) =>
    aoMudar({ ...filtro, regras: marcada ? [...filtro.regras, r] : filtro.regras.filter((x) => x !== r) });
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda px-2.5 text-[13px] text-casca-texto hover:bg-casca-raia">
        <Funnel size={14} aria-hidden />
        {t("Filtros")}
        {ativos > 0 ? (
          <span className="rounded-full bg-casca-marca px-1.5 text-[11px] font-semibold text-white">{ativos}</span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 w-[280px] rounded-lg border border-casca-borda bg-surface p-4 text-[13px] shadow-casca-painel">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Critérios")}</p>
          <p className="mt-1 text-[12px] text-casca-meta">{t("Casou por")}</p>
          <div className="mt-2 flex flex-col gap-2">
            {REGRAS_DE_MESCLA.map((r) => (
              <CaixaDaCasca key={r} marcada={filtro.regras.includes(r)} aoMudar={(m) => alternarRegra(r, m)} rotulo={t(ROTULO_DA_REGRA[r])} aria-label={t(ROTULO_DA_REGRA[r])} />
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Confiança")}</p>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={0} max={100} aria-label={t("Confiança")} value={filtro.min} onChange={(e) => aoMudar({ ...filtro, min: Number(e.target.value) || 0 })} className="h-8 w-16 rounded-md bg-casca-busca px-2" />
            <span className="text-casca-suave">{t("até")}</span>
            <input type="number" min={0} max={100} aria-label={t("até")} value={filtro.max} onChange={(e) => aoMudar({ ...filtro, max: Number(e.target.value) || 100 })} className="h-8 w-16 rounded-md bg-casca-busca px-2" />
          </div>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Tags")}</p>
          <input
            aria-label={t("Filtrar por tags")}
            placeholder={t("Filtrar por tags")}
            value={filtro.tags.join(", ")}
            onChange={(e) => aoMudar({ ...filtro, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="mt-2 h-8 w-full rounded-md bg-casca-busca px-2"
          />
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Outros")}</p>
          <div className="mt-2">
            <CaixaDaCasca marcada={filtro.validos} aoMudar={(m) => aoMudar({ ...filtro, validos: m })} rotulo={t("Ignorar telefones inválidos")} aria-label={t("Ignorar telefones inválidos")} />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => aoMudar({ ...filtro, regras: [], min: 0, max: 100, tags: [], validos: false })} className="text-[13px] font-medium text-casca-marca hover:underline">
              {t("Limpar")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
```

**Confira antes de rodar:** a `CaixaDaCasca` tem a prop `rotulo` (texto ao lado; é o que o Step 1 da `CaixaDaCasca` mostra) e o Radix Popover está instalado (`grep -n '"@radix-ui/react-popover"' package.json`; a 2B usou `PainelSuspenso`: se o Popover não estiver, use o `PainelSuspenso` da casca do mesmo jeito). O campo de número usa o `<input type="number">`: a Clint usa um par de números com "até" também, não um controle de data; não é controle nativo proibido pelo contrato (que fala de data e seleção).

Create `components/escale/contatos/mescla/ListaDeSugestoes.tsx`:

```tsx
"use client";
import * as MenuPrimitive from "@radix-ui/react-dropdown-menu";
import { useEffect, useState } from "react";

import { FotoDaLinha } from "@/components/escale/contatos/FotoDaLinha";
import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { FiltroDasSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { ORDENS_DA_MESCLA, ROTULO_DA_ORDEM, ROTULO_DA_FAIXA, faixaDaConfianca, type Sugestao } from "@/lib/escale/mescla/regras";
import { ArrowUpDown, Search } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FiltrosDaMescla } from "./FiltrosDaMescla";
import { SeloDaConfianca } from "./SeloDaConfianca";

const nomesDaSugestao = (s: Sugestao) =>
  s.contatos.slice(0, 3).map((c) => c.nome ?? c.telefone ?? c.email ?? "—").join(", ");

/** A COLUNA DA ESQUERDA (300px): busca (350 ms), Filtros, Ordenar, "Selecionar todos", a lista e o rodapé. */
export function ListaDeSugestoes({
  filtro,
  aoMudarFiltro,
  sugestoes,
  total,
  carregando,
  erro,
  temMais,
  aoCarregarMais,
  escolhida,
  aoEscolher,
  marcadas,
  aoMarcar,
}: {
  filtro: FiltroDasSugestoes;
  aoMudarFiltro: (f: FiltroDasSugestoes) => void;
  sugestoes: Sugestao[];
  total: number;
  carregando: boolean;
  erro: boolean;
  temMais: boolean;
  aoCarregarMais: () => void;
  escolhida: string | null;
  aoEscolher: (chave: string) => void;
  marcadas: ReadonlySet<string>;
  aoMarcar: (chaves: string[], marcar: boolean) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState(filtro.q);
  useEffect(() => {
    const id = window.setTimeout(() => {
      if (busca !== filtro.q) aoMudarFiltro({ ...filtro, q: busca });
    }, 350);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- só a busca digitada dispara
  }, [busca]);
  const marcaveis = sugestoes.filter((s) => !s.bloqueada).map((s) => s.chave);
  const todasMarcadas = marcaveis.length > 0 && marcaveis.every((c) => marcadas.has(c));

  return (
    <div className="flex w-[300px] shrink-0 flex-col border-r border-casca-borda">
      <div className="flex flex-col gap-2 border-b border-casca-borda p-3">
        <span className="relative">
          <input
            type="text"
            aria-label={t("Buscar telefone ou nome…")}
            placeholder={t("Buscar telefone ou nome…")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-full rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta"
          />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </span>
        <div className="flex items-center gap-2">
          <FiltrosDaMescla filtro={filtro} aoMudar={aoMudarFiltro} />
          <MenuPrimitive.Root>
            <MenuPrimitive.Trigger className="flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda px-2.5 text-[13px] text-casca-texto hover:bg-casca-raia">
              <ArrowUpDown size={14} aria-hidden />
              {t("Ordenar")}
            </MenuPrimitive.Trigger>
            <MenuPrimitive.Portal>
              <MenuPrimitive.Content align="start" className={CAIXA_DO_MENU}>
                {ORDENS_DA_MESCLA.map((o) => (
                  <MenuPrimitive.Item key={o} className={cn(ITEM_DO_MENU, o === filtro.ordem && "font-semibold text-casca-marca")} onSelect={() => aoMudarFiltro({ ...filtro, ordem: o })}>
                    {t(ROTULO_DA_ORDEM[o])}
                  </MenuPrimitive.Item>
                ))}
              </MenuPrimitive.Content>
            </MenuPrimitive.Portal>
          </MenuPrimitive.Root>
        </div>
        <CaixaDaCasca
          marcada={todasMarcadas}
          aoMudar={(m) => aoMarcar(marcaveis, m)}
          rotulo={`${t("Selecionar todos")} (${marcaveis.length})`}
          aria-label={`${t("Selecionar todos")} (${marcaveis.length})`}
          desabilitada={marcaveis.length === 0}
        />
      </div>
      <ul
        className="min-h-0 flex-1 overflow-y-auto"
        onScroll={(e) => {
          const el = e.currentTarget;
          if (temMais && el.scrollTop + el.clientHeight >= el.scrollHeight - 80) aoCarregarMais();
        }}
      >
        {carregando ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Carregando…")}</li>
        ) : erro ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Falha ao carregar sugestões de mescla.")}</li>
        ) : sugestoes.length === 0 ? (
          <li className="px-3 py-6 text-xs text-casca-suave">{t("Nenhuma sugestão de mescla")}</li>
        ) : (
          sugestoes.map((s) => {
            const nomes = nomesDaSugestao(s);
            const faixa = t(ROTULO_DA_FAIXA[faixaDaConfianca(s.confianca)]);
            return (
              <li key={s.chave} className={cn("flex items-center gap-2 border-b border-casca-borda px-3 py-2.5", s.chave === escolhida && "bg-casca-raia")}>
                <CaixaDaCasca marcada={marcadas.has(s.chave)} aoMudar={(m) => aoMarcar([s.chave], m)} aria-label={`${t("Selecionar")} ${nomes}`} desabilitada={s.bloqueada} />
                <button type="button" aria-label={`${nomes}, ${s.confianca}% · ${faixa}`} onClick={() => aoEscolher(s.chave)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <span className="flex shrink-0 -space-x-2">
                    {s.contatos.slice(0, 3).map((c) => (
                      <FotoDaLinha key={c.id} id={c.id} nome={c.nome ?? ""} temFoto={false} />
                    ))}
                    {s.contatos.length > 3 ? (
                      <span className="grid size-8 place-items-center rounded-full bg-casca-raia text-[11px] text-casca-suave">{`+${s.contatos.length - 3}`}</span>
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-[13px] text-casca-texto">{nomes}</span>
                  <SeloDaConfianca confianca={s.confianca} />
                </button>
              </li>
            );
          })
        )}
      </ul>
      <p className="border-t border-casca-borda px-3 py-2 text-[12px] text-casca-suave">
        {marcadas.size > 0
          ? `${marcadas.size} ${marcadas.size === 1 ? t("marcada") : t("marcadas")}`
          : `${total} ${total === 1 ? t("sugestão") : t("sugestões")}`}
      </p>
    </div>
  );
}
```

Create `components/escale/contatos/mescla/ComparacaoDaMescla.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_DA_MESCLA,
  REGRAS_DE_MESCLA,
  ROTULO_DA_REGRA,
  ROTULO_DO_CAMPO_DA_MESCLA,
  contatoResultante,
  escolhasPadrao,
  estadoDoCampo,
  principalDasEscolhas,
  valorDoCampo,
  type CampoDaMescla,
  type ContatoDaMescla,
  type Escolhas,
  type Sugestao,
} from "@/lib/escale/mescla/regras";
import { cn } from "@/lib/utils";

import { SeloDaConfianca } from "./SeloDaConfianca";

export type PedidoDaComparacao = { principal: ContatoDaMescla; secundarios: string[]; escolhas: Escolhas };

/**
 * A COMPARAÇÃO DA DIREITA (Clint `DuplicateContactsV2`): uma coluna por contato
 * (desmarcar tira o contato; mínimo 2), uma linha por campo; clicar na célula
 * escolhe o valor que fica; "Contato resultante"; o botão "Mesclar contatos para
 * {nome}". Os campos já resolvidos (iguais ou únicos) ficam escondidos até
 * "Mostrar todos os campos".
 */
export function ComparacaoDaMescla({ sugestao, aoMesclar }: { sugestao: Sugestao; aoMesclar: (p: PedidoDaComparacao) => void }) {
  const t = useT();
  const [fora, setFora] = useState<ReadonlySet<string>>(new Set());
  const contatos = useMemo(() => sugestao.contatos.filter((c) => !fora.has(c.id)), [sugestao, fora]);
  const [escolhas, setEscolhas] = useState<Escolhas>(() => escolhasPadrao(sugestao.contatos));
  const [todos, setTodos] = useState(false);
  const validas: Escolhas = useMemo(() => {
    const padrao = escolhasPadrao(contatos);
    const juntas: Escolhas = { ...padrao };
    for (const campo of CAMPOS_DA_MESCLA) {
      if (escolhas[campo] && contatos.some((c) => c.id === escolhas[campo])) juntas[campo] = escolhas[campo];
    }
    return juntas;
  }, [contatos, escolhas]);
  const estados = CAMPOS_DA_MESCLA.map((campo) => ({ campo, estado: estadoDoCampo(contatos, campo) }));
  const aDecidir = estados.filter((e) => e.estado === "decidir").length;
  const resolvidos = estados.filter((e) => e.estado === "igual" || e.estado === "unico").length;
  const visiveis = estados.filter((e) => todos || e.estado === "decidir");
  const resultante = contatoResultante(contatos, validas);
  const principalId = contatos.length > 0 ? principalDasEscolhas(contatos, validas) : null;
  const principal = contatos.find((c) => c.id === principalId) ?? null;
  const poucos = contatos.length < 2;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="flex items-center justify-between gap-3 border-b border-casca-borda px-5 py-3">
        <span className="truncate text-[15px] font-medium text-casca-texto">{sugestao.contatos.map((c) => c.nome ?? "—").join(", ")}</span>
        <span
          className="flex items-center gap-2"
          title={`${t("Confiança calculada a partir dos critérios que casaram e dos que conflitam entre os contatos.")} ${t("Casou por")}: ${sugestao.casou.map((r) => t(ROTULO_DA_REGRA[r])).join(", ")}${sugestao.conflitos.length ? ` · ${t("Conflito por")}: ${sugestao.conflitos.map((r) => t(ROTULO_DA_REGRA[r])).join(", ")}` : ""}`}
        >
          <SeloDaConfianca confianca={sugestao.confianca} />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[14px] font-medium text-casca-texto">{t("Comparar contatos e escolher por campo")}</p>
        <p className="mt-1 text-[12px] text-casca-suave">
          {`${aDecidir} ${t("campos a decidir")} · ${resolvidos} ${t("campos já resolvidos")}`}
        </p>
        <p className="mt-1 text-[12px] text-casca-meta">
          {t("Toque em uma célula para escolher o valor que prevalece.")} {t("Desmarque uma coluna para excluir o contato da mescla.")}
        </p>
        <table className="mt-3 w-full border-collapse text-[13px]">
          <thead>
            <tr className="border-b border-casca-borda">
              <th className="w-32" />
              {sugestao.contatos.map((c) => (
                <th key={c.id} className="px-2 py-2 text-left font-medium">
                  <CaixaDaCasca
                    marcada={!fora.has(c.id)}
                    aoMudar={(m) => setFora((atual) => { const novo = new Set(atual); if (m) novo.delete(c.id); else novo.add(c.id); return novo; })}
                    rotulo={c.nome ?? "—"}
                    aria-label={c.nome ?? "—"}
                  />
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {visiveis.map(({ campo, estado }) => (
              <tr key={campo} className="border-b border-casca-borda">
                <td className="py-2 pr-2 text-casca-suave">
                  {t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}
                  {estado === "igual" ? <span className="block text-[11px] text-casca-meta">{t("igual em todos")}</span> : null}
                  {estado === "unico" ? <span className="block text-[11px] text-casca-meta">{t("único disponível")}</span> : null}
                </td>
                {sugestao.contatos.map((c) => (
                  <td key={c.id} className="px-2 py-1.5">
                    <Celula campo={campo} contato={c} ativa={!fora.has(c.id)} escolhida={validas[campo] === c.id} aoEscolher={() => setEscolhas((e) => ({ ...e, [campo]: c.id }))} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {resolvidos > 0 ? (
          <button type="button" onClick={() => setTodos((v) => !v)} className="mt-2 text-[12px] font-medium text-casca-marca hover:underline">
            {todos ? t("Ocultar campos já resolvidos") : `${t("Mostrar todos os campos")} (${CAMPOS_DA_MESCLA.length})`}
          </button>
        ) : null}
        <p className="mt-2 text-[12px] text-casca-meta">{t("Tags: sempre unidas")}</p>
        <section aria-label={t("Contato resultante")} className="mt-4 rounded-lg border border-casca-borda bg-casca-raia p-3">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Contato resultante")}</p>
          <dl className="mt-2 grid grid-cols-[120px_1fr] gap-y-1 text-[13px]">
            {CAMPOS_DA_MESCLA.map((campo) => (
              <div key={campo} className="contents">
                <dt className="text-casca-suave">{t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}</dt>
                <dd className="text-casca-texto">{resultante[campo] ?? "—"}</dd>
              </div>
            ))}
          </dl>
        </section>
        {poucos ? <p className="mt-3 text-[12px] text-casca-alerta">{t("São necessários ao menos 2 contatos.")}</p> : null}
        {sugestao.bloqueada ? <p className="mt-3 text-[12px] text-casca-alerta">{t("Atendimento ativo impede a mescla deste grupo.")}</p> : null}
      </div>
      <div className="flex items-center justify-between gap-3 border-t border-casca-borda px-5 py-3">
        <span className="text-[12px] text-casca-meta">{t("A mescla é definitiva e não pode ser desfeita.")}</span>
        <BotaoDaCasca
          variante="marca"
          tamanho="md"
          disabled={poucos || sugestao.bloqueada || !principal}
          onClick={() =>
            principal &&
            aoMesclar({ principal, secundarios: contatos.map((c) => c.id).filter((id) => id !== principal.id), escolhas: validas })
          }
        >
          {`${t("Mesclar contatos para")} ${principal?.nome ?? resultante.nome ?? "—"}`}
        </BotaoDaCasca>
      </div>
    </div>
  );
}

function Celula({
  campo,
  contato,
  ativa,
  escolhida,
  aoEscolher,
}: {
  campo: CampoDaMescla;
  contato: ContatoDaMescla;
  ativa: boolean;
  escolhida: boolean;
  aoEscolher: () => void;
}) {
  const t = useT();
  const valor = valorDoCampo(contato, campo);
  if (!valor) return <span className="text-casca-meta">—</span>;
  return (
    <button
      type="button"
      aria-label={`${t(ROTULO_DO_CAMPO_DA_MESCLA[campo])}: ${valor}`}
      aria-pressed={escolhida}
      disabled={!ativa}
      onClick={aoEscolher}
      className={cn(
        "w-full truncate rounded-md border px-2 py-1 text-left",
        escolhida ? "border-casca-marca bg-casca-marca-suave text-casca-marca" : "border-casca-borda text-casca-texto hover:bg-casca-raia",
        !ativa && "opacity-40",
      )}
    >
      {valor}
    </button>
  );
}
```

(O `REGRAS_DE_MESCLA` importado só aparece no `title`; se o eslint acusar import sem uso, tire-o.)

Create `components/escale/contatos/mescla/MesclaEmMassa.tsx`:

```tsx
"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  MAX_GRUPOS_EM_MASSA,
  PRIORIDADES,
  ROTULO_DA_PRIORIDADE,
  principalPorPrioridade,
  type Prioridade,
  type Sugestao,
} from "@/lib/escale/mescla/regras";
import { X } from "@/lib/ui/icons-da-casca";

const PREVIA = 20;

/** "Mesclando em massa" (Clint): o critério, os vencedores previstos e o botão. Sem escolha por campo. */
export function MesclaEmMassa({
  selecionadas,
  prioridade,
  aoMudarPrioridade,
  aoRemover,
  aoMesclar,
}: {
  selecionadas: Sugestao[];
  prioridade: Prioridade;
  aoMudarPrioridade: (p: Prioridade) => void;
  aoRemover: (chave: string) => void;
  aoMesclar: () => void;
}) {
  const t = useT();
  const n = selecionadas.length;
  const acima = n > MAX_GRUPOS_EM_MASSA;
  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="border-b border-casca-borda px-5 py-3 text-[15px] font-medium text-casca-texto">{t("Mesclando em massa")}</div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
        <p className="text-[13px] font-medium text-casca-texto">{t("Critério de priorização")}</p>
        <div className="mt-2 w-[260px]">
          <SeletorDaCasca
            valor={prioridade}
            opcoes={PRIORIDADES.map((p) => ({ valor: p, rotulo: t(ROTULO_DA_PRIORIDADE[p]) }))}
            aoMudar={(v) => aoMudarPrioridade((v || "criado_por_ultimo") as Prioridade)}
            aria-label={t("Critério de priorização")}
            aparencia="janela"
          />
        </div>
        <p className="mt-5 text-[13px] font-medium text-casca-texto">{t("Vencedores previstos")}</p>
        <ul className="mt-2 flex flex-col gap-1">
          {selecionadas.slice(0, PREVIA).map((s) => {
            const vencedor = s.contatos.find((c) => c.id === principalPorPrioridade(s.contatos, prioridade));
            return (
              <li key={s.chave} className="flex items-center justify-between rounded-md border border-casca-borda px-3 py-2 text-[13px]">
                <span className="truncate">{vencedor?.nome ?? vencedor?.telefone ?? "—"}</span>
                <button type="button" aria-label={t("Remover da seleção")} title={t("Remover da seleção")} onClick={() => aoRemover(s.chave)} className="grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
                  <X size={14} aria-hidden />
                </button>
              </li>
            );
          })}
        </ul>
        {n > PREVIA ? (
          <p className="mt-2 text-[12px] text-casca-suave">{`+${n - PREVIA} ${t("grupos selecionados serão mesclados com o mesmo critério")}`}</p>
        ) : null}
        {acima ? (
          <div className="mt-4 rounded-md border border-warning bg-warning-bg p-3 text-[13px]">
            <p className="font-medium">{t("Seleção acima do limite")}</p>
            <p className="mt-1 text-casca-suave">
              {t("Refine o filtro: a seleção ({count}) passa do limite de {cap} por mescla.").replace("{count}", String(n)).replace("{cap}", String(MAX_GRUPOS_EM_MASSA))}
            </p>
          </div>
        ) : null}
      </div>
      <div className="flex justify-end border-t border-casca-borda px-5 py-3">
        <BotaoDaCasca variante="marca" tamanho="md" disabled={acima || n === 0} onClick={aoMesclar}>
          {n === 1 ? t("Mesclar 1 grupo selecionado") : `${t("Mesclar")} ${n} ${t("grupos selecionados")}`}
        </BotaoDaCasca>
      </div>
    </div>
  );
}
```

Create `components/escale/contatos/mescla/EtapasDaMescla.tsx`:

```tsx
"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Loader2 } from "@/lib/ui/icons-da-casca";

/** As etapas depois de escolher (Clint `ll`/`il`): confirmar, mesclando, concluído e erro. */
export function ConfirmarMescla({
  grupos,
  absorvidos,
  emMassa,
  aoVoltar,
  aoConfirmar,
}: {
  grupos: number;
  absorvidos: number;
  emMassa: boolean;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  const [entendi, setEntendi] = useState(false);
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-4 px-5 py-8">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Confirmar mescla irreversível")}</h3>
      <p className="text-[13px] text-casca-suave">
        {emMassa
          ? t("Você está mesclando vários grupos de uma vez. Revise antes de confirmar.")
          : t("Esta ação consolida os contatos em um único vencedor e não pode ser desfeita.")}
      </p>
      <div className="flex gap-6 text-[13px]">
        <span><strong>{grupos}</strong> {grupos === 1 ? t("grupo") : t("grupos")}</span>
        <span><strong>{absorvidos}</strong> {t("contatos absorvidos")}</span>
      </div>
      <CaixaDaCasca
        marcada={entendi}
        aoMudar={setEntendi}
        rotulo={t("Entendo que a mescla é definitiva e não pode ser desfeita.")}
        aria-label={t("Entendo que a mescla é definitiva e não pode ser desfeita.")}
      />
      <div className="flex justify-between">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVoltar}>{t("Voltar")}</BotaoDaCasca>
        <button
          type="button"
          disabled={!entendi}
          onClick={aoConfirmar}
          className="h-[31px] rounded-casca-gatilho bg-destructive px-4 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {`${t("Confirmar e mesclar")} (${emMassa ? grupos : absorvidos + 1})`}
        </button>
      </div>
    </div>
  );
}

export function Mesclando() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
      <Loader2 size={28} aria-hidden className="animate-spin text-casca-marca" />
      <p className="text-[15px] font-medium text-casca-texto">{t("Mesclando contatos…")}</p>
      <p className="max-w-[360px] text-[13px] text-casca-suave">
        {t("Consolidando os contatos, leva só alguns instantes. Mantenha esta janela aberta.")}
      </p>
    </div>
  );
}

export function MesclaConcluida({
  contatos,
  falhas,
  aoVoltar,
  aoVerContato,
  aoConcluir,
}: {
  contatos: number;
  falhas: string[];
  aoVoltar: () => void;
  aoVerContato: (() => void) | null;
  aoConcluir: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-3 px-5 py-8 text-center">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Contatos mesclados")}</h3>
      <p className="text-[13px] text-casca-suave">{`${contatos} ${t("contatos mesclados.")}`}</p>
      {falhas.length > 0 ? (
        <ul className="text-left text-[12px] text-casca-alerta">
          {falhas.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      ) : null}
      <div className="mt-2 flex justify-center gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVoltar}>{t("Voltar para a lista")}</BotaoDaCasca>
        {aoVerContato ? <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVerContato}>{t("Ver contato")}</BotaoDaCasca> : null}
        <BotaoDaCasca variante="marca" tamanho="md" onClick={aoConcluir}>{t("Concluir")}</BotaoDaCasca>
      </div>
    </div>
  );
}

export function FalhaDaMescla({ mensagem, aoTentarDeNovo, aoFechar }: { mensagem: string; aoTentarDeNovo: () => void; aoFechar: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-3 px-5 py-8 text-center">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Falha ao mesclar contatos.")}</h3>
      <p className="text-[13px] text-casca-suave">{mensagem}</p>
      <div className="mt-2 flex justify-center gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoFechar}>{t("Fechar")}</BotaoDaCasca>
        <BotaoDaCasca variante="marca" tamanho="md" onClick={aoTentarDeNovo}>{t("Tentar de novo")}</BotaoDaCasca>
      </div>
    </div>
  );
}
```

**Confira antes de rodar:** `bg-destructive` passa na cerca `tailwind-tokens` (o token existe em `app/globals.css`); se a cerca pedir token da casca, use `bg-casca-alerta`. O botão vermelho é da Clint ("Confirmar e mesclar" em vermelho).

Create `components/escale/contatos/mescla/JanelaDeMescla.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useEffect, useMemo, useState } from "react";

import { DialogOverlay, DialogPortal } from "@/components/ui/dialog";
import {
  useMesclar,
  useMesclarEmMassa,
  useSugestoesDeMescla,
  type FiltroDasSugestoes,
} from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import type { ResultadoDaMescla } from "@/lib/escale/mescla/banco";
import type { Prioridade } from "@/lib/escale/mescla/regras";
import { X } from "@/lib/ui/icons-da-casca";

import { ComparacaoDaMescla, type PedidoDaComparacao } from "./ComparacaoDaMescla";
import { ConfirmarMescla, FalhaDaMescla, MesclaConcluida, Mesclando } from "./EtapasDaMescla";
import { ListaDeSugestoes } from "./ListaDeSugestoes";
import { MesclaEmMassa } from "./MesclaEmMassa";

const FILTRO_INICIAL: FiltroDasSugestoes = { q: "", ordem: "maior_confianca", regras: [], min: 0, max: 100, tags: [], validos: false };

type Etapa =
  | { tipo: "lista" }
  | { tipo: "confirmar"; unica: PedidoDaComparacao | null }
  | { tipo: "mesclando" }
  | { tipo: "concluida"; contatos: number; falhas: string[]; vencedor: string | null }
  | { tipo: "erro"; mensagem: string; repetir: () => void };

/**
 * A JANELA "MESCLAR CONTATOS DUPLICADOS" (fork Escale, Fase 2E; C2; Clint
 * `DuplicateContactsV2`). Lista de sugestões à esquerda; à direita a comparação
 * da escolhida ou, com duas ou mais marcadas, a mescla em massa; depois
 * confirmar, mesclando e concluído. Aberta pelo contato, já vem na sugestão dele.
 */
export function JanelaDeMescla({
  aberta,
  contatoInicial,
  aoFechar,
  aoMesclar,
  aoVerContato,
}: {
  aberta: boolean;
  contatoInicial?: string;
  aoFechar: () => void;
  aoMesclar: (r: ResultadoDaMescla) => void;
  aoVerContato: (id: string) => void;
}) {
  const t = useT();
  const [filtro, setFiltro] = useState<FiltroDasSugestoes>(FILTRO_INICIAL);
  const consulta = useMemo(() => ({ ...filtro, contato: contatoInicial }), [filtro, contatoInicial]);
  const lista = useSugestoesDeMescla(consulta, aberta);
  const [escolhida, setEscolhida] = useState<string | null>(null);
  const [marcadas, setMarcadas] = useState<ReadonlySet<string>>(new Set());
  const [prioridade, setPrioridade] = useState<Prioridade>("criado_por_ultimo");
  const [etapa, setEtapa] = useState<Etapa>({ tipo: "lista" });
  const mesclar = useMesclar();
  const emMassa = useMesclarEmMassa();

  useEffect(() => {
    if (contatoInicial && lista.sugestoes[0] && escolhida === null) setEscolhida(lista.sugestoes[0].chave);
  }, [contatoInicial, lista.sugestoes, escolhida]);

  const sugestao = lista.sugestoes.find((s) => s.chave === escolhida) ?? null;
  const selecionadas = lista.sugestoes.filter((s) => marcadas.has(s.chave));
  const marcar = (chaves: string[], marcar: boolean) =>
    setMarcadas((atual) => {
      const novo = new Set(atual);
      for (const c of chaves) (marcar ? novo.add(c) : novo.delete(c));
      return novo;
    });

  const rodarUnica = (p: PedidoDaComparacao) => {
    setEtapa({ tipo: "mesclando" });
    mesclar.mutate(
      { principal_id: p.principal.id, secundarios: p.secundarios, escolhas: p.escolhas },
      {
        onSuccess: (r) => {
          aoMesclar(r);
          setEscolhida(null);
          setEtapa({ tipo: "concluida", contatos: r.contatos_mesclados.length + 1, falhas: [], vencedor: r.contato_id });
        },
        onError: (e) => setEtapa({ tipo: "erro", mensagem: e.message, repetir: () => rodarUnica(p) }),
      },
    );
  };
  const rodarEmMassa = () => {
    const grupos = selecionadas.map((s) => s.contatos.map((c) => c.id));
    setEtapa({ tipo: "mesclando" });
    emMassa.mutate(
      { grupos, prioridade },
      {
        onSuccess: (r) => {
          r.mesclados.forEach(aoMesclar);
          setMarcadas(new Set());
          setEtapa({
            tipo: "concluida",
            contatos: r.mesclados.reduce((n, m) => n + m.contatos_mesclados.length, 0),
            falhas: r.falhas.map((f) => f.erro),
            vencedor: null,
          });
        },
        onError: (e) => setEtapa({ tipo: "erro", mensagem: e.message, repetir: rodarEmMassa }),
      },
    );
  };

  const fechar = () => {
    setEtapa({ tipo: "lista" });
    setEscolhida(null);
    setMarcadas(new Set());
    aoFechar();
  };

  return (
    <DialogPrimitive.Root open={aberta} onOpenChange={(a) => !a && fechar()}>
      <DialogPortal>
        <DialogOverlay className="bg-black/55" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[46px] left-1/2 z-50 flex h-[calc(100dvh-46px)] w-[calc(100vw-96px)] max-w-[1428px] -translate-x-1/2 flex-col rounded-t-[8px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <div className="flex h-[52px] shrink-0 items-center justify-between border-b border-casca-borda px-4">
            <DialogPrimitive.Title className="text-[15px] font-medium">{t("Mesclar contatos duplicados")}</DialogPrimitive.Title>
            <DialogPrimitive.Close aria-label={t("Fechar")} className="mr-1 grid size-6 place-items-center rounded-md text-casca-suave hover:bg-casca-raia">
              <X size={16} aria-hidden />
            </DialogPrimitive.Close>
          </div>
          {etapa.tipo === "lista" ? (
            <div className="flex min-h-0 flex-1">
              <ListaDeSugestoes
                filtro={filtro}
                aoMudarFiltro={setFiltro}
                sugestoes={lista.sugestoes}
                total={lista.total}
                carregando={lista.isLoading}
                erro={lista.isError}
                temMais={lista.temMais}
                aoCarregarMais={lista.carregarMais}
                escolhida={escolhida}
                aoEscolher={setEscolhida}
                marcadas={marcadas}
                aoMarcar={marcar}
              />
              {selecionadas.length >= 2 ? (
                <MesclaEmMassa
                  selecionadas={selecionadas}
                  prioridade={prioridade}
                  aoMudarPrioridade={setPrioridade}
                  aoRemover={(c) => marcar([c], false)}
                  aoMesclar={() => setEtapa({ tipo: "confirmar", unica: null })}
                />
              ) : sugestao ? (
                <ComparacaoDaMescla key={sugestao.chave} sugestao={sugestao} aoMesclar={(p) => setEtapa({ tipo: "confirmar", unica: p })} />
              ) : (
                <div className="flex flex-1 flex-col items-center justify-center gap-2 text-center">
                  <p className="text-[17px] font-semibold text-casca-texto">{t("Selecione uma sugestão para mesclar")}</p>
                  <p className="max-w-[300px] text-[15px] text-casca-suave">
                    {t("Escolha uma sugestão na lista ao lado para revisar e confirmar a mescla.")}
                  </p>
                </div>
              )}
            </div>
          ) : etapa.tipo === "confirmar" ? (
            <ConfirmarMescla
              grupos={etapa.unica ? 1 : selecionadas.length}
              absorvidos={etapa.unica ? etapa.unica.secundarios.length : selecionadas.reduce((n, s) => n + s.contatos.length - 1, 0)}
              emMassa={!etapa.unica}
              aoVoltar={() => setEtapa({ tipo: "lista" })}
              aoConfirmar={() => (etapa.unica ? rodarUnica(etapa.unica) : rodarEmMassa())}
            />
          ) : etapa.tipo === "mesclando" ? (
            <Mesclando />
          ) : etapa.tipo === "concluida" ? (
            <MesclaConcluida
              contatos={etapa.contatos}
              falhas={etapa.falhas}
              aoVoltar={() => setEtapa({ tipo: "lista" })}
              aoVerContato={etapa.vencedor ? () => aoVerContato(etapa.vencedor!) : null}
              aoConcluir={fechar}
            />
          ) : (
            <FalhaDaMescla mensagem={etapa.mensagem} aoTentarDeNovo={etapa.repetir} aoFechar={fechar} />
          )}
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

**Confira antes de rodar:** o rótulo do botão de confirmar no caso único é "Confirmar e mesclar ({absorvidos + 1})" (os contatos do grupo, como no teste: 2); na em massa é o número de grupos. O "Mesclar 2 grupos selecionados" do teste sai de `${t("Mesclar")} 2 ${t("grupos selecionados")}`.

- [ ] **Step 4: O selo e a lista**

`components/escale/contatos/SeloDeMescla.tsx` vira:

```tsx
"use client";
import { useTotalDeSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { TriangleAlert } from "@/lib/ui/icons-da-casca";

/**
 * O selo "{n} sugestões de mescla" (Clint `duplicate-contacts-alert`). Fase 2E:
 * conta as sugestões da casca e abre a "Mesclar contatos duplicados" (N13).
 */
export function SeloDeMescla({ aoAbrir }: { aoAbrir: () => void }) {
  const t = useT();
  const n = useTotalDeSugestoes(true);
  if (n === 0) return null;
  return (
    <button
      type="button"
      onClick={aoAbrir}
      title={t("Clique para revisar e mesclar as sugestões")}
      className="flex h-[31px] items-center gap-2 rounded-casca-gatilho border border-warning bg-warning-bg px-3 text-[13px] font-medium text-casca-texto hover:brightness-95"
    >
      <TriangleAlert size={15} aria-hidden className="text-warning" />
      {n} {n === 1 ? t("sugestão de mescla") : t("sugestões de mescla")}
    </button>
  );
}
```

Em `ListaDeContatos.tsx`: `{podeMesclar && <SeloDeMescla aoAbrir={() => setMescla({ aberta: true })} />}` e, depois da `JanelaDoContato`:

```tsx
      {podeMesclar ? (
        <JanelaDeMescla
          aberta={mescla.aberta}
          contatoInicial={mescla.contatoInicial}
          aoFechar={() => setMescla({ aberta: false })}
          aoMesclar={(r) => {
            if (contatoAberto.contatoId && r.contatos_mesclados.includes(contatoAberto.contatoId)) {
              contatoAberto.trocar(r.contato_id);
            }
          }}
          aoVerContato={(id) => {
            setMescla({ aberta: false });
            contatoAberto.abrir(id);
          }}
        />
      ) : null}
```

No teste da 2A que pinava o `SeloDeMescla` (procure com `grep -rln "SeloDeMescla" tests/unit`): o mock de `useContactDuplicates` vira o de `useTotalDeSugestoes` (`vi.mock("@/hooks/escale/useSugestoesDeMescla", () => ({ useTotalDeSugestoes: () => 3 }))`), e o clique passa a esperar a chamada de `aoAbrir` (monte `<SeloDeMescla aoAbrir={aoAbrir} />`). Se o teste vinha da tela inteira (`ListaDeContatos`), espere a janela "Mesclar contatos duplicados" aberta.

Run:
```bash
corepack pnpm vitest run tests/unit/escale-janela-de-mescla.test.tsx tests/unit/escale-janela-do-contato.test.tsx $(grep -rln "SeloDeMescla" tests/unit)
```
Expected: PASS.

- [ ] **Step 5: Typecheck, eslint e commit**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale/contatos hooks/escale
corepack pnpm vitest run tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts
git add -A components/escale/contatos hooks/escale tests/unit
git commit -m "feat(escale): janela Mesclar contatos duplicados da Clint (Fase 2E, C2)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

---

### Task 11: Espanhol, conferência na tela, PRDs e o PR B

**Files:**
- Modify: `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`

- [ ] **Step 1: O espanhol das telas**

Rode o guarda para listar o que falta: `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts`. Acrescente, logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`, o bloco `// ─── FORK ESCALE · Fase 2E (PR B): janela do contato e mescla ───` com **cada** texto que o guarda apontar. Os da fase (pule os que já existirem):

```ts
  // ─── FORK ESCALE · Fase 2E (PR B): janela do contato e mescla ───
  "Informações do contato": "Información del contacto",
  "Chamar": "Llamar",
  "Abrir em Conversas": "Abrir en Conversaciones",
  "Possível duplicado": "Posible duplicado",
  "Possível duplicado. Clique para revisar e unir os dados.": "Posible duplicado. Haz clic para revisar y unir los datos.",
  "Contato mesclado": "Contacto fusionado",
  "Contato excluído": "Contacto eliminado",
  "Abrir página completa": "Abrir página completa",
  "Mais": "Más",
  "Editar nome": "Editar nombre",
  "Negócios": "Negocios",
  "Motivo de perda": "Motivo de pérdida",
  "Dono:": "Responsable:",
  "Sem dono": "Sin responsable",
  "Arquivado": "Archivado",
  "Ir para o negócio": "Ir al negocio",
  "Excluir negócio": "Eliminar negocio",
  "Tem certeza que deseja excluir o negócio selecionado?": "¿Seguro que deseas eliminar el negocio seleccionado?",
  "Mostrar arquivados": "Mostrar archivados",
  "Ocultar arquivados": "Ocultar archivados",
  "Mesclar contatos duplicados": "Fusionar contactos duplicados",
  "Buscar telefone ou nome…": "Buscar teléfono o nombre…",
  "Ordenar": "Ordenar",
  "Maior confiança": "Mayor confianza",
  "Menor confiança": "Menor confianza",
  "Mais recentes": "Más recientes",
  "Mais antigas": "Más antiguas",
  "Critérios": "Criterios",
  "Casou por": "Coincidió por",
  "Conflito por": "Conflicto por",
  "Confiança": "Confianza",
  "até": "hasta",
  "Filtrar por tags": "Filtrar por etiquetas",
  "Outros": "Otros",
  "Ignorar telefones inválidos": "Ignorar teléfonos inválidos",
  "Selecionar todos": "Seleccionar todos",
  "marcada": "marcada",
  "marcadas": "marcadas",
  "sugestão": "sugerencia",
  "sugestões": "sugerencias",
  "Nenhuma sugestão de mescla": "Ninguna sugerencia de fusión",
  "Falha ao carregar sugestões de mescla.": "Error al cargar las sugerencias de fusión.",
  "Alta": "Alta",
  "Média": "Media",
  "Baixa": "Baja",
  "Confiança calculada a partir dos critérios que casaram e dos que conflitam entre os contatos.": "Confianza calculada a partir de los criterios que coincidieron y de los que entran en conflicto entre los contactos.",
  "ID do WhatsApp": "ID de WhatsApp",
  "Organização": "Organización",
  "Selecione uma sugestão para mesclar": "Selecciona una sugerencia para fusionar",
  "Escolha uma sugestão na lista ao lado para revisar e confirmar a mescla.": "Elige una sugerencia de la lista para revisar y confirmar la fusión.",
  "Comparar contatos e escolher por campo": "Comparar contactos y elegir por campo",
  "campos a decidir": "campos por decidir",
  "campos já resolvidos": "campos ya resueltos",
  "igual em todos": "igual en todos",
  "único disponível": "único disponible",
  "Ocultar campos já resolvidos": "Ocultar campos ya resueltos",
  "Mostrar todos os campos": "Mostrar todos los campos",
  "Toque em uma célula para escolher o valor que prevalece.": "Toca una celda para elegir el valor que prevalece.",
  "Desmarque uma coluna para excluir o contato da mescla.": "Desmarca una columna para excluir el contacto de la fusión.",
  "Tags: sempre unidas": "Etiquetas: siempre unidas",
  "Contato resultante": "Contacto resultante",
  "Mesclar contatos para": "Fusionar contactos en",
  "A mescla é definitiva e não pode ser desfeita.": "La fusión es definitiva y no se puede deshacer.",
  "Mesclando em massa": "Fusionando en masa",
  "Critério de priorização": "Criterio de priorización",
  "Adicionado por último": "Agregado por último",
  "Adicionado por primeiro": "Agregado primero",
  "Atualizado por último": "Actualizado por último",
  "Atualizado por primeiro": "Actualizado primero",
  "Vencedores previstos": "Ganadores previstos",
  "Remover da seleção": "Quitar de la selección",
  "grupos selecionados serão mesclados com o mesmo critério": "grupos seleccionados se fusionarán con el mismo criterio",
  "Refine o filtro: a seleção ({count}) passa do limite de {cap} por mescla.": "Refina el filtro: la selección ({count}) supera el límite de {cap} por fusión.",
  "Mesclar 1 grupo selecionado": "Fusionar 1 grupo seleccionado",
  "Mesclar": "Fusionar",
  "grupos selecionados": "grupos seleccionados",
  "Confirmar mescla irreversível": "Confirmar fusión irreversible",
  "Esta ação consolida os contatos em um único vencedor e não pode ser desfeita.": "Esta acción consolida los contactos en un único ganador y no se puede deshacer.",
  "Você está mesclando vários grupos de uma vez. Revise antes de confirmar.": "Estás fusionando varios grupos a la vez. Revisa antes de confirmar.",
  "grupo": "grupo",
  "grupos": "grupos",
  "contatos absorvidos": "contactos absorbidos",
  "Entendo que a mescla é definitiva e não pode ser desfeita.": "Entiendo que la fusión es definitiva y no se puede deshacer.",
  "Confirmar e mesclar": "Confirmar y fusionar",
  "Mesclando contatos…": "Fusionando contactos…",
  "Consolidando os contatos, leva só alguns instantes. Mantenha esta janela aberta.": "Consolidando los contactos, solo toma unos instantes. Mantén esta ventana abierta.",
  "Contatos mesclados": "Contactos fusionados",
  "contatos mesclados.": "contactos fusionados.",
  "Voltar para a lista": "Volver a la lista",
  "Ver contato": "Ver contacto",
  "Concluir": "Concluir",
  "Tentar de novo": "Intentar de nuevo",
  "Falha ao mesclar contatos.": "Error al fusionar contactos.",
```

Run: `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/i18n-dicionario.test.ts`
Expected: PASS (sem chave repetida; se o guarda acusar repetida, tire a do bloco novo).

- [ ] **Step 2: Conferência na tela (regra do produto, item 4)**

Suba a casca local como nas fases anteriores (`next build` + `next start -p 3100` contra o Supabase local com o baseline desta branch, cookie `escale_menu=topo`), crie dois contatos com o mesmo telefone (um com e outro sem o nono dígito) e um terceiro com o mesmo e-mail de um deles, e capture, janela 1523×784, em `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2e\` com o prefixo `2026-10-18-ESCALE-2E-`:
1. `01-janela-aba-contato` — compare lado a lado com 2b-10;
2. `02-aba-empresa`, `03-aba-negocios`, `04-aba-conversas` (a conversa à direita), `05-aba-arquivos`, `06-aba-historico` (com uma nota solta);
3. `07-mescla-lista`, `08-mescla-comparacao`, `09-mescla-confirmar`, `10-mescla-em-massa`, `11-mescla-concluida`.

Escreva `docs/clint/prints-2e/LEIA-ME.md` (no formato do `prints-1h/LEIA-ME.md`) com as medidas medidas (`getBoundingClientRect`) e **a lista de cada diferença** contra 2b-10. Diferença sem justificativa = corrigir antes do PR. As telas sem print da Clint (itens 1–3 da lista de prints) ficam marcadas "provisório, sem print".

- [ ] **Step 3: PRDs**

`C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`:
- seção 4, tabela C: `| C2 |` → Fase "2E ✅ (a lista de sugestões da Clint atual; sem as abas e sem 'Dispensar', que estão desligadas na Clint)"; `| C3 |` → "2E ✅ (janela por cima da lista com as abas Contato, Empresa, Negócios, Conversas, Arquivos e Histórico; ⋮ 'Abrir página completa')"; `| C4 |` → "2E ✅ 'Padrão chat' (o único modo ligado na Clint atual); 'Por canal' e 'Timeline unificada' fora";
- seção 8, linha `| 2E |`: `✅ executada: PR A (#…) e PR B (#…) mergeados na main; testes pesados e publicação ficam para a bateria única da Frente B`;
- seção 11, linha `| 2E |`: acrescente "Prints do nosso app em `docs/clint/prints-2e/`; os da Clint que faltam continuam pedidos".

`C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\3-conversas.md`, tabela F, linha `| F5 |`: "A Clint atual liga só 'Padrão chat' (`enabledVariants = ["chat"]`); entregue na 2E. 'Por canal' e 'Timeline unificada' saem do escopo (decisão Q4 do plano da 2E). A 3E põe o compositor na conversa da direita."

- [ ] **Step 4: Gates e o PR B**

```bash
corepack pnpm tsc -p tsconfig.typecheck.json --noEmit
corepack pnpm eslint components/escale hooks/escale lib/escale "app/app/contacts" lib/i18n/dicionario.ts
corepack pnpm vitest run tests/unit/escale-abas-por-contato.test.tsx tests/unit/escale-aba-negocios-do-contato.test.tsx tests/unit/escale-historico-do-contato.test.tsx tests/unit/escale-janela-do-contato.test.tsx tests/unit/escale-lista-abre-o-contato.test.tsx tests/unit/escale-janela-de-mescla.test.tsx tests/unit/escale-ficha-*.test.tsx tests/unit/escale-aba-empresa-do-negocio.test.tsx tests/unit/escale-casca-v2-original-intacto.test.tsx tests/unit/navegacao-completude.test.ts tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts tests/unit/vocabulario-do-funil.test.ts tests/unit/evidencia-citada.test.ts tests/unit/i18n-espanhol-cobre-a-tela.test.ts
git add lib/i18n/dicionario.ts docs/clint/prints-2e
git commit -m "feat(escale): espanhol e conferência da janela do contato e da mescla (Fase 2E, PR B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git fetch escale-crm && git rebase escale-crm/main
git push -u escale-crm feat/fase-2e-ficha-e-mescla-telas
gh pr create -R rgisjr/escale-crm -B main -H feat/fase-2e-ficha-e-mescla-telas --title "Fase 2E (PR B): janela do contato e Mesclar contatos duplicados" --body-file .superpowers/sdd/2e-b-pr.md
gh pr merge --merge -R rgisjr/escale-crm <número>
```

(Se `docs/clint/prints-2e` ficar fora do repositório, como as outras pastas de prints, tire-a do `git add`.) O corpo traz: a janela do contato (2b-10) e quem a abre, as abas servindo ao contato, a conversa à direita (vale para a ficha do negócio), a mescla (lista, comparação, em massa, confirmação), as decisões Q1–Q9 e N1–N14, as diferenças conhecidas (os prints que faltam; o ⋮ "Mais" que a Clint não tem; "Selecionar todos" marca as sugestões carregadas, não o filtro inteiro; sem "Por canal"/"Timeline unificada"; sem "Dispensar"; sem histórico de mesclas), e termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`. **Merge direto.**

**PARE aqui.** A próxima fase da Frente B é a 2F (importar contatos, Q7 da 2B) e, depois dela, a bateria única de testes e a publicação da Frente B inteira. Nenhuma tag, release ou deploy no meio da frente.

---

## Self-review (feito ao escrever, 18/10)

- **Cobertura do PRD:** C2 → Tasks 1 (regras), 2 (chaves e mesclar), 3 (rotas), 10 (a janela: lista, Filtros, Ordenar, comparação, resultante, confirmação, em massa, concluído; o selo); C3 → Tasks 4 (negócios e notas no servidor, URL), 6 (abas pelo contato), 8 (Histórico e Negócios), 9 (a janela, o cabeçalho, quem abre, o encaixe e a página completa); C4 → Task 7 ("Padrão chat" com a conversa à direita; os outros dois modos fora, Q4). Permissões (Q9) nas rotas (Tasks 3, 4) e nas telas (Tasks 9, 10). "Em breve" que esta fase fecha: o nome, o "Editar" e o "Ver N negócios" da lista (2A) → Task 9; o "Visualizar contato" da ficha (1G) cai na janela pelo encaixe (Task 9).
- **Placeholders:** sem "TBD". Os "Confira antes de rodar" apontam o arquivo onde o nome pode ter mudado (`wa_lid`, `email_normalized`, coluna de arquivo da origem, `crm_stages`, `profiles.full_name`, FK embutida de `companies`, `useEmpresaDoContato`, `CaixaDaCasca.rotulo`, Popover, `bg-destructive`).
- **Nomes que atravessam tasks:** `REGRAS_DE_MESCLA`, `ROTULO_DA_REGRA`, `confianca`, `faixaDaConfianca`, `ROTULO_DA_FAIXA`, `ContatoDaMescla`, `ChaveDeMescla`, `Sugestao`, `montarSugestoes`, `ORDENS_DA_MESCLA`, `ROTULO_DA_ORDEM`, `consultaDeSugestoesSchema`, `ConsultaDeSugestoes`, `filtrarSugestoes`, `ordenarSugestoes`, `CAMPOS_DA_MESCLA`, `ROTULO_DO_CAMPO_DA_MESCLA`, `Escolhas`, `valorDoCampo`, `escolhasPadrao`, `estadoDoCampo`, `contatoResultante`, `principalDasEscolhas`, `PRIORIDADES`, `Prioridade`, `ROTULO_DA_PRIORIDADE`, `principalPorPrioridade`, `MAX_GRUPOS_EM_MASSA`, `mesclarSchema`, `mesclarEmMassaSchema` (Task 1) → Tasks 3, 10; `fn_escale_chaves_de_mescla`, `fn_escale_mesclar_contatos` (Task 2) → Task 3; `lerSugestoes`, `contatosDaMescla`, `mesclarGrupo`, `ErroDaMescla`, `TEXTO_DO_ERRO_DA_MESCLA`, `statusDoErroDaMescla`, `ResultadoDaMescla` (Task 3) → Task 10; `AlvoDaNota`, `rotaDasNotasDoAlvo`, `ABAS_DO_CONTATO`, `AbaDoContato`, `ROTULO_DA_ABA_DO_CONTATO`, `PARAM_ABA_DO_CONTATO`, `ROTA_DA_LISTA_DE_CONTATOS`, `contatoDaRota`, `abaDoContato`, `rotaDoContatoAberto`, `rotaDaListaSemContato`, `rotaDaPaginaCompleta`, `abasVisiveis`, `NegocioDoContato`, `ROTULO_DO_STATUS_DO_NEGOCIO`, `negociosParaMostrar`, `temPerdido`, `juntarNotasAoHistorico`, `FichaDeNegociosDoContato` (Task 4) → Tasks 6, 8, 9; `useNotas`, `useCriarNota(alvo)`, `ContatoEditavel`, `AbaEmpresa({ contatoId })`, `AbaConversas({ contatoId, foto })`, `AbaArquivos({ contatoId, leadId })`, `TagsDoContato`, `FotoDaLinha.tamanho` (Task 6) → Task 9; `ConversaEmLeitura` (Task 7); `useHistorico`, `AbaHistorico({ alvo, nomesDasEtapas })`, `useNegociosDoContato`, `AbaNegociosDoContato` (Task 8) → Task 9; `useContatoAberto`, `useSugestaoDoContato`, `ContatoParaNegocio`, `JanelaDoContato`, `CabecalhoDoContato`, `NomeDoContato` (Task 9) → Task 10; `useSugestoesDeMescla`, `FiltroDasSugestoes`, `useTotalDeSugestoes`, `useMesclar`, `useMesclarEmMassa`, `JanelaDeMescla`, `SeloDeMescla({ aoAbrir })`, `SeloDaConfianca` (Task 10). Da 2C/2D: `camposDoContatoComGrupos`, `useCatalogoDeCampos`, `useOcultosDaOrigem`, `useEmpresaDoContato`, `empresaDoContato`, `trocarEmpresaDoContato`.
- **Numeração:** Tasks 1–11 contíguas (PR A 1–5, PR B 6–11); migration 9106 (2D = 9105; a 2F, se precisar de banco, usa a 9107).
- **Pontos de atenção do executor:** o corpo da `ContatoEditavel` depois da 2C (só a assinatura e o `pipeline` opcional mudam); o `useOcultosDaOrigem(null)`; a chave das notas mudou (`["notas", tipo, id]`); o `pushState` precisa do App Router sincronizando a URL (Next 16 sincroniza; se `usePathname` não mudar no teste manual, troque `window.history.pushState` por `router.push(rota, { scroll: false })` e aceite a ida ao servidor); o teste de forma da 9106 procura o cabeçalho do bloco da 9105 no baseline pelo texto que a 2D gravou.
