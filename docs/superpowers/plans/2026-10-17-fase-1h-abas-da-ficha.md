# Fase 1H — Ficha do negócio: as abas (igual à Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** C10, C14, C15, C16, C17 e C18 de `docs/modulos/1-negocios.md` (seção 4, tabela C), mais o que a 1G deixou "Em breve" na ficha: "Editar nome", "+ Adicionar tags", "Nova nota" (ação rápida e ⋮), "Ocultar vazios", "Pesquisar campos", "Gerenciar campos", a busca e o filtro do Histórico. **C12 (Empresa) fica fora** (Q2). **Dois PRs** (N14): o PR A entrega a edição dos campos (Contato e Negócio), o nome e as tags (Tasks 1 a 6), sem banco; o PR B entrega notas, arquivos, todas as conversas e o Histórico completo (Tasks 7 a 14), com a migration 9008.

## Perguntas em aberto (respostas do usuário antes do "pode fazer")

| # | Pergunta | O que o plano faz se a resposta for "sim, como está" |
|---|---|---|
| Q1 | **Dois PRs** (A: Tasks 1 a 6, sem banco; B: Tasks 7 a 14, com a 9008). Aceita? | N14 |
| Q2 | **Aba Empresa (C12).** Na Clint, o campo "Nome da empresa" é uma busca que vincula ou cria a empresa do contato. No original, as empresas são o módulo B2B (`companies`, `people`, `company_people`), que vem **desligado** (`MODULO_CRM_B2B`), não liga empresa a negócio nem a contato diretamente (contato → pessoa → empresa) e tem só 3 dos 8 campos da Clint (Nome, Cidade, Estado, CNPJ; sem Site, Categoria, Segmento e Nº de funcionários). O plano **deixa a aba como a 1G entregou** (a moldura com os oito campos vazios, "Em breve") e passa a C12 para a Fase 2 (Empresas), junto com a C13. A alternativa é um "ver e vincular" mínimo por cima do módulo B2B ligado, que resolve só a metade dos campos. Fica para a Fase 2? | N13 |
| Q3 | **Lápis do nome.** Na Clint edita o **nome do contato** ("Nome do contato", "Salvar nome"). O cabeçalho mostra `tituloDoCard(lead)`, que é o nome do contato (ou o título do negócio, quando não há contato). O plano edita o nome do contato pelo `PATCH /api/v1/contacts/[id]` e, em negócio sem contato, o título do negócio. Está bem? | N5 |
| Q4 | **Apagar telefone ou e-mail.** O `contactPatchSchema` do original não aceita `null` nem vazio em `email` e `phone_number`. Na 1H, deixar o campo vazio e salvar mostra "Para apagar o telefone, use a ficha do contato." (texto nosso) e não grava. Mexer no schema é arquivo do Rafael. Fica assim? | N4 |
| Q5 | **Grupos de campos (C14).** A Clint tem grupos de campos à esquerda ("Informações Gerais", "Facebook Leads Ads"…). O catálogo da 1F-a (`crm_campos_do_negocio`) não tem grupo, e a tela "Gerenciamento de campos" (que cria os grupos) é da Fase 2. O plano mantém o grupo único "Informações Gerais" e o botão "Gerenciar campos" leva à tela de campos do original (`/app/settings/tenant/pipelines`, só administrador). Os grupos chegam com a Fase 2. Confirma? | N3 |
| Q6 | **Modo espião (C16).** Na Clint, ligado, abrir uma conversa dentro da aba não a marca como lida. Aqui a conversa ainda abre no Inbox (abrir dentro da aba é a C22, Fase 3), e o Inbox sempre marca como lida. O plano deixa "Ativar modo espião" desligado ("Em breve") até a Fase 3. Confirma? | N9 |
| Q7 | **Filtros de Conversas.** O PRD (C16) cita filtros de data, setor e dispositivo, que estão na captura antiga (ficha 01-005). O JS atual da Clint e o print 05 de 17/10 **não têm filtros**: só a lista de sessões e a conversa ao lado. O plano segue a Clint atual (sem filtros). Confirma? | N9 |
| Q8 | **Arquivos são do contato.** Na Clint o arquivo fica junto do contato ("Envie arquivos para mantê-los junto deste contato") e aparece em todo negócio dele. O plano grava por contato (`contact_id`), lembrando em qual negócio foi enviado (`lead_id`). Negócio sem contato não envia arquivo. Está bem? | N10 |
| Q9 | **Editor da nota.** A Clint usa um editor de texto rico (CKEditor). O plano usa uma caixa de texto simples (até 4.000 caracteres), com o mesmo modal "Nova nota" (título, dica, Cancelar e Salvar). Texto rico fica para quando houver pedido. Confirma? | N7 |
| Q10 | **"Ver automação" (C18).** O original não grava qual regra de automação gerou o evento: as ações da automação chegam como ator `webhook_source` e a linha do tempo as guarda como "Sistema", sem `rule_id` (arquivos `lib/leads/activity-emitter.ts` e `lib/automation/actions/*`, do Rafael). O plano **não entrega** o link "Ver automação" nem o título "… via automação"; a opção "Automações" do filtro mostra os eventos de `source_module = webhook`. Fazer o link exige um encaixe no emissor de atividades do original. Fica fora? | N12 |
| Q11 | **Antes/depois dos campos (C18).** O original grava só os NOMES dos campos alterados (`lead_edited`, "Alterou valor, tags"), de propósito, por LGPD (o valor é PII). O plano mostra o antes/depois **da etapa** ("Esta oportunidade passou da etapa X para a etapa Y", os nomes vêm do quadro) e, para campos, o texto do original. Confirma? | N12 |
| Q12 | **Cores e ícones do Histórico.** O print 07 mostra o ícone verde (atividade concluída), roxo (posição e etapa) e cinza (os outros). O plano usa o verde de `--escale-status-ganho` (1G PR B), a cor da marca e o cinza da casca. Está bem até o print com conta-gotas? | N12 |
| Q13 | **Tags: criar com cor.** O popover da Clint cria a tag com nome, cor e descrição. O nosso vocabulário de tags é texto livre; a cor é separada (`/api/v1/tags/cores`). O plano cria a tag só pelo nome (a opção "Criar «nome»" na lista) e a cor fica a do original. Confirma? | N6 |
| Q14 | **LGPD.** A anonimização do contato (`fn_lgpd_cascade_redact_contact`, do original) não alcança as tabelas novas. O plano põe `on delete cascade` nas FKs (excluir o contato apaga notas e arquivos) e registra a cascata de anonimização como pendência da Fase 2 (Contatos). Está bem? | N11 |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano diz o desvio):
1. ❌ Um campo do Contato **em edição** (os botões "Cancelar" e "Salvar" embaixo do campo) e o check verde depois de salvar.
2. ❌ "Mostrar vazios" ligado (com "Porque não vejo alguns campos?" no rodapé) e "Pesquisar campos" com texto.
3. ❌ O lápis do nome clicado (input, ✓ e ✕).
4. ❌ "+ Adicionar tags" clicado (o popover com a busca e o "Criar") e o cabeçalho com tags.
5. ❌ O modal "Nova nota" e uma nota no Histórico (recolhida e expandida, com "Editar nota" e a lixeira).
6. ❌ O modal "Novo documento" (Adicionar, lista, Salvar), um arquivo na tabela, o "⋯" da linha e a confirmação de excluir.
7. ❌ Os filtros "Data" e "Tipo de arquivo" abertos.
8. ❌ Conversas com mais de uma sessão.
9. ❌ O Histórico com "Hoje", "Ontem" e uma data antiga, e o "Carregar mais".
10. ❌ A opção "Ver nota" e um cartão "Campo do negócio alterado".

**Goal:** As sete abas da ficha deixam de ser só leitura e ganham o que a Clint tem em cada uma:
- **Contato** (C10): cada campo é um input; digitar mostra Cancelar/Salvar; Enter salva; o lápis do cabeçalho edita o nome; "Ocultar/Mostrar vazios" e "Pesquisar campos..." funcionam.
- **Negócio** (C14): o mesmo, para Valor e os campos do CRM; "Gerenciar campos" leva à tela de campos.
- **Tags**: "+ Adicionar tags" no cabeçalho, com chips e remoção.
- **Notas** (C15): "Nova nota" (ação rápida e ⋮) abre o modal; a nota vai para o Histórico, com "Ver nota", "Editar nota" e a lixeira.
- **Conversas** (C16): todas as sessões do contato, com status, hora, não lidas e atendente.
- **Arquivos** (C17): "Novo arquivo" (modal "Novo documento"), tabela com nome, tamanho, data e usuário, busca, filtros Data e Tipo de arquivo, baixar e excluir.
- **Histórico** (C18): busca, filtro por grupo (os 16 da Clint), "Carregar mais", seções Hoje/Ontem/Esta semana/data, cartões com título, corpo e autor, etapa antes/depois.
Sem a casca, nada muda.

**Architecture:**
- **Campos (PR A):** um editor em linha por tipo (`EditorDeCampo`) dentro da moldura `CamposDaFicha` da 1G. A aba Negócio grava pelo `useEditLead(pipelineId)` (o mesmo do dossiê), uma chave por vez (`custom_fields` é mesclado no banco); a aba Contato grava pelo `useUpdateContact(id)` (que substitui `custom_fields` inteiro) e invalida o quadro, que é de onde a ficha lê. As definições dos campos do contato são as mesmas do negócio (`camposDoFunil(pipeline.settings)`, como a ficha do contato do original faz), com os valores em `contacts.custom_fields` (`useContact`).
- **Banco (PR B):** migration 9008 com `crm_notas_do_negocio` (por negócio e contato) e `crm_arquivos_do_contato` (por contato), RLS que segue `fn_can_view_lead`, e o bucket privado `arquivos-do-contato` (só o service role, como `internal-media`).
- **Rotas (PR B):** `/api/v1/leads/[id]/notas` (+ `/[notaId]`) e `/api/v1/contacts/[id]/arquivos` (+ `/[arquivoId]`, que devolve 302 para a URL assinada). A nota emite a atividade `note` da linha do tempo (payload `{ nota_id }`), e o Histórico mostra o texto lido da tabela de notas.
- **Conversas e Histórico (PR B):** leem rotas que já existem: `GET /api/v1/conversations?contact_id=` e `GET /api/v1/leads/[id]/timeline` (com `type`, `limit` e `cursor`), por hooks novos do fork.

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5 (`useInfiniteQuery` no Histórico), Radix (Popover, Dialog, AlertDialog), Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Supabase (RLS, Storage com URL assinada pelo service role).

## Referência visual (abrir o PNG antes de cada task de tela)

Os prints de 17/10 têm 1523×784, 1:1 em px de CSS, em C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1g\ (os da 1G; a 1H não tem pasta própria). Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 02 | 2026-10-17-02-aba-contato.jpg | a moldura "Campos de contato": Nome, Whatsapp, Email, Telefone (com "BR ▾"), Cargo…; os grupos à esquerda; "Ocultar vazios"; "Pesquisar campos..." | 2, 3, 4 |
| 04 | 2026-10-17-04-aba-negocio-grupos-de-campos.jpg | "Campos de negócio": Valor, campos com ▾ (lista), vários grupos | 2, 3 |
| 01 | 2026-10-17-01-ficha-aba-atividades.jpg | cabeçalho (nome + lápis), linha de ações com "+ Adicionar tags" | 5 |
| 05 | 2026-10-17-05-aba-conversas.jpg | "1 sessões", o item da sessão (foto, chip "Em aberto", "Quarta-feira", ✓✓ prévia, inicial do atendente), o vazio à direita | 12 |
| 06 | 2026-10-17-06-aba-arquivos.jpg | barra (Pesquisar..., Data ▾, Tipo de arquivo ▾, "0.00 GB / 5.00 GB usados", ?, Novo arquivo), cabeçalho da tabela com setas de ordenação, o vazio | 11 |
| 07 | 2026-10-17-07-aba-historico.jpg | busca, "Todos", "ESTA SEMANA 14 Out", cartões (ícone verde/roxo/cinza, título, "ORIGEM: …", corpo, "há 3 dias por ◯ Nome") | 13 |
| 12 | 2026-10-17-12-historico-filtro-por-tipo.jpg | o filtro aberto: Todos ✓, Agendamentos, Automações, Atividades, Notas, Email, Lembretes, Ligação, Negócio criado, Clique para WhatsApp… (cada um com ícone) | 13 |
| 004 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-004-aba-contato-v1.png | a aba Contato na v1 (a linha "Tags") | 4, 5 |
| 001 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-001-aba-arquivos-v1.png | Arquivos na v1 (uma linha com arquivo) | 11 |
| 007 | C:\Documentos\projetos claude\Escale IA OS\clint-documentacao\modulos\01-negocios\imagens\01-007-aba-historico-v1.png | Histórico na v1 (seções de data, "Carregar mais") | 13 |

### Medidas tiradas dos prints de 17/10 (1:1)

| Peça | Medida |
|---|---|
| Linha de campo | rótulo em 275px, 13px/500; caixa de valor de 32px, fundo `casca-busca`, canto 6px, texto 13px; "Clique aqui para adicionar" em `casca-meta`; ▾ de 14px à direita nos campos de lista |
| Busca de campos | 166×32px, à esquerda, com a lupa à direita |
| Botões da faixa | "Ocultar vazios" e "⚙ Gerenciar campos" brancos, 28px, texto 12px, canto 6px, 8px entre eles |
| Lista de sessões | coluna de 337px; item de 72px: foto 40px, chip de status (verde claro, 11px) + dia à direita (11px, `casca-meta`), ✓✓ + prévia (12px, truncada), inicial do atendente num círculo de 20px |
| Barra de Arquivos | busca 148×32; gatilhos "Data ▾" e "Tipo de arquivo ▾" 32px, 13px; à direita o "?" e "Novo arquivo" (borda, 32px) |
| Tabela de Arquivos | cabeçalho de 44px, 10px/600 maiúsculo, com ⇅ ao lado; colunas: Arquivo (flex), Data de upload (200px, direita), Usuário (120px, direita) |
| Histórico | busca 148×32; filtro 218×32; seção "ESTA SEMANA" 11px/600 + data 11px `casca-meta` + linha; cartão: fundo `casca-raia`, canto 8px, 12px de respiro; ícone num quadrado de 32px (canto 6px); título 13px/600 + "ORIGEM: …" 10px maiúsculo `casca-meta`; corpo 13px com negritos; rodapé 11px `casca-suave` com relógio, "há 3 dias por", bolinha de 16px com a inicial e o nome |
| Filtro do Histórico aberto | lista de 218px, itens de 38px com ícone de 14px à esquerda e ✓ no escolhido, até 370px com rolagem |

### Textos da Clint usados nesta fase

Do catálogo `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\catalog-v2\i18n-pt.txt` (linha entre parênteses) e do bundle `raw-v2\js\pt-BR-DmQ11GIn.js.txt` (marcado "bundle"):
- **Campos:** "Ocultar" / "Mostrar" (bundle) + "vazios" (8279) = "Ocultar vazios", "Mostrar vazios"; "Alternar exibição de campos sem valor preenchido" (8289); "Gerenciar campos" (8283); "Configure quais campos aparecem e em que ordem" (8285); "Pesquisar campos..." (8287); "Nenhum campo encontrado" (8286); "Porque não vejo alguns campos?" (8677); "Clique aqui para adicionar" (6895); "Cancelar", "Salvar" (bundle); "Necessário ser um email válido." (8683); "Campo obrigatório nesta etapa" (8682); toasts fixos no JS: "As alterações foram salvas com sucesso.", "Ocorreu um erro ao salvar o campo", "O telefone foi salvo com sucesso!".
- **Nome:** "Editar nome" (7494), "Nome do contato" (7490), "Salvar nome" (7504), "Nome atualizado." (7492), "Não foi possível atualizar o nome. Tente novamente." (7491).
- **Tags:** "+ Adicionar tags" (bundle `label.tAddTags`), "Adicione uma tag" (13386), "Nenhuma tag correspondente" (13389), "Não permitido tag em branco!" (13388), "Criar" (bundle), "Deseja remover esta tag do contato?" (6964), "Ver mais"/"Ver menos" (6966/6965).
- **Notas:** "Nova nota" (bundle `label.tNewNote`), "Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato." (10608), "A nota foi salva com sucesso!" (10609), "A nota foi editada com sucesso!" (10607), "Ocorreu um erro ao salvar a nota!" (10612), "Editar nota" (10606), "Ver nota" (6697), "Deseja remover a nota?" (6696), "A nota foi removida com sucesso!" e "Ocorreu um erro ao remover a nota!" (fixos no JS).
- **Conversas:** "{count} sessões" (6927), "Atendente: {attendant}" (6474), "Não foi possível carregar as conversas." (6922), "Este contato não possui conversas no atendimento" (6551), "Selecione uma conversa" (6926), "Escolha uma conversa ao lado para ver as mensagens." (6925).
- **Arquivos:** "Pesquisar..." (6905), "Data" e "Tipo de arquivo" (bundle), "Filtrar por data de upload" e "Filtrar por tipo de arquivo" (bundle), "Limpar filtros" (bundle), "Novo arquivo" (bundle), "Novo documento" (bundle), "Nenhum documento adicionado" (9259), "Adicionar" (bundle), "Arquivo" (6904), "Data de upload" (6906), "Usuário" (6909), "Baixar arquivo" (bundle), "Excluir" (bundle), "Tem certeza que deseja apagar este arquivo?" (4972), "Arquivo excluído com sucesso" (4975), "Erro ao excluir arquivo" (4974), "Arquivo(s) enviado(s) com sucesso" (6908), "Erro ao enviar arquivo(s)" (6907), "O arquivo {fileName} excede o limite de {maxMb} MB." (bundle), "Faça upload de arquivos de até {maxMb} MB para anexar ao contato" (bundle), "Nenhum arquivo encontrado" (6902), "Envie arquivos para mantê-los junto deste contato." (6903).
- **Histórico:** "Buscar no histórico..." (fixo no JS), "Selecione um grupo" (9137), "Carregar mais" (9091), "Hoje" (9163), "Ontem" (9197), "Esta semana" (9151), "Os resultados não foram encontrados." (9128), os 16 grupos (bundle): "Todos", "Agendamentos", "Automações", "Atividades", "Notas", "Email", "Lembretes", "Ligação", "Negócio criado", "Clique para WhatsApp", "Alterações negócio", "Alteração de campos", "Integrações", "Campanhas", "Mescla de contatos", "Anexos"; títulos "Mudou de etapa" (8990), "Mudou de usuário" (8995), "Mudou de origem" (print 07), "Negócio criado"; corpo "Esta oportunidade passou da etapa" (9117) + "para a etapa" (9162); "Campo do negócio alterado" (9061), "Campos do negócio alterados" (9069); "Sem dono" (9107); autores "Automação" (8949), "Agente de IA" (8943).

### Comportamento da Clint conferido no código

Arquivos em `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\` (minificados; os trechos se acham pelo `data-cy`):
- **Campos** (`index-BhVJ8kAx.js.txt`, componentes `pl` e `Hs`): o valor é **sempre um input** (não há modo leitura que vira input); ao digitar, `editing:true` e aparecem "Cancelar" (`bt-calcel-email-edit-by-deal`) e "Salvar" (`bt-save-email-edit-by-deal`) embaixo; **Enter salva** (`T.keyCode===13`); sair do campo não salva; ao salvar, spinner e depois um check verde por 1s. "Ocultar vazios" (`bt-hidden-show-fields`): a flag `options.hidden` tem o nome invertido (`true` = tudo aparece); o estado é por tipo e fica no localStorage (`FIELDS_STORAGE`); com vazios ocultos, aparece "Porque não vejo alguns campos?". A busca filtra pelo rótulo. "Gerenciar campos" (`bt-manage-fields`) exige `ORIGIN_FIELDS_CONFIG`.
- **Nome** (`index-BKc3FRy4.js.txt`): `bt-edit-name-deal-header` abre um input de 200px, `maxLength:80`, placeholder "Nome do contato"; ✓ `bt-save-name-contact-deal-header`, ✕ `bt-cancel-...`; Enter salva, Escape cancela; vazio ou igual só cancela.
- **Tags** (`index-DCKImOq3.js.txt`, `tag-popover`): sem tags, botão ghost "+ Adicionar tags"; com tags, só o "+"; combobox "Adicione uma tag"; sem correspondência, a opção "Criar" + chip; remover pede "Deseja remover esta tag do contato?".
- **Notas** (`NoteModal-EpHtCPUS.js.txt`): modal 2xl "Nova nota" com o "i" (dica 10608), editor, "Cancelar" e "Salvar"; grava `track {category:"NOTE_CREATE", contact_id, deal_id, body}`; aparece no Histórico como "Nova nota", com "Ver nota" (expande), "Editar nota" e a lixeira ("Deseja remover a nota?"); o filtro tem o grupo "Notas".
- **Conversas** (`cx` em `index-BhVJ8kAx.js.txt`): **sem filtros** na versão atual; colunas `340px 1fr`; "{count} sessões"; item com avatar, badge de status, hora, badge de não lidas, avatar do atendente ("Atendente: {attendant}") e prévia. Modo espião: `toggleSpyMode` só em memória; ligado, `markChatSeen` não roda.
- **Arquivos** (`Cx` em `index-BhVJ8kAx.js.txt`, helpers em `warning_2-fUi5U_7e.js.txt`): **do contato**; busca com debounce de 600ms; "Data" abre dois calendários com os atalhos Hoje, Ontem, Essa semana, Semana passada, Esse mês, Mês passado, Esse ano; "Tipo de arquivo" é multiseleção de **extensões** (PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, JPG, JPEG, PNG, GIF, SVG, ZIP, RAR, MP4, AVI, MP3, WAV); "Limpar filtros" quando há filtro; cota "{usedGb} GB / {quotaGb} GB usados" (fora, PRD §9); `maxFileSize` padrão 25 MB; "Novo arquivo" abre `ImportModal` ("Novo documento", "Adicionar" = `<input type=file multiple>` com a lista de extensões acima, linhas com ✕, "Cancelar", "Salvar"), sem arrastar; tabela ordenável (Arquivo, Data de upload 180px, Usuário 120px); linha com ícone por extensão, nome + tamanho embaixo, data `dd/mm/aaaa hh:mm:ss`, avatar do usuário; "⋯" no hover com "Baixar arquivo" e "Excluir" (confirmação "Tem certeza que deseja apagar este arquivo?").
- **Histórico** (`R0` em `index-BhVJ8kAx.js.txt`, `Mr` em `index-B35wgd1d.js.txt`): busca "Buscar no histórico..." com debounce de 500ms, no corpo, categoria, tipo, autor e origem; 25 por página e "Carregar mais"; filtro `tbl-filter-history` com os 16 grupos; seções "Hoje", "Ontem", "Esta semana" e depois "DD MMM" (não há "Semana passada"); cartão com ícone, título, origem, corpo e rodapé "há N dias por {autor}"; etapa: "Esta oportunidade passou da etapa **X** para a etapa **Y**".

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Editor em linha igual ao da Clint:** o valor é sempre um input; digitar mostra Cancelar/Salvar embaixo; Enter salva; Esc e Cancelar voltam ao valor gravado; sair do campo não salva; depois de salvar, check verde por 1s; toasts da Clint. Lista, múltipla e Sim/Não gravam ao escolher | Código da Clint (`Hs`) |
| N2 | **Tipos:** texto, número, e-mail, url, telefone, texto longo (textarea), moeda (em reais, com o prefixo da moeda), data (texto dd/mm/aaaa, validado; sem datepicker até haver print), lista (`SeletorDaCasca`), múltipla (`SeletorMultiploDaCasca`), Sim/Não (`SeletorDaCasca` com duas opções). Os campos condicionais passam por `camposVisiveis(defs, valores)` (doutrina do `campo-condicional-nos-pontos-de-renderizacao`) | Clint e o original |
| N3 | **Grupo único** "Informações Gerais"; "Gerenciar campos" é link para `/app/settings/tenant/pipelines`, ligado só para quem administra (`usePermission("settings.write")`), com a dica da Clint; "Ocultar/Mostrar vazios" por tipo, em `localStorage` (`escale_campos_vazios_<tipo>`); "Pesquisar campos..." filtra pelo rótulo e mostra "Nenhum campo encontrado" (Q5) | Sem grupos no catálogo; a tela de grupos é da Fase 2 |
| N4 | **Contato:** Nome (`name`), Telefone (`phone_number`, gravado canônico com +DDI; digitado sem "+" com 10 ou 11 dígitos ganha "+55"), Email, os links (`link_<tipo>`, via `aplicarLinks`) e os campos do CRM em `contacts.custom_fields`, lidos por `useContact(id)`. Grava pelo `useUpdateContact(id)` com `custom_fields` **inteiro** e invalida `chaveDoQuadro(pipelineId)` (a ficha lê do quadro). Telefone e e-mail vazios não gravam (Q4). Colisão de telefone/e-mail (500 do original) vira "Ocorreu um erro ao salvar o campo" | `patchContactHandler` substitui `custom_fields`; o precedente de invalidar o quadro é `FormularioDeLinks` |
| N5 | **Lápis do nome:** input de 200px, `maxLength 80`, "Nome do contato", ✓ "Salvar nome" e ✕; Enter salva, Esc cancela; vazio ou igual cancela; grava `name` do contato (ou `title` do negócio sem contato) (Q3) | Código da Clint |
| N6 | **Tags do contato:** chips com a cor do original (`ChipDeEtiqueta`) na linha de ações, depois dos ícones; "+ Adicionar tags" (sem tag) ou "+" (com tag) abre um `PainelSuspenso` com busca ("Adicione uma tag"), as tags do vocabulário que faltam, e "Criar «texto»" quando não há correspondência; o × do chip pede "Deseja remover esta tag do contato?"; grava `{ tags }` inteiro pelo `useUpdateContact`, até 20 tags (teto do original); normalização `normalizarTags` (Q13) | Código da Clint (`tag-popover`); `contacts.tags` é `text[]` |
| N7 | **Notas:** tabela `crm_notas_do_negocio` (negócio + contato + autor + texto até 4.000); modal "Nova nota" (`JanelaDaCasca`) com textarea (Q9); grava pela rota e emite a atividade `note` (payload `{ nota_id }`, `reason` "Nova nota", `sourceModule` "escale"); edita (dono, ou gerente+) e remove (idem) com os textos da Clint; aparece no Histórico como "Nova nota" com "Ver nota" | NoteModal da Clint; a linha do tempo não pode guardar o texto (PII em `reason`) |
| N8 | **Arquivos:** tabela `crm_arquivos_do_contato` + bucket privado `arquivos-do-contato` (50 MB no bucket, **25 MB por arquivo** na rota, como o padrão da Clint); extensões aceitas = a lista da Clint; upload por rota multipart com `createAdminClient().storage` (nenhuma policy de escrita em `storage.objects`, doutrina da 0464/0483); download por 302 para URL assinada de 60s; apaga quem enviou ou gerente+ (PRD §5). Modal "Novo documento" sem arrastar; filtros Data (dois calendários com atalhos = `CalendarioDePeriodo` sem as abas de tipo) e Tipo de arquivo (extensões, múltipla); busca pelo nome; ordenação por coluna; clicar na linha abre o arquivo (a prévia em tela cheia fica fora). Sem o medidor de cota (PRD §9) (Q8) | Código da Clint (`Cx`, `ImportModal`); padrão de upload do original (`notes/media`) |
| N9 | **Conversas:** `GET /api/v1/conversations?contact_id=<id>&limit=100` (já existe); lista com foto, chip do status, dia, ✓✓ prévia, badge de não lidas e inicial do atendente; clique abre no Inbox (`/app/inbox?id=`), como na 1G; sem filtros (Q7); modo espião "Em breve" (Q6) | JS atual da Clint; a RLS de `conversations` decide o que entra |
| N10 | **Arquivo e nota são do contato na Clint;** aqui a nota é do negócio (com `contact_id`) e o arquivo é do contato (com `lead_id` de onde foi enviado). Negócio sem contato: Arquivos mostra o vazio com "Novo arquivo" desligado ("Este negócio não tem contato.") (Q8) | Texto da Clint ("junto deste contato") |
| N11 | **RLS:** notas e arquivos são vistos por quem vê o negócio/contato (`fn_can_view_lead` via `crm_leads` para a nota; membro da organização para o arquivo, como `contacts`); escreve agent+ com `user_id = auth.uid()`; edita/apaga o dono ou gerente+ (`fn_role_at_least(org,'manager')`); `revoke … from anon`; travas de suporte; FKs com `on delete cascade` (Q14) | Padrão das 9003/9004; PRD §5 |
| N12 | **Histórico:** hook próprio com `useInfiniteQuery` (25 por página, `cursor`), filtro por grupo (os 16 da Clint; cada grupo = lista de `type` do original enviada na rota; "Automações" = `source_module = webhook`, filtrado na tela), busca na tela (título, corpo, autor); seções Hoje/Ontem/Esta semana/"DD MMM"; títulos e corpos da Clint onde o dado existe (etapa com nomes do quadro; `lead_edited` com os nomes dos campos; dono só "Mudou de usuário"); "Ver automação" fica fora (Q10, Q11); ícones e cores por grupo (Q12) | Rota do original já pagina e filtra por `type`; sem busca no servidor |
| N13 | **Empresa:** fica como na 1G (Q2) | Módulo B2B desligado e sem ligação direta |
| N14 | **Dois PRs:** A = Tasks 1 a 6 (campos, nome, tags; sem banco); B = Tasks 7 a 14 (9008, notas, arquivos, conversas, histórico). O PR B nasce da `main` depois do merge do A | Escopo (Q1) |
| N15 | **Testes da 1G que mudam de propósito:** os que pinavam "Em breve" nas peças que esta fase liga (lista em Global Constraints) | — |
| G1 | **Verificação enxuta** (aprovada em 17/10). Ver "Verificação" | Política em vigor |

## Global Constraints

### Repositório e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo`.
- **Base do PR A:** `escale-crm/main` com os **dois PRs da 1G mergeados** (a página e o cabeçalho). A Task 1 prova (`components/escale/negocio/AcoesDaFicha.tsx` e `MenuDaFicha.tsx` existem). Sem eles, PARE e pergunte.
- **Migration:** só o PR B, a **9008** (`supabase/migrations/20261023120000_9008_notas_e_arquivos.sql`). A Task 7 confere que a última da `main` é a 9007; se houver uma maior, troque o número e o timestamp em todos os lugares (arquivo, cabeçalho do baseline, testes) e PARE se a 9008 já existir em outra branch (`bash scripts/checar-colisao-de-migration.sh escale-crm/main`).
- **Branches:** PR A `feat/fase-1h-campos-e-tags`; PR B `feat/fase-1h-notas-arquivos-historico`, criada da `escale-crm/main` **depois** do merge do PR A (Task 7 prova).
- **PR:** para `rgisjr/escale-crm`, base `main`. Quem aprova é o usuário.
- **Proibido:** push em `origin` (Rafael), merge, tag, release, VPS e gravar no banco de produção.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só no PR B (Task 7 e a rodada cheia da Task 14). Precisa do Docker: se `docker info` falhar, PARE e peça ao usuário.

### Onde o fork entra nos arquivos do original

| Arquivo | Mudança |
|---|---|
| `tests/invariants/rls-completude-varredura.test.ts` | duas entradas novas em `PROVA_PROPRIA` (Task 7) |
| `lib/i18n/dicionario.ts` | bloco novo logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`, depois dos blocos da 1G (Tasks 6 e 14) |
| `supabase/baseline.sql` | o bloco da 9008, idêntico à migration (Task 7) |

Nenhum outro arquivo do original muda. Os do fork que mudam: `components/escale/negocio/abas/*`, `CabecalhoDaFicha.tsx`, `AcoesDaFicha.tsx`, `MenuDaFicha.tsx`, `ConteudoDaAba.tsx`, `FichaDoNegocio.tsx`, `lib/escale/negocio/regras.ts`, `components/escale/ui/CalendarioDePeriodo.tsx` (prop `semAbas`), `lib/ui/icons-da-casca.ts`.

### Testes da 1G que esta fase muda de propósito

| Teste | O que pinava | Por quê muda |
|---|---|---|
| `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` | "Ocultar vazios", "Gerenciar campos" e a busca desligados; Arquivos e Conversas só com a moldura | Tasks 3, 4, 11, 12 reescrevem os `it` correspondentes |
| `tests/unit/escale-ficha-abas-atividades-historico.test.tsx` | busca e filtro do Histórico desligados ("Em breve") | Task 13 |
| `tests/unit/escale-ficha-do-negocio.test.tsx` | "o cabeçalho: nome e lápis desligado (editar é 1H)" | Task 5 |
| `tests/unit/escale-ficha-acoes-e-menu.test.tsx` (1G PR B) | "Nova nota" e "+ Adicionar tags" desligados | Tasks 5 e 9 |

### Cercas que precisam ficar verdes

- `controle-decorativo`: todo botão desligado tem `title`.
- `tailwind-tokens`: cores só por token da casca ou `var(--escale-*)`; nenhum hex novo em `className`.
- `vocabulario-do-funil`: nenhum "pipeline"/"kanban" em texto de JSX.
- `evidencia-citada`: este plano, copiado para o repositório, não cita imagem entre crases nem em link.
- `escale-casca-v2-original-intacto`: as peças do shell do original não importam `@/components/escale/`.
- `campo-condicional-nos-pontos-de-renderizacao`: os editores novos filtram com `camposVisiveis(defs, valores)` e mandam o objeto de valores inteiro quando o PATCH substitui (contato).
- `i18n-espanhol-cobre-a-tela`: os textos novos têm espanhol (Tasks 6 e 14).
- `tabelas-do-motor-nao-se-leem-pelo-login`: a lista é fixa; as tabelas novas são lidas pela sessão (RLS), como as da 9003/9004.
- `manifest-x-migrations`: a 9008 tem a linha `-- manifest:`; o `MANIFEST.md` não muda.
- `rls-completude-varredura`: as duas tabelas novas entram em `PROVA_PROPRIA` apontando para `tests/invariants/escale-notas-e-arquivos-rls.test.ts`.
- `lib/clipboard.test.ts`: nada de `navigator.clipboard` cru.

### Verificação (G1 — aprovada em 17/10)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, o typecheck e o eslint dos arquivos alterados. Os guardas:
   ```bash
   for f in <arquivos alterados>; do grep -rlF "${f%.*}" tests/unit tests/invariants lib app components --include='*.test.ts' --include='*.test.tsx'; done | sort -u
   ```
   Rode os de `tests/unit` com `corepack pnpm vitest run <arquivos>`. O prettier só nos arquivos NOVOS.
2. **`test:db`:** só a Task 7 roda o arquivo novo sozinho (`corepack pnpm test:db tests/invariants/escale-notas-e-arquivos-rls.test.ts`), e a rodada cheia do PR B roda tudo.
3. **Revisor (subagente) só** na Task 3 (edição que grava no negócio), na Task 7 (migration e RLS), na Task 10 (upload e URL assinada) e na Task 13 (Histórico, UI grande). As outras são checadas pelo controlador, lendo o diff.
4. **Uma rodada cheia por PR**, no fim (Tasks 6 e 14), em segundo plano, comparada com `.superpowers/sdd/falhas-conhecidas.txt`.
5. **Conferência visual** do contrato só no fim de cada PR (CAMINHO A ou B), por aba e por estado, contra o print citado, com a lista escrita das diferenças que sobram.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>`; o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório no PR A (Task 1).
- Todo texto de tela por `t()` com literal. Datas e moeda no formato brasileiro.

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/negocio/campos.ts` | novo | A | regras puras dos campos: leitura, busca, vazios, telefone, data, patch do contato |
| `components/escale/negocio/abas/EditorDeCampo.tsx` | novo | A | o input em linha por tipo, com Cancelar/Salvar e o check |
| `components/escale/negocio/abas/CamposDaFicha.tsx` | alterado | A | busca, vazios, Gerenciar campos, o editor em cada linha |
| `components/escale/negocio/abas/AbasDeCampos.tsx` | alterado | A | Contato e Negócio editáveis |
| `components/escale/negocio/NomeDaFicha.tsx` | novo | A | o lápis do nome |
| `components/escale/negocio/TagsDaFicha.tsx` | novo | A | chips e o popover "+ Adicionar tags" |
| `components/escale/negocio/CabecalhoDaFicha.tsx`, `AcoesDaFicha.tsx` | alterados | A | encaixe do nome e das tags |
| `hooks/escale/useGravarContato.ts` | novo | A | `useUpdateContact` + invalidação do quadro |
| `supabase/migrations/20261023120000_9008_notas_e_arquivos.sql`, `supabase/baseline.sql` | novo / bloco | B | tabelas, RLS, bucket |
| `tests/unit/escale-notas-e-arquivos-migration.test.ts`, `tests/invariants/escale-notas-e-arquivos-rls.test.ts`, `tests/invariants/rls-completude-varredura.test.ts` | novos / alterado | B | forma do SQL, prova no Postgres, varredura |
| `lib/escale/negocio/notas.ts`, `app/api/v1/leads/[id]/notas/route.ts`, `app/api/v1/leads/[id]/notas/[notaId]/route.ts`, `hooks/escale/useNotasDoNegocio.ts` | novos | B | notas |
| `components/escale/negocio/JanelaDeNota.tsx`, `MenuDaFicha.tsx` (alterado) | novo / alterado | B | o modal "Nova nota" e as portas |
| `lib/escale/negocio/arquivos.ts`, `app/api/v1/contacts/[id]/arquivos/route.ts`, `app/api/v1/contacts/[id]/arquivos/[arquivoId]/route.ts`, `hooks/escale/useArquivosDoContato.ts` | novos | B | arquivos |
| `components/escale/negocio/abas/AbaArquivos.tsx`, `JanelaDeNovoDocumento.tsx` | alterado / novo | B | a aba Arquivos |
| `components/escale/ui/CalendarioDePeriodo.tsx` | alterado | B | prop `semAbas` |
| `hooks/escale/useConversasDoContato.ts`, `components/escale/negocio/abas/AbaConversas.tsx` | novo / alterado | B | a aba Conversas |
| `lib/escale/negocio/historico.ts`, `hooks/escale/useHistoricoDoNegocio.ts`, `components/escale/negocio/abas/AbaHistorico.tsx`, `CartaoDoHistorico.tsx` | novos / alterado | B | a aba Histórico |
| `lib/escale/negocio/regras.ts` | alterado | B | `secoesDoHistorico` com Hoje/Ontem |
| `lib/ui/icons-da-casca.ts` | alterado | A e B | ícones novos |
| `lib/i18n/dicionario.ts` | alterado | A e B | espanhol |
| Testes: `tests/unit/escale-ficha-campos-regras.test.ts`, `escale-ficha-editor-de-campo.test.tsx`, `escale-ficha-abas-campos-conversas-arquivos.test.tsx` (alterado), `escale-ficha-nome-e-tags.test.tsx`, `escale-ficha-notas-rotas.test.ts`, `escale-ficha-janela-de-nota.test.tsx`, `escale-ficha-arquivos-regras.test.ts`, `escale-ficha-arquivos-rotas.test.ts`, `escale-ficha-aba-arquivos.test.tsx`, `escale-ficha-aba-conversas.test.tsx`, `escale-ficha-historico-regras.test.ts`, `escale-ficha-aba-historico.test.tsx` | | A e B | |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md` | alterado (fora do repositório) | A e B | a linha da 1H na seção 8 |

---

# PR A — Campos editáveis, nome e tags

### Task 1: Base, branch e as regras puras dos campos

**Files:**
- Create: `lib/escale/negocio/campos.ts`, `tests/unit/escale-ficha-campos-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/`

**Interfaces (Produces):** `CampoEditavel`, `TipoDeCampoDaFicha`, `CHAVE_NOME`, `CHAVE_TELEFONE`, `CHAVE_EMAIL`, `MAX_TAGS_DO_CONTATO`, `valorParaLeitura`, `campoVazio`, `filtrarCampos`, `telefoneParaGravar`, `dataIsoDeBr`, `dataBrDeIso`, `reaisDeTexto`, `textoDeReais`, `valorParaGravar`, `simboloDaMoeda`, `CHAVE_DOS_VAZIOS`, `lerOcultarVazios`, `patchDoContato`.

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio. Se não, PARE e pergunte.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/negocio/FichaDoNegocio.tsx && echo "1G A ok"
git cat-file -e escale-crm/main:components/escale/negocio/AcoesDaFicha.tsx && echo "1G B ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | sort | tail -2
git switch -c feat/fase-1h-campos-e-tags escale-crm/main
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-17-fase-1h-abas-da-ficha.md" docs/superpowers/plans/
```
Expected: `1G A ok`, `1G B ok`; a última migration é a 9007 (o PR A não cria nenhuma). Sem `1G B ok`, PARE.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-ficha-campos-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  campoVazio,
  dataBrDeIso,
  dataIsoDeBr,
  filtrarCampos,
  lerOcultarVazios,
  patchDoContato,
  reaisDeTexto,
  telefoneParaGravar,
  textoDeReais,
  valorParaGravar,
  valorParaLeitura,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";

/** FORK ESCALE · Fase 1H (C10, C14): as regras puras dos campos editáveis da ficha. */
const t = (s: string) => s;
const campo = (chave: string, valor: unknown, extra: Partial<CampoEditavel> = {}): CampoEditavel => ({
  chave,
  rotulo: chave,
  tipo: "text",
  valor,
  ...extra,
});

describe("leitura do valor (o que a caixa mostra)", () => {
  it("vazio é null; lista e múltipla mostram o rótulo; data vira dd/mm/aaaa; Sim/Não; moeda em reais", () => {
    const opcoes = [{ value: "g", label: "Google" }, { value: "m", label: "Meta" }];
    expect(valorParaLeitura("text", undefined, "", t)).toBeNull();
    expect(valorParaLeitura("select", opcoes, "g", t)).toBe("Google");
    expect(valorParaLeitura("multiselect", opcoes, ["g", "m"], t)).toBe("Google, Meta");
    expect(valorParaLeitura("date", undefined, "2026-10-17", t)).toBe("17/10/2026");
    expect(valorParaLeitura("boolean", undefined, true, t)).toBe("Sim");
    expect(valorParaLeitura("currency", undefined, 1500.5, t)).toBe("1.500,50");
  });

  it("campoVazio: null, undefined, '' e [] são vazios; 0 e false não", () => {
    expect(campoVazio(null)).toBe(true);
    expect(campoVazio("")).toBe(true);
    expect(campoVazio([])).toBe(true);
    expect(campoVazio(0)).toBe(false);
    expect(campoVazio(false)).toBe(false);
  });
});

describe("busca e vazios (N3)", () => {
  const campos = [campo("nome", "Ana"), campo("cargo", null), campo("email", "a@b.c")];
  it("a busca filtra pelo rótulo, sem acento e sem caixa", () => {
    expect(filtrarCampos(campos, "CARGO", false).map((c) => c.chave)).toEqual(["cargo"]);
    expect(filtrarCampos(campos, "", false)).toHaveLength(3);
  });
  it("ocultar vazios tira os sem valor", () => {
    expect(filtrarCampos(campos, "", true).map((c) => c.chave)).toEqual(["nome", "email"]);
  });
  it("lerOcultarVazios: o padrão é mostrar tudo (a flag da Clint é invertida)", () => {
    const storage = new Map<string, string>();
    expect(lerOcultarVazios({ getItem: (k) => storage.get(k) ?? null }, "contato")).toBe(false);
    storage.set("escale_campos_vazios_contato", "1");
    expect(lerOcultarVazios({ getItem: (k) => storage.get(k) ?? null }, "contato")).toBe(true);
    expect(lerOcultarVazios(null, "contato")).toBe(false);
  });
});

describe("o que vai para o banco", () => {
  it("telefone: canônico com +; 10 ou 11 dígitos sem + ganham +55; inválido recusa", () => {
    expect(telefoneParaGravar("+55 43 99803-1566")).toEqual({ ok: true, valor: "+5543998031566" });
    expect(telefoneParaGravar("(43) 99803-1566")).toEqual({ ok: true, valor: "+5543998031566" });
    expect(telefoneParaGravar("4332223344")).toEqual({ ok: true, valor: "+554332223344" });
    expect(telefoneParaGravar("123")).toEqual({ ok: false, erro: "O telefone informado está inválido." });
    expect(telefoneParaGravar("")).toEqual({ ok: false, erro: "Para apagar o telefone, use a ficha do contato." });
  });

  it("data: dd/mm/aaaa ↔ ISO, e recusa data impossível", () => {
    expect(dataIsoDeBr("17/10/2026")).toBe("2026-10-17");
    expect(dataIsoDeBr("31/02/2026")).toBeNull();
    expect(dataIsoDeBr("2026-10-17")).toBe("2026-10-17");
    expect(dataBrDeIso("2026-10-17")).toBe("17/10/2026");
  });

  it("moeda: texto brasileiro ↔ número em reais", () => {
    expect(reaisDeTexto("1.500,50")).toBe(1500.5);
    expect(reaisDeTexto("R$ 1500")).toBe(1500);
    expect(reaisDeTexto("abc")).toBeNull();
    expect(textoDeReais(1500.5)).toBe("1.500,50");
  });

  it("valorParaGravar por tipo: vazio vira null; número e moeda viram número; data vira ISO", () => {
    expect(valorParaGravar("text", "  Ana ")).toEqual({ ok: true, valor: "Ana" });
    expect(valorParaGravar("text", "   ")).toEqual({ ok: true, valor: null });
    expect(valorParaGravar("number", "12,5")).toEqual({ ok: true, valor: 12.5 });
    expect(valorParaGravar("number", "x")).toEqual({ ok: false, erro: "Digite um número." });
    expect(valorParaGravar("currency", "1.500,50")).toEqual({ ok: true, valor: 1500.5 });
    expect(valorParaGravar("date", "17/10/2026")).toEqual({ ok: true, valor: "2026-10-17" });
    expect(valorParaGravar("date", "99/99/9999")).toEqual({ ok: false, erro: "Digite uma data válida (dd/mm/aaaa)." });
    expect(valorParaGravar("email", "ana@")).toEqual({ ok: false, erro: "Necessário ser um email válido." });
    expect(valorParaGravar("url", "escaleia.com")).toEqual({ ok: true, valor: "https://escaleia.com" });
  });
});

describe("patch do contato (N4)", () => {
  const contato = { custom_fields: { cargo: "CEO", link_site: "https://a.com" } };
  it("nome, telefone e e-mail vão nas colunas; o resto em custom_fields INTEIRO", () => {
    expect(patchDoContato(contato, "nome", "Ana")).toEqual({ name: "Ana" });
    expect(patchDoContato(contato, "telefone", "+5543998031566")).toEqual({ phone_number: "+5543998031566" });
    expect(patchDoContato(contato, "email", "a@b.co")).toEqual({ email: "a@b.co" });
    expect(patchDoContato(contato, "cargo", "CTO")).toEqual({
      custom_fields: { cargo: "CTO", link_site: "https://a.com" },
    });
  });
  it("um link vai pela chave link_<tipo>, normalizado; vazio apaga a chave", () => {
    expect(patchDoContato(contato, "link_instagram", "https://instagram.com/ana")).toEqual({
      custom_fields: { cargo: "CEO", link_site: "https://a.com", link_instagram: "https://instagram.com/ana" },
    });
    expect(patchDoContato(contato, "link_site", null)).toEqual({ custom_fields: { cargo: "CEO" } });
  });
  it("e-mail e telefone vazios não geram patch", () => {
    expect(patchDoContato(contato, "email", null)).toBeNull();
    expect(patchDoContato(contato, "telefone", "")).toBeNull();
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-campos-regras.test.ts`
Expected: FAIL (`Cannot find module '@/lib/escale/negocio/campos'`).

- [ ] **Step 4: As regras**

Create `lib/escale/negocio/campos.ts`:

```ts
/**
 * CAMPOS EDITÁVEIS DA FICHA (fork Escale, Fase 1H; C10, C14): regras puras do
 * editor em linha da Clint. Sem React e sem rede.
 *
 * - A caixa mostra o valor como texto (`valorParaLeitura`) e grava o que o
 *   tipo pede (`valorParaGravar`): número e moeda viram número (a moeda em
 *   REAIS, como o `CustomFieldsEditor` do original), data vira ISO, vazio vira null.
 * - "Ocultar vazios" é por tipo e fica no localStorage; o padrão da Clint é
 *   mostrar tudo (a flag `options.hidden` dela tem o nome invertido).
 * - O contato grava `custom_fields` INTEIRO (o PATCH do original substitui o
 *   objeto); nome, telefone e e-mail vão nas colunas.
 */
import type { CustomFieldType } from "@/components/contacts/CustomFieldsEditor";
import type { ContactPatch } from "@/lib/schemas/contacts";
import { PREFIXO_DA_CHAVE, normalizarLink } from "@/lib/leads/links-de-contato";

export type TipoDeCampoDaFicha = CustomFieldType;

export interface CampoEditavel {
  chave: string;
  rotulo: string;
  tipo: TipoDeCampoDaFicha;
  valor: unknown;
  opcoes?: { value: string; label: string }[];
  /** Fase 1F: o campo é exigido nesta etapa ("Campo obrigatório nesta etapa"). */
  obrigatorioNaEtapa?: boolean;
  /** Só leitura (o "Valor" de um negócio ganho ou perdido, por exemplo). */
  travado?: boolean;
}

/** As chaves fixas do contato; o resto vai em `custom_fields`. */
export const CHAVE_NOME = "nome";
export const CHAVE_TELEFONE = "telefone";
export const CHAVE_EMAIL = "email";
export const MAX_TAGS_DO_CONTATO = 20;

const SIMBOLO: Record<string, string> = { BRL: "R$", USD: "US$", EUR: "€", GBP: "£", ARS: "$", MXN: "$" };
export const simboloDaMoeda = (moeda: string | null | undefined): string => SIMBOLO[moeda ?? "BRL"] ?? (moeda ?? "R$");

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function campoVazio(bruto: unknown): boolean {
  if (bruto === null || bruto === undefined) return true;
  if (typeof bruto === "string") return bruto.trim() === "";
  if (Array.isArray(bruto)) return bruto.length === 0;
  return false;
}

export function textoDeReais(valor: number): string {
  return valor.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export function reaisDeTexto(texto: string): number | null {
  const limpo = texto.replace(/[^\d,.-]/g, "");
  if (!limpo) return null;
  // "1.500,50" → "1500.50"; "1500" → "1500"; "1,5" → "1.5".
  const normalizado = limpo.includes(",") ? limpo.replace(/\./g, "").replace(",", ".") : limpo;
  const n = Number(normalizado);
  return Number.isFinite(n) ? n : null;
}

export function dataBrDeIso(iso: string): string {
  const [a, m, d] = iso.slice(0, 10).split("-");
  return a && m && d ? `${d}/${m}/${a}` : iso;
}

export function dataIsoDeBr(texto: string): string | null {
  const limpo = texto.trim();
  const iso = /^(\d{4})-(\d{2})-(\d{2})$/.exec(limpo);
  const br = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(limpo);
  const [a, m, d] = iso ? [iso[1], iso[2], iso[3]] : br ? [br[3], br[2], br[1]] : [];
  if (!a || !m || !d) return null;
  const data = new Date(Number(a), Number(m) - 1, Number(d));
  const bate =
    data.getFullYear() === Number(a) && data.getMonth() === Number(m) - 1 && data.getDate() === Number(d);
  return bate ? `${a}-${m}-${d}` : null;
}

/** O que a caixa mostra (null = "Clique aqui para adicionar"). */
export function valorParaLeitura(
  tipo: TipoDeCampoDaFicha,
  opcoes: { value: string; label: string }[] | undefined,
  bruto: unknown,
  t: (s: string) => string,
): string | null {
  if (campoVazio(bruto)) return null;
  const rotuloDa = (v: unknown) => opcoes?.find((o) => o.value === v)?.label ?? String(v);
  switch (tipo) {
    case "boolean":
      return bruto ? t("Sim") : t("Não");
    case "select":
      return rotuloDa(bruto);
    case "multiselect":
      return Array.isArray(bruto) ? bruto.map(rotuloDa).join(", ") || null : String(bruto);
    case "date":
      return typeof bruto === "string" ? dataBrDeIso(bruto) : String(bruto);
    case "currency":
      return typeof bruto === "number" ? textoDeReais(bruto) : String(bruto);
    default:
      return String(bruto);
  }
}

export type ValorParaGravar = { ok: true; valor: unknown } | { ok: false; erro: string };

/** O texto digitado vira o valor do tipo. Vazio vira null (apaga). */
export function valorParaGravar(tipo: TipoDeCampoDaFicha, texto: string): ValorParaGravar {
  const limpo = texto.trim();
  if (!limpo) return { ok: true, valor: null };
  switch (tipo) {
    case "number": {
      const n = Number(limpo.replace(/\./g, "").replace(",", "."));
      return Number.isFinite(n) ? { ok: true, valor: n } : { ok: false, erro: "Digite um número." };
    }
    case "currency": {
      const n = reaisDeTexto(limpo);
      return n === null ? { ok: false, erro: "Digite um valor." } : { ok: true, valor: n };
    }
    case "date": {
      const iso = dataIsoDeBr(limpo);
      return iso ? { ok: true, valor: iso } : { ok: false, erro: "Digite uma data válida (dd/mm/aaaa)." };
    }
    case "email":
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)
        ? { ok: true, valor: limpo }
        : { ok: false, erro: "Necessário ser um email válido." };
    case "url": {
      const url = normalizarLink(/^https?:\/\//i.test(limpo) ? limpo : `https://${limpo}`);
      return url ? { ok: true, valor: url } : { ok: false, erro: "Digite um endereço válido." };
    }
    case "phone": {
      const tel = telefoneParaGravar(limpo);
      return tel.ok ? { ok: true, valor: tel.valor } : tel;
    }
    default:
      return { ok: true, valor: limpo };
  }
}

export type TelefoneParaGravar = { ok: true; valor: string } | { ok: false; erro: string };

/** Canônico `+DDI…` (o `PHONE_REGEX` do original: `^\+\d{8,15}$`). */
export function telefoneParaGravar(texto: string): TelefoneParaGravar {
  const limpo = texto.trim();
  if (!limpo) return { ok: false, erro: "Para apagar o telefone, use a ficha do contato." };
  const digitos = limpo.replace(/\D/g, "");
  const comDdi = limpo.startsWith("+")
    ? digitos
    : digitos.length === 10 || digitos.length === 11
      ? `55${digitos}`
      : digitos;
  return /^\d{8,15}$/.test(comDdi)
    ? { ok: true, valor: `+${comDdi}` }
    : { ok: false, erro: "O telefone informado está inválido." };
}

export function filtrarCampos(
  campos: readonly CampoEditavel[],
  busca: string,
  ocultarVazios: boolean,
): CampoEditavel[] {
  const termo = semAcento(busca.trim());
  return campos.filter(
    (c) => (!termo || semAcento(c.rotulo).includes(termo)) && (!ocultarVazios || !campoVazio(c.valor)),
  );
}

export const CHAVE_DOS_VAZIOS = (tipo: string) => `escale_campos_vazios_${tipo}`;

/** true = ocultar os vazios. O padrão (sem nada guardado) é mostrar tudo. */
export function lerOcultarVazios(
  storage: { getItem: (k: string) => string | null } | null,
  tipo: string,
): boolean {
  try {
    return storage?.getItem(CHAVE_DOS_VAZIOS(tipo)) === "1";
  } catch {
    return false;
  }
}

/**
 * O PATCH do contato para UMA chave. `custom_fields` vai inteiro (o handler do
 * original substitui o objeto). E-mail e telefone vazios não geram patch (o
 * schema não aceita apagar; Q4).
 */
export function patchDoContato(
  contato: { custom_fields: Record<string, unknown> | null | undefined },
  chave: string,
  valor: unknown,
): ContactPatch | null {
  if (chave === CHAVE_NOME) return campoVazio(valor) ? null : { name: String(valor) };
  if (chave === CHAVE_TELEFONE) return campoVazio(valor) ? null : { phone_number: String(valor) };
  if (chave === CHAVE_EMAIL) return campoVazio(valor) ? null : { email: String(valor) };
  const atual = { ...(contato.custom_fields ?? {}) };
  if (chave.startsWith(PREFIXO_DA_CHAVE)) {
    const url = campoVazio(valor) ? null : normalizarLink(String(valor));
    if (url) atual[chave] = url;
    else delete atual[chave];
    return { custom_fields: atual };
  }
  if (campoVazio(valor)) delete atual[chave];
  else atual[chave] = valor;
  return { custom_fields: atual };
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-campos-regras.test.ts && corepack pnpm prettier --write lib/escale/negocio/campos.ts tests/unit/escale-ficha-campos-regras.test.ts && corepack pnpm eslint lib/escale/negocio/campos.ts`
Expected: PASS. Se o `ContactPatch` do original tipar `custom_fields` de um jeito que recuse `Record<string, unknown>`, confira `customFieldsSchema` em `lib/schemas/contacts.ts` e ajuste o tipo do retorno (nunca o schema do original).

- [ ] **Step 6: Commit**

```bash
git add lib/escale/negocio/campos.ts tests/unit/escale-ficha-campos-regras.test.ts docs/superpowers/plans/2026-10-17-fase-1h-abas-da-ficha.md
git commit -m "feat(escale): regras dos campos editáveis da ficha do negócio (Fase 1H)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 2: O editor em linha (`EditorDeCampo`)

**Files:**
- Create: `components/escale/negocio/abas/EditorDeCampo.tsx`, `tests/unit/escale-ficha-editor-de-campo.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (ícones novos da fase)

**Interfaces:**
- Consumes: `CampoEditavel`, `valorParaGravar`, `textoDeReais`, `dataBrDeIso`, `simboloDaMoeda` (Task 1); `SeletorDaCasca`, `SeletorMultiploDaCasca`, `BotaoDaCasca`.
- Produces: `EditorDeCampo({ campo, aoSalvar, moeda? })`, com `aoSalvar: (valor: unknown) => Promise<void>` (rejeita com `Error`; a `message` vai para a tela).

**Detalhes visuais (prints 02 e 04, N1):** a caixa de 32px com fundo `casca-busca` é o próprio input (sem borda; 13px; placeholder "Clique aqui para adicionar" em `casca-meta`); lista e múltipla desenham o ▾ à direita (o `SeletorDaCasca` com `className="h-8"`); ao digitar, embaixo aparecem "Cancelar" (texto) e "Salvar" (marca, 26px), à direita; ao salvar, o spinner à direita da caixa e depois o ✓ verde por 1s; o erro em 11px vermelho embaixo. Sem print do estado de edição (print que falta 1): segue o código da Clint.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-editor-de-campo.test.tsx`:

```tsx
import { act, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));

import { EditorDeCampo } from "@/components/escale/negocio/abas/EditorDeCampo";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";

/** FORK ESCALE · Fase 1H (N1): o input em linha da Clint. */
const texto = (valor: unknown): CampoEditavel => ({ chave: "cargo", rotulo: "Cargo", tipo: "text", valor });

describe("texto", () => {
  it("vazio mostra o placeholder da Clint; digitar mostra Cancelar/Salvar; Enter salva o texto", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto(null)} aoSalvar={aoSalvar} />);
    const input = screen.getByRole("textbox", { name: "Cargo" });
    expect(input).toHaveAttribute("placeholder", "Clique aqui para adicionar");
    expect(screen.queryByRole("button", { name: "Salvar" })).toBeNull();
    await userEvent.type(input, "CEO");
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    await userEvent.keyboard("{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith("CEO");
    expect(await screen.findByLabelText("Salvo")).toBeInTheDocument();
  });

  it("Esc e Cancelar voltam ao valor gravado; sair do campo não salva", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto("CEO")} aoSalvar={aoSalvar} />);
    const input = screen.getByRole("textbox", { name: "Cargo" });
    await userEvent.clear(input);
    await userEvent.type(input, "CTO");
    await userEvent.tab();
    expect(aoSalvar).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(input).toHaveValue("CEO");
    await userEvent.type(input, "X{Escape}");
    expect(input).toHaveValue("CEO");
  });

  it("valor inválido mostra o erro e não salva; erro do servidor aparece embaixo", async () => {
    const aoSalvar = vi.fn(async () => {
      throw new Error("Ocorreu um erro ao salvar o campo");
    });
    render(
      <EditorDeCampo campo={{ chave: "email", rotulo: "Email", tipo: "email", valor: null }} aoSalvar={aoSalvar} />,
    );
    const input = screen.getByRole("textbox", { name: "Email" });
    await userEvent.type(input, "ana@{Enter}");
    expect(screen.getByText("Necessário ser um email válido.")).toBeInTheDocument();
    expect(aoSalvar).not.toHaveBeenCalled();
    await userEvent.type(input, "b.co{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith("ana@b.co");
    expect(await screen.findByText("Ocorreu um erro ao salvar o campo")).toBeInTheDocument();
  });
});

describe("outros tipos", () => {
  it("moeda mostra reais e grava número; data mostra dd/mm/aaaa e grava ISO", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    const { rerender } = render(
      <EditorDeCampo
        campo={{ chave: "v", rotulo: "Valor", tipo: "currency", valor: 1500.5 }}
        aoSalvar={aoSalvar}
        moeda="BRL"
      />,
    );
    const valor = screen.getByRole("textbox", { name: "Valor" });
    expect(valor).toHaveValue("1.500,50");
    expect(screen.getByText("R$")).toBeInTheDocument();
    await userEvent.clear(valor);
    await userEvent.type(valor, "2000{Enter}");
    expect(aoSalvar).toHaveBeenCalledWith(2000);
    rerender(
      <EditorDeCampo campo={{ chave: "d", rotulo: "Data", tipo: "date", valor: "2026-10-17" }} aoSalvar={aoSalvar} />,
    );
    const data = screen.getByRole("textbox", { name: "Data" });
    expect(data).toHaveValue("17/10/2026");
    await userEvent.clear(data);
    await userEvent.type(data, "01/11/2026{Enter}");
    expect(aoSalvar).toHaveBeenLastCalledWith("2026-11-01");
  });

  it("lista grava ao escolher", async () => {
    const aoSalvar = vi.fn(async () => undefined);
    render(
      <EditorDeCampo
        campo={{ chave: "o", rotulo: "Origem", tipo: "select", valor: null, opcoes: [{ value: "g", label: "Google" }] }}
        aoSalvar={aoSalvar}
      />,
    );
    await userEvent.click(screen.getByRole("combobox", { name: "Origem" }));
    await userEvent.click(await screen.findByRole("option", { name: "Google" }));
    expect(aoSalvar).toHaveBeenCalledWith("g");
  });

  it("travado é só leitura, com a dica", () => {
    render(<EditorDeCampo campo={{ ...texto("x"), travado: true }} aoSalvar={vi.fn(async () => undefined)} />);
    const input = screen.getByRole("textbox", { name: "Cargo" });
    expect(input).toBeDisabled();
    expect(input).toHaveAttribute("title", "Este campo não pode ser editado aqui.");
  });

  it("o check some depois de 1s", async () => {
    vi.useFakeTimers({ shouldAdvanceTime: true });
    const aoSalvar = vi.fn(async () => undefined);
    render(<EditorDeCampo campo={texto(null)} aoSalvar={aoSalvar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Cargo" }), "A{Enter}");
    expect(await screen.findByLabelText("Salvo")).toBeInTheDocument();
    await act(async () => {
      vi.advanceTimersByTime(1100);
    });
    expect(screen.queryByLabelText("Salvo")).toBeNull();
    vi.useRealTimers();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-editor-de-campo.test.tsx`
Expected: FAIL (módulo não encontrado).

- [ ] **Step 3: Os ícones e o componente**

Em `lib/ui/icons-da-casca.ts`, acrescente no fim:

```ts
// Fase 1H (ficha do negócio, abas): spinner e check do salvar, nota, arquivos, conversas e histórico.
export {
  Loader2,
  CircleCheck,
  NotebookPen,
  File,
  FileImage,
  FileSpreadsheet,
  FileAudio,
  FileVideo,
  FileArchive,
  Paperclip,
  Zap,
  CalendarDays,
  Bot,
  Merge,
  Send,
  MousePointerClick,
  Link2,
  ExternalLink,
} from "lucide-react";
```

Create `components/escale/negocio/abas/EditorDeCampo.tsx`:

```tsx
"use client";
import { useEffect, useId, useRef, useState, type KeyboardEvent, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  dataBrDeIso,
  simboloDaMoeda,
  textoDeReais,
  valorParaGravar,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import { CircleCheck, Loader2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O INPUT EM LINHA DA CLINT (fork Escale, Fase 1H; N1, N2; prints 02 e 04).
 *
 * O valor é sempre um input. Digitar mostra "Cancelar" e "Salvar" embaixo;
 * Enter salva; Esc e Cancelar voltam ao valor gravado; sair do campo não
 * salva. Depois de salvar, o ✓ verde por 1s. Lista, múltipla e Sim/Não gravam
 * ao escolher. `aoSalvar` rejeita com a mensagem que vai para a tela.
 */
const CAIXA =
  "h-8 w-full rounded-md bg-casca-busca px-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca disabled:cursor-not-allowed disabled:text-casca-meta";
const CHECK_POR_MS = 1000;

type Estado = { fase: "parado" } | { fase: "salvando" } | { fase: "salvo" } | { fase: "erro"; erro: string };

export function EditorDeCampo({
  campo,
  aoSalvar,
  moeda = "BRL",
}: {
  campo: CampoEditavel;
  aoSalvar: (valor: unknown) => Promise<void>;
  moeda?: string;
}) {
  const t = useT();
  const id = useId();
  const gravado = textoDoValor(campo);
  const [texto, setTexto] = useState(gravado);
  const [estado, setEstado] = useState<Estado>({ fase: "parado" });
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // O valor que chega do servidor (tempo real, outra aba) vence o rascunho parado.
  useEffect(() => {
    setTexto(gravado);
  }, [gravado]);
  useEffect(() => () => clearTimeout(timer.current ?? undefined), []);

  async function gravar(valor: unknown) {
    setEstado({ fase: "salvando" });
    try {
      await aoSalvar(valor);
      setEstado({ fase: "salvo" });
      timer.current = setTimeout(() => setEstado({ fase: "parado" }), CHECK_POR_MS);
    } catch (err) {
      setEstado({
        fase: "erro",
        erro: err instanceof Error && err.message ? err.message : t("Ocorreu um erro ao salvar o campo"),
      });
    }
  }

  function salvarTexto() {
    const resultado = valorParaGravar(campo.tipo, texto);
    if (!resultado.ok) return setEstado({ fase: "erro", erro: t(resultado.erro) });
    void gravar(resultado.valor);
  }

  function cancelar() {
    setTexto(gravado);
    setEstado({ fase: "parado" });
  }

  function tecla(e: KeyboardEvent<HTMLInputElement | HTMLTextAreaElement>) {
    if (e.key === "Enter" && !(campo.tipo === "textarea" && e.shiftKey)) {
      e.preventDefault();
      salvarTexto();
    }
    if (e.key === "Escape") cancelar();
  }

  const editando = texto !== gravado && estado.fase !== "salvando";
  const dica = campo.travado ? t("Este campo não pode ser editado aqui.") : undefined;

  if (campo.tipo === "select" || campo.tipo === "boolean") {
    const opcoes =
      campo.tipo === "boolean"
        ? [
            { valor: "true", rotulo: t("Sim") },
            { valor: "false", rotulo: t("Não") },
          ]
        : (campo.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }));
    const valor = campo.valor === null || campo.valor === undefined || campo.valor === "" ? "" : String(campo.valor);
    return (
      <Moldura estado={estado}>
        <SeletorDaCasca
          valor={valor}
          opcoes={opcoes}
          vazio={t("Clique aqui para adicionar")}
          aria-label={campo.rotulo}
          desabilitado={campo.travado}
          dica={dica}
          className="h-8"
          aoMudar={(v) => void gravar(v === "" ? null : campo.tipo === "boolean" ? v === "true" : v)}
        />
      </Moldura>
    );
  }

  if (campo.tipo === "multiselect") {
    const valores = Array.isArray(campo.valor) ? campo.valor.map(String) : [];
    return (
      <Moldura estado={estado}>
        <SeletorMultiploDaCasca
          valores={valores}
          opcoes={(campo.opcoes ?? []).map((o) => ({ valor: o.value, rotulo: o.label }))}
          vazio={t("Clique aqui para adicionar")}
          aria-label={campo.rotulo}
          desabilitado={campo.travado}
          dica={dica}
          aoMudar={(v) => void gravar(v.length ? v : null)}
        />
      </Moldura>
    );
  }

  const comuns = {
    id,
    "aria-label": campo.rotulo,
    value: texto,
    disabled: campo.travado,
    title: dica,
    placeholder: t("Clique aqui para adicionar"),
    onChange: (e: { target: { value: string } }) => {
      setTexto(e.target.value);
      if (estado.fase === "erro") setEstado({ fase: "parado" });
    },
    onKeyDown: tecla,
  };
  return (
    <Moldura estado={estado}>
      <div className="flex items-center gap-2">
        {campo.tipo === "currency" ? (
          <span className="text-[13px] text-casca-texto-2">{simboloDaMoeda(moeda)}</span>
        ) : null}
        {campo.tipo === "textarea" ? (
          <textarea {...comuns} rows={3} className={cn(CAIXA, "h-auto min-h-16 py-2")} />
        ) : (
          <input
            {...comuns}
            type="text"
            inputMode={campo.tipo === "number" || campo.tipo === "currency" ? "decimal" : undefined}
            className={CAIXA}
          />
        )}
      </div>
      {editando ? (
        <div className="mt-1.5 flex justify-end gap-2">
          <BotaoDaCasca variante="texto" tamanho="sm" onClick={cancelar}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca variante="marca" tamanho="sm" onClick={salvarTexto}>
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </Moldura>
  );
}

/** O que a Clint mostra ao lado e embaixo da caixa: spinner, ✓ por 1s ou o erro. */
function Moldura({ estado, children }: { estado: Estado; children: ReactNode }) {
  const t = useT();
  return (
    <div>
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">{children}</div>
        {estado.fase === "salvando" ? (
          <Loader2 size={16} aria-label={t("Salvando…")} className="shrink-0 animate-spin text-casca-suave" />
        ) : estado.fase === "salvo" ? (
          <CircleCheck size={16} aria-label={t("Salvo")} className="shrink-0 text-[var(--escale-status-ganho)]" />
        ) : null}
      </div>
      {estado.fase === "erro" ? <p className="mt-1 text-[11px] text-destructive">{estado.erro}</p> : null}
    </div>
  );
}

/** O texto que o input mostra para o valor gravado. */
function textoDoValor(campo: CampoEditavel): string {
  const v = campo.valor;
  if (v === null || v === undefined || v === "") return "";
  if (campo.tipo === "currency" && typeof v === "number") return textoDeReais(v);
  if (campo.tipo === "date" && typeof v === "string") return dataBrDeIso(v);
  return String(v);
}
```

Confira que `--escale-status-ganho` existe em `app/escale-tema.css` (a 1G PR B a criou). Se não existir, PARE: a Task 9 da 1G não foi mergeada.

- [ ] **Step 4: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-editor-de-campo.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/negocio/abas/EditorDeCampo.tsx tests/unit/escale-ficha-editor-de-campo.test.tsx && corepack pnpm eslint components/escale/negocio/abas/EditorDeCampo.tsx lib/ui/icons-da-casca.ts`
Expected: PASS. Se o `SeletorDaCasca` não abrir com o clique no teste, abra com `{ArrowDown}` no gatilho (o teclado dele abre a lista). Se a cerca `tailwind-tokens` recusar o `text-[var(--escale-status-ganho)]`, use o mesmo padrão que a 1G PR B usou em `StatusDaFicha.tsx` para a cor de Ganho.

- [ ] **Step 5: Commit**

```bash
git add components/escale/negocio/abas/EditorDeCampo.tsx lib/ui/icons-da-casca.ts tests/unit/escale-ficha-editor-de-campo.test.tsx
git commit -m "feat(escale): o input em linha da ficha do negócio, como na Clint (Fase 1H)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 3: A moldura com busca, vazios e Gerenciar campos; a aba Negócio editável (C14)

**Files:**
- Modify: `components/escale/negocio/abas/CamposDaFicha.tsx`, `components/escale/negocio/abas/AbasDeCampos.tsx` (só `AbaNegocio` e `AbaEmpresa`), `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` (os `describe` de Negócio e Empresa)

**Interfaces:**
- Consumes: `EditorDeCampo` (Task 2); `CampoEditavel`, `filtrarCampos`, `lerOcultarVazios`, `CHAVE_DOS_VAZIOS`, `valorParaLeitura` (Task 1); `useEditLead(pipelineId)` (`hooks/kanban/useUpdateLead`, `mutateAsync({ leadId, patch })`); `camposDoFunil`; `camposVisiveis` (`lib/schemas/mostrar-quando`); `usePermission("settings.write")`.
- Produces: `CamposDaFicha({ icone, titulo, tipo, campos, aoSalvar?, moeda?, gerenciarHref? })` com `tipo: "contato" | "empresa" | "negocio"` e `aoSalvar?: (chave: string, valor: unknown) => Promise<void>` (sem `aoSalvar`, a moldura é só leitura, como na 1G); `AbaNegocio({ lead, pipeline })` editável; `AbaEmpresa()` igual à 1G.

**Detalhes visuais (prints 02 e 04):** a faixa de título com "Ocultar vazios" (ou "Mostrar vazios") e "⚙ Gerenciar campos" brancos; a busca de 166×32 na coluna da direita; a lista de linhas com rótulo em 275px e a caixa (agora o `EditorDeCampo`); com a busca sem resultado, "Nenhum campo encontrado" em 13px `casca-suave`; com vazios ocultos, o rodapé "Porque não vejo alguns campos?" em 12px `casca-marca`, com a dica da Clint no `title`.

- [ ] **Step 1: Os testes (vão falhar)**

Em `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, acrescente os mocks logo depois do mock de `useT`:

```tsx
import userEvent from "@testing-library/user-event";

const editar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({ useEditLead: () => ({ mutateAsync: editar.mutateAsync, isPending: false }) }));
const permissao = vi.hoisted(() => ({ pode: true }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ usePermission: () => permissao.pode }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
```

Troque o `describe("aba Negócio (print 04)")` inteiro por:

```tsx
describe("aba Negócio (print 04, C14)", () => {
  beforeEach(() => {
    editar.mutateAsync.mockClear();
    permissao.pode = true;
    window.localStorage.clear();
  });

  it("Valor e os campos do CRM num grupo só, cada um num input; a lista com ▾", () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de negócio" })).toBeInTheDocument();
    expect(
      within(screen.getByRole("navigation", { name: "Grupos de campos" })).getByText("Informações Gerais"),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("textbox", { name: "Valor" })).toHaveValue("1.500,00");
    expect(screen.getByRole("combobox", { name: "origem_organico" })).toHaveTextContent("Google");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveAttribute("placeholder", "Clique aqui para adicionar");
  });

  it("editar o Valor grava value_cents; editar um campo grava só aquela chave", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    const valor = screen.getByRole("textbox", { name: "Valor" });
    await userEvent.clear(valor);
    await userEvent.type(valor, "2.000,50{Enter}");
    expect(editar.mutateAsync).toHaveBeenCalledWith({ leadId: "n1", patch: { value_cents: 200050 } });
    await userEvent.type(screen.getByRole("textbox", { name: "Notas" }), "Ligar amanhã{Enter}");
    expect(editar.mutateAsync).toHaveBeenLastCalledWith({
      leadId: "n1",
      patch: { custom_fields: { notas: "Ligar amanhã" } },
    });
  });

  it("Ocultar vazios esconde os sem valor, lembra no localStorage e mostra o aviso da Clint", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.click(screen.getByRole("button", { name: "Ocultar vazios" }));
    expect(screen.queryByRole("textbox", { name: "Notas" })).toBeNull();
    expect(screen.getByRole("textbox", { name: "Valor" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Mostrar vazios" })).toBeInTheDocument();
    expect(screen.getByText("Porque não vejo alguns campos?")).toHaveAttribute(
      "title",
      'Os campos vazios estão sendo ocultados. Você pode clicar no canto superior direito dessa aba para "Mostrar campos vazios".',
    );
    expect(window.localStorage.getItem("escale_campos_vazios_negocio")).toBe("1");
  });

  it("Pesquisar campos filtra pelo rótulo; sem resultado, 'Nenhum campo encontrado'", async () => {
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar campos..." }), "nota");
    expect(screen.getByRole("textbox", { name: "Notas" })).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Valor" })).toBeNull();
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar campos..." }), "xyz");
    expect(screen.getByText("Nenhum campo encontrado")).toBeInTheDocument();
  });

  it("Gerenciar campos leva à tela de campos para quem administra; para os outros fica desligado", () => {
    const { unmount } = render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("link", { name: "Gerenciar campos" })).toHaveAttribute("href", "/app/settings/tenant/pipelines");
    unmount();
    permissao.pode = false;
    render(<AbaNegocio lead={LEAD} pipeline={PIPELINE} />);
    const botao = screen.getByRole("button", { name: "Gerenciar campos" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Só quem administra a conta gerencia os campos.");
  });

  it("um campo condicional escondido não aparece (camposVisiveis)", () => {
    const comCondicional = {
      ...PIPELINE,
      settings: {
        fields: [
          ...(PIPELINE.settings as { fields: unknown[] }).fields,
          { key: "cnpj", label: "CNPJ", type: "text", mostrar_quando: { campo: "origem_organico", operador: "igual", valor: "meta" } },
        ],
      },
    } as unknown as Pipeline;
    render(<AbaNegocio lead={LEAD} pipeline={comCondicional} />);
    expect(screen.queryByRole("textbox", { name: "CNPJ" })).toBeNull();
  });
});
```

Confira o formato de `mostrar_quando` em `lib/schemas/mostrar-quando.ts` (`mostrarQuandoSchema`) e ajuste o objeto do último teste às chaves reais (`campo`/`operador`/`valor` ou os nomes que o schema usa).

O `describe("aba Empresa")` continua como está (a moldura só leitura). Acrescente `beforeEach` ao `import` do vitest.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`
Expected: FAIL nos testes de Negócio (sem `textbox` "Valor", sem `searchbox`).

- [ ] **Step 3: A moldura**

Replace `components/escale/negocio/abas/CamposDaFicha.tsx` inteiro por:

```tsx
"use client";
import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  CHAVE_DOS_VAZIOS,
  filtrarCampos,
  lerOcultarVazios,
  valorParaLeitura,
  type CampoEditavel,
} from "@/lib/escale/negocio/campos";
import { ChevronDown, Search, Settings } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { EditorDeCampo } from "./EditorDeCampo";

/**
 * A MOLDURA "CAMPOS DE …" DA CLINT (fork Escale, Fases 1G e 1H; prints 02 a 04).
 *
 * Um grupo só ("Informações Gerais"; os grupos são da Fase 2, N3). A faixa tem
 * "Ocultar/Mostrar vazios" (por tipo, no localStorage; a flag da Clint é
 * invertida: o padrão é mostrar tudo) e "Gerenciar campos" (link para a tela de
 * campos, só para quem administra). A busca filtra pelo rótulo. Com `aoSalvar`,
 * cada linha é o `EditorDeCampo`; sem ele (Empresa), a caixa é só leitura.
 */
export type TipoDaMoldura = "contato" | "empresa" | "negocio";

const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";
const BOTAO_DA_FAIXA = "border border-casca-borda bg-surface";
export const ROTA_DE_GERENCIAR_CAMPOS = "/app/settings/tenant/pipelines";

export function CamposDaFicha({
  icone,
  titulo,
  tipo,
  campos,
  aoSalvar,
  moeda,
  gerenciarHref,
}: {
  icone: ReactNode;
  titulo: string;
  tipo: TipoDaMoldura;
  campos: CampoEditavel[];
  aoSalvar?: (chave: string, valor: unknown) => Promise<void>;
  moeda?: string;
  /** O link de "Gerenciar campos"; `null` = desligado (sem permissão); `undefined` = "Em breve" (Empresa). */
  gerenciarHref?: string | null;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const [ocultarVazios, setOcultarVazios] = useState(() =>
    lerOcultarVazios(typeof window === "undefined" ? null : window.localStorage, tipo),
  );
  const visiveis = useMemo(() => filtrarCampos(campos, busca, ocultarVazios), [campos, busca, ocultarVazios]);

  function alternarVazios() {
    const proximo = !ocultarVazios;
    setOcultarVazios(proximo);
    try {
      window.localStorage.setItem(CHAVE_DOS_VAZIOS(tipo), proximo ? "1" : "0");
    } catch {
      // Sem localStorage (modo privado): a escolha vale só nesta abertura.
    }
  }

  return (
    <div className="px-4 py-6">
      <div className="flex h-[46px] items-center justify-between rounded-lg bg-casca-raia px-5">
        <h2 className="flex items-center gap-2 text-[15px] text-casca-texto">
          <span aria-hidden className="text-casca-marca">
            {icone}
          </span>
          {titulo}
        </h2>
        <div className="flex items-center gap-2">
          <BotaoDaCasca
            variante="texto"
            tamanho="sm"
            title={t("Alternar exibição de campos sem valor preenchido")}
            className={BOTAO_DA_FAIXA}
            onClick={alternarVazios}
          >
            {ocultarVazios ? t("Mostrar vazios") : t("Ocultar vazios")}
          </BotaoDaCasca>
          {gerenciarHref ? (
            <Link
              href={gerenciarHref}
              title={t("Configure quais campos aparecem e em que ordem")}
              className={cn(
                "inline-flex h-7 items-center gap-1.5 rounded-casca-gatilho px-2 text-xs font-medium text-casca-texto-2 hover:bg-casca-raia [&_svg]:size-3.5",
                BOTAO_DA_FAIXA,
              )}
            >
              <Settings aria-hidden />
              {t("Gerenciar campos")}
            </Link>
          ) : (
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              disabled
              title={gerenciarHref === null ? t("Só quem administra a conta gerencia os campos.") : t("Em breve")}
              className={cn(BOTAO_DA_FAIXA, EM_BREVE)}
            >
              <Settings aria-hidden />
              {t("Gerenciar campos")}
            </BotaoDaCasca>
          )}
        </div>
      </div>
      <div className="mt-4 flex rounded-lg border border-casca-borda">
        <nav aria-label={t("Grupos de campos")} className="w-[238px] shrink-0 border-r border-casca-borda p-2">
          <span
            aria-current="true"
            className="flex h-9 items-center rounded-md border-l-2 border-casca-marca bg-casca-raia px-3 text-[13px] font-semibold text-casca-texto"
          >
            {t("Informações Gerais")}
          </span>
        </nav>
        <div className="min-w-0 flex-1">
          <div className="border-b border-casca-borda p-4">
            <span className="relative inline-block">
              <input
                type="search"
                aria-label={t("Pesquisar campos...")}
                placeholder={t("Pesquisar campos...")}
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                className="h-8 w-[166px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
              />
              <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
            </span>
          </div>
          {visiveis.length === 0 ? (
            <p className="px-9 py-6 text-[13px] text-casca-suave">{t("Nenhum campo encontrado")}</p>
          ) : (
            <dl className="px-9 py-4">
              {visiveis.map((c) => (
                <div
                  key={c.chave}
                  className="grid grid-cols-[275px_1fr] items-center border-b border-casca-borda py-2 last:border-b-0"
                >
                  <dt className="text-[13px] font-medium text-casca-texto">
                    {c.rotulo}
                    {c.obrigatorioNaEtapa ? (
                      <span className="ml-1 text-[11px] text-destructive">{t("Campo obrigatório nesta etapa")}</span>
                    ) : null}
                  </dt>
                  <dd>
                    {aoSalvar ? (
                      <EditorDeCampo campo={c} moeda={moeda} aoSalvar={(valor) => aoSalvar(c.chave, valor)} />
                    ) : (
                      <CaixaSoLeitura campo={c} />
                    )}
                  </dd>
                </div>
              ))}
            </dl>
          )}
          {ocultarVazios ? (
            <p className="px-9 pb-4">
              <span
                className="cursor-help text-[12px] text-casca-marca"
                title={t(
                  'Os campos vazios estão sendo ocultados. Você pode clicar no canto superior direito dessa aba para "Mostrar campos vazios".',
                )}
              >
                {t("Porque não vejo alguns campos?")}
              </span>
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

/** A caixa da 1G (só leitura), usada onde ainda não se edita (Empresa, Q2). */
function CaixaSoLeitura({ campo }: { campo: CampoEditavel }) {
  const t = useT();
  const texto = valorParaLeitura(campo.tipo, campo.opcoes, campo.valor, t);
  const lista = campo.tipo === "select" || campo.tipo === "multiselect";
  return (
    <div
      title={texto ? undefined : t("Em breve")}
      className={cn(
        "flex h-8 items-center justify-between rounded-md bg-casca-busca px-3 text-[13px]",
        texto ? "text-casca-texto" : "text-casca-meta",
      )}
    >
      <span className="truncate">{texto ?? t("Clique aqui para adicionar")}</span>
      {lista ? <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-suave" /> : null}
    </div>
  );
}
```

- [ ] **Step 4: A aba Negócio (e a Empresa no tipo novo)**

Em `components/escale/negocio/abas/AbasDeCampos.tsx`, troque os imports e as funções `AbaEmpresa` e `AbaNegocio` (deixe `AbaContato` como está até a Task 4; apague a função `paraLeitura`, que vira `valorParaLeitura` da Task 1):

```tsx
"use client";
import { useCallback } from "react";
import { toast } from "sonner";

import { usePermission } from "@/hooks/auth/AuthProvider";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { dadosDeFiltro } from "@/lib/escale/filtros/dados-do-quadro";
import type { CampoEditavel } from "@/lib/escale/negocio/campos";
import type { Pipeline } from "@/lib/kanban/types";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { MOEDA_PADRAO } from "@/lib/money";
import { camposVisiveis } from "@/lib/schemas/mostrar-quando";
import type { Lead } from "@/lib/types/leads";
import { Building2, Target, User } from "@/lib/ui/icons-da-casca";

import { CamposDaFicha, ROTA_DE_GERENCIAR_CAMPOS } from "./CamposDaFicha";

/** FORK ESCALE · Fases 1G e 1H (C2, C10, C14): as abas de campos (prints 02 a 04). */

const CHAVE_DO_VALOR = "valor";

/** Os oito campos da empresa na Clint (print 03). A empresa do negócio é da Fase 2 (Q2). */
const CAMPOS_DA_EMPRESA = [
  "Nome da empresa",
  "Site",
  "Cidade",
  "Estado",
  "Categoria",
  "Segmento",
  "Número de funcionários",
  "CNPJ",
] as const;

export function AbaEmpresa() {
  const t = useT();
  const campos: CampoEditavel[] = CAMPOS_DA_EMPRESA.map((rotulo) => ({
    chave: rotulo,
    rotulo: t(rotulo),
    tipo: "text",
    valor: null,
  }));
  return (
    <CamposDaFicha icone={<Building2 size={16} />} titulo={t("Campos de empresa")} tipo="empresa" campos={campos} />
  );
}

/** As definições do CRM (1F-a) como campos editáveis, já sem os condicionais escondidos. */
export function camposDoCrm(pipeline: Pipeline, valores: Record<string, unknown>): CampoEditavel[] {
  const defs = camposDoFunil(pipeline.settings ?? null);
  return camposVisiveis(defs, valores).map((def) => ({
    chave: def.key,
    rotulo: def.label,
    tipo: def.type,
    valor: valores[def.key],
    opcoes: def.options,
  }));
}

export function AbaNegocio({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const administra = usePermission("settings.write");
  const editar = useEditLead(pipeline.id);
  const moeda = lead.currency ?? MOEDA_PADRAO;
  const campos: CampoEditavel[] = [
    {
      chave: CHAVE_DO_VALOR,
      rotulo: t("Valor"),
      tipo: "currency",
      valor: lead.value_cents == null ? null : lead.value_cents / 100,
    },
    ...camposDoCrm(pipeline, lead.custom_fields ?? {}),
  ];

  const aoSalvar = useCallback(
    async (chave: string, valor: unknown) => {
      // `custom_fields` é mesclado no banco (fn_lead_anotar_campos): vai só a chave que mudou.
      const patch =
        chave === CHAVE_DO_VALOR
          ? { value_cents: valor == null ? null : Math.round(Number(valor) * 100) }
          : { custom_fields: { [chave]: valor } };
      try {
        await editar.mutateAsync({ leadId: lead.id, patch });
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [editar, lead.id, t],
  );

  return (
    <CamposDaFicha
      icone={<Target size={16} />}
      titulo={t("Campos de negócio")}
      tipo="negocio"
      campos={campos}
      moeda={moeda}
      aoSalvar={aoSalvar}
      gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
    />
  );
}
```

Mantenha o `export function AbaContato` da 1G neste arquivo (com `CampoDaFicha` trocado por `CampoEditavel` e `tipo: "text"` em cada campo; `lista` sai) até a Task 4 reescrevê-la. `camposVisiveis` é genérico em `{ key; mostrar_quando? }`: se o tipo `CustomFieldDef` do `CustomFieldsEditor` não casar, passe `defs as Array<{ key: string; mostrar_quando?: unknown }>` só no filtro e mapeie pela lista original pelos `key`s que sobraram.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/campo-condicional-nos-pontos-de-renderizacao.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm eslint components/escale/negocio/abas/CamposDaFicha.tsx components/escale/negocio/abas/AbasDeCampos.tsx && export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck`
Expected: PASS; typecheck limpo. O teste da ficha inteira (`escale-ficha-do-negocio.test.tsx`) monta a aba Negócio por dentro: se ele quebrar por falta do mock de `useEditLead`/`usePermission`, acrescente lá os mesmos dois mocks deste arquivo.

- [ ] **Step 6: Revisor (G1).** Dispare o `code-reviewer` com o diff desta task e a pergunta: "o PATCH do negócio manda só a chave alterada; o Valor vai em centavos inteiros; o condicional escondido não aparece e não é gravado; o Gerenciar campos só liga para quem tem `settings.write`?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 7: Commit**

```bash
git add components/escale/negocio/abas/CamposDaFicha.tsx components/escale/negocio/abas/AbasDeCampos.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): aba Negócio editável, com busca, vazios e Gerenciar campos (Fase 1H, C14)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 4: A aba Contato editável (C10)

**Files:**
- Create: `hooks/escale/useGravarContato.ts`, `tests/unit/escale-ficha-gravar-contato.test.tsx`
- Modify: `components/escale/negocio/abas/AbasDeCampos.tsx` (`AbaContato`), `components/escale/negocio/ConteudoDaAba.tsx` (`case "contato": return <AbaContato lead={ficha.lead} pipeline={ficha.pipeline} />;`), `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` (o `describe` de Contato)

**Interfaces:**
- Consumes: `useContact(id)` (`hooks/contacts/useContact`, `{ data?: { data: Contact } }`); `useUpdateContact(id)` (`mutateAsync(patch: ContactPatch)`); `chaveDoQuadro(pipelineId)` (`hooks/kanban/useBoard`); `patchDoContato`, `CHAVE_NOME`, `CHAVE_TELEFONE`, `CHAVE_EMAIL` (Task 1); `TIPOS_DE_LINK`, `chaveDoLink`, `lerLinks` (`lib/leads/links-de-contato`); `phoneForDisplay` (`lib/channels/phone-variants`); `camposDoCrm` (Task 3).
- Produces: `useGravarContato(contactId, pipelineId)` → `{ gravar: (patch: ContactPatch) => Promise<void> }` (invalida `["contact", id]` pelo próprio `useUpdateContact`, mais `chaveDoQuadro(pipelineId)` e `["timeline", …]`); `AbaContato({ lead, pipeline })` editável.

**Detalhes visuais (print 02):** as linhas Nome, Telefone, Email, depois os links (rótulo legível de `TIPOS_DE_LINK`, por exemplo "Instagram", "Site") e os campos do CRM. A Clint mostra "Whatsapp" e "Telefone" (com "BR ▾"); aqui só "Telefone", sem o seletor de país (desvio registrado; o DDI vai no texto).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-ficha-gravar-contato.test.tsx`:

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const atualizar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({ data: {} })) }));
vi.mock("@/hooks/contacts/useUpdateContact", () => ({ useUpdateContact: () => ({ mutateAsync: atualizar.mutateAsync }) }));

import { useGravarContato } from "@/hooks/escale/useGravarContato";

/** FORK ESCALE · Fase 1H (N4): gravar o contato invalida o quadro, que é de onde a ficha lê. */
describe("useGravarContato", () => {
  it("manda o patch e invalida o quadro da origem e a linha do tempo", async () => {
    const qc = new QueryClient();
    const invalidar = vi.spyOn(qc, "invalidateQueries");
    const wrapper = ({ children }: { children: ReactNode }) => (
      <QueryClientProvider client={qc}>{children}</QueryClientProvider>
    );
    const { result } = renderHook(() => useGravarContato("c1", "o1"), { wrapper });
    await result.current.gravar({ name: "Ana" });
    expect(atualizar.mutateAsync).toHaveBeenCalledWith({ name: "Ana" });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["board", "o1"] });
    expect(invalidar).toHaveBeenCalledWith({ queryKey: ["timeline"] });
  });
});
```

Em `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`, acrescente os mocks:

```tsx
const contato = vi.hoisted(() => ({
  data: {
    data: {
      id: "c1",
      name: "Ana",
      email: "ana@b.co",
      phone_number: "+5543998031566",
      tags: ["vip"],
      custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana" },
    },
  },
  isLoading: false,
}));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => contato }));
const gravar = vi.hoisted(() => ({ gravar: vi.fn(async () => undefined) }));
vi.mock("@/hooks/escale/useGravarContato", () => ({ useGravarContato: () => gravar }));
```

E troque o `describe` da aba Contato (se existir; senão, crie) por:

```tsx
describe("aba Contato (print 02, C10)", () => {
  beforeEach(() => gravar.gravar.mockClear());

  it("Nome, Telefone (para exibição), Email, os links e os campos do CRM, cada um num input", () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    expect(screen.getByRole("heading", { name: "Campos de contato" })).toBeInTheDocument();
    expect(screen.getByRole("textbox", { name: "Nome" })).toHaveValue("Ana");
    expect(screen.getByRole("textbox", { name: "Telefone" })).toHaveValue("+55 43 99803-1566");
    expect(screen.getByRole("textbox", { name: "Email" })).toHaveValue("ana@b.co");
    expect(screen.getByRole("textbox", { name: "Instagram" })).toHaveValue("https://instagram.com/ana");
    expect(screen.getByRole("textbox", { name: "Site" })).toHaveValue("");
    expect(screen.getByRole("textbox", { name: "Notas" })).toHaveValue("");
  });

  it("editar o nome grava name; um campo do CRM grava custom_fields INTEIRO; o telefone vai canônico", async () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    const nome = screen.getByRole("textbox", { name: "Nome" });
    await userEvent.clear(nome);
    await userEvent.type(nome, "Ana Nunes{Enter}");
    expect(gravar.gravar).toHaveBeenCalledWith({ name: "Ana Nunes" });
    await userEvent.type(screen.getByRole("textbox", { name: "Notas" }), "VIP{Enter}");
    expect(gravar.gravar).toHaveBeenLastCalledWith({
      custom_fields: { cargo: "CEO", link_instagram: "https://instagram.com/ana", notas: "VIP" },
    });
    const tel = screen.getByRole("textbox", { name: "Telefone" });
    await userEvent.clear(tel);
    await userEvent.type(tel, "(43) 3222-3344{Enter}");
    expect(gravar.gravar).toHaveBeenLastCalledWith({ phone_number: "+554332223344" });
  });

  it("apagar o e-mail não grava e explica (Q4)", async () => {
    render(<AbaContato lead={LEAD} pipeline={PIPELINE} />);
    await userEvent.clear(screen.getByRole("textbox", { name: "Email" }));
    await userEvent.keyboard("{Enter}");
    expect(gravar.gravar).not.toHaveBeenCalled();
    expect(screen.getByText("Para apagar o e-mail, use a ficha do contato.")).toBeInTheDocument();
  });

  it("negócio sem contato: a moldura só leitura com o aviso", () => {
    render(<AbaContato lead={{ ...LEAD, contact_id: null } as Lead} pipeline={PIPELINE} />);
    expect(screen.getByText("Este negócio não tem contato.")).toBeInTheDocument();
    expect(screen.queryByRole("textbox", { name: "Nome" })).toBeNull();
  });
});
```

Confira o formato que `phoneForDisplay` devolve (`lib/channels/phone-variants.ts:80`) e ajuste o valor esperado do Telefone ao formato real.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-gravar-contato.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx`
Expected: FAIL (hook não existe; a aba ainda é só leitura).

- [ ] **Step 3: O hook**

Create `hooks/escale/useGravarContato.ts`:

```ts
"use client";
import { useQueryClient } from "@tanstack/react-query";
import { useCallback } from "react";

import { useUpdateContact } from "@/hooks/contacts/useUpdateContact";
import { chaveDoQuadro } from "@/hooks/kanban/useBoard";
import type { ContactPatch } from "@/lib/schemas/contacts";

/**
 * GRAVAR O CONTATO PELA FICHA DO NEGÓCIO (fork Escale, Fase 1H; N4).
 *
 * O `useUpdateContact` do original invalida o contato, a lista e as conversas,
 * mas não o quadro — e a ficha lê o nome, o telefone, o e-mail e os links do
 * cache do quadro (`["board", origem]`). O precedente é o `FormularioDeLinks`
 * do dossiê. A linha do tempo também, porque o PATCH grava `contact.updated`.
 */
export function useGravarContato(contactId: string, pipelineId: string) {
  const qc = useQueryClient();
  const atualizar = useUpdateContact(contactId);
  const gravar = useCallback(
    async (patch: ContactPatch) => {
      await atualizar.mutateAsync(patch);
      await Promise.all([
        qc.invalidateQueries({ queryKey: chaveDoQuadro(pipelineId) }),
        qc.invalidateQueries({ queryKey: ["timeline"] }),
      ]);
    },
    [atualizar, qc, pipelineId],
  );
  return { gravar };
}
```

- [ ] **Step 4: A aba**

Em `components/escale/negocio/abas/AbasDeCampos.tsx`, troque a `AbaContato` por:

```tsx
export function AbaContato({ lead, pipeline }: { lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  if (!lead.contact_id) {
    return (
      <>
        <CamposDaFicha icone={<User size={16} />} titulo={t("Campos de contato")} tipo="contato" campos={[]} />
        <p className="px-4 text-[13px] text-casca-suave">{t("Este negócio não tem contato.")}</p>
      </>
    );
  }
  return <ContatoEditavel contactId={lead.contact_id} lead={lead} pipeline={pipeline} />;
}

function ContatoEditavel({ contactId, lead, pipeline }: { contactId: string; lead: Lead; pipeline: Pipeline }) {
  const t = useT();
  const administra = usePermission("settings.write");
  const { data } = useContact(contactId);
  const { gravar } = useGravarContato(contactId, pipeline.id);
  const contato = data?.data ?? null;
  const camposDoContato = contato?.custom_fields ?? {};
  const links = lerLinks(camposDoContato);

  const campos: CampoEditavel[] = [
    { chave: CHAVE_NOME, rotulo: t("Nome"), tipo: "text", valor: contato?.name ?? dadosDeFiltro(lead)?.contato_nome ?? null },
    {
      chave: CHAVE_TELEFONE,
      rotulo: t("Telefone"),
      tipo: "phone",
      valor: phoneForDisplay(contato?.phone_number ?? lead.contact_phone) || null,
    },
    { chave: CHAVE_EMAIL, rotulo: t("Email"), tipo: "email", valor: contato?.email ?? lead.contact_email ?? null },
    ...TIPOS_DE_LINK.map((tipo) => ({
      chave: chaveDoLink(tipo.id),
      rotulo: t(tipo.rotulo),
      tipo: "url" as const,
      valor: links[tipo.id] ?? null,
    })),
    ...camposDoCrm(pipeline, camposDoContato),
  ];

  const aoSalvar = useCallback(
    async (chave: string, valor: unknown) => {
      if (chave === CHAVE_EMAIL && valor == null) throw new Error(t("Para apagar o e-mail, use a ficha do contato."));
      if (chave === CHAVE_TELEFONE && valor == null) throw new Error(t("Para apagar o telefone, use a ficha do contato."));
      const patch = patchDoContato({ custom_fields: camposDoContato }, chave, valor);
      if (!patch) return;
      try {
        await gravar(patch);
        toast.success(t("As alterações foram salvas com sucesso."));
      } catch {
        throw new Error(t("Ocorreu um erro ao salvar o campo"));
      }
    },
    [camposDoContato, gravar, t],
  );

  return (
    <CamposDaFicha
      icone={<User size={16} />}
      titulo={t("Campos de contato")}
      tipo="contato"
      campos={campos}
      aoSalvar={aoSalvar}
      gerenciarHref={administra ? ROTA_DE_GERENCIAR_CAMPOS : null}
    />
  );
}
```

Em `components/escale/negocio/ConteudoDaAba.tsx`, a aba passa a receber a origem: `case "contato": return <AbaContato lead={ficha.lead} pipeline={ficha.pipeline} />;`.

Imports a acrescentar no topo do arquivo: `useContact` de `@/hooks/contacts/useContact`; `useGravarContato` de `@/hooks/escale/useGravarContato`; `CHAVE_EMAIL`, `CHAVE_NOME`, `CHAVE_TELEFONE`, `patchDoContato` de `@/lib/escale/negocio/campos`; `TIPOS_DE_LINK`, `chaveDoLink`, `lerLinks` de `@/lib/leads/links-de-contato`; `phoneForDisplay` de `@/lib/channels/phone-variants`. O `useUpdateContact` do original já mostra o toast de erro (`showApiError`); o nosso erro embaixo do campo é o texto da Clint.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-gravar-contato.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/campo-condicional-nos-pontos-de-renderizacao.test.ts && corepack pnpm prettier --write hooks/escale/useGravarContato.ts tests/unit/escale-ficha-gravar-contato.test.tsx && corepack pnpm eslint hooks/escale/useGravarContato.ts components/escale/negocio/abas/AbasDeCampos.tsx && corepack pnpm typecheck`
Expected: PASS; typecheck limpo. Se `escale-ficha-do-negocio.test.tsx` montar a aba Contato, acrescente lá os mocks de `useContact` e `useGravarContato`.

- [ ] **Step 6: Commit**

```bash
git add hooks/escale/useGravarContato.ts components/escale/negocio/abas/AbasDeCampos.tsx components/escale/negocio/ConteudoDaAba.tsx tests/unit/escale-ficha-gravar-contato.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): aba Contato editável na ficha do negócio (Fase 1H, C10)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 5: O lápis do nome e "+ Adicionar tags" (C10)

**Files:**
- Create: `components/escale/negocio/NomeDaFicha.tsx`, `components/escale/negocio/TagsDaFicha.tsx`, `tests/unit/escale-ficha-nome-e-tags.test.tsx`
- Modify: `components/escale/negocio/CabecalhoDaFicha.tsx`, `components/escale/negocio/AcoesDaFicha.tsx`, `components/escale/negocio/FichaDoNegocio.tsx`, `tests/unit/escale-ficha-do-negocio.test.tsx`, `tests/unit/escale-ficha-acoes-e-menu.test.tsx`

**Interfaces:**
- Consumes: `useGravarContato` (Task 4); `useEditLead` (negócio sem contato); `useContact`; `useContactTagVocabulary(orgId)` (`hooks/contacts/useContactTagVocabulary`, `string[]`); `useActiveOrg()` (`orgId`); `normalizarTags` (`lib/contacts/tag-normalizada`); `ChipDeEtiqueta` (`components/tags/ChipDeEtiqueta`, prop `tag`); `PainelSuspenso`, `Popover`/`PopoverTrigger`; `AlertDialog*` (`components/ui/alert-dialog`); `MAX_TAGS_DO_CONTATO` (Task 1); `tituloDoCard`.
- Produces: `NomeDaFicha({ lead, pipelineId })` (o `h1` + lápis, ou o input com ✓ e ✕); `TagsDaFicha({ lead, pipelineId })` (os chips e o "+ Adicionar tags").
- `CabecalhoDaFicha` e `AcoesDaFicha` ganham a prop `pipelineId: string`, que `FichaDoNegocio` passa (`ficha.pipeline.id`).

**Detalhes visuais (print 01, código da Clint):** o nome em 15px com o lápis de 12px; clicado, vira um input de 200×28px (fundo `casca-busca`, 15px) com o placeholder "Nome do contato", e à direita ✓ (`Check`, cor da marca) e ✕ (`X`, `casca-suave`), 24px cada. Tags: na linha de ações, depois dos ícones e de um respiro de 16px, os chips (`ChipDeEtiqueta`, com um × de 12px dentro) e o botão "+ Adicionar tags" (ghost, 12–13px, `casca-texto-2`); com tags, só o "+" (`BotaoDaCasca` ícone, 24px). O painel (`PainelSuspenso`, 260px): busca "Adicione uma tag" (32px), lista das que faltam (itens de 34px), e "Criar «texto»" quando não há correspondência; "Nenhuma tag correspondente" quando a busca não acha e o texto já existe. Sem print do painel (print que falta 4).

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-ficha-nome-e-tags.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useActiveOrg: () => ({ orgId: "org1" }) }));
const contato = vi.hoisted(() => ({ data: { data: { id: "c1", name: "Ana", tags: ["vip"], custom_fields: {} } } }));
vi.mock("@/hooks/contacts/useContact", () => ({ useContact: () => contato }));
const gravar = vi.hoisted(() => ({ gravar: vi.fn(async () => undefined) }));
vi.mock("@/hooks/escale/useGravarContato", () => ({ useGravarContato: () => gravar }));
const editar = vi.hoisted(() => ({ mutateAsync: vi.fn(async () => ({})) }));
vi.mock("@/hooks/kanban/useUpdateLead", () => ({ useEditLead: () => ({ mutateAsync: editar.mutateAsync }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({
  useContactTagVocabulary: () => ({ data: ["vip", "quente", "frio"] }),
}));

import { NomeDaFicha } from "@/components/escale/negocio/NomeDaFicha";
import { TagsDaFicha } from "@/components/escale/negocio/TagsDaFicha";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C10): o lápis do nome e "+ Adicionar tags", como na Clint. */
const LEAD = {
  id: "n1",
  contact_id: "c1",
  title: "Ana | Nunes Regularize",
  contact_tags: ["vip"],
  filtros_escale: { contato_nome: "Ana | Nunes Regularize" },
} as unknown as Lead;

beforeEach(() => {
  gravar.gravar.mockClear();
  editar.mutateAsync.mockClear();
});

describe("o nome (N5)", () => {
  it("o lápis abre o input com o nome; Enter grava o nome do contato; Esc cancela", async () => {
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    expect(screen.getByRole("heading", { level: 1, name: "Ana | Nunes Regularize" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    const input = screen.getByRole("textbox", { name: "Nome do contato" });
    expect(input).toHaveValue("Ana | Nunes Regularize");
    expect(input).toHaveAttribute("maxlength", "80");
    await userEvent.clear(input);
    await userEvent.type(input, "Ana Nunes{Enter}");
    expect(gravar.gravar).toHaveBeenCalledWith({ name: "Ana Nunes" });
    expect(await screen.findByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "X{Escape}");
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(gravar.gravar).toHaveBeenCalledTimes(1);
  });

  it("vazio ou igual só cancela; ✓ e ✕ têm os nomes da Clint", async () => {
    render(<NomeDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    expect(screen.getByRole("button", { name: "Salvar nome" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar nome" }));
    expect(gravar.gravar).not.toHaveBeenCalled();
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Nome do contato" }));
    await userEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(gravar.gravar).not.toHaveBeenCalled();
  });

  it("negócio sem contato grava o título do negócio", async () => {
    render(<NomeDaFicha lead={{ ...LEAD, contact_id: null, filtros_escale: {} } as unknown as Lead} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Editar nome" }));
    await userEvent.clear(screen.getByRole("textbox", { name: "Nome do contato" }));
    await userEvent.type(screen.getByRole("textbox", { name: "Nome do contato" }), "Obra 12{Enter}");
    expect(editar.mutateAsync).toHaveBeenCalledWith({ leadId: "n1", patch: { title: "Obra 12" } });
  });
});

describe("as tags (N6)", () => {
  it("mostra os chips do contato e o '+'; sem tags, '+ Adicionar tags'", () => {
    const { unmount } = render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    expect(screen.getByText("vip")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Adicionar tags" })).toBeInTheDocument();
    expect(screen.queryByText("+ Adicionar tags")).toBeNull();
    unmount();
    contato.data.data.tags = [];
    render(<TagsDaFicha lead={{ ...LEAD, contact_tags: [] } as unknown as Lead} pipelineId="o1" />);
    expect(screen.getByRole("button", { name: "+ Adicionar tags" })).toBeInTheDocument();
    contato.data.data.tags = ["vip"];
  });

  it("o painel lista as tags que faltam; escolher uma grava a lista inteira", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    const painel = await screen.findByRole("listbox", { name: "Adicione uma tag" });
    expect(within(painel).queryByRole("option", { name: "vip" })).toBeNull();
    await userEvent.click(within(painel).getByRole("option", { name: "quente" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: ["vip", "quente"] });
  });

  it("texto sem correspondência oferece 'Criar «texto»', normalizado", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Adicionar tags" }));
    await userEvent.type(await screen.findByRole("searchbox", { name: "Adicione uma tag" }), "  Morno ");
    await userEvent.click(screen.getByRole("option", { name: "Criar «morno»" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: ["vip", "morno"] });
  });

  it("o × do chip pede confirmação e grava sem a tag", async () => {
    render(<TagsDaFicha lead={LEAD} pipelineId="o1" />);
    await userEvent.click(screen.getByRole("button", { name: "Remover a tag vip" }));
    expect(await screen.findByText("Deseja remover esta tag do contato?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(gravar.gravar).toHaveBeenCalledWith({ tags: [] });
  });

  it("negócio sem contato: o botão fica desligado", () => {
    render(<TagsDaFicha lead={{ ...LEAD, contact_id: null } as unknown as Lead} pipelineId="o1" />);
    const botao = screen.getByRole("button", { name: "+ Adicionar tags" });
    expect(botao).toBeDisabled();
    expect(botao).toHaveAttribute("title", "Este negócio não tem contato.");
  });
});
```

Em `tests/unit/escale-ficha-do-negocio.test.tsx`, troque o `it("o cabeçalho: nome e lápis desligado (editar é 1H)")` por:

```tsx
  it("o cabeçalho: nome e o lápis ligado", () => {
    render(<FichaDoNegocio {...PROPS} />);
    expect(screen.getByRole("heading", { level: 1, name: "Ana | Nunes Regularize" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar nome" })).toBeEnabled();
  });
```

e acrescente os mocks de `useContact`, `useGravarContato`, `useContactTagVocabulary` e `useEditLead` (os mesmos do arquivo novo) se o teste ainda não os tiver. Em `tests/unit/escale-ficha-acoes-e-menu.test.tsx`, o `it` que pinava "+ Adicionar tags" desligado passa a esperar `screen.getByRole("button", { name: /Adicionar tags/ })` ligado (com os mesmos mocks).

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-nome-e-tags.test.tsx`
Expected: FAIL (módulos não existem).

- [ ] **Step 3: O nome**

Create `components/escale/negocio/NomeDaFicha.tsx`:

```tsx
"use client";
import { useState, type KeyboardEvent } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { useEditLead } from "@/hooks/kanban/useUpdateLead";
import { tituloDoCard } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { Check, Pencil, X } from "@/lib/ui/icons-da-casca";

/**
 * O NOME NO CABEÇALHO DA FICHA (fork Escale, Fase 1H; N5; print 01).
 *
 * Como na Clint: o lápis ("Editar nome") abre um input de 200px, até 80
 * caracteres, "Nome do contato"; ✓ "Salvar nome" e ✕; Enter salva, Esc
 * cancela; vazio ou igual só cancela. Grava o NOME DO CONTATO (é ele que o
 * card e o cabeçalho mostram); em negócio sem contato, o título do negócio.
 */
const MAX_NOME = 80;

export function NomeDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const atual = tituloDoCard(lead);
  const [editando, setEditando] = useState(false);
  const [texto, setTexto] = useState(atual);
  const [salvando, setSalvando] = useState(false);
  const { gravar } = useGravarContato(lead.contact_id ?? "", pipelineId);
  const editarNegocio = useEditLead(pipelineId);

  function abrir() {
    setTexto(atual);
    setEditando(true);
  }
  function cancelar() {
    setEditando(false);
  }
  async function salvar() {
    const nome = texto.trim();
    if (!nome || nome === atual) return cancelar();
    setSalvando(true);
    try {
      if (lead.contact_id) await gravar({ name: nome });
      else await editarNegocio.mutateAsync({ leadId: lead.id, patch: { title: nome } });
      toast.success(t("Nome atualizado."));
      setEditando(false);
    } catch {
      toast.error(t("Não foi possível atualizar o nome. Tente novamente."));
    } finally {
      setSalvando(false);
    }
  }
  function tecla(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter") {
      e.preventDefault();
      void salvar();
    }
    if (e.key === "Escape") {
      e.preventDefault();
      cancelar();
    }
  }

  if (!editando) {
    return (
      <div className="flex min-w-0 items-center gap-[3px]">
        <h1 className="truncate text-[15px] font-normal text-casca-texto">{atual}</h1>
        <BotaoDaCasca
          variante="icone"
          tamanho="sm"
          aria-label={t("Editar nome")}
          title={t("Editar nome")}
          onClick={abrir}
          className="[&_svg]:size-3!"
        >
          <Pencil aria-hidden />
        </BotaoDaCasca>
      </div>
    );
  }
  return (
    <div className="flex items-center gap-1">
      <input
        autoFocus
        aria-label={t("Nome do contato")}
        placeholder={t("Nome do contato")}
        maxLength={MAX_NOME}
        value={texto}
        disabled={salvando}
        onChange={(e) => setTexto(e.target.value)}
        onKeyDown={tecla}
        className="h-7 w-[200px] rounded-md bg-casca-busca px-2 text-[15px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
      />
      <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Salvar nome")} disabled={salvando} onClick={() => void salvar()} className="text-casca-marca">
        <Check aria-hidden />
      </BotaoDaCasca>
      <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Cancelar")} disabled={salvando} onClick={cancelar}>
        <X aria-hidden />
      </BotaoDaCasca>
    </div>
  );
}
```

Em `components/escale/negocio/CabecalhoDaFicha.tsx`: a prop vira `{ lead, pipelineId, direita }`; o bloco `<div className="flex min-w-0 items-center gap-[3px]">…</div>` (o `h1` e o lápis desligado) é trocado por `<NomeDaFicha lead={lead} pipelineId={pipelineId} />`; saem os imports de `BotaoDaCasca`, `tituloDoCard`, `Pencil` e `useT` se ficarem sem uso. Em `FichaDoNegocio.tsx`, `<CabecalhoDaFicha lead={ficha.lead} pipelineId={ficha.pipeline.id} … />`.

- [ ] **Step 4: As tags**

Create `components/escale/negocio/TagsDaFicha.tsx`:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { ChipDeEtiqueta } from "@/components/tags/ChipDeEtiqueta";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useActiveOrg } from "@/hooks/auth/AuthProvider";
import { useContact } from "@/hooks/contacts/useContact";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useGravarContato } from "@/hooks/escale/useGravarContato";
import { useT } from "@/hooks/i18n/useT";
import { normalizarTag } from "@/lib/contacts/tag-normalizada";
import { MAX_TAGS_DO_CONTATO } from "@/lib/escale/negocio/campos";
import type { Lead } from "@/lib/types/leads";
import { Plus, Search, X } from "@/lib/ui/icons-da-casca";

/**
 * AS TAGS DO CONTATO NO CABEÇALHO (fork Escale, Fase 1H; N6; print 01).
 *
 * Como na Clint: sem tags, "+ Adicionar tags"; com tags, os chips e só o "+".
 * O painel lista as tags do vocabulário que faltam e oferece "Criar «texto»"
 * quando não há correspondência. O × do chip pede confirmação. As tags são do
 * CONTATO (`contacts.tags`, `text[]`), gravadas inteiras pelo PATCH do contato.
 */
export function TagsDaFicha({ lead, pipelineId }: { lead: Lead; pipelineId: string }) {
  const t = useT();
  const org = useActiveOrg();
  const contactId = lead.contact_id ?? "";
  const { data } = useContact(contactId);
  const { gravar } = useGravarContato(contactId, pipelineId);
  const vocabulario = useContactTagVocabulary(org?.orgId ?? null).data ?? [];
  const tags = data?.data?.tags ?? lead.contact_tags ?? [];
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const [removendo, setRemovendo] = useState<string | null>(null);

  const termo = normalizarTag(busca);
  const faltam = useMemo(
    () => vocabulario.filter((v) => !tags.includes(v) && (!termo || v.includes(termo))),
    [vocabulario, tags, termo],
  );
  const podeCriar = termo !== "" && !vocabulario.includes(termo) && !tags.includes(termo);

  async function gravarTags(novas: string[]) {
    try {
      await gravar({ tags: novas });
      toast.success(t("As alterações foram salvas com sucesso."));
    } catch {
      toast.error(t("Ocorreu um erro ao salvar o campo"));
    }
  }
  async function adicionar(tag: string) {
    setAberto(false);
    setBusca("");
    if (tags.length >= MAX_TAGS_DO_CONTATO) return toast.error(t("O contato já tem o máximo de 20 tags."));
    await gravarTags([...tags, tag]);
  }

  const semContato = !lead.contact_id;
  const gatilho = tags.length ? (
    <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Adicionar tags")} title={t("Adicionar tags")} disabled={semContato}>
      <Plus aria-hidden />
    </BotaoDaCasca>
  ) : (
    <BotaoDaCasca
      variante="texto"
      tamanho="sm"
      disabled={semContato}
      title={semContato ? t("Este negócio não tem contato.") : undefined}
      className="disabled:pointer-events-auto disabled:cursor-not-allowed"
    >
      {t("+ Adicionar tags")}
    </BotaoDaCasca>
  );

  return (
    <div className="ml-4 flex min-w-0 items-center gap-2">
      <ul className="flex min-w-0 flex-wrap items-center gap-1.5">
        {tags.map((tag) => (
          <li key={tag} className="flex items-center">
            <ChipDeEtiqueta tag={tag} />
            <button
              type="button"
              aria-label={`${t("Remover a tag")} ${tag}`}
              onClick={() => setRemovendo(tag)}
              className="-ml-1 grid size-4 place-items-center rounded-full text-casca-suave hover:text-casca-texto"
            >
              <X size={12} aria-hidden />
            </button>
          </li>
        ))}
      </ul>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>{gatilho}</PopoverTrigger>
        <PainelSuspenso className="w-[260px] p-2">
          <span className="relative block">
            <input
              type="search"
              autoFocus
              aria-label={t("Adicione uma tag")}
              placeholder={t("Adicione uma tag")}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && podeCriar) void adicionar(termo);
              }}
              className="h-8 w-full rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
            />
            <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
          </span>
          <ul role="listbox" aria-label={t("Adicione uma tag")} className="mt-2 max-h-[240px] overflow-y-auto">
            {faltam.map((tag) => (
              <li key={tag}>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void adicionar(tag)}
                  className="flex h-[34px] w-full items-center rounded-md px-2 text-left text-[11px] text-casca-texto hover:bg-casca-marca-suave"
                >
                  {tag}
                </button>
              </li>
            ))}
            {podeCriar ? (
              <li>
                <button
                  type="button"
                  role="option"
                  aria-selected={false}
                  onClick={() => void adicionar(termo)}
                  className="flex h-[34px] w-full items-center gap-2 rounded-md px-2 text-left text-[11px] text-casca-marca hover:bg-casca-marca-suave"
                >
                  {`${t("Criar")} «${termo}»`}
                </button>
              </li>
            ) : null}
            {faltam.length === 0 && !podeCriar ? (
              <li className="px-2 py-3 text-[11px] text-casca-suave">{t("Nenhuma tag correspondente")}</li>
            ) : null}
          </ul>
        </PainelSuspenso>
      </Popover>
      <AlertDialog open={removendo !== null} onOpenChange={(a) => !a && setRemovendo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Deseja remover esta tag do contato?")}</AlertDialogTitle>
            <AlertDialogDescription>{removendo}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                const tag = removendo;
                setRemovendo(null);
                if (tag) void gravarTags(tags.filter((x) => x !== tag));
              }}
            >
              {t("Remover")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
```

Em `components/escale/negocio/AcoesDaFicha.tsx` (1G PR B): a prop vira `{ lead, pipelineId }`; o botão "+ Adicionar tags" desligado ("Em breve") é trocado por `<TagsDaFicha lead={lead} pipelineId={pipelineId} />`. Em `FichaDoNegocio.tsx`, passe `pipelineId={ficha.pipeline.id}` à `AcoesDaFicha`. Se a `AcoesDaFicha` da 1G tiver outro desenho para o botão de tags, mantenha os ícones como estão e só substitua a peça das tags.

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/negocio/NomeDaFicha.tsx components/escale/negocio/TagsDaFicha.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx && corepack pnpm eslint components/escale/negocio/NomeDaFicha.tsx components/escale/negocio/TagsDaFicha.tsx components/escale/negocio/CabecalhoDaFicha.tsx components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/FichaDoNegocio.tsx && corepack pnpm typecheck`
Expected: PASS; typecheck limpo. O `ChipDeEtiqueta` lê as cores por um hook próprio: se ele exigir provider no teste, mocke `@/components/tags/ChipDeEtiqueta` com `({ tag }) => <span>{tag}</span>`.

- [ ] **Step 6: Commit**

```bash
git add components/escale/negocio/NomeDaFicha.tsx components/escale/negocio/TagsDaFicha.tsx components/escale/negocio/CabecalhoDaFicha.tsx components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/FichaDoNegocio.tsx tests/unit/escale-ficha-nome-e-tags.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx
git commit -m "feat(escale): editar o nome e as tags do contato pela ficha do negócio (Fase 1H, C10)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 6: Espanhol do PR A, a rodada cheia, a conferência, o PRD e o PR A

- [ ] **Step 1: O espanhol.** Bloco novo `  // ─── FORK ESCALE · Fase 1H (PR A): campos, nome e tags da ficha ───` em `lib/i18n/dicionario.ts`, logo ANTES de `  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───`. Rode da raiz do repositório (o script pula chave que já existe, com ou sem aspas):

```bash
node - <<'NODE'
const fs = require("fs");
const ARQ = "lib/i18n/dicionario.ts";
const ANCORA = "  // ─── FORK ESCALE · filtros do quadro (Fase 1D: status, filtros, filtros salvos, ordenação) ───";
const CAB = "  // ─── FORK ESCALE · Fase 1H (PR A): campos, nome e tags da ficha ───";
const ENTRADAS = [
  ["Ocultar vazios", "Ocultar vacíos"],
  ["Mostrar vazios", "Mostrar vacíos"],
  ["Alternar exibição de campos sem valor preenchido", "Alternar la visualización de campos sin valor"],
  ["Configure quais campos aparecem e em que ordem", "Configura qué campos aparecen y en qué orden"],
  ["Só quem administra a conta gerencia os campos.", "Solo quien administra la cuenta gestiona los campos."],
  ["Nenhum campo encontrado", "Ningún campo encontrado"],
  ["Porque não vejo alguns campos?", "¿Por qué no veo algunos campos?"],
  ['Os campos vazios estão sendo ocultados. Você pode clicar no canto superior direito dessa aba para "Mostrar campos vazios".', 'Los campos vacíos están ocultos. Puedes hacer clic en la esquina superior derecha de esta pestaña para "Mostrar campos vacíos".'],
  ["Campo obrigatório nesta etapa", "Campo obligatorio en esta etapa"],
  ["Este campo não pode ser editado aqui.", "Este campo no se puede editar aquí."],
  ["Salvando…", "Guardando…"],
  ["Salvo", "Guardado"],
  ["As alterações foram salvas com sucesso.", "Los cambios se guardaron con éxito."],
  ["Ocorreu um erro ao salvar o campo", "Ocurrió un error al guardar el campo"],
  ["Digite um número.", "Escribe un número."],
  ["Digite um valor.", "Escribe un valor."],
  ["Digite uma data válida (dd/mm/aaaa).", "Escribe una fecha válida (dd/mm/aaaa)."],
  ["Necessário ser um email válido.", "Debe ser un email válido."],
  ["Digite um endereço válido.", "Escribe una dirección válida."],
  ["O telefone informado está inválido.", "El teléfono informado no es válido."],
  ["Para apagar o telefone, use a ficha do contato.", "Para borrar el teléfono, usa la ficha del contacto."],
  ["Para apagar o e-mail, use a ficha do contato.", "Para borrar el email, usa la ficha del contacto."],
  ["Este negócio não tem contato.", "Este negocio no tiene contacto."],
  ["Nome do contato", "Nombre del contacto"],
  ["Salvar nome", "Guardar nombre"],
  ["Nome atualizado.", "Nombre actualizado."],
  ["Não foi possível atualizar o nome. Tente novamente.", "No se pudo actualizar el nombre. Inténtalo de nuevo."],
  ["+ Adicionar tags", "+ Agregar etiquetas"],
  ["Adicionar tags", "Agregar etiquetas"],
  ["Adicione uma tag", "Agrega una etiqueta"],
  ["Nenhuma tag correspondente", "Ninguna etiqueta coincide"],
  ["Criar", "Crear"],
  ["Remover a tag", "Quitar la etiqueta"],
  ["Remover", "Quitar"],
  ["Deseja remover esta tag do contato?", "¿Quieres quitar esta etiqueta del contacto?"],
  ["O contato já tem o máximo de 20 tags.", "El contacto ya tiene el máximo de 20 etiquetas."],
  ["Instagram", "Instagram"],
  ["Site", "Sitio web"],
  ["Google Meu Negócio", "Google Mi Negocio"],
  ["Facebook", "Facebook"],
  ["LinkedIn", "LinkedIn"],
  ["TikTok", "TikTok"],
  ["YouTube", "YouTube"],
  ["Outro", "Otro"],
];
let texto = fs.readFileSync(ARQ, "utf8");
if (texto.includes(CAB)) throw new Error("o bloco da 1H (PR A) já está no dicionário");
const i = texto.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 1D não encontrada");
const eol = texto.includes("\r\n") ? "\r\n" : "\n";
const vistas = new Set();
const novas = [];
const puladas = [];
for (const [pt, es] of ENTRADAS) {
  if (vistas.has(pt)) continue;
  vistas.add(pt);
  const semAspas = /^[A-Za-zÀ-ÿ_$][\wÀ-ÿ$]*$/.test(pt) && new RegExp(`^\\s*${pt.replace(/[$]/g, "\\$")}:`, "m").test(texto);
  if (texto.includes(JSON.stringify(pt) + ":") || semAspas) { puladas.push(pt); continue; }
  novas.push(`  ${JSON.stringify(pt)}: { es: ${JSON.stringify(es)} },`);
}
texto = texto.slice(0, i) + [CAB, ...novas].join(eol) + eol + texto.slice(i);
fs.writeFileSync(ARQ, texto);
console.log(`${novas.length} entradas novas; já existiam ${puladas.length}: ${puladas.join(" | ")}`);
NODE
```

Os rótulos dos links (`TIPOS_DE_LINK[].rotulo`) podem ter outro texto: confira em `lib/leads/links-de-contato.ts` e use os reais. Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-espanhol-registro-tu.test.ts` e o typecheck. Se a gate listar um texto que não está acima, acrescente o par à mão no fim do bloco. Expected: PASS. Commit `feat(escale): espanhol da ficha do negócio (1H, PR A)`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1).**

```bash
export NODE_OPTIONS=--max-old-space-size=6144
mkdir -p .superpowers/sdd
( corepack pnpm typecheck && corepack pnpm lint && corepack pnpm lint:channels && corepack pnpm lint:role-rank \
  && bash scripts/checar-colisao-de-migration.sh escale-crm/main ) > .superpowers/sdd/1h-pra-gates-rapidos.log 2>&1; echo "rapidos=$?" >> .superpowers/sdd/1h-pra-gates-rapidos.log &
corepack pnpm vitest run --reporter=json --outputFile=.superpowers/sdd/1h-pra-unit.json > .superpowers/sdd/1h-pra-unit.log 2>&1 &
```
`vitest run` roda os dois projetos (`cercas` e `produto`). O `test:db` não entra no PR A (não toca o banco). Enquanto rodam, faça os Steps 3 e 4. Depois, compare com as conhecidas (se `.superpowers/sdd/falhas-conhecidas.txt` não existir, crie-o com a lista da 1F-a, Task 5):

```bash
node -e '
const fs = require("fs"), path = require("path");
const r = JSON.parse(fs.readFileSync(".superpowers/sdd/1h-pra-unit.json", "utf8"));
const conhecidas = new Set(fs.readFileSync(".superpowers/sdd/falhas-conhecidas.txt", "utf8").split(/\r?\n/).filter(Boolean));
const falhas = r.testResults.filter((t) => t.status === "failed").map((t) => path.relative(process.cwd(), t.name).replace(/\\/g, "/"));
const novas = falhas.filter((f) => !conhecidas.has(f));
console.log("falharam:", falhas.length, "| novas:", novas.length);
for (const f of novas) console.log("NOVA", f);
process.exit(novas.length ? 1 : 0);
'
```
Expected: `novas: 0` e `rapidos=0`. Toda falha nova é regressão: rode o arquivo sozinho; se continuar falhando, corrija antes do PR.

- [ ] **Step 3: Conferência visual** (contrato, CAMINHO A ou B). Com a casca ligada, abra um negócio e compare a aba Contato com o print 02, a Negócio com o 04 e o cabeçalho com o 01; edite um campo de texto, uma lista e o Valor; clique no lápis; abra o "+ Adicionar tags". Escreva a lista das diferenças que sobram (as já previstas: sem o seletor de país "BR ▾" no telefone; sem grupos de campos; sem datepicker; o painel das tags sem cor e descrição; "Whatsapp" não existe como campo separado). Com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD.** Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\1-negocios.md`, seção 8, na linha `| 1H |`, troque a última coluna por `PR A aberto (campos, nome e tags); PR B a seguir (notas, arquivos, conversas e histórico)`. Na seção 4, tabela C, linha `| C12 |`, troque a última coluna `1H` por `Fase 2 (Empresas) — decisão de 17/10 (plano da 1H, Q2)`.

- [ ] **Step 5: Push e PR A.**

```bash
git push -u escale-crm feat/fase-1h-campos-e-tags
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1h-campos-e-tags --title "feat(escale): Fase 1H (A) — campos, nome e tags editáveis na ficha, igual à Clint" --body-file .superpowers/sdd/1h-pra-pr.md
```

Corpo: o Goal (a parte dos campos, nome e tags); as decisões N1 a N6, N13, N14 e G1; o que fica para o PR B; os desvios previstos (Step 3); as perguntas Q1 a Q5 e Q13; os prints que faltam 1 a 4; a conferência visual; a verificação (por task e a rodada cheia). Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE. O PR B só começa depois do merge do PR A, com o "pode fazer" do usuário.

---

# PR B — Notas, arquivos, conversas e histórico

### Task 7: Branch do PR B, a migration 9008, o bloco do baseline e as provas

**Files:**
- Create: `supabase/migrations/20261023120000_9008_notas_e_arquivos.sql`, `tests/unit/escale-notas-e-arquivos-migration.test.ts`, `tests/invariants/escale-notas-e-arquivos-rls.test.ts`
- Modify: `supabase/baseline.sql` (bloco novo), `tests/invariants/rls-completude-varredura.test.ts` (`PROVA_PROPRIA`)

**Interfaces (Produces):** tabelas `public.crm_notas_do_negocio` (`id, organization_id, lead_id, contact_id, user_id, user_nome, texto, created_at, updated_at`) e `public.crm_arquivos_do_contato` (`id, organization_id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, storage_path, created_at`); bucket `arquivos-do-contato`; índice `uq_crm_leads_org_id`.

- [ ] **Step 1: A base e a branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/repo"
export PATH="/c/Program Files/nodejs:$PATH"
git status --porcelain    # Expected: vazio.
git fetch escale-crm --quiet
git cat-file -e escale-crm/main:components/escale/negocio/TagsDaFicha.tsx && echo "PR A ok"
git ls-tree --name-only escale-crm/main supabase/migrations/ | sort | tail -2
docker info > /dev/null 2>&1 && echo "docker ok"
git switch -c feat/fase-1h-notas-arquivos-historico escale-crm/main
```
Expected: `PR A ok`, a última migration é a 9007, `docker ok`. Senão, PARE. Se a última for maior que 9007, a nova é a seguinte (troque `9008` e `20261023120000` em todos os lugares desta fase).

- [ ] **Step 2: O teste da forma do SQL (vai falhar)**

Create `tests/unit/escale-notas-e-arquivos-migration.test.ts`:

```ts
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

/**
 * NOTAS E ARQUIVOS DA FICHA (fork Escale, migration 9008): a migration e o bloco
 * do baseline são o MESMO SQL, e o bloco mora depois do bloco 9007 e antes do da 0323.
 */
const RAIZ = join(__dirname, "..", "..");
const MIGRATION = "supabase/migrations/20261023120000_9008_notas_e_arquivos.sql";
const MIGRATION_9007 = "supabase/migrations/20261022120000_9007_configuracoes_da_origem.sql";
const CABECALHO = "-- ---- FORK ESCALE · notas e arquivos da ficha (migration 9008) ----";

const ler = (caminho: string) => readFileSync(join(RAIZ, caminho), "utf8").replace(/\r\n/g, "\n");

describe("notas e arquivos: migration 9008 e bloco do baseline", () => {
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

  it("as duas tabelas têm RLS, grants fechados a anon e travas de suporte", () => {
    const sql = ler(MIGRATION);
    for (const tabela of ["crm_notas_do_negocio", "crm_arquivos_do_contato"]) {
      expect(sql).toContain(`alter table public.${tabela} enable row level security;`);
      expect(sql).toContain(`create policy ${tabela}_select on public.${tabela}`);
      expect(sql).toContain(`create policy ${tabela}_insert on public.${tabela}`);
      expect(sql).toContain(`create policy ${tabela}_dono_ou_gerente_write on public.${tabela}`);
      expect(sql).toContain(`revoke all on public.${tabela} from anon;`);
      expect(sql).toContain(`grant select, insert, update, delete on public.${tabela} to authenticated;`);
    }
    expect(sql).toContain("perform public.fn_aplicar_travas_de_suporte();");
    expect(sql).toContain("notify pgrst, 'reload schema';");
  });

  it("a nota segue quem vê o negócio (fn_can_view_lead); o arquivo, a organização; escreve agent+ como autor", () => {
    const sql = ler(MIGRATION).replace(/\s+/g, " ");
    expect(sql).toContain("public.fn_can_view_lead(l.organization_id, l.owner_user_id)");
    expect(sql).toContain("public.fn_role_at_least(organization_id, 'agent')");
    expect(sql).toContain("and user_id = auth.uid()");
    expect(sql).toContain("or public.fn_role_at_least(organization_id, 'manager')");
  });

  it("FKs com cascade (negócio, contato e autor) e o índice composto de crm_leads", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("create unique index if not exists uq_crm_leads_org_id on public.crm_leads (organization_id, id);");
    expect(sql).toContain("references public.crm_leads (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.contacts (organization_id, id) on delete cascade");
    expect(sql).toContain("references public.user_organizations (user_id, organization_id) on delete cascade");
  });

  it("o bucket é privado, de 50 MB, sem policy de escrita em storage.objects", () => {
    const sql = ler(MIGRATION);
    expect(sql).toContain("values ('arquivos-do-contato', 'arquivos-do-contato', false, 52428800)");
    expect(sql).not.toMatch(/create policy .* on storage\.objects/);
  });
});
```

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-notas-e-arquivos-migration.test.ts`
Expected: FAIL (a migration não existe).

- [ ] **Step 4: A migration**

Create `supabase/migrations/20261023120000_9008_notas_e_arquivos.sql` (a primeira linha é UMA linha só):

```sql
-- manifest: **Notas e arquivos da ficha do negócio (fork Escale, Fase 1H).** Duas tabelas novas. `crm_notas_do_negocio`: a nota que a pessoa escreve no negócio ("Nova nota" da Clint), com autor, texto (1 a 4.000 caracteres) e o contato; vista por quem vê o negócio (`fn_can_view_lead` via `crm_leads`, com a sessão de quem olha), escrita por agent+ como autor (`user_id = auth.uid()`), editada e apagada pelo autor ou por gerente+. `crm_arquivos_do_contato`: o arquivo enviado junto do contato (na Clint o arquivo é do contato, não do negócio), com o negócio de onde foi enviado, nome, extensão, mime, tamanho e o caminho no bucket; vista pela organização (como `contacts`), enviada por agent+ como autor, apagada pelo autor ou por gerente+. FKs compostas com `on delete cascade` para o negócio (ganha o índice único `uq_crm_leads_org_id`), o contato e o autor. Bucket privado `arquivos-do-contato` (50 MB), sem policy em `storage.objects`: só o service role lê e grava, por rota (doutrina da 0464/0483). Travas de suporte nas duas tabelas.
-- 9008: notas do negócio e arquivos do contato (fork Escale).

-- A FK composta para o negócio precisa do alvo único (o mesmo desenho da 9003 para crm_pipelines).
create unique index if not exists uq_crm_leads_org_id on public.crm_leads (organization_id, id);

-- ── 1. notas do negócio ───────────────────────────────────────────────────────
create table if not exists public.crm_notas_do_negocio (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  lead_id uuid not null,
  contact_id uuid,
  user_id uuid not null,
  user_nome text,
  texto text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_notas_do_negocio_texto_valido check (char_length(btrim(texto)) between 1 and 4000),
  constraint crm_notas_do_negocio_negocio_fk foreign key (organization_id, lead_id)
    references public.crm_leads (organization_id, id) on delete cascade,
  constraint crm_notas_do_negocio_contato_fk foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete cascade,
  constraint crm_notas_do_negocio_autor_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_notas_do_negocio_negocio
  on public.crm_notas_do_negocio (organization_id, lead_id, created_at desc);

alter table public.crm_notas_do_negocio enable row level security;

drop policy if exists crm_notas_do_negocio_select on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_insert on public.crm_notas_do_negocio;
drop policy if exists crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio;

-- Quem vê a nota é quem vê o negócio: a subconsulta roda sob a RLS de quem olha.
create policy crm_notas_do_negocio_select on public.crm_notas_do_negocio
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_notas_do_negocio.lead_id
                       and l.organization_id = crm_notas_do_negocio.organization_id
                       and public.fn_can_view_lead(l.organization_id, l.owner_user_id)))
  );

-- Escreve agent+ (viewer é só leitura), sempre como autor, e só em negócio que ENXERGA.
create policy crm_notas_do_negocio_insert on public.crm_notas_do_negocio
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and exists (select 1 from public.crm_leads l
                     where l.id = crm_notas_do_negocio.lead_id
                       and l.organization_id = crm_notas_do_negocio.organization_id))
  );

-- Edita e apaga o autor, ou gerente ou acima (PRD §5).
create policy crm_notas_do_negocio_dono_ou_gerente_write on public.crm_notas_do_negocio
  for all using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

revoke all on public.crm_notas_do_negocio from anon;
grant select, insert, update, delete on public.crm_notas_do_negocio to authenticated;
grant all on public.crm_notas_do_negocio to service_role;

drop trigger if exists trg_crm_notas_do_negocio_updated_at on public.crm_notas_do_negocio;
create trigger trg_crm_notas_do_negocio_updated_at
  before update on public.crm_notas_do_negocio
  for each row execute function public.fn_set_updated_at();

-- ── 2. arquivos do contato ────────────────────────────────────────────────────
create table if not exists public.crm_arquivos_do_contato (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  contact_id uuid not null,
  lead_id uuid,
  user_id uuid not null,
  user_nome text,
  nome text not null,
  extensao text not null,
  mime text not null,
  tamanho bigint not null,
  storage_path text not null unique,
  created_at timestamptz not null default now(),
  constraint crm_arquivos_do_contato_nome_valido check (char_length(btrim(nome)) between 1 and 255),
  constraint crm_arquivos_do_contato_tamanho_valido check (tamanho > 0 and tamanho <= 52428800),
  constraint crm_arquivos_do_contato_contato_fk foreign key (organization_id, contact_id)
    references public.contacts (organization_id, id) on delete cascade,
  constraint crm_arquivos_do_contato_negocio_fk foreign key (organization_id, lead_id)
    references public.crm_leads (organization_id, id) on delete set null (lead_id),
  constraint crm_arquivos_do_contato_autor_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_arquivos_do_contato_contato
  on public.crm_arquivos_do_contato (organization_id, contact_id, created_at desc);

alter table public.crm_arquivos_do_contato enable row level security;

drop policy if exists crm_arquivos_do_contato_select on public.crm_arquivos_do_contato;
drop policy if exists crm_arquivos_do_contato_insert on public.crm_arquivos_do_contato;
drop policy if exists crm_arquivos_do_contato_dono_ou_gerente_write on public.crm_arquivos_do_contato;

-- O arquivo é do contato: quem vê o contato (a organização inteira, como em `contacts`) vê o arquivo.
create policy crm_arquivos_do_contato_select on public.crm_arquivos_do_contato
  for select using (
    public.fn_is_platform_admin()
    or (organization_id in (select public.fn_user_org_ids()))
  );

create policy crm_arquivos_do_contato_insert on public.crm_arquivos_do_contato
  for insert with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and user_id = auth.uid()
        and exists (select 1 from public.contacts c
                     where c.id = crm_arquivos_do_contato.contact_id
                       and c.organization_id = crm_arquivos_do_contato.organization_id))
  );

create policy crm_arquivos_do_contato_dono_ou_gerente_write on public.crm_arquivos_do_contato
  for all using (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  )
  with check (
    public.fn_is_platform_admin_full()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'agent')
        and (user_id = auth.uid() or public.fn_role_at_least(organization_id, 'manager')))
  );

revoke all on public.crm_arquivos_do_contato from anon;
grant select, insert, update, delete on public.crm_arquivos_do_contato to authenticated;
grant all on public.crm_arquivos_do_contato to service_role;

-- ── 3. bucket privado ─────────────────────────────────────────────────────────
-- Sem policy em storage.objects (doutrina da 0464/0483): o service role ignora a
-- RLS e grava/assina por rota; `auth.role()` quebraria o Postgres efêmero do test:db.
insert into storage.buckets (id, name, public, file_size_limit)
values ('arquivos-do-contato', 'arquivos-do-contato', false, 52428800)
on conflict (id) do update set file_size_limit = excluded.file_size_limit;

comment on table public.crm_notas_do_negocio is
  'Notas do negócio (fork Escale, migration 9008): a "Nova nota" da Clint. Vista por quem vê o negócio; escrita por agent+ como autor; editada/apagada pelo autor ou por gerente+. O texto fica só aqui (a linha do tempo guarda o ponteiro, sem PII).';
comment on table public.crm_arquivos_do_contato is
  'Arquivos do contato (fork Escale, migration 9008): enviados pela ficha do negócio (lead_id = de onde veio). Vistos pela organização; enviados por agent+ como autor; apagados pelo autor ou por gerente+. O binário fica no bucket privado arquivos-do-contato, lido por URL assinada pelo service role.';

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

Se o Postgres do `test:db` for anterior ao 15, `on delete set null (lead_id)` não compila: troque por `on delete set null` (sem a lista). A 9001 já usa a forma com lista, então deve estar bem.

- [ ] **Step 5: O bloco do baseline**

Em `supabase/baseline.sql`, logo ANTES da linha `-- ---- marcadores do contato no filtro de conversas (migration 0323) ----` (e depois do bloco da 9007), insira o cabeçalho e o conteúdo idêntico da migration:

```bash
node - <<'NODE'
const fs = require("fs");
const mig = fs.readFileSync("supabase/migrations/20261023120000_9008_notas_e_arquivos.sql", "utf8");
const ARQ = "supabase/baseline.sql";
let base = fs.readFileSync(ARQ, "utf8");
const CAB = "-- ---- FORK ESCALE · notas e arquivos da ficha (migration 9008) ----";
if (base.includes(CAB)) throw new Error("bloco 9008 já existe");
const ANCORA = "-- ---- marcadores do contato no filtro de conversas (migration 0323) ----";
const i = base.indexOf(ANCORA);
if (i < 0) throw new Error("âncora da 0323 não encontrada");
const eol = base.includes("\r\n") ? "\r\n" : "\n";
const bloco = CAB + eol + mig.replace(/\r\n/g, "\n").replace(/\n/g, eol) + eol + eol;
base = base.slice(0, i) + bloco + base.slice(i);
fs.writeFileSync(ARQ, base);
console.log("bloco 9008 inserido");
NODE
corepack pnpm vitest run tests/unit/escale-notas-e-arquivos-migration.test.ts tests/unit/manifest-x-migrations.test.ts tests/unit/escale-configuracoes-da-origem-migration.test.ts
```
Expected: PASS (inclusive o teste da 9007, que confere a ordem dos blocos).

- [ ] **Step 6: A prova no Postgres e a varredura**

Create `tests/invariants/escale-notas-e-arquivos-rls.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import {
  GOV_AGENT_A,
  GOV_AGENT_B,
  GOV_CONTACT_1,
  GOV_LEAD,
  GOV_MANAGER,
  GOV_ORG,
  GOV_VIEWER,
  countAs,
  seedGov,
  sql,
  writeCountAs,
} from "./gov-helpers";

/**
 * NOTAS E ARQUIVOS DA FICHA (fork Escale, migration 9008) — prova contra Postgres
 * real: zero linhas do vizinho nos dois sentidos, viewer não escreve, agent
 * escreve só como autor, o autor apaga o que é seu, gerente apaga o dos outros,
 * e a FK composta recusa nota de negócio de outra organização.
 *
 * Roda via `pnpm test:db` (não roda no `test:unit`).
 */
const ORG_B = "e5ca1e00-9008-4000-8000-000000000001";
const USER_B = "e5ca1e00-9008-4000-8000-000000000002";
const CONTATO_B = "e5ca1e00-9008-4000-8000-000000000003";
const FUNIL_B = "e5ca1e00-9008-4000-8000-000000000004";
const ETAPA_B = "e5ca1e00-9008-4000-8000-000000000005";
const LEAD_B = "e5ca1e00-9008-4000-8000-000000000006";
const NOTA_A = "e5ca1e00-9008-4000-8000-000000000011";
const NOTA_DO_B_AGENT = "e5ca1e00-9008-4000-8000-000000000012";
const NOTA_B = "e5ca1e00-9008-4000-8000-000000000013";
const ARQ_A = "e5ca1e00-9008-4000-8000-000000000021";
const ARQ_B = "e5ca1e00-9008-4000-8000-000000000022";

beforeAll(() => {
  seedGov();
  sql(`
    insert into auth.users (id, email) values ('${USER_B}', 'escale-notas-b@invariant.test') on conflict do nothing;
    insert into public.organizations (id, slug, legal_name, display_name)
      values ('${ORG_B}', 'escale-notas-b', 'Escale Notas Org B', 'Escale NB') on conflict do nothing;
    insert into public.user_organizations (user_id, organization_id, role, accepted_at)
      values ('${USER_B}', '${ORG_B}', 'admin', now()) on conflict do nothing;
    insert into public.contacts (id, organization_id, name) values ('${CONTATO_B}', '${ORG_B}', 'Contato B') on conflict do nothing;
    insert into public.crm_pipelines (id, organization_id, name, slug) values ('${FUNIL_B}', '${ORG_B}', 'Funil B', 'escale-notas-funil-b') on conflict do nothing;
    insert into public.crm_stages (id, organization_id, pipeline_id, name, slug, position)
      values ('${ETAPA_B}', '${ORG_B}', '${FUNIL_B}', 'Etapa B', 'etapa-b', 0) on conflict do nothing;
    insert into public.crm_leads (id, organization_id, pipeline_id, stage_id, contact_id, title)
      values ('${LEAD_B}', '${ORG_B}', '${FUNIL_B}', '${ETAPA_B}', '${CONTATO_B}', 'Negócio B') on conflict do nothing;
    insert into public.crm_notas_do_negocio (id, organization_id, lead_id, contact_id, user_id, user_nome, texto) values
      ('${NOTA_A}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_A}', 'Agent A', 'nota da A'),
      ('${NOTA_DO_B_AGENT}', '${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${GOV_AGENT_B}', 'Agent B', 'nota do agent B'),
      ('${NOTA_B}', '${ORG_B}', '${LEAD_B}', '${CONTATO_B}', '${USER_B}', 'B', 'nota da B')
      on conflict do nothing;
    insert into public.crm_arquivos_do_contato (id, organization_id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, storage_path) values
      ('${ARQ_A}', '${GOV_ORG}', '${GOV_CONTACT_1}', '${GOV_LEAD}', '${GOV_AGENT_A}', 'Agent A', 'contrato.pdf', 'pdf', 'application/pdf', 1234, '${GOV_ORG}/${GOV_CONTACT_1}/a.pdf'),
      ('${ARQ_B}', '${ORG_B}', '${CONTATO_B}', null, '${USER_B}', 'B', 'foto.png', 'png', 'image/png', 99, '${ORG_B}/${CONTATO_B}/b.png')
      on conflict do nothing;
  `);
});

describe("notas: isolamento e papéis", () => {
  it("a organização vê as suas e ZERO do vizinho, nos dois sentidos", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`)).toBe("2");
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`)).toBe("0");
    expect(countAs(USER_B, `select count(*) from public.crm_notas_do_negocio where organization_id = '${GOV_ORG}'`)).toBe("0");
    expect(countAs(USER_B, `select count(*) from public.crm_notas_do_negocio where organization_id = '${ORG_B}'`)).toBe("1");
  });

  it("viewer não escreve; agent escreve só como autor", () => {
    const linha = (user: string, autor: string) =>
      `insert into public.crm_notas_do_negocio (organization_id, lead_id, contact_id, user_id, texto) values ('${GOV_ORG}', '${GOV_LEAD}', '${GOV_CONTACT_1}', '${autor}', 'x')`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER, GOV_VIEWER))).toBe("0");
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_A, GOV_AGENT_B))).toBe("0");
    expect(writeCountAs(GOV_AGENT_A, linha(GOV_AGENT_A, GOV_AGENT_A))).toBe("1");
  });

  it("o autor apaga a sua, não a do outro; gerente apaga a dos outros", () => {
    expect(writeCountAs(GOV_AGENT_A, `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`)).toBe("0");
    expect(writeCountAs(GOV_AGENT_A, `update public.crm_notas_do_negocio set texto = 'editada' where id = '${NOTA_A}'`)).toBe("1");
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_notas_do_negocio where id = '${NOTA_DO_B_AGENT}'`)).toBe("1");
  });

  it("a FK composta recusa nota apontando para negócio de outra organização", () => {
    expect(() =>
      sql(`insert into public.crm_notas_do_negocio (organization_id, lead_id, user_id, texto) values ('${GOV_ORG}', '${LEAD_B}', '${GOV_AGENT_A}', 'x')`),
    ).toThrow();
  });
});

describe("arquivos: isolamento e papéis", () => {
  it("a organização vê os seus e ZERO do vizinho", () => {
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`)).toBe("1");
    expect(countAs(GOV_VIEWER, `select count(*) from public.crm_arquivos_do_contato where organization_id = '${ORG_B}'`)).toBe("0");
    expect(countAs(USER_B, `select count(*) from public.crm_arquivos_do_contato where organization_id = '${GOV_ORG}'`)).toBe("0");
  });

  it("viewer não envia; agent envia como autor; apaga o autor ou gerente", () => {
    const linha = (autor: string, path: string) =>
      `insert into public.crm_arquivos_do_contato (organization_id, contact_id, user_id, nome, extensao, mime, tamanho, storage_path) values ('${GOV_ORG}', '${GOV_CONTACT_1}', '${autor}', 'n.pdf', 'pdf', 'application/pdf', 1, '${path}')`;
    expect(writeCountAs(GOV_VIEWER, linha(GOV_VIEWER, "v.pdf"))).toBe("0");
    expect(writeCountAs(GOV_AGENT_B, linha(GOV_AGENT_B, "b1.pdf"))).toBe("1");
    expect(writeCountAs(GOV_AGENT_B, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`)).toBe("0");
    expect(writeCountAs(GOV_MANAGER, `delete from public.crm_arquivos_do_contato where id = '${ARQ_A}'`)).toBe("1");
  });
});
```

Confira em `tests/invariants/gov-helpers.ts` as colunas que o `seedGov` usa para `crm_stages` e `crm_leads` (o INSERT acima copia o desenho; se `slug` ou `position` não existirem em `crm_stages`, tire). Em `tests/invariants/rls-completude-varredura.test.ts`, acrescente ao fim de `PROVA_PROPRIA`:

```ts
  {
    tabela: "crm_notas_do_negocio",
    razao:
      "tests/invariants/escale-notas-e-arquivos-rls.test.ts — fork Escale (migration 9008): dois tenants reais por JWT " +
      "(zero do vizinho nos dois sentidos), viewer não escreve, agent escreve só como autor, o autor edita o que é seu, " +
      "gerente apaga o dos outros, e a FK composta recusa negócio de outra organização.",
  },
  {
    tabela: "crm_arquivos_do_contato",
    razao:
      "tests/invariants/escale-notas-e-arquivos-rls.test.ts — fork Escale (migration 9008): zero do vizinho, viewer não envia, " +
      "agent envia só como autor, apaga o autor ou gerente.",
  },
```

Run: `corepack pnpm test:db tests/invariants/escale-notas-e-arquivos-rls.test.ts tests/invariants/rls-completude-varredura.test.ts`
Expected: PASS. Se a varredura reclamar de outra lista (`TABLES`), siga a mensagem dela.

- [ ] **Step 7: Revisor (G1).** Dispare o `security-reviewer` com a migration e a pergunta: "a nota só é vista por quem vê o negócio; ninguém grava como outro autor; o bucket não tem policy de escrita; as FKs recusam cruzar organização?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 8: Commit**

```bash
git add supabase/migrations/20261023120000_9008_notas_e_arquivos.sql supabase/baseline.sql tests/unit/escale-notas-e-arquivos-migration.test.ts tests/invariants/escale-notas-e-arquivos-rls.test.ts tests/invariants/rls-completude-varredura.test.ts
git commit -m "feat(escale): migration 9008 — notas do negócio e arquivos do contato (Fase 1H)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 8: As rotas e o hook das notas (C15)

**Files:**
- Create: `lib/escale/negocio/notas.ts`, `app/api/v1/leads/[id]/notas/route.ts`, `app/api/v1/leads/[id]/notas/[notaId]/route.ts`, `hooks/escale/useNotasDoNegocio.ts`, `tests/unit/escale-ficha-notas-rotas.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `requireSupportWrite`, `createClient`, `ok`/`fail`, `lerJson` (`lib/escale/origens/respostas`), `traduzir`, `emitLeadActivity` + `actorParaAtividade`? (não: a atividade usa `actor: { type: "user", id }` direto), `audit`.
- Produces: `Nota` (`{ id, lead_id, contact_id, user_id, user_nome, texto, created_at, updated_at }`), `notaSchema` (`{ texto: string }`), `MAX_TEXTO_DA_NOTA = 4000`; rotas `GET/POST /api/v1/leads/[id]/notas`, `PATCH/DELETE /api/v1/leads/[id]/notas/[notaId]`; `useNotasDoNegocio(leadId)` (`{ data?: Nota[] }`), `useCriarNota(leadId)`, `useEditarNota(leadId)`, `useExcluirNota(leadId)` (todos `mutateAsync`), `chaveDasNotas(leadId) = ["notas-do-negocio", leadId]`.

- [ ] **Step 1: O teste das rotas (vai falhar)**

Create `tests/unit/escale-ficha-notas-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "@/app/api/v1/leads/[id]/notas/route";
import { DELETE, PATCH } from "@/app/api/v1/leads/[id]/notas/[notaId]/route";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));
const atividade = vi.hoisted(() => ({ emitLeadActivity: vi.fn(async () => ({ ok: true })) }));
vi.mock("@/lib/leads/activity-emitter", () => ({ emitLeadActivity: atividade.emitLeadActivity }));

/** FORK ESCALE · Fase 1H (C15): as rotas das notas do negócio. */
const ORG = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";
const LEAD = "33333333-3333-4333-8333-333333333333";
const NOTA = "44444444-4444-4444-8444-444444444444";

type Linha = Record<string, unknown>;
/** Um Supabase de mentira, encadeável: guarda a última operação por tabela. */
function fakeSupabase(estado: { leads: Linha[]; notas: Linha[] }) {
  const op = { tabela: "", acao: "select" as "select" | "insert" | "update" | "delete", filtros: [] as [string, unknown][], valores: {} as Linha };
  const resolver = () => {
    const linhas = (op.tabela === "crm_leads" ? estado.leads : estado.notas).filter((l) =>
      op.filtros.every(([c, v]) => l[c] === v),
    );
    if (op.acao === "insert") {
      const nova = { id: NOTA, created_at: "2026-10-17T10:00:00Z", updated_at: "2026-10-17T10:00:00Z", ...op.valores };
      estado.notas.push(nova);
      return { data: nova, error: null };
    }
    if (op.acao === "update") {
      linhas.forEach((l) => Object.assign(l, op.valores));
      return { data: linhas[0] ?? null, error: null };
    }
    if (op.acao === "delete") {
      estado.notas = estado.notas.filter((l) => !linhas.includes(l));
      return { data: linhas, error: null, count: linhas.length };
    }
    return { data: linhas, error: null };
  };
  const cadeia: Record<string, unknown> = {};
  const self = () => cadeia;
  Object.assign(cadeia, {
    from: (tabela: string) => {
      op.tabela = tabela;
      op.acao = "select";
      op.filtros = [];
      op.valores = {};
      return cadeia;
    },
    select: self,
    order: self,
    insert: (v: Linha) => ((op.acao = "insert"), (op.valores = v), cadeia),
    update: (v: Linha) => ((op.acao = "update"), (op.valores = v), cadeia),
    delete: () => ((op.acao = "delete"), cadeia),
    eq: (c: string, v: unknown) => (op.filtros.push([c, v]), cadeia),
    maybeSingle: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
    },
    single: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: r.error };
    },
    then: (res: (v: unknown) => void) => res(resolver()),
  });
  return cadeia;
}

function sessao(role: "viewer" | "agent" | "manager") {
  vi.mocked(requireRole).mockImplementation(async (min) => {
    const rank = { viewer: 1, agent: 2, manager: 3 };
    if (rank[role] < rank[min as "viewer" | "agent" | "manager"]) {
      return { ok: false, response: new Response(null, { status: 403 }) } as never;
    }
    return {
      ok: true,
      user: { id: USER, full_name: "Ana", idioma: "pt-BR" },
      org: { orgId: ORG, role },
    } as never;
  });
}

const pedido = (caminho: string, method: string, body?: unknown) =>
  new NextRequest(`http://localhost${caminho}`, {
    method,
    body: body === undefined ? undefined : JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
const ctx = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: LEAD, ...extra }) });

let estado: { leads: Linha[]; notas: Linha[] };
beforeEach(() => {
  vi.clearAllMocks();
  estado = {
    leads: [{ id: LEAD, organization_id: ORG, contact_id: "c1", pipeline_id: "p1" }],
    notas: [{ id: NOTA, organization_id: ORG, lead_id: LEAD, contact_id: "c1", user_id: USER, user_nome: "Ana", texto: "antiga" }],
  };
  vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado) as never);
});

describe("GET /api/v1/leads/[id]/notas", () => {
  it("viewer lista as notas do negócio", async () => {
    sessao("viewer");
    const res = await GET(pedido(`/api/v1/leads/${LEAD}/notas`, "GET"), ctx());
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: { texto: string }[] };
    expect(corpo.data.map((n) => n.texto)).toEqual(["antiga"]);
  });
});

describe("POST", () => {
  it("agent cria a nota como autor e emite a atividade note com o ponteiro", async () => {
    sessao("agent");
    const res = await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "  Ligar amanhã  " }), ctx());
    expect(res.status).toBe(201);
    const corpo = (await res.json()) as { data: { texto: string; user_id: string; user_nome: string } };
    expect(corpo.data).toMatchObject({ texto: "Ligar amanhã", user_id: USER, user_nome: "Ana" });
    expect(atividade.emitLeadActivity).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ type: "note", leadId: LEAD, sourceModule: "escale", reason: "Nova nota", payload: { nota_id: NOTA } }),
    );
  });
  it("viewer recebe 403; texto vazio ou acima de 4000 recebe 422; negócio de outra organização, 404", async () => {
    sessao("viewer");
    expect((await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "x" }), ctx())).status).toBe(403);
    sessao("agent");
    expect((await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "   " }), ctx())).status).toBe(422);
    expect((await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "a".repeat(4001) }), ctx())).status).toBe(422);
    estado.leads = [];
    expect((await POST(pedido(`/api/v1/leads/${LEAD}/notas`, "POST", { texto: "x" }), ctx())).status).toBe(404);
  });
});

describe("PATCH e DELETE", () => {
  it("edita o texto e apaga (a RLS decide quem pode; a rota só confere o negócio)", async () => {
    sessao("agent");
    const res = await PATCH(pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "PATCH", { texto: "nova" }), ctx({ notaId: NOTA }));
    expect(res.status).toBe(200);
    expect(estado.notas[0]?.texto).toBe("nova");
    const del = await DELETE(pedido(`/api/v1/leads/${LEAD}/notas/${NOTA}`, "DELETE"), ctx({ notaId: NOTA }));
    expect(del.status).toBe(204);
    expect(estado.notas).toHaveLength(0);
  });
  it("nota que a RLS não deixa apagar (zero linhas) responde 404", async () => {
    sessao("agent");
    const del = await DELETE(pedido(`/api/v1/leads/${LEAD}/notas/99999999-9999-4999-8999-999999999999`, "DELETE"), ctx({ notaId: "99999999-9999-4999-8999-999999999999" }));
    expect(del.status).toBe(404);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-notas-rotas.test.ts`
Expected: FAIL (rotas não existem).

- [ ] **Step 3: A lib e as rotas**

Create `lib/escale/negocio/notas.ts`:

```ts
import { z } from "zod";

/** NOTAS DO NEGÓCIO (fork Escale, Fase 1H; C15, N7): o contrato entre a tela e as rotas. */
export const MAX_TEXTO_DA_NOTA = 4000;

export interface Nota {
  id: string;
  lead_id: string;
  contact_id: string | null;
  user_id: string;
  user_nome: string | null;
  texto: string;
  created_at: string;
  updated_at: string;
}

export const COLUNAS_DA_NOTA = "id, lead_id, contact_id, user_id, user_nome, texto, created_at, updated_at";

export const notaSchema = z
  .object({ texto: z.string().transform((s) => s.trim()).pipe(z.string().min(1).max(MAX_TEXTO_DA_NOTA)) })
  .strict();

export const rotaDasNotas = (leadId: string) => `/api/v1/leads/${leadId}/notas`;
```

Create `app/api/v1/leads/[id]/notas/route.ts`:

```ts
/**
 * GET/POST /api/v1/leads/:id/notas — as NOTAS do negócio (fork Escale, Fase 1H; C15).
 *
 * GET: qualquer papel (a RLS mostra só as notas de negócio que a pessoa vê).
 * POST: agent ou acima; a nota nasce com `user_id` e `user_nome` da sessão, e
 * a linha do tempo ganha a atividade `note` com o PONTEIRO (`payload.nota_id`),
 * nunca o texto (PII fica só na tabela de notas). A organização vem da sessão.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { COLUNAS_DA_NOTA, notaSchema, type Nota } from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { emitLeadActivity } from "@/lib/leads/activity-emitter";
import { logger } from "@/lib/logger";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

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
  if (!uuidValido(id)) return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .select(COLUNAS_DA_NOTA)
    .eq("organization_id", authz.org.orgId)
    .eq("lead_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("notas.listar", { requestId, error: error.message });
    return fail("internal_error", t("Não consegui carregar as notas."), 500, { requestId });
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
  if (!uuidValido(id)) return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = notaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("A nota precisa de texto, com até 4.000 caracteres."), 422, { requestId });
  }

  const supabase = await createClient();
  const { data: lead } = await supabase
    .from("crm_leads")
    .select("id, contact_id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!lead) return fail("not_found", t("Esse negócio não existe ou foi removido"), 404, { requestId });

  const { data: nota, error } = await supabase
    .from("crm_notas_do_negocio")
    .insert({
      organization_id: authz.org.orgId,
      lead_id: id,
      contact_id: lead.contact_id ?? null,
      user_id: authz.user.id,
      user_nome: authz.user.full_name ?? null,
      texto: parsed.data.texto,
    })
    .select(COLUNAS_DA_NOTA)
    .single();
  if (error || !nota) {
    logger.error("notas.criar", { requestId, error: error?.message });
    return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  }

  // Fire-and-forget, como todo emissor da linha do tempo: a nota já está gravada.
  void emitLeadActivity(supabase, {
    organizationId: authz.org.orgId,
    leadId: id,
    contactId: lead.contact_id ?? null,
    type: "note",
    sourceModule: "escale",
    sourceId: (nota as Nota).id,
    actor: { type: "user", id: authz.user.id, role: authz.org.role },
    reason: "Nova nota",
    payload: { nota_id: (nota as Nota).id },
  });
  void audit({
    action: "lead.note_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_notas_do_negocio",
    resourceId: (nota as Nota).id,
    metadata: { lead_id: id },
  });
  return ok(nota as Nota, { requestId, status: 201 });
}
```

Create `app/api/v1/leads/[id]/notas/[notaId]/route.ts`:

```ts
/**
 * PATCH/DELETE /api/v1/leads/:id/notas/:notaId (fork Escale, Fase 1H; C15).
 * Quem pode editar e apagar é a RLS (autor, ou gerente ou acima): a rota grava
 * com a sessão e, sem exatamente uma linha afetada, responde 404.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { COLUNAS_DA_NOTA, notaSchema, type Nota } from "@/lib/escale/negocio/notas";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; notaId: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;

export async function PATCH(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, notaId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(notaId)) return fail("not_found", t("Nota não encontrada."), 404, { requestId });

  const lido = await lerJson(req);
  if (!lido.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const parsed = notaSchema.safeParse(lido.json);
  if (!parsed.success) {
    return fail("unprocessable_entity", t("A nota precisa de texto, com até 4.000 caracteres."), 422, { requestId });
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .update({ texto: parsed.data.texto })
    .eq("organization_id", authz.org.orgId)
    .eq("lead_id", id)
    .eq("id", notaId)
    .select(COLUNAS_DA_NOTA)
    .maybeSingle();
  if (error) return fail("internal_error", t("Ocorreu um erro ao salvar a nota!"), 500, { requestId });
  if (!data) return fail("not_found", t("Nota não encontrada."), 404, { requestId });
  return ok(data as Nota, { requestId });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_notas_do_negocio" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, notaId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(notaId)) return fail("not_found", t("Nota não encontrada."), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_notas_do_negocio")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("lead_id", id)
    .eq("id", notaId)
    .select("id");
  if (error) return fail("internal_error", t("Ocorreu um erro ao remover a nota!"), 500, { requestId });
  if (!data || data.length === 0) return fail("not_found", t("Nota não encontrada."), 404, { requestId });
  return noContent(requestId);
}
```

Confira a assinatura de `ok` (`lib/api/wrappers.ts:51`, `OkOptions`): se não aceitar `status`, devolva `201` com `new NextResponse(JSON.stringify({ data }), { status: 201, … })` ou o helper que o original usa para criar (`grep -n "status: 201" app/api/v1 -r | head`). Confira também os campos de `AuditEntry` (`lib/audit`); se `resourceType`/`resourceId` tiverem outro nome, use os reais. No teste, o `fakeSupabase` precisa de `.select()` depois de `.delete()`/`.update()`: ele já encadeia tudo.

- [ ] **Step 4: O hook**

Create `hooks/escale/useNotasDoNegocio.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDasNotas, type Nota } from "@/lib/escale/negocio/notas";

/** NOTAS DO NEGÓCIO (fork Escale, Fase 1H; C15): ler, criar, editar e apagar. */
export const chaveDasNotas = (leadId: string) => ["notas-do-negocio", leadId] as const;

export function useNotasDoNegocio(leadId: string) {
  return useQuery({
    queryKey: chaveDasNotas(leadId),
    queryFn: async () => (await apiClient.get<{ data: Nota[] }>(rotaDasNotas(leadId))).data,
  });
}

function useInvalidarNotas(leadId: string) {
  const qc = useQueryClient();
  return () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: chaveDasNotas(leadId) }),
      qc.invalidateQueries({ queryKey: ["timeline", leadId] }),
      qc.invalidateQueries({ queryKey: ["historico-do-negocio", leadId] }),
    ]);
}

export function useCriarNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async (texto: string) => (await apiClient.post<{ data: Nota }>(rotaDasNotas(leadId), { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useEditarNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async ({ notaId, texto }: { notaId: string; texto: string }) =>
      (await apiClient.patch<{ data: Nota }>(`${rotaDasNotas(leadId)}/${notaId}`, { texto })).data,
    onSuccess: () => void invalidar(),
  });
}

export function useExcluirNota(leadId: string) {
  const invalidar = useInvalidarNotas(leadId);
  return useMutation({
    mutationFn: async (notaId: string) => apiClient.delete<void>(`${rotaDasNotas(leadId)}/${notaId}`),
    onSuccess: () => void invalidar(),
  });
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-notas-rotas.test.ts tests/unit/tabelas-do-motor-nao-se-leem-pelo-login.test.ts && corepack pnpm prettier --write lib/escale/negocio/notas.ts "app/api/v1/leads/[id]/notas/route.ts" "app/api/v1/leads/[id]/notas/[notaId]/route.ts" hooks/escale/useNotasDoNegocio.ts tests/unit/escale-ficha-notas-rotas.test.ts && corepack pnpm eslint lib/escale/negocio/notas.ts "app/api/v1/leads/[id]/notas" hooks/escale/useNotasDoNegocio.ts && corepack pnpm typecheck`
Expected: PASS; typecheck limpo. Se a cerca `navegacao-completude` ou outra reclamar de rota sem teste de contrato (`grep -rn "notas" tests/unit/*rotas* | head`), siga a mensagem.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/negocio/notas.ts "app/api/v1/leads/[id]/notas" hooks/escale/useNotasDoNegocio.ts tests/unit/escale-ficha-notas-rotas.test.ts
git commit -m "feat(escale): rotas e hook das notas do negócio (Fase 1H, C15)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 9: O modal "Nova nota" e as portas (ação rápida e ⋮)

**Files:**
- Create: `components/escale/negocio/JanelaDeNota.tsx`, `tests/unit/escale-ficha-janela-de-nota.test.tsx`
- Modify: `components/escale/negocio/AcoesDaFicha.tsx`, `components/escale/negocio/MenuDaFicha.tsx`, `tests/unit/escale-ficha-acoes-e-menu.test.tsx`

**Interfaces:**
- Consumes: `JanelaDaCasca` (`components/escale/origens/JanelaDaCasca`, `{ aberta, onFechar, children }`); `DialogTitle`/`DialogDescription` (`components/ui/dialog`); `AjudaDaCasca({ texto })`; `useCriarNota`, `useEditarNota` (Task 8); `MAX_TEXTO_DA_NOTA`.
- Produces: `JanelaDeNota({ leadId, aberta, onFechar, nota? })` — com `nota` (`{ id, texto }`) é "Editar nota".

**Detalhes visuais (código da Clint; sem print, nº 5):** janela de 2xl (a `JanelaDaCasca` com `className` de largura `w-[min(42rem,calc(100vw-2rem))]`: acrescente a prop opcional `className` à `JanelaDaCasca` se ela não tiver), título "Nova nota" com o "i" (`AjudaDaCasca` com a dica 10608), textarea de 160px com "Clique aqui para adicionar", contador "N/4000" em 11px `casca-meta`, rodapé "Cancelar" (texto) e "Salvar" (marca).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-janela-de-nota.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
const notas = vi.hoisted(() => ({ criar: vi.fn(async () => ({})), editar: vi.fn(async () => ({})) }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useCriarNota: () => ({ mutateAsync: notas.criar, isPending: false }),
  useEditarNota: () => ({ mutateAsync: notas.editar, isPending: false }),
}));

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";

/** FORK ESCALE · Fase 1H (C15, N7): o modal "Nova nota" da Clint. */
beforeEach(() => vi.clearAllMocks());

describe("JanelaDeNota", () => {
  it("título, dica, textarea e Salvar desligado até haver texto; salvar cria e fecha", async () => {
    const onFechar = vi.fn();
    render(<JanelaDeNota leadId="n1" aberta onFechar={onFechar} />);
    expect(screen.getByRole("dialog", { name: "Nova nota" })).toBeInTheDocument();
    expect(
      screen.getByText("Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato."),
    ).toBeInTheDocument();
    const caixa = screen.getByRole("textbox", { name: "Nova nota" });
    expect(caixa).toHaveAttribute("placeholder", "Clique aqui para adicionar");
    expect(screen.getByRole("button", { name: "Salvar" })).toBeDisabled();
    await userEvent.type(caixa, "Ligar amanhã");
    expect(screen.getByText("12/4000")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(notas.criar).toHaveBeenCalledWith("Ligar amanhã");
    expect(onFechar).toHaveBeenCalled();
  });

  it("com nota, é 'Editar nota' e grava pelo editar", async () => {
    const onFechar = vi.fn();
    render(<JanelaDeNota leadId="n1" aberta onFechar={onFechar} nota={{ id: "x1", texto: "antiga" }} />);
    expect(screen.getByRole("dialog", { name: "Editar nota" })).toBeInTheDocument();
    const caixa = screen.getByRole("textbox", { name: "Editar nota" });
    expect(caixa).toHaveValue("antiga");
    await userEvent.type(caixa, " e nova");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(notas.editar).toHaveBeenCalledWith({ notaId: "x1", texto: "antiga e nova" });
  });

  it("erro ao salvar mostra o toast da Clint e não fecha", async () => {
    const { toast } = await import("sonner");
    notas.criar.mockRejectedValueOnce(new Error("x"));
    const onFechar = vi.fn();
    render(<JanelaDeNota leadId="n1" aberta onFechar={onFechar} />);
    await userEvent.type(screen.getByRole("textbox", { name: "Nova nota" }), "a");
    await userEvent.click(screen.getByRole("button", { name: "Salvar" }));
    expect(toast.error).toHaveBeenCalledWith("Ocorreu um erro ao salvar a nota!");
    expect(onFechar).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-janela-de-nota.test.tsx`
Expected: FAIL.

- [ ] **Step 3: O modal**

Create `components/escale/negocio/JanelaDeNota.tsx`:

```tsx
"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useCriarNota, useEditarNota } from "@/hooks/escale/useNotasDoNegocio";
import { useT } from "@/hooks/i18n/useT";
import { MAX_TEXTO_DA_NOTA } from "@/lib/escale/negocio/notas";

/**
 * O MODAL "NOVA NOTA" DA CLINT (fork Escale, Fase 1H; C15, N7; NoteModal).
 * Título com o "i" (a dica 10608), a caixa de texto (texto simples, Q9), o
 * contador, "Cancelar" e "Salvar". Com `nota`, é "Editar nota".
 */
export function JanelaDeNota({
  leadId,
  aberta,
  onFechar,
  nota,
}: {
  leadId: string;
  aberta: boolean;
  onFechar: () => void;
  nota?: { id: string; texto: string };
}) {
  const t = useT();
  const criar = useCriarNota(leadId);
  const editar = useEditarNota(leadId);
  const [texto, setTexto] = useState(nota?.texto ?? "");
  useEffect(() => {
    if (aberta) setTexto(nota?.texto ?? "");
  }, [aberta, nota?.texto]);
  const titulo = nota ? t("Editar nota") : t("Nova nota");
  const salvando = criar.isPending || editar.isPending;
  const limpo = texto.trim();

  async function salvar() {
    if (!limpo) return;
    try {
      if (nota) {
        await editar.mutateAsync({ notaId: nota.id, texto: limpo });
        toast.success(t("A nota foi editada com sucesso!"));
      } else {
        await criar.mutateAsync(limpo);
        toast.success(t("A nota foi salva com sucesso!"));
      }
      onFechar();
    } catch {
      toast.error(t("Ocorreu um erro ao salvar a nota!"));
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={onFechar} className="w-[min(42rem,calc(100vw-2rem))]">
      <DialogTitle className="flex items-center gap-2 text-[15px] font-semibold text-casca-texto">
        {titulo}
        <AjudaDaCasca
          texto={t("Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato.")}
        />
      </DialogTitle>
      <DialogDescription className="sr-only">{titulo}</DialogDescription>
      <textarea
        autoFocus
        aria-label={titulo}
        placeholder={t("Clique aqui para adicionar")}
        maxLength={MAX_TEXTO_DA_NOTA}
        value={texto}
        disabled={salvando}
        onChange={(e) => setTexto(e.target.value)}
        className="h-40 w-full resize-y rounded-md bg-casca-busca p-3 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
      />
      <p className="-mt-3 text-right text-[11px] text-casca-meta">{`${texto.length}/${MAX_TEXTO_DA_NOTA}`}</p>
      <div className="flex justify-end gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={onFechar} disabled={salvando}>
          {t("Cancelar")}
        </BotaoDaCasca>
        <BotaoDaCasca variante="marca" tamanho="md" onClick={() => void salvar()} disabled={!limpo || salvando}>
          {t("Salvar")}
        </BotaoDaCasca>
      </div>
    </JanelaDaCasca>
  );
}
```

Se a `JanelaDaCasca` não aceitar `className`, acrescente a prop (`className?: string`, aplicada com `cn(…)` no `DialogPrimitive.Content`, depois das classes de largura, para a nova vencer). A `AjudaDaCasca` mostra a dica num tooltip: confira se o texto fica no DOM (o teste usa `getByText`); se ela só montar no hover, troque no teste por `screen.getByRole("button", { name: /Ao inserir/ })` ou o papel que ela expõe.

- [ ] **Step 4: As portas**

Em `components/escale/negocio/AcoesDaFicha.tsx` e `components/escale/negocio/MenuDaFicha.tsx` (1G PR B): o ícone "Nova nota" da linha de ações e o item "Nova nota" do ⋮ deixam de ser `disabled`/"Em breve" e abrem a janela: um `const [nota, setNota] = useState(false)` no componente, `onClick={() => setNota(true)}` no botão/item, e `<JanelaDeNota leadId={lead.id} aberta={nota} onFechar={() => setNota(false)} />` no fim do JSX. Em `tests/unit/escale-ficha-acoes-e-menu.test.tsx`, os `it` que pinavam "Nova nota" desligado passam a: clicar abre `screen.getByRole("dialog", { name: "Nova nota" })` (com os mocks de `useCriarNota`/`useEditarNota` como no arquivo novo).

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-janela-de-nota.test.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write components/escale/negocio/JanelaDeNota.tsx tests/unit/escale-ficha-janela-de-nota.test.tsx && corepack pnpm eslint components/escale/negocio/JanelaDeNota.tsx components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/MenuDaFicha.tsx components/escale/origens/JanelaDaCasca.tsx && corepack pnpm typecheck`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add components/escale/negocio/JanelaDeNota.tsx components/escale/negocio/AcoesDaFicha.tsx components/escale/negocio/MenuDaFicha.tsx components/escale/origens/JanelaDaCasca.tsx tests/unit/escale-ficha-janela-de-nota.test.tsx tests/unit/escale-ficha-acoes-e-menu.test.tsx
git commit -m "feat(escale): o modal Nova nota na ficha do negócio (Fase 1H, C15)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 10: Arquivos: regras, rotas (upload, lista, download, excluir) e hook (C17)

**Files:**
- Create: `lib/escale/negocio/arquivos.ts`, `app/api/v1/contacts/[id]/arquivos/route.ts`, `app/api/v1/contacts/[id]/arquivos/[arquivoId]/route.ts`, `hooks/escale/useArquivosDoContato.ts`, `tests/unit/escale-ficha-arquivos-regras.test.ts`, `tests/unit/escale-ficha-arquivos-rotas.test.ts`

**Interfaces:**
- Consumes: `requireRole`, `requireSupportWrite`, `createClient` (sessão), `createAdminClient` (`lib/supabase/admin`, storage), `ok`/`fail`/`noContent`, `traduzir`, `logger`, `audit`.
- Produces: `Arquivo` (`{ id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, created_at }`), `EXTENSOES_ACEITAS`, `MAX_ARQUIVO_BYTES` (25 MB), `BUCKET_DOS_ARQUIVOS`, `extensaoDe(nome)`, `validarArquivo({ nome, tamanho })`, `mimeDaExtensao(ext)`, `familiaDaExtensao(ext)`, `formatarTamanho(bytes)`, `dataHoraBr(iso)`, `caminhoNoBucket(orgId, contactId, id, ext)`, `caminhoPertenceA(path, orgId, contactId)`, `FiltroDeArquivos`, `filtrarArquivos(lista, filtro)`, `ColunaDeArquivos`, `ordenarArquivos(lista, coluna, direcao)`, `rotaDosArquivos(contactId)`; rotas `GET/POST /api/v1/contacts/[id]/arquivos` e `GET(302)/DELETE /api/v1/contacts/[id]/arquivos/[arquivoId]`; `useArquivosDoContato(contactId)`, `useEnviarArquivos(contactId, leadId)` (`mutateAsync(files: File[])` → `{ enviados: number; falhas: string[] }`), `useExcluirArquivo(contactId)`, `chaveDosArquivos(contactId)`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-ficha-arquivos-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  caminhoNoBucket,
  caminhoPertenceA,
  dataHoraBr,
  extensaoDe,
  familiaDaExtensao,
  filtrarArquivos,
  formatarTamanho,
  mimeDaExtensao,
  ordenarArquivos,
  validarArquivo,
  type Arquivo,
} from "@/lib/escale/negocio/arquivos";

/** FORK ESCALE · Fase 1H (C17, N8): as regras puras dos arquivos do contato. */
const arq = (nome: string, extra: Partial<Arquivo> = {}): Arquivo => ({
  id: nome,
  contact_id: "c1",
  lead_id: null,
  user_id: "u1",
  user_nome: "Ana",
  nome,
  extensao: extensaoDe(nome) ?? "",
  mime: "application/octet-stream",
  tamanho: 10,
  created_at: "2026-10-17T13:05:09Z",
  ...extra,
});

describe("extensão, tamanho e tipo", () => {
  it("extensaoDe lê a última extensão, minúscula; sem extensão é null", () => {
    expect(extensaoDe("Contrato.Final.PDF")).toBe("pdf");
    expect(extensaoDe("semext")).toBeNull();
  });
  it("validarArquivo aceita a lista da Clint até 25 MB", () => {
    expect(validarArquivo({ nome: "a.pdf", tamanho: 1 })).toEqual({ ok: true, extensao: "pdf" });
    expect(validarArquivo({ nome: "a.exe", tamanho: 1 })).toEqual({ ok: false, erro: "Tipo de arquivo não suportado." });
    expect(validarArquivo({ nome: "a.pdf", tamanho: 25 * 1024 * 1024 + 1 })).toEqual({
      ok: false,
      erro: "O arquivo {fileName} excede o limite de {maxMb} MB.",
    });
    expect(validarArquivo({ nome: "a.pdf", tamanho: 0 })).toEqual({ ok: false, erro: "Arquivo vazio." });
  });
  it("mime pela extensão e a família do ícone", () => {
    expect(mimeDaExtensao("png")).toBe("image/png");
    expect(mimeDaExtensao("xlsx")).toBe("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    expect(familiaDaExtensao("jpg")).toBe("imagem");
    expect(familiaDaExtensao("csv")).toBe("planilha");
    expect(familiaDaExtensao("mp3")).toBe("audio");
    expect(familiaDaExtensao("zip")).toBe("pacote");
    expect(familiaDaExtensao("pdf")).toBe("documento");
  });
  it("tamanho e data no formato brasileiro", () => {
    expect(formatarTamanho(512)).toBe("512 B");
    expect(formatarTamanho(1536)).toBe("1,5 KB");
    expect(formatarTamanho(2 * 1024 * 1024)).toBe("2,0 MB");
    expect(dataHoraBr("2026-10-17T13:05:09Z", "UTC")).toBe("17/10/2026 13:05:09");
  });
});

describe("o caminho no bucket", () => {
  it("é org/contato/id.ext e só pertence ao prefixo exato", () => {
    expect(caminhoNoBucket("o1", "c1", "a1", "pdf")).toBe("o1/c1/a1.pdf");
    expect(caminhoPertenceA("o1/c1/a1.pdf", "o1", "c1")).toBe(true);
    expect(caminhoPertenceA("o1/c2/a1.pdf", "o1", "c1")).toBe(false);
    expect(caminhoPertenceA("o1/c1/../x.pdf", "o1", "c1")).toBe(false);
  });
});

describe("filtro e ordenação", () => {
  const lista = [
    arq("contrato.pdf", { created_at: "2026-10-10T10:00:00Z" }),
    arq("foto.png", { created_at: "2026-10-17T10:00:00Z", tamanho: 5 }),
    arq("planilha.xlsx", { created_at: "2026-10-15T10:00:00Z", user_nome: "Bia" }),
  ];
  it("busca pelo nome, período pela data de upload, extensões em múltipla escolha", () => {
    expect(filtrarArquivos(lista, { busca: "FOTO", extensoes: [] }).map((a) => a.nome)).toEqual(["foto.png"]);
    expect(filtrarArquivos(lista, { busca: "", de: "2026-10-15", ate: "2026-10-16", extensoes: [] }).map((a) => a.nome)).toEqual(["planilha.xlsx"]);
    expect(filtrarArquivos(lista, { busca: "", extensoes: ["pdf", "png"] }).map((a) => a.nome)).toEqual(["contrato.pdf", "foto.png"]);
  });
  it("ordena por nome, data e usuário, nos dois sentidos; o padrão é data desc", () => {
    expect(ordenarArquivos(lista, "data", "desc").map((a) => a.nome)).toEqual(["foto.png", "planilha.xlsx", "contrato.pdf"]);
    expect(ordenarArquivos(lista, "nome", "asc").map((a) => a.nome)).toEqual(["contrato.pdf", "foto.png", "planilha.xlsx"]);
    expect(ordenarArquivos(lista, "usuario", "asc").map((a) => a.user_nome)).toEqual(["Ana", "Ana", "Bia"]);
  });
});
```

Create `tests/unit/escale-ficha-arquivos-rotas.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { requireRole } from "@/lib/auth/require-role";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { GET, POST } from "@/app/api/v1/contacts/[id]/arquivos/route";
import { DELETE, GET as BAIXAR } from "@/app/api/v1/contacts/[id]/arquivos/[arquivoId]/route";

vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn() }));
vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/logger", () => ({ logger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() } }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn(async () => undefined) }));

/** FORK ESCALE · Fase 1H (C17, N8): upload por rota, download por URL assinada, exclusão pela RLS. */
const ORG = "22222222-2222-4222-8222-222222222222";
const USER = "11111111-1111-4111-8111-111111111111";
const CONTATO = "33333333-3333-4333-8333-333333333333";
const ARQ = "44444444-4444-4444-8444-444444444444";

type Linha = Record<string, unknown>;
function fakeSupabase(estado: { contatos: Linha[]; arquivos: Linha[] }) {
  const op = { tabela: "", acao: "select" as "select" | "insert" | "delete", filtros: [] as [string, unknown][], valores: {} as Linha };
  const resolver = () => {
    const base = op.tabela === "contacts" ? estado.contatos : estado.arquivos;
    const linhas = base.filter((l) => op.filtros.every(([c, v]) => l[c] === v));
    if (op.acao === "insert") {
      const nova = { id: ARQ, created_at: "2026-10-17T10:00:00Z", ...op.valores };
      estado.arquivos.push(nova);
      return { data: nova, error: null };
    }
    if (op.acao === "delete") {
      estado.arquivos = estado.arquivos.filter((l) => !linhas.includes(l));
      return { data: linhas, error: null };
    }
    return { data: linhas, error: null };
  };
  const cadeia: Record<string, unknown> = {};
  const self = () => cadeia;
  Object.assign(cadeia, {
    from: (tabela: string) => ((op.tabela = tabela), (op.acao = "select"), (op.filtros = []), (op.valores = {}), cadeia),
    select: self,
    order: self,
    insert: (v: Linha) => ((op.acao = "insert"), (op.valores = v), cadeia),
    delete: () => ((op.acao = "delete"), cadeia),
    eq: (c: string, v: unknown) => (op.filtros.push([c, v]), cadeia),
    maybeSingle: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
    },
    single: async () => {
      const r = resolver();
      return { data: Array.isArray(r.data) ? (r.data[0] ?? null) : r.data, error: null };
    },
    then: (res: (v: unknown) => void) => res(resolver()),
  });
  return cadeia;
}

const storage = vi.hoisted(() => ({
  upload: vi.fn(async () => ({ data: { path: "x" }, error: null })),
  createSignedUrl: vi.fn(async () => ({ data: { signedUrl: "https://assinada/x.pdf?token=1" }, error: null })),
  remove: vi.fn(async () => ({ data: [], error: null })),
}));

function sessao(role: "viewer" | "agent" | "manager") {
  vi.mocked(requireRole).mockImplementation(async (min) => {
    const rank = { viewer: 1, agent: 2, manager: 3 };
    if (rank[role] < rank[min as "viewer" | "agent" | "manager"]) return { ok: false, response: new Response(null, { status: 403 }) } as never;
    return { ok: true, user: { id: USER, full_name: "Ana", idioma: "pt-BR" }, org: { orgId: ORG, role } } as never;
  });
}
const ctx = (extra: Record<string, string> = {}) => ({ params: Promise.resolve({ id: CONTATO, ...extra }) });
function envio(nome: string, tipo: string, bytes: number) {
  const fd = new FormData();
  fd.append("file", new File([new Uint8Array(bytes)], nome, { type: tipo }));
  return new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`, { method: "POST", body: fd });
}

let estado: { contatos: Linha[]; arquivos: Linha[] };
beforeEach(() => {
  vi.clearAllMocks();
  estado = {
    contatos: [{ id: CONTATO, organization_id: ORG }],
    arquivos: [{ id: ARQ, organization_id: ORG, contact_id: CONTATO, user_id: USER, nome: "contrato.pdf", extensao: "pdf", mime: "application/pdf", tamanho: 3, storage_path: `${ORG}/${CONTATO}/${ARQ}.pdf` }],
  };
  vi.mocked(createClient).mockResolvedValue(fakeSupabase(estado) as never);
  vi.mocked(createAdminClient).mockReturnValue({ storage: { from: () => storage } } as never);
});

describe("GET lista", () => {
  it("viewer lista os arquivos do contato, sem o storage_path", async () => {
    sessao("viewer");
    const res = await GET(new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`), ctx());
    expect(res.status).toBe(200);
    const corpo = (await res.json()) as { data: Record<string, unknown>[] };
    expect(corpo.data[0]).toMatchObject({ nome: "contrato.pdf" });
    expect(corpo.data[0]).not.toHaveProperty("storage_path");
  });
});

describe("POST upload", () => {
  it("agent envia um PDF: grava no bucket em org/contato/id.ext e na tabela, como autor", async () => {
    sessao("agent");
    const res = await POST(envio("Proposta.pdf", "application/pdf", 3), ctx());
    expect(res.status).toBe(201);
    const corpo = (await res.json()) as { data: Record<string, unknown> };
    expect(corpo.data).toMatchObject({ nome: "Proposta.pdf", extensao: "pdf", user_id: USER, user_nome: "Ana", tamanho: 3 });
    expect(storage.upload).toHaveBeenCalledWith(
      expect.stringMatching(new RegExp(`^${ORG}/${CONTATO}/[0-9a-f-]{36}\\.pdf$`)),
      expect.anything(),
      expect.objectContaining({ contentType: "application/pdf", upsert: false }),
    );
  });
  it("viewer 403; extensão fora da lista 415; acima de 25 MB 413; contato de outra organização 404", async () => {
    sessao("viewer");
    expect((await POST(envio("a.pdf", "application/pdf", 1), ctx())).status).toBe(403);
    sessao("agent");
    expect((await POST(envio("virus.exe", "application/octet-stream", 1), ctx())).status).toBe(415);
    const grande = new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos`, {
      method: "POST",
      body: new FormData(),
      headers: { "content-length": String(30 * 1024 * 1024) },
    });
    expect((await POST(grande, ctx())).status).toBe(413);
    estado.contatos = [];
    expect((await POST(envio("a.pdf", "application/pdf", 1), ctx())).status).toBe(404);
  });
  it("se a tabela recusar, o objeto do bucket é removido", async () => {
    sessao("agent");
    const cliente = fakeSupabase(estado) as Record<string, unknown>;
    cliente.single = async () => ({ data: null, error: { message: "rls" } });
    vi.mocked(createClient).mockResolvedValue(cliente as never);
    const res = await POST(envio("a.pdf", "application/pdf", 1), ctx());
    expect(res.status).toBe(500);
    expect(storage.remove).toHaveBeenCalled();
  });
});

describe("GET download e DELETE", () => {
  it("o download é um 302 para a URL assinada, sem cache", async () => {
    sessao("viewer");
    const res = await BAIXAR(new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos/${ARQ}`), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(302);
    expect(res.headers.get("location")).toBe("https://assinada/x.pdf?token=1");
    expect(res.headers.get("cache-control")).toBe("private, no-store");
    expect(storage.createSignedUrl).toHaveBeenCalledWith(`${ORG}/${CONTATO}/${ARQ}.pdf`, 60, { download: "contrato.pdf" });
  });
  it("excluir apaga a linha (a RLS decide) e depois o objeto; zero linhas é 404", async () => {
    sessao("agent");
    const res = await DELETE(new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos/${ARQ}`, { method: "DELETE" }), ctx({ arquivoId: ARQ }));
    expect(res.status).toBe(204);
    expect(storage.remove).toHaveBeenCalledWith([`${ORG}/${CONTATO}/${ARQ}.pdf`]);
    const outra = await DELETE(new NextRequest(`http://localhost/api/v1/contacts/${CONTATO}/arquivos/${ARQ}`, { method: "DELETE" }), ctx({ arquivoId: ARQ }));
    expect(outra.status).toBe(404);
  });
});
```

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-arquivos-regras.test.ts tests/unit/escale-ficha-arquivos-rotas.test.ts`
Expected: FAIL.

- [ ] **Step 3: As regras**

Create `lib/escale/negocio/arquivos.ts`:

```ts
/**
 * ARQUIVOS DO CONTATO (fork Escale, Fase 1H; C17, N8): regras puras. Sem
 * React e sem rede. A lista de extensões, o limite de 25 MB e o filtro por
 * extensão são os da Clint (`Cx`, `ImportModal`); o caminho no bucket segue o
 * padrão do anexo de nota interna do original (`{org}/{dono}/{id}.{ext}`).
 */
export interface Arquivo {
  id: string;
  contact_id: string;
  lead_id: string | null;
  user_id: string;
  user_nome: string | null;
  nome: string;
  extensao: string;
  mime: string;
  tamanho: number;
  created_at: string;
}

export const BUCKET_DOS_ARQUIVOS = "arquivos-do-contato";
export const MAX_ARQUIVO_MB = 25;
export const MAX_ARQUIVO_BYTES = MAX_ARQUIVO_MB * 1024 * 1024;
export const COLUNAS_DO_ARQUIVO = "id, contact_id, lead_id, user_id, user_nome, nome, extensao, mime, tamanho, created_at";

export const EXTENSOES_ACEITAS = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "txt", "csv",
  "jpg", "jpeg", "png", "gif", "svg", "zip", "rar", "mp4", "avi", "mp3", "wav",
] as const;
export type Extensao = (typeof EXTENSOES_ACEITAS)[number];
export const ACCEPT_DO_INPUT = EXTENSOES_ACEITAS.map((e) => `.${e}`).join(",");

const MIME: Record<Extensao, string> = {
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  ppt: "application/vnd.ms-powerpoint",
  pptx: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
  txt: "text/plain",
  csv: "text/csv",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  svg: "image/svg+xml",
  zip: "application/zip",
  rar: "application/vnd.rar",
  mp4: "video/mp4",
  avi: "video/x-msvideo",
  mp3: "audio/mpeg",
  wav: "audio/wav",
};

export type FamiliaDoArquivo = "imagem" | "planilha" | "audio" | "video" | "pacote" | "documento";

export function extensaoDe(nome: string): string | null {
  const i = nome.lastIndexOf(".");
  return i > 0 && i < nome.length - 1 ? nome.slice(i + 1).toLowerCase() : null;
}

export const extensaoAceita = (ext: string | null): ext is Extensao =>
  ext !== null && (EXTENSOES_ACEITAS as readonly string[]).includes(ext);

export type Validacao = { ok: true; extensao: Extensao } | { ok: false; erro: string };

export function validarArquivo(a: { nome: string; tamanho: number }): Validacao {
  if (!a.tamanho || a.tamanho <= 0) return { ok: false, erro: "Arquivo vazio." };
  if (a.tamanho > MAX_ARQUIVO_BYTES) return { ok: false, erro: "O arquivo {fileName} excede o limite de {maxMb} MB." };
  const ext = extensaoDe(a.nome);
  if (!extensaoAceita(ext)) return { ok: false, erro: "Tipo de arquivo não suportado." };
  return { ok: true, extensao: ext };
}

export const mimeDaExtensao = (ext: Extensao): string => MIME[ext];

export function familiaDaExtensao(ext: string): FamiliaDoArquivo {
  if (["jpg", "jpeg", "png", "gif", "svg"].includes(ext)) return "imagem";
  if (["xls", "xlsx", "csv"].includes(ext)) return "planilha";
  if (["mp3", "wav"].includes(ext)) return "audio";
  if (["mp4", "avi"].includes(ext)) return "video";
  if (["zip", "rar"].includes(ext)) return "pacote";
  return "documento";
}

/** "512 B", "1,5 KB", "2,0 MB" (vírgula, como pede a regra 5 do CLAUDE.md). */
export function formatarTamanho(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const unidades = ["KB", "MB", "GB"];
  let valor = bytes / 1024;
  let i = 0;
  while (valor >= 1024 && i < unidades.length - 1) {
    valor /= 1024;
    i += 1;
  }
  return `${valor.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ${unidades[i]}`;
}

/** "17/10/2026 13:05:09" (a tabela da Clint mostra dd/mm/aaaa hh:mm:ss). */
export function dataHoraBr(iso: string, timeZone?: string): string {
  const d = new Date(iso);
  const data = d.toLocaleDateString("pt-BR", { timeZone, day: "2-digit", month: "2-digit", year: "numeric" });
  const hora = d.toLocaleTimeString("pt-BR", { timeZone, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  return `${data} ${hora}`;
}

export const caminhoNoBucket = (orgId: string, contactId: string, id: string, ext: string) =>
  `${orgId}/${contactId}/${id}.${ext}`;

export function caminhoPertenceA(path: string, orgId: string, contactId: string): boolean {
  const partes = path.split("/");
  return (
    partes.length === 3 &&
    partes[0] === orgId &&
    partes[1] === contactId &&
    !!partes[2] &&
    !partes[2].includes("..") &&
    !path.includes("\\")
  );
}

export interface FiltroDeArquivos {
  busca: string;
  de?: string;
  ate?: string;
  extensoes: readonly string[];
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** A data local (aaaa-mm-dd) do upload, para comparar com o período escolhido. */
function diaLocal(iso: string): string {
  const d = new Date(iso);
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${mm}-${dd}`;
}

export function filtrarArquivos(lista: readonly Arquivo[], f: FiltroDeArquivos): Arquivo[] {
  const termo = semAcento(f.busca.trim());
  return lista.filter((a) => {
    if (termo && !semAcento(a.nome).includes(termo)) return false;
    const dia = diaLocal(a.created_at);
    if (f.de && dia < f.de) return false;
    if (f.ate && dia > f.ate) return false;
    if (f.extensoes.length && !f.extensoes.includes(a.extensao)) return false;
    return true;
  });
}

export type ColunaDeArquivos = "nome" | "data" | "usuario";
export type Direcao = "asc" | "desc";

export function ordenarArquivos(lista: readonly Arquivo[], coluna: ColunaDeArquivos, direcao: Direcao): Arquivo[] {
  const sinal = direcao === "asc" ? 1 : -1;
  const chave = (a: Arquivo) =>
    coluna === "nome" ? a.nome.toLowerCase() : coluna === "usuario" ? (a.user_nome ?? "").toLowerCase() : a.created_at;
  return [...lista].sort((a, b) => (chave(a) < chave(b) ? -sinal : chave(a) > chave(b) ? sinal : 0));
}

export const rotaDosArquivos = (contactId: string) => `/api/v1/contacts/${contactId}/arquivos`;
```

- [ ] **Step 4: As rotas**

Create `app/api/v1/contacts/[id]/arquivos/route.ts`:

```ts
/**
 * GET/POST /api/v1/contacts/:id/arquivos — os ARQUIVOS do contato (fork Escale,
 * Fase 1H; C17). GET: qualquer papel (a RLS filtra). POST: agent ou acima,
 * multipart com o campo `file`; o binário vai para o bucket privado pelo
 * service role (não há policy de escrita em storage.objects) e a linha é
 * gravada com a sessão (a RLS exige o autor). Se a linha falhar, o objeto é
 * removido. O mesmo desenho do anexo de nota interna do original.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import {
  BUCKET_DOS_ARQUIVOS,
  COLUNAS_DO_ARQUIVO,
  MAX_ARQUIVO_BYTES,
  MAX_ARQUIVO_MB,
  caminhoNoBucket,
  mimeDaExtensao,
  validarArquivo,
  type Arquivo,
} from "@/lib/escale/negocio/arquivos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;
const FOLGA_DO_MULTIPART = 1024 * 1024;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_arquivos_do_contato")
    .select(COLUNAS_DO_ARQUIVO)
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .order("created_at", { ascending: false });
  if (error) {
    logger.error("arquivos.listar", { requestId, error: error.message });
    return fail("internal_error", t("Não consegui carregar os arquivos."), 500, { requestId });
  }
  return ok((data ?? []) as Arquivo[], { requestId });
}

export async function POST(req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await ctx.params;
  if (!uuidValido(id)) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  // Guarda contra corpo gigante antes de ler o multipart.
  const declarado = Number(req.headers.get("content-length") ?? 0);
  if (declarado > MAX_ARQUIVO_BYTES + FOLGA_DO_MULTIPART) {
    return fail("payload_too_large", t("O arquivo {fileName} excede o limite de {maxMb} MB.").replace("{fileName}", "").replace("{maxMb}", String(MAX_ARQUIVO_MB)), 413, { requestId });
  }

  let arquivo: File | null = null;
  try {
    const form = await req.formData();
    const campo = form.get("file");
    arquivo = campo instanceof File ? campo : null;
  } catch {
    return fail("invalid_request", t("Envie o arquivo no campo file."), 400, { requestId });
  }
  if (!arquivo) return fail("invalid_request", t("Envie o arquivo no campo file."), 400, { requestId });

  const validacao = validarArquivo({ nome: arquivo.name, tamanho: arquivo.size });
  if (!validacao.ok) {
    const status = validacao.erro.startsWith("O arquivo") ? 413 : validacao.erro.startsWith("Tipo") ? 415 : 422;
    const codigo = status === 413 ? "payload_too_large" : status === 415 ? "unsupported_media_type" : "validation_failed";
    return fail(codigo, t(validacao.erro).replace("{fileName}", arquivo.name).replace("{maxMb}", String(MAX_ARQUIVO_MB)), status, { requestId });
  }

  const supabase = await createClient();
  const { data: contato } = await supabase
    .from("contacts")
    .select("id")
    .eq("organization_id", authz.org.orgId)
    .eq("id", id)
    .maybeSingle();
  if (!contato) return fail("not_found", t("Contato não encontrado."), 404, { requestId });

  const leadId = req.nextUrl.searchParams.get("negocio");
  const arquivoId = randomUUID();
  const mime = mimeDaExtensao(validacao.extensao);
  const path = caminhoNoBucket(authz.org.orgId, id, arquivoId, validacao.extensao);
  const admin = createAdminClient();
  const bytes = Buffer.from(await arquivo.arrayBuffer());
  const subida = await admin.storage.from(BUCKET_DOS_ARQUIVOS).upload(path, bytes, { contentType: mime, upsert: false });
  if (subida.error) {
    logger.error("arquivos.upload", { requestId, error: subida.error.message });
    return fail("internal_error", t("Erro ao enviar arquivo(s)"), 500, { requestId });
  }

  const { data: linha, error } = await supabase
    .from("crm_arquivos_do_contato")
    .insert({
      id: arquivoId,
      organization_id: authz.org.orgId,
      contact_id: id,
      lead_id: leadId && uuidValido(leadId) ? leadId : null,
      user_id: authz.user.id,
      user_nome: authz.user.full_name ?? null,
      nome: arquivo.name,
      extensao: validacao.extensao,
      mime,
      tamanho: arquivo.size,
      storage_path: path,
    })
    .select(COLUNAS_DO_ARQUIVO)
    .single();
  if (error || !linha) {
    logger.error("arquivos.gravar", { requestId, error: error?.message });
    await admin.storage.from(BUCKET_DOS_ARQUIVOS).remove([path]);
    return fail("internal_error", t("Erro ao enviar arquivo(s)"), 500, { requestId });
  }

  void audit({
    action: "contact.file_added",
    actorUserId: authz.user.id,
    organizationId: authz.org.orgId,
    resourceType: "crm_arquivos_do_contato",
    resourceId: arquivoId,
    metadata: { contact_id: id, lead_id: leadId ?? null, nome: arquivo.name, tamanho: arquivo.size },
  });
  return ok(linha as Arquivo, { requestId, status: 201 });
}
```

Create `app/api/v1/contacts/[id]/arquivos/[arquivoId]/route.ts`:

```ts
/**
 * GET/DELETE /api/v1/contacts/:id/arquivos/:arquivoId (fork Escale, Fase 1H; C17).
 * GET: 302 para a URL assinada de 60s (o service role assina; quem pode ver é a
 * RLS da tabela, consultada com a sessão). DELETE: a linha sai com a sessão
 * (a RLS: autor, ou gerente ou acima) e só então o objeto.
 */
import { randomUUID } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";

import { fail, noContent } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { BUCKET_DOS_ARQUIVOS, caminhoPertenceA } from "@/lib/escale/negocio/arquivos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

interface RouteCtx {
  params: Promise<{ id: string; arquivoId: string }>;
}
const uuidValido = (id: string) => z.string().uuid().safeParse(id).success;
const URL_ASSINADA_SEGUNDOS = 60;

export async function GET(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("viewer", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, arquivoId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(arquivoId)) return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const { data: linha } = await supabase
    .from("crm_arquivos_do_contato")
    .select("nome, storage_path")
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", arquivoId)
    .maybeSingle();
  if (!linha || !caminhoPertenceA(linha.storage_path, authz.org.orgId, id)) {
    return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });
  }

  const { data, error } = await createAdminClient()
    .storage.from(BUCKET_DOS_ARQUIVOS)
    .createSignedUrl(linha.storage_path, URL_ASSINADA_SEGUNDOS, { download: linha.nome });
  if (error || !data?.signedUrl) {
    logger.error("arquivos.assinar", { requestId, error: error?.message });
    return fail("internal_error", t("Não consegui abrir o arquivo."), 500, { requestId });
  }
  return NextResponse.redirect(data.signedUrl, { status: 302, headers: { "Cache-Control": "private, no-store" } });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx): Promise<Response> {
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const requestId = randomUUID();
  const authz = await requireRole("agent", { requestId, resource: "crm_arquivos_do_contato" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, arquivoId } = await ctx.params;
  if (!uuidValido(id) || !uuidValido(arquivoId)) return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("crm_arquivos_do_contato")
    .delete()
    .eq("organization_id", authz.org.orgId)
    .eq("contact_id", id)
    .eq("id", arquivoId)
    .select("storage_path");
  if (error) return fail("internal_error", t("Erro ao excluir arquivo"), 500, { requestId });
  if (!data || data.length === 0) return fail("not_found", t("Arquivo não encontrado."), 404, { requestId });

  const caminhos = data.map((l) => l.storage_path).filter((p) => caminhoPertenceA(p, authz.org.orgId, id));
  const { error: erroDoBucket } = await createAdminClient().storage.from(BUCKET_DOS_ARQUIVOS).remove(caminhos);
  if (erroDoBucket) logger.warn("arquivos.remover_objeto", { requestId, error: erroDoBucket.message });
  return noContent(requestId);
}
```

Os mesmos cuidados da Task 8 valem aqui: a assinatura de `ok` (status 201) e os campos de `AuditEntry`. No teste do 413, se o runtime do `NextRequest` descartar o `content-length` manual com corpo `FormData`, troque o corpo por uma string (`body: "x"`) só nesse caso: a rota recusa pelo cabeçalho antes de ler o corpo. O `lib/database.types.ts` não conhece as tabelas novas (ele é gerado do original): se o typecheck reclamar de `from("crm_arquivos_do_contato")`, siga o que a 9004 fez para `crm_filtros_salvos` (`grep -rn "crm_filtros_salvos" lib/database.types.ts lib/escale/filtros/*.ts | head`) e aplique o mesmo padrão (tipagem local ou o bloco do fork no `database.types.ts`).

- [ ] **Step 5: O hook**

Create `hooks/escale/useArquivosDoContato.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import { rotaDosArquivos, type Arquivo } from "@/lib/escale/negocio/arquivos";

/** ARQUIVOS DO CONTATO (fork Escale, Fase 1H; C17): ler, enviar (um por vez, multipart) e excluir. */
export const chaveDosArquivos = (contactId: string) => ["arquivos-do-contato", contactId] as const;

export function useArquivosDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDosArquivos(contactId ?? ""),
    enabled: !!contactId,
    queryFn: async () => (await apiClient.get<{ data: Arquivo[] }>(rotaDosArquivos(contactId as string))).data,
  });
}

export interface ResultadoDoEnvio {
  enviados: number;
  /** "nome.ext: mensagem" por arquivo que falhou. */
  falhas: string[];
}

export function useEnviarArquivos(contactId: string, leadId: string | null) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivos: File[]): Promise<ResultadoDoEnvio> => {
      const resultado: ResultadoDoEnvio = { enviados: 0, falhas: [] };
      const rota = leadId ? `${rotaDosArquivos(contactId)}?negocio=${leadId}` : rotaDosArquivos(contactId);
      for (const arquivo of arquivos) {
        const fd = new FormData();
        fd.append("file", arquivo);
        // `apiClient` manda JSON; o multipart vai por `fetch` cru, com o cookie da sessão.
        const res = await fetch(rota, { method: "POST", body: fd, credentials: "same-origin" });
        if (res.ok) resultado.enviados += 1;
        else {
          const corpo = (await res.json().catch(() => null)) as { error?: { message?: string } } | null;
          resultado.falhas.push(`${arquivo.name}: ${corpo?.error?.message ?? res.statusText}`);
        }
      }
      return resultado;
    },
    onSettled: () => void qc.invalidateQueries({ queryKey: chaveDosArquivos(contactId) }),
  });
}

export function useExcluirArquivo(contactId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (arquivoId: string) => apiClient.delete<void>(`${rotaDosArquivos(contactId)}/${arquivoId}`),
    onSuccess: () => void qc.invalidateQueries({ queryKey: chaveDosArquivos(contactId) }),
  });
}
```

Confira o formato de erro do `fail` (`lib/api/wrappers.ts`): se o corpo for `{ error: string, message }` ou outro, ajuste a leitura em `falhas`.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-arquivos-regras.test.ts tests/unit/escale-ficha-arquivos-rotas.test.ts tests/unit/tabelas-do-motor-nao-se-leem-pelo-login.test.ts && corepack pnpm prettier --write lib/escale/negocio/arquivos.ts "app/api/v1/contacts/[id]/arquivos/route.ts" "app/api/v1/contacts/[id]/arquivos/[arquivoId]/route.ts" hooks/escale/useArquivosDoContato.ts tests/unit/escale-ficha-arquivos-regras.test.ts tests/unit/escale-ficha-arquivos-rotas.test.ts && corepack pnpm eslint lib/escale/negocio/arquivos.ts "app/api/v1/contacts/[id]/arquivos" hooks/escale/useArquivosDoContato.ts && corepack pnpm typecheck`
Expected: PASS; typecheck limpo.

- [ ] **Step 7: Revisor (G1).** Dispare o `security-reviewer` com as duas rotas e a pergunta: "o caminho no bucket nunca sai do prefixo org/contato; a URL assinada só é gerada depois de a RLS devolver a linha; o DELETE só remove objeto cujo caminho pertence ao prefixo; o tamanho e a extensão são conferidos antes de ler o arquivo inteiro; nenhum mime do cliente é confiado?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 8: Commit**

```bash
git add lib/escale/negocio/arquivos.ts "app/api/v1/contacts/[id]/arquivos" hooks/escale/useArquivosDoContato.ts tests/unit/escale-ficha-arquivos-regras.test.ts tests/unit/escale-ficha-arquivos-rotas.test.ts
git commit -m "feat(escale): rotas e hook dos arquivos do contato (Fase 1H, C17)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 11: A aba Arquivos (C17)

**Files:**
- Create: `components/escale/negocio/abas/JanelaDeNovoDocumento.tsx`, `tests/unit/escale-ficha-aba-arquivos.test.tsx`
- Modify: `components/escale/negocio/abas/AbaArquivos.tsx`, `components/escale/negocio/ConteudoDaAba.tsx` (`<AbaArquivos lead={ficha.lead} />`), `components/escale/ui/CalendarioDePeriodo.tsx` (prop `semAbas`), `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` (o `describe` de Arquivos sai daqui e vai para o arquivo novo)

**Interfaces:**
- Consumes: Task 10 (lib e hooks); `CalendarioDePeriodo` (`{ valor: Periodo, aoMudar, tiposDisponiveis?, semAbas? }`); `SeletorMultiploDaCasca`; `PainelSuspenso`, `Popover`; `DropdownMenu*` (`components/ui/dropdown-menu`) com `CAIXA_DO_MENU`/`ITEM_DO_MENU` (`components/escale/quadro/estilos-do-menu`); `AlertDialog*`; `JanelaDaCasca`; `AjudaDaCasca`; `useUser()` (`id`) e `useActiveOrg()` (`role`) para "apaga o autor ou gerente+" na tela (`ROLE_RANK`, `lib/auth/types`).
- Produces: `AbaArquivos({ lead })`; `JanelaDeNovoDocumento({ aberta, onFechar, aoSalvar: (files: File[]) => Promise<void> })`.

**Detalhes visuais (print 06, 01-001):** a barra: busca 148×32, "Data ▾" e "Tipo de arquivo ▾" (botões de 32px, 13px, `casca-texto`, chevron 14px; quando há valor, o texto do botão mostra o resumo — "De 01/10/2026 a 17/10/2026" / "PDF, PNG"), "Limpar filtros" (texto, `casca-marca`) quando há filtro; à direita o "?" (`AjudaDaCasca`, "Faça upload de arquivos de até 25 MB para anexar ao contato") e "Novo arquivo" (borda, nuvem). A tabela: cabeçalho de 44px com ⇅ (`ArrowUpDown` 12px) em cada coluna, a ativa com `ArrowDownUp`... use `ArrowUpDown` e o `aria-sort`; linhas de 56px: ícone da família (20px, `casca-marca`) + nome (13px, truncado) com o tamanho embaixo (11px `casca-meta`); data (13px, direita); usuário = bolinha de 24px com a inicial + nome no `title`; o "⋯" (`EllipsisVertical`, 16px) aparece no hover (`group-hover:opacity-100`) e abre o menu com "Baixar arquivo" e "Excluir" (vermelho). O vazio é o da 1G. Sem o medidor "0.00 GB / 5.00 GB usados" (PRD §9). Modal "Novo documento" (sem print, nº 6): título, "Nenhum documento adicionado" (ou a lista: nome + tamanho + ✕ por linha), "Adicionar" (abre o `<input type=file multiple>` escondido), rodapé "Cancelar" e "Salvar".

- [ ] **Step 1: `semAbas` no calendário**

Em `components/escale/ui/CalendarioDePeriodo.tsx`: acrescente `semAbas?: boolean` em `CalendarioDePeriodoProps` e no destructuring (`semAbas = false`); envolva a coluna das abas (`<div role="tablist" …>…</div>`) em `{semAbas ? null : (…)}`. Com `semAbas`, o `tipo` do valor é ignorado pela tela (quem chama passa `tipo: "criacao"`). Teste: em `tests/unit/` ache o teste do calendário (`grep -l CalendarioDePeriodo tests/unit/*.tsx`) e acrescente:

```tsx
  it("semAbas: Arquivos e Conversas usam só os calendários e os atalhos", () => {
    render(<CalendarioDePeriodo valor={{ tipo: "criacao" }} aoMudar={() => undefined} semAbas />);
    expect(screen.queryByRole("tablist", { name: "Tipo de data" })).toBeNull();
    expect(screen.getByRole("button", { name: "Hoje" })).toBeInTheDocument();
  });
```

(ajuste o nome do atalho ao que o componente usa: `ATALHOS_DE_PERIODO` em `lib/escale/ui/periodos.ts`).

- [ ] **Step 2: O teste da aba (vai falhar)**

Create `tests/unit/escale-ficha-aba-arquivos.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({
  useUser: () => ({ id: "u1" }),
  useActiveOrg: () => ({ orgId: "org1", role: "agent" }),
}));
const arquivos = vi.hoisted(() => ({
  lista: [
    { id: "a1", contact_id: "c1", lead_id: "n1", user_id: "u1", user_nome: "Ana", nome: "contrato.pdf", extensao: "pdf", mime: "application/pdf", tamanho: 1536, created_at: "2026-10-17T13:05:09Z" },
    { id: "a2", contact_id: "c1", lead_id: null, user_id: "u2", user_nome: "Bia", nome: "foto.png", extensao: "png", mime: "image/png", tamanho: 10, created_at: "2026-10-10T10:00:00Z" },
  ],
  enviar: vi.fn(async () => ({ enviados: 1, falhas: [] })),
  excluir: vi.fn(async () => undefined),
}));
vi.mock("@/hooks/escale/useArquivosDoContato", () => ({
  useArquivosDoContato: () => ({ data: arquivos.lista, isLoading: false, isError: false }),
  useEnviarArquivos: () => ({ mutateAsync: arquivos.enviar, isPending: false }),
  useExcluirArquivo: () => ({ mutateAsync: arquivos.excluir, isPending: false }),
}));

import { AbaArquivos } from "@/components/escale/negocio/abas/AbaArquivos";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C17): a aba Arquivos da Clint (print 06). */
const LEAD = { id: "n1", contact_id: "c1" } as unknown as Lead;
beforeEach(() => vi.clearAllMocks());

describe("a tabela", () => {
  it("lista nome, tamanho, data e usuário; data desc por padrão; clicar no cabeçalho reordena", async () => {
    render(<AbaArquivos lead={LEAD} />);
    const linhas = () => screen.getAllByRole("row").slice(1).map((r) => within(r).getAllByRole("cell")[0]?.textContent);
    expect(linhas()[0]).toContain("contrato.pdf");
    expect(linhas()[0]).toContain("1,5 KB");
    expect(screen.getByText(/17\/10\/2026 \d{2}:05:09/)).toBeInTheDocument();
    expect(screen.getByTitle("Bia")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Arquivo" }));
    expect(linhas()[0]).toContain("contrato.pdf");
    await userEvent.click(screen.getByRole("button", { name: "Arquivo" }));
    expect(linhas()[0]).toContain("foto.png");
  });

  it("busca e filtro por extensão; 'Limpar filtros' aparece e limpa", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Pesquisar..." }), "foto");
    expect(screen.getAllByRole("row")).toHaveLength(2);
    await userEvent.click(screen.getByRole("button", { name: "Limpar filtros" }));
    expect(screen.getAllByRole("row")).toHaveLength(3);
    await userEvent.click(screen.getByRole("combobox", { name: "Tipo de arquivo" }));
    await userEvent.click(await screen.findByRole("option", { name: "PDF" }));
    expect(screen.getAllByRole("row")).toHaveLength(2);
  });

  it("o ⋯ da linha: Baixar abre a rota de download; Excluir pede confirmação e chama o excluir", async () => {
    const abrir = vi.spyOn(window, "open").mockImplementation(() => null);
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Baixar arquivo" }));
    expect(abrir).toHaveBeenCalledWith("/api/v1/contacts/c1/arquivos/a1", "_blank", "noopener,noreferrer");
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[0]!);
    await userEvent.click(await screen.findByRole("menuitem", { name: "Excluir" }));
    expect(await screen.findByText("Tem certeza que deseja apagar este arquivo?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Excluir" }));
    expect(arquivos.excluir).toHaveBeenCalledWith("a1");
  });

  it("o arquivo de outra pessoa não tem Excluir para agent", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getAllByRole("button", { name: "Mais opções" })[1]!);
    expect(await screen.findByRole("menuitem", { name: "Baixar arquivo" })).toBeInTheDocument();
    expect(screen.queryByRole("menuitem", { name: "Excluir" })).toBeNull();
  });
});

describe("Novo arquivo", () => {
  it("abre 'Novo documento'; adicionar lista o arquivo; Salvar envia e mostra o toast da Clint", async () => {
    const { toast } = await import("sonner");
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    expect(within(janela).getByText("Nenhum documento adicionado")).toBeInTheDocument();
    const input = within(janela).getByLabelText("Adicionar") as HTMLInputElement;
    expect(input).toHaveAttribute("accept", expect.stringContaining(".pdf"));
    await userEvent.upload(input, new File(["x"], "proposta.pdf", { type: "application/pdf" }));
    expect(within(janela).getByText("proposta.pdf")).toBeInTheDocument();
    await userEvent.click(within(janela).getByRole("button", { name: "Salvar" }));
    expect(arquivos.enviar).toHaveBeenCalledWith([expect.objectContaining({ name: "proposta.pdf" })]);
    expect(toast.success).toHaveBeenCalledWith("Arquivo(s) enviado(s) com sucesso");
  });

  it("arquivo fora da lista ou acima de 25 MB nem entra na lista, com o aviso", async () => {
    render(<AbaArquivos lead={LEAD} />);
    await userEvent.click(screen.getByRole("button", { name: "Novo arquivo" }));
    const janela = await screen.findByRole("dialog", { name: "Novo documento" });
    await userEvent.upload(within(janela).getByLabelText("Adicionar"), new File(["x"], "virus.exe"));
    expect(within(janela).getByText("Nenhum documento adicionado")).toBeInTheDocument();
    expect(within(janela).getByText("virus.exe: Tipo de arquivo não suportado.")).toBeInTheDocument();
  });

  it("negócio sem contato: o vazio com 'Novo arquivo' desligado", () => {
    render(<AbaArquivos lead={{ id: "n1", contact_id: null } as unknown as Lead} />);
    for (const b of screen.getAllByRole("button", { name: "Novo arquivo" })) {
      expect(b).toBeDisabled();
      expect(b).toHaveAttribute("title", "Este negócio não tem contato.");
    }
  });
});
```

Mova para este arquivo (ou apague) o `describe` de Arquivos que estava em `escale-ficha-abas-campos-conversas-arquivos.test.tsx` (ele pinava tudo "Em breve").

- [ ] **Step 3: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-arquivos.test.tsx`
Expected: FAIL.

- [ ] **Step 4: O modal "Novo documento"**

Create `components/escale/negocio/abas/JanelaDeNovoDocumento.tsx`:

```tsx
"use client";
import { useId, useRef, useState } from "react";

import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useT } from "@/hooks/i18n/useT";
import { ACCEPT_DO_INPUT, MAX_ARQUIVO_MB, formatarTamanho, validarArquivo } from "@/lib/escale/negocio/arquivos";
import { Plus, X } from "@/lib/ui/icons-da-casca";

/**
 * O MODAL "NOVO DOCUMENTO" DA CLINT (fork Escale, Fase 1H; C17; ImportModal).
 * "Adicionar" abre o seletor de arquivos (vários; a lista de extensões da
 * Clint); cada arquivo vira uma linha com ×; o que não serve fica de fora, com
 * o motivo; "Salvar" envia. Sem arrastar, como na Clint.
 */
export function JanelaDeNovoDocumento({
  aberta,
  onFechar,
  aoSalvar,
}: {
  aberta: boolean;
  onFechar: () => void;
  aoSalvar: (arquivos: File[]) => Promise<void>;
}) {
  const t = useT();
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const [lista, setLista] = useState<File[]>([]);
  const [recusados, setRecusados] = useState<string[]>([]);
  const [enviando, setEnviando] = useState(false);

  function fechar() {
    setLista([]);
    setRecusados([]);
    onFechar();
  }

  function escolher(arquivos: FileList | null) {
    if (!arquivos) return;
    const aceitos: File[] = [];
    const avisos: string[] = [];
    for (const a of Array.from(arquivos)) {
      const v = validarArquivo({ nome: a.name, tamanho: a.size });
      if (v.ok) aceitos.push(a);
      else avisos.push(`${a.name}: ${t(v.erro).replace("{fileName}", a.name).replace("{maxMb}", String(MAX_ARQUIVO_MB))}`);
    }
    setLista((atual) => [...atual, ...aceitos]);
    setRecusados(avisos);
    if (input.current) input.current.value = "";
  }

  async function salvar() {
    setEnviando(true);
    try {
      await aoSalvar(lista);
      fechar();
    } finally {
      setEnviando(false);
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <DialogTitle className="text-[15px] font-semibold text-casca-texto">{t("Novo documento")}</DialogTitle>
      <DialogDescription className="sr-only">{t("Novo documento")}</DialogDescription>
      <input
        ref={input}
        id={id}
        type="file"
        multiple
        accept={ACCEPT_DO_INPUT}
        aria-label={t("Adicionar")}
        className="sr-only"
        onChange={(e) => escolher(e.target.files)}
      />
      {lista.length === 0 ? (
        <p className="text-[13px] text-casca-suave">{t("Nenhum documento adicionado")}</p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          {lista.map((a, i) => (
            <li key={`${a.name}-${i}`} className="flex h-9 items-center justify-between rounded-md bg-casca-raia px-3 text-[13px] text-casca-texto">
              <span className="min-w-0 truncate">
                {a.name} <span className="text-[11px] text-casca-meta">{formatarTamanho(a.size)}</span>
              </span>
              <button
                type="button"
                aria-label={`${t("Remover")} ${a.name}`}
                onClick={() => setLista((atual) => atual.filter((_, j) => j !== i))}
                className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:text-casca-texto"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      {recusados.map((r) => (
        <p key={r} className="text-[11px] text-destructive">
          {r}
        </p>
      ))}
      <div className="flex items-center justify-between">
        <BotaoDaCasca variante="texto" tamanho="sm" className="border border-casca-borda" onClick={() => input.current?.click()}>
          <Plus aria-hidden />
          {t("Adicionar")}
        </BotaoDaCasca>
        <div className="flex gap-2">
          <BotaoDaCasca variante="texto" tamanho="md" onClick={fechar} disabled={enviando}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca variante="marca" tamanho="md" onClick={() => void salvar()} disabled={lista.length === 0 || enviando}>
            {t("Salvar")}
          </BotaoDaCasca>
        </div>
      </div>
    </JanelaDaCasca>
  );
}
```

- [ ] **Step 5: A aba**

Replace `components/escale/negocio/abas/AbaArquivos.tsx` inteiro por:

```tsx
"use client";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { CAIXA_DO_MENU, ITEM_DO_MENU } from "@/components/escale/quadro/estilos-do-menu";
import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CalendarioDePeriodo } from "@/components/escale/ui/CalendarioDePeriodo";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useArquivosDoContato, useEnviarArquivos, useExcluirArquivo } from "@/hooks/escale/useArquivosDoContato";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import {
  EXTENSOES_ACEITAS,
  MAX_ARQUIVO_MB,
  dataHoraBr,
  familiaDaExtensao,
  filtrarArquivos,
  formatarTamanho,
  ordenarArquivos,
  rotaDosArquivos,
  type Arquivo,
  type ColunaDeArquivos,
  type Direcao,
  type FamiliaDoArquivo,
} from "@/lib/escale/negocio/arquivos";
import { formatarDataBr } from "@/lib/escale/ui/periodos";
import {
  ArrowUpDown,
  ChevronDown,
  CloudUpload,
  Download,
  EllipsisVertical,
  File,
  FileArchive,
  FileAudio,
  FileImage,
  FileSpreadsheet,
  FileText,
  FileVideo,
  Search,
  Trash2,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { JanelaDeNovoDocumento } from "./JanelaDeNovoDocumento";

/**
 * A ABA ARQUIVOS DA FICHA (fork Escale, Fase 1H; C17, N8; print 06 e 01-001).
 *
 * Os arquivos são do CONTATO (como na Clint). Barra: busca, Data (dois
 * calendários com atalhos), Tipo de arquivo (extensões, múltipla), "Limpar
 * filtros", o "?" e "Novo arquivo". Tabela ordenável; o ⋯ da linha baixa ou
 * exclui (o autor, ou gerente ou acima). Sem o medidor de cota (PRD §9).
 */
const ICONE_DA_FAMILIA: Record<FamiliaDoArquivo, LucideIcon> = {
  imagem: FileImage,
  planilha: FileSpreadsheet,
  audio: FileAudio,
  video: FileVideo,
  pacote: FileArchive,
  documento: FileText,
};
const EM_BREVE = "disabled:pointer-events-auto disabled:cursor-not-allowed";

export function AbaArquivos({ lead }: { lead: Lead }) {
  const t = useT();
  const contactId = lead.contact_id;
  const { data, isLoading, isError } = useArquivosDoContato(contactId);
  const enviar = useEnviarArquivos(contactId ?? "", lead.id);
  const excluir = useExcluirArquivo(contactId ?? "");
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;

  const [busca, setBusca] = useState("");
  const [periodo, setPeriodo] = useState<{ de?: string; ate?: string }>({});
  const [extensoes, setExtensoes] = useState<string[]>([]);
  const [coluna, setColuna] = useState<ColunaDeArquivos>("data");
  const [direcao, setDirecao] = useState<Direcao>("desc");
  const [janela, setJanela] = useState(false);
  const [excluindo, setExcluindo] = useState<Arquivo | null>(null);

  const lista = useMemo(
    () => ordenarArquivos(filtrarArquivos(data ?? [], { busca, ...periodo, extensoes }), coluna, direcao),
    [data, busca, periodo, extensoes, coluna, direcao],
  );
  const temFiltro = !!busca || !!periodo.de || extensoes.length > 0;

  function ordenarPor(c: ColunaDeArquivos) {
    if (c === coluna) setDirecao(direcao === "asc" ? "desc" : "asc");
    else {
      setColuna(c);
      setDirecao(c === "data" ? "desc" : "asc");
    }
  }

  async function salvarNovos(arquivos: File[]) {
    const r = await enviar.mutateAsync(arquivos);
    if (r.enviados > 0) toast.success(t("Arquivo(s) enviado(s) com sucesso"));
    for (const f of r.falhas) toast.error(`${t("Erro ao enviar arquivo(s)")}: ${f}`);
  }

  async function confirmarExclusao() {
    const alvo = excluindo;
    setExcluindo(null);
    if (!alvo) return;
    try {
      await excluir.mutateAsync(alvo.id);
      toast.success(t("Arquivo excluído com sucesso"));
    } catch {
      toast.error(t("Erro ao excluir arquivo"));
    }
  }

  const semContato = !contactId;
  const botaoNovo = (className?: string) => (
    <BotaoDaCasca
      variante="texto"
      tamanho="sm"
      disabled={semContato}
      title={semContato ? t("Este negócio não tem contato.") : undefined}
      className={cn("border border-casca-borda", EM_BREVE, className)}
      onClick={() => setJanela(true)}
    >
      <CloudUpload aria-hidden />
      {t("Novo arquivo")}
    </BotaoDaCasca>
  );
  const gatilho = "flex h-8 items-center gap-1 rounded-md px-2 text-[13px] text-casca-texto hover:bg-casca-raia";
  const resumoDoPeriodo = periodo.de
    ? periodo.ate
      ? t("De {de} a {ate}").replace("{de}", formatarDataBr(periodo.de)).replace("{ate}", formatarDataBr(periodo.ate))
      : t("A partir de {de}").replace("{de}", formatarDataBr(periodo.de))
    : t("Data");

  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <span className="relative">
            <input
              type="search"
              aria-label={t("Pesquisar...")}
              placeholder={t("Pesquisar...")}
              value={busca}
              onChange={(e) => setBusca(e.target.value)}
              className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
            />
            <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
          </span>
          <Popover>
            <PopoverTrigger asChild>
              <button type="button" title={t("Filtrar por data de upload")} className={gatilho}>
                {resumoDoPeriodo}
                <ChevronDown size={14} aria-hidden />
              </button>
            </PopoverTrigger>
            <PainelSuspenso>
              <CalendarioDePeriodo
                semAbas
                valor={{ tipo: "criacao", ...periodo }}
                aoMudar={(p) => setPeriodo({ de: p.de, ate: p.ate })}
              />
            </PainelSuspenso>
          </Popover>
          <SeletorMultiploDaCasca
            valores={extensoes}
            opcoes={EXTENSOES_ACEITAS.map((e) => ({ valor: e, rotulo: e.toUpperCase() }))}
            vazio={t("Tipo de arquivo")}
            aria-label={t("Tipo de arquivo")}
            dica={t("Filtrar por tipo de arquivo")}
            aoMudar={setExtensoes}
          />
          {temFiltro ? (
            <BotaoDaCasca
              variante="texto"
              tamanho="sm"
              className="text-casca-marca"
              onClick={() => {
                setBusca("");
                setPeriodo({});
                setExtensoes([]);
              }}
            >
              {t("Limpar filtros")}
            </BotaoDaCasca>
          ) : null}
        </div>
        <div className="flex items-center gap-3">
          <AjudaDaCasca texto={t("Faça upload de arquivos de até {maxMb} MB para anexar ao contato").replace("{maxMb}", String(MAX_ARQUIVO_MB))} />
          {botaoNovo()}
        </div>
      </div>
      <div className="mt-3 flex min-h-0 flex-1 flex-col overflow-y-auto rounded-lg border border-casca-borda">
        <table className="w-full table-fixed">
          <thead className="sticky top-0 bg-surface">
            <tr className="h-11 border-b border-casca-borda text-[10px] font-semibold tracking-wide text-casca-texto uppercase">
              <Cabecalho rotulo={t("Arquivo")} ativa={coluna === "nome"} direcao={direcao} aoClicar={() => ordenarPor("nome")} className="text-left" />
              <Cabecalho rotulo={t("Data de upload")} ativa={coluna === "data"} direcao={direcao} aoClicar={() => ordenarPor("data")} className="w-[200px] text-right" />
              <Cabecalho rotulo={t("Usuário")} ativa={coluna === "usuario"} direcao={direcao} aoClicar={() => ordenarPor("usuario")} className="w-[120px] text-right" />
              <th scope="col" className="w-10" />
            </tr>
          </thead>
          <tbody>
            {lista.map((a) => {
              const Icone = ICONE_DA_FAMILIA[familiaDaExtensao(a.extensao)] ?? File;
              const podeExcluir = gerente || a.user_id === user.id;
              return (
                <tr key={a.id} className="group h-14 border-b border-casca-borda last:border-b-0 hover:bg-casca-raia">
                  <td className="px-3">
                    <span className="flex items-center gap-3">
                      <Icone size={20} aria-hidden className="shrink-0 text-casca-marca" />
                      <span className="min-w-0">
                        <span className="block truncate text-[13px] text-casca-texto">{a.nome}</span>
                        <span className="block text-[11px] text-casca-meta">{formatarTamanho(a.tamanho)}</span>
                      </span>
                    </span>
                  </td>
                  <td className="px-3 text-right text-[13px] text-casca-texto-2">{dataHoraBr(a.created_at)}</td>
                  <td className="px-3">
                    <span className="flex justify-end">
                      <span
                        title={a.user_nome ?? undefined}
                        className="grid size-6 place-items-center rounded-full bg-casca-marca-suave text-[11px] font-semibold text-casca-marca"
                      >
                        {(a.user_nome ?? "?").charAt(0).toUpperCase()}
                      </span>
                    </span>
                  </td>
                  <td className="px-1">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          type="button"
                          aria-label={t("Mais opções")}
                          className="grid size-7 place-items-center rounded-casca-gatilho text-casca-suave opacity-0 group-hover:opacity-100 focus-visible:opacity-100 data-[state=open]:opacity-100"
                        >
                          <EllipsisVertical size={16} aria-hidden />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className={CAIXA_DO_MENU}>
                        <DropdownMenuItem
                          className={ITEM_DO_MENU}
                          onSelect={() => window.open(`${rotaDosArquivos(a.contact_id)}/${a.id}`, "_blank", "noopener,noreferrer")}
                        >
                          <Download size={14} aria-hidden />
                          {t("Baixar arquivo")}
                        </DropdownMenuItem>
                        {podeExcluir ? (
                          <DropdownMenuItem className={cn(ITEM_DO_MENU, "text-destructive")} onSelect={() => setExcluindo(a)}>
                            <Trash2 size={14} aria-hidden />
                            {t("Excluir")}
                          </DropdownMenuItem>
                        ) : null}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {isLoading ? (
          <p className="p-6 text-xs text-casca-suave">{t("Carregando…")}</p>
        ) : isError ? (
          <p className="p-6 text-xs text-casca-suave">{t("Não consegui carregar os arquivos.")}</p>
        ) : lista.length === 0 ? (
          <div className="flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center">
            <span className="grid size-14 place-items-center rounded-xl bg-casca-marca-suave text-casca-marca">
              <FileText size={22} aria-hidden />
            </span>
            <p className="mt-2 text-[15px] font-semibold text-casca-texto">{t("Nenhum arquivo encontrado")}</p>
            <p className="max-w-[180px] text-[13px] text-casca-suave">{t("Envie arquivos para mantê-los junto deste contato.")}</p>
            {botaoNovo("mt-2")}
          </div>
        ) : null}
      </div>
      {contactId ? <JanelaDeNovoDocumento aberta={janela} onFechar={() => setJanela(false)} aoSalvar={salvarNovos} /> : null}
      <AlertDialog open={excluindo !== null} onOpenChange={(a) => !a && setExcluindo(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t("Tem certeza que deseja apagar este arquivo?")}</AlertDialogTitle>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmarExclusao()}>{t("Excluir")}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function Cabecalho({
  rotulo,
  ativa,
  direcao,
  aoClicar,
  className,
}: {
  rotulo: string;
  ativa: boolean;
  direcao: Direcao;
  aoClicar: () => void;
  className?: string;
}) {
  return (
    <th scope="col" aria-sort={ativa ? (direcao === "asc" ? "ascending" : "descending") : "none"} className={cn("px-3", className)}>
      <button type="button" onClick={aoClicar} className="inline-flex items-center gap-1 uppercase hover:text-casca-marca">
        {rotulo}
        <ArrowUpDown size={12} aria-hidden className={ativa ? "text-casca-marca" : "text-casca-suave"} />
      </button>
    </th>
  );
}
```

Em `ConteudoDaAba.tsx`: `case "arquivos": return <AbaArquivos lead={ficha.lead} />;`. O `SeletorMultiploDaCasca` expõe o gatilho como `combobox`? Confira o papel no componente (`role=`) e ajuste o teste (`getByRole("combobox" | "button", { name: "Tipo de arquivo" })`). Confira também os textos "De {de} a {ate}" e "A partir de {de}" (já existem no dicionário pela V1).

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-arquivos.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/controle-decorativo.test.ts tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write components/escale/negocio/abas/JanelaDeNovoDocumento.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx && corepack pnpm eslint components/escale/negocio/abas/AbaArquivos.tsx components/escale/negocio/abas/JanelaDeNovoDocumento.tsx components/escale/negocio/ConteudoDaAba.tsx components/escale/ui/CalendarioDePeriodo.tsx && corepack pnpm typecheck`
Expected: PASS. Se `escale-ficha-do-negocio.test.tsx` montar a aba Arquivos, acrescente os mocks de `useArquivosDoContato` e `useUser`.

- [ ] **Step 7: Commit**

```bash
git add components/escale/negocio/abas/AbaArquivos.tsx components/escale/negocio/abas/JanelaDeNovoDocumento.tsx components/escale/negocio/ConteudoDaAba.tsx components/escale/ui/CalendarioDePeriodo.tsx tests/unit/escale-ficha-aba-arquivos.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git add -A tests/unit  # o teste do calendário alterado
git commit -m "feat(escale): aba Arquivos da ficha do negócio, como na Clint (Fase 1H, C17)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 12: A aba Conversas com todas as sessões (C16)

**Files:**
- Create: `lib/escale/negocio/conversas.ts`, `hooks/escale/useConversasDoContato.ts`, `tests/unit/escale-ficha-aba-conversas.test.tsx`
- Modify: `components/escale/negocio/abas/AbaConversas.tsx`, `tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx` (o `describe` de Conversas sai daqui)

**Interfaces:**
- Consumes: `GET /api/v1/conversations?contact_id=<id>&limit=100` (`{ data: ConversationWithContact[], meta }`; tipo em `hooks/inbox/useConversationsRealtime`); `dataDaMensagem` (`lib/escale/quadro/aparencia`); `FotoDaFicha`.
- Produces: `ROTULO_DO_STATUS` (`Record<StatusDeConversa, string>`), `classeDoStatus(status)`; `useConversasDoContato(contactId)` (`{ data?: ConversationWithContact[], isLoading, isError }`, chave `["conversas-do-contato", contactId]`); `AbaConversas({ lead })`.

**Detalhes visuais (print 05):** "N sessões" em 12px/500 no topo da coluna de 337px; cada item (72px): foto 40px (com o ícone do canal no canto, desvio: sem o ícone até haver o canal na resposta — `channel` existe: WhatsApp verde, Instagram, Facebook via `MessageCircle`), chip do status (11px, fundo verde claro para "Em aberto"; cinza para os demais), o dia à direita (11px `casca-meta`), ✓✓ + prévia (12px `casca-texto-2`, truncada), badge de não lidas (`casca-novo`), a inicial do atendente num círculo de 20px (`title` "Atendente: {nome}"). O lado direito continua o vazio "Selecione uma conversa". Sem filtros (Q7) e com o modo espião "Em breve" (Q6).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-ficha-aba-conversas.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
const conversas = vi.hoisted(() => ({
  data: [
    { id: "cv1", status: "open", channel: "whatsapp", last_message_at: "2026-10-14T10:00:00Z", last_message_preview: "Olá, me chamo Camilly", unread_count_for_assignee: 2, assigned_to_user_name: "Camilly Victória" },
    { id: "cv2", status: "closed", channel: "instagram", last_message_at: "2026-09-01T10:00:00Z", last_message_preview: "Obrigada", unread_count_for_assignee: 0, assigned_to_user_name: null },
  ],
  isLoading: false,
  isError: false,
}));
vi.mock("@/hooks/escale/useConversasDoContato", () => ({ useConversasDoContato: () => conversas }));

import { AbaConversas } from "@/components/escale/negocio/abas/AbaConversas";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C16, N9): todas as sessões do contato, como na Clint (print 05). */
const LEAD = { id: "n1", contact_id: "c1", title: "Ana" } as unknown as Lead;

describe("AbaConversas", () => {
  it("'N sessões', cada sessão com status, prévia, não lidas e atendente; clique abre no Inbox", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("2 sessões")).toBeInTheDocument();
    const itens = screen.getAllByRole("link");
    expect(itens[0]).toHaveAttribute("href", "/app/inbox?id=cv1");
    expect(within(itens[0]!).getByText("Em aberto")).toBeInTheDocument();
    expect(within(itens[0]!).getByText("Olá, me chamo Camilly")).toBeInTheDocument();
    expect(within(itens[0]!).getByText("2")).toBeInTheDocument();
    expect(within(itens[0]!).getByTitle("Atendente: Camilly Victória")).toHaveTextContent("C");
    expect(within(itens[1]!).getByText("Encerrada")).toBeInTheDocument();
    expect(screen.getByText("Selecione uma conversa")).toBeInTheDocument();
  });

  it("vazio, erro e negócio sem contato", () => {
    conversas.data = [];
    const { unmount } = render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("Este contato não possui conversas no atendimento")).toBeInTheDocument();
    unmount();
    conversas.isError = true;
    const r2 = render(<AbaConversas lead={LEAD} />);
    expect(screen.getByText("Não foi possível carregar as conversas.")).toBeInTheDocument();
    r2.unmount();
    conversas.isError = false;
    render(<AbaConversas lead={{ ...LEAD, contact_id: null } as unknown as Lead} />);
    expect(screen.getByText("Este negócio não tem contato.")).toBeInTheDocument();
  });

  it("o modo espião continua 'Em breve' (Fase 3)", () => {
    render(<AbaConversas lead={LEAD} />);
    expect(screen.getByRole("button", { name: "Ativar modo espião" })).toHaveAttribute("title", "Em breve");
  });
});
```

Mova para cá (ou apague) o `describe` de Conversas de `escale-ficha-abas-campos-conversas-arquivos.test.tsx`.

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-conversas.test.tsx`
Expected: FAIL.

- [ ] **Step 3: A lib e o hook**

Create `lib/escale/negocio/conversas.ts`:

```ts
import type { StatusDeConversa } from "@/hooks/inbox/useConversationsRealtime";

/** CONVERSAS NA FICHA (fork Escale, Fase 1H; C16): o chip de status da sessão (print 05: "Em aberto"). */
export const ROTULO_DO_STATUS: Readonly<Record<StatusDeConversa, string>> = {
  open: "Em aberto",
  pending: "Pendente",
  claimed: "Em atendimento",
  ai_handling: "Com o agente",
  resolved: "Resolvida",
  closed: "Encerrada",
  archived: "Arquivada",
};

/** Verde claro para o que está aberto; cinza para o resto (sem print dos outros estados). */
export function classeDoStatus(status: string): string {
  return status === "open" || status === "claimed" || status === "ai_handling" || status === "pending"
    ? "bg-[var(--escale-status-ganho-suave)] text-[var(--escale-status-ganho)]"
    : "bg-casca-raia text-casca-texto-2";
}

export const MAX_SESSOES = 100;
```

Se `--escale-status-ganho-suave` não existir em `app/escale-tema.css`, crie-a ao lado de `--escale-status-ganho` (um tom claro do mesmo verde; o print 05 mostra `#E6F7EC`-ish, medir com conta-gotas e registrar como provisório).

Create `hooks/escale/useConversasDoContato.ts`:

```ts
"use client";
import { useQuery } from "@tanstack/react-query";

import type { ConversationWithContact } from "@/hooks/inbox/useConversationsRealtime";
import { apiClient } from "@/lib/api/client";
import { MAX_SESSOES } from "@/lib/escale/negocio/conversas";

/**
 * TODAS AS SESSÕES DO CONTATO (fork Escale, Fase 1H; C16). A rota do original
 * já aceita `contact_id`; o hook do Inbox não o envia, então este é do fork.
 * A RLS de `conversations` decide o que entra (visibility_mode).
 */
export const chaveDasConversasDoContato = (contactId: string) => ["conversas-do-contato", contactId] as const;

export function useConversasDoContato(contactId: string | null) {
  return useQuery({
    queryKey: chaveDasConversasDoContato(contactId ?? ""),
    enabled: !!contactId,
    queryFn: async () =>
      (
        await apiClient.get<{ data: ConversationWithContact[] }>(
          `/api/v1/conversations?contact_id=${contactId}&limit=${MAX_SESSOES}`,
        )
      ).data,
  });
}
```

- [ ] **Step 4: A aba**

Replace `components/escale/negocio/abas/AbaConversas.tsx` inteiro por:

```tsx
"use client";
import Link from "next/link";

import { useConversasDoContato } from "@/hooks/escale/useConversasDoContato";
import { useT } from "@/hooks/i18n/useT";
import { ROTULO_DO_STATUS, classeDoStatus } from "@/lib/escale/negocio/conversas";
import { dataDaMensagem } from "@/lib/escale/quadro/aparencia";
import type { Lead } from "@/lib/types/leads";
import { CheckCheck, Glasses, MessagesSquare } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { FotoDaFicha } from "../FotoDaFicha";

/**
 * A ABA CONVERSAS DA FICHA (fork Escale, Fases 1G e 1H; C16, N9; print 05).
 *
 * Todas as sessões do contato, como na Clint atual (sem filtros, Q7). Clicar
 * abre no Inbox; abrir aqui dentro é a C22 (Fase 3), e por isso o modo espião
 * segue "Em breve" (Q6).
 */
export function AbaConversas({ lead }: { lead: Lead }) {
  const t = useT();
  const { data, isLoading, isError } = useConversasDoContato(lead.contact_id);
  const sessoes = data ?? [];
  return (
    <div className="flex h-full min-h-0 flex-col px-4 py-6">
      <div className="flex h-10 shrink-0 items-center justify-between rounded-t-lg bg-casca-raia px-4 text-[13px] text-casca-texto-2">
        <span className="flex items-center gap-2">
          <Glasses size={16} aria-hidden />
          {t("Abra as conversas sem marcá-las como lidas.")}
        </span>
        <button
          type="button"
          disabled
          title={t("Em breve")}
          className="text-[13px] text-casca-marca underline disabled:pointer-events-auto disabled:cursor-not-allowed"
        >
          {t("Ativar modo espião")}
        </button>
      </div>
      <div className="flex min-h-0 flex-1 rounded-b-lg border border-t-0 border-casca-borda">
        <div className="w-[337px] shrink-0 overflow-y-auto border-r border-casca-borda">
          {!lead.contact_id ? (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Este negócio não tem contato.")}</p>
          ) : isLoading ? (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Carregando…")}</p>
          ) : isError ? (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Não foi possível carregar as conversas.")}</p>
          ) : sessoes.length === 0 ? (
            <p className="px-3 py-6 text-xs text-casca-suave">{t("Este contato não possui conversas no atendimento")}</p>
          ) : (
            <>
              <p className="px-3 py-3 text-xs font-medium text-casca-texto">{`${sessoes.length} ${t("sessões")}`}</p>
              <ul>
                {sessoes.map((c) => (
                  <li key={c.id}>
                    <Link
                      href={`/app/inbox?id=${c.id}`}
                      className="flex h-[72px] items-center gap-3 border-b border-casca-borda px-3 hover:bg-casca-raia"
                    >
                      <FotoDaFicha lead={lead} tamanho="conversa" />
                      <span className="min-w-0 flex-1">
                        <span className="flex items-center justify-between">
                          <span className={cn("rounded-sm px-1.5 py-px text-[11px] font-medium", classeDoStatus(c.status))}>
                            {t(ROTULO_DO_STATUS[c.status as keyof typeof ROTULO_DO_STATUS] ?? c.status)}
                          </span>
                          <span className="text-[11px] text-casca-meta">{dataDaMensagem(c.last_message_at)}</span>
                        </span>
                        <span className="mt-1 flex items-center gap-1 text-xs text-casca-texto-2">
                          <CheckCheck size={14} aria-hidden className="shrink-0" />
                          <span className="truncate">{c.last_message_preview ?? t("Sem mensagem")}</span>
                        </span>
                      </span>
                      <span className="flex shrink-0 flex-col items-end gap-1">
                        {c.unread_count_for_assignee > 0 ? (
                          <span className="rounded-sm bg-casca-novo px-1.5 text-[11px] font-semibold text-white">
                            {c.unread_count_for_assignee}
                          </span>
                        ) : null}
                        {c.assigned_to_user_name ? (
                          <span
                            title={`${t("Atendente:")} ${c.assigned_to_user_name}`}
                            className="grid size-5 place-items-center rounded-full bg-casca-marca-suave text-[10px] font-semibold text-casca-marca"
                          >
                            {c.assigned_to_user_name.charAt(0).toUpperCase()}
                          </span>
                        ) : null}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
        <div className="flex min-w-0 flex-1 flex-col items-center justify-center gap-2 text-center">
          <span className="grid size-20 place-items-center rounded-2xl bg-casca-marca-suave text-casca-marca">
            <MessagesSquare size={32} aria-hidden />
          </span>
          <p className="mt-2 text-[17px] font-semibold text-casca-texto">{t("Selecione uma conversa")}</p>
          <p className="max-w-[210px] text-[15px] text-casca-suave">{t("Escolha uma conversa ao lado para ver as mensagens.")}</p>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-aba-conversas.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/tailwind-tokens.test.ts && corepack pnpm prettier --write lib/escale/negocio/conversas.ts hooks/escale/useConversasDoContato.ts tests/unit/escale-ficha-aba-conversas.test.tsx && corepack pnpm eslint lib/escale/negocio/conversas.ts hooks/escale/useConversasDoContato.ts components/escale/negocio/abas/AbaConversas.tsx && corepack pnpm typecheck`
Expected: PASS. Se `escale-ficha-do-negocio.test.tsx` montar Conversas, acrescente o mock de `useConversasDoContato`.

- [ ] **Step 6: Commit**

```bash
git add lib/escale/negocio/conversas.ts hooks/escale/useConversasDoContato.ts components/escale/negocio/abas/AbaConversas.tsx app/escale-tema.css tests/unit/escale-ficha-aba-conversas.test.tsx tests/unit/escale-ficha-abas-campos-conversas-arquivos.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): todas as sessões do contato na aba Conversas (Fase 1H, C16)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 13: O Histórico completo (C18): busca, filtro por grupo, Carregar mais, seções, cartões e notas

**Files:**
- Create: `lib/escale/negocio/historico.ts`, `hooks/escale/useHistoricoDoNegocio.ts`, `components/escale/negocio/abas/CartaoDoHistorico.tsx`, `tests/unit/escale-ficha-historico-regras.test.ts`, `tests/unit/escale-ficha-aba-historico.test.tsx`
- Modify: `lib/escale/negocio/regras.ts` (`secoesDoHistorico`), `tests/unit/escale-ficha-regras.test.ts` (as expectativas das seções), `components/escale/negocio/abas/AbaHistorico.tsx`, `tests/unit/escale-ficha-abas-atividades-historico.test.tsx` (o `describe` do Histórico sai daqui)

**Interfaces:**
- Consumes: `GET /api/v1/leads/[id]/timeline?limit=25&type=…&cursor=…` (`{ data: TimelineItemView[], meta: { has_more, cursor } }`); `useRealtimeChannel` (`hooks/realtime/useRealtimeChannel`, `{ name, postgresChanges: { event, table, filter }, onChange }`); `activityLabel`, `actorName`, `listaLegivel`, `ACTIVITY_LABELS`/`ActivityType` (`lib/leads/activity-vocabulary`); `useNotasDoNegocio`, `useExcluirNota` (Task 8); `JanelaDeNota` (Task 9); `haQuantoTempo`, `secoesDoHistorico` (regras); `SeletorDaCasca`; `useUser`, `useActiveOrg`, `ROLE_RANK`.
- Produces: `GRUPOS_DO_HISTORICO` (`{ chave, rotulo, tipos: ActivityType[] | "automacoes" | "todos" }[]`), `ChaveDoGrupo`, `tiposDoGrupo(chave)`, `grupoDoEvento(item)`, `textoDoEvento(item, nomesDasEtapas, t)` → `{ titulo, trechos: { texto, negrito?: boolean }[] }`, `casaComABusca(item, termo, t, nomesDasEtapas)`, `PAGINA_DO_HISTORICO = 25`; `useHistoricoDoNegocio(leadId, grupo)` (`{ itens, isLoading, isError, temMais, carregarMais, carregandoMais }`, chave `["historico-do-negocio", leadId, grupo]`); `CartaoDoHistorico({ item, nota?, nomesDasEtapas, leadId, podeEditarNota })`; `AbaHistorico({ lead, stages })`.
- `ConteudoDaAba.tsx`: `<AbaHistorico lead={ficha.lead} stages={ficha.stages} />`.

**Detalhes visuais (prints 07 e 12):** a busca (148×32, "Buscar no histórico...") e o filtro (218×32, "Todos"; aberto, itens de 38px com ícone de 14px e ✓ no escolhido — o `SeletorDaCasca` não desenha ícone por opção: desvio registrado até ele ganhar `icone?` na opção, que fica fora desta fase). Seções: "HOJE", "ONTEM", "ESTA SEMANA" ou "DD MMM" em 11px/600 maiúsculo + a data do evento mais novo + linha. Cartão: fundo `casca-raia`, canto 8px, 12px de respiro; ícone num quadrado de 32px (verde em Atividades/Agendamentos, cor da marca em Alterações negócio/Negócio criado, cinza nos outros; Q12); título 13px/600 e "ORIGEM: GRUPO › ORIGEM" em 10px maiúsculo `casca-meta`; corpo 13px com negritos; rodapé 11px `casca-suave`: relógio, "há N dias por", bolinha de 16px com a inicial e o nome. Nota: o corpo mostra as 2 primeiras linhas e "Ver nota" (`casca-marca`); expandida, o texto inteiro, "Editar nota" e a lixeira (autor ou gerente+). No fim, "Carregar mais" (texto, centralizado) enquanto `has_more`.

- [ ] **Step 1: Os testes (vão falhar)**

Create `tests/unit/escale-ficha-historico-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  GRUPOS_DO_HISTORICO,
  casaComABusca,
  grupoDoEvento,
  textoDoEvento,
  tiposDoGrupo,
} from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";
import type { TimelineItemView } from "@/lib/types/contacts";

/** FORK ESCALE · Fase 1H (C18, N12): os grupos, os textos e a busca do Histórico da Clint. */
const t = (s: string) => s;
const etapas = { e1: "1. Entrada Lead", e2: "2. Qualificação" };
const item = (type: string, extra: Partial<TimelineItemView> = {}): TimelineItemView =>
  ({ id: type, type, performed_at: "2026-10-17T10:00:00Z", payload: {}, metadata: {}, source_module: "crm", actor_kind: "user", actor_user_name: "Ana", reason: "", ...extra }) as TimelineItemView;

describe("grupos (os 16 da Clint, na ordem do print 12)", () => {
  it("a lista começa por Todos e tem os 16 rótulos", () => {
    expect(GRUPOS_DO_HISTORICO.map((g) => g.rotulo)).toEqual([
      "Todos", "Agendamentos", "Automações", "Atividades", "Notas", "Email", "Lembretes", "Ligação",
      "Negócio criado", "Clique para WhatsApp", "Alterações negócio", "Alteração de campos", "Integrações",
      "Campanhas", "Mescla de contatos", "Anexos",
    ]);
  });
  it("tiposDoGrupo: todos = sem filtro; automações = na tela; os outros têm a lista de types", () => {
    expect(tiposDoGrupo("todos")).toBeNull();
    expect(tiposDoGrupo("automacoes")).toBeNull();
    expect(tiposDoGrupo("notas")).toEqual(["note"]);
    expect(tiposDoGrupo("negocio_criado")).toEqual(["lead_created"]);
    expect(tiposDoGrupo("ligacao")).toEqual(["voice_call", "voice_call_missed", "voice_call_unanswered"]);
    expect(tiposDoGrupo("email")).toEqual([]);
  });
  it("grupoDoEvento: pelo type; automação pelo source_module webhook", () => {
    expect(grupoDoEvento(item("task_completed"))).toBe("atividades");
    expect(grupoDoEvento(item("stage_changed"))).toBe("alteracoes_negocio");
    expect(grupoDoEvento(item("lead_edited"))).toBe("alteracao_de_campos");
    expect(grupoDoEvento(item("stage_changed", { source_module: "webhook", actor_kind: "system" }))).toBe("automacoes");
    expect(grupoDoEvento(item("contacts_merged"))).toBe("mescla_de_contatos");
    expect(grupoDoEvento(item("xyz_desconhecido"))).toBe("alteracoes_negocio");
  });
});

describe("textoDoEvento", () => {
  it("etapa: título e corpo da Clint com os nomes do quadro", () => {
    const r = textoDoEvento(item("stage_changed", { payload: { from_stage_id: "e1", to_stage_id: "e2" } }), etapas, t);
    expect(r.titulo).toBe("Mudou de etapa");
    expect(r.trechos).toEqual([
      { texto: "Esta oportunidade passou da etapa " },
      { texto: "1. Entrada Lead", negrito: true },
      { texto: " para a etapa " },
      { texto: "2. Qualificação", negrito: true },
    ]);
  });
  it("campos: um ou vários; dono vira 'Mudou de usuário'", () => {
    expect(textoDoEvento(item("lead_edited", { payload: { fields: ["value_cents"] }, reason: "Alterou valor" }), etapas, t).titulo).toBe("Campo do negócio alterado");
    expect(textoDoEvento(item("lead_edited", { payload: { fields: ["value_cents", "tags"] }, reason: "Alterou valor, tags" }), etapas, t).titulo).toBe("Campos do negócio alterados");
    expect(textoDoEvento(item("lead_edited", { payload: { fields: ["owner_user_id"] } }), etapas, t).titulo).toBe("Mudou de usuário");
  });
  it("nota, negócio criado e origem; o resto usa o rótulo do original e o reason", () => {
    expect(textoDoEvento(item("note"), etapas, t).titulo).toBe("Nova nota");
    expect(textoDoEvento(item("lead_created"), etapas, t).titulo).toBe("Negócio criado");
    expect(textoDoEvento(item("moved_from_pipeline", { reason: "Veio do funil X" }), etapas, t)).toEqual({ titulo: "Mudou de origem", trechos: [{ texto: "Veio do funil X" }] });
    expect(textoDoEvento(item("task_completed", { reason: "Ligação feita" }), etapas, t).trechos).toEqual([{ texto: "Ligação feita" }]);
  });
});

describe("busca na tela", () => {
  it("acha no título, no corpo e no autor, sem acento", () => {
    const i = item("stage_changed", { payload: { from_stage_id: "e1", to_stage_id: "e2" } });
    expect(casaComABusca(i, "qualificacao", t, etapas)).toBe(true);
    expect(casaComABusca(i, "mudou de etapa", t, etapas)).toBe(true);
    expect(casaComABusca(i, "ana", t, etapas)).toBe(true);
    expect(casaComABusca(i, "xyz", t, etapas)).toBe(false);
    expect(casaComABusca(i, "", t, etapas)).toBe(true);
  });
});

describe("seções: Hoje, Ontem, Esta semana e a data (Clint)", () => {
  it("rotula pelo dia do evento em relação a agora", () => {
    const agora = new Date(2026, 9, 17, 12); // sábado 17/10/2026
    const s = secoesDoHistorico(
      [
        { id: "a", performed_at: new Date(2026, 9, 17, 9).toISOString() },
        { id: "b", performed_at: new Date(2026, 9, 16, 9).toISOString() },
        { id: "c", performed_at: new Date(2026, 9, 13, 9).toISOString() },
        { id: "d", performed_at: new Date(2026, 8, 15, 9).toISOString() },
      ],
      agora,
    );
    expect(s.map((x) => x.rotulo)).toEqual(["Hoje", "Ontem", "Esta semana", "15 Set"]);
  });
});
```

Em `tests/unit/escale-ficha-regras.test.ts`, ajuste o `describe` de `secoesDoHistorico` ao novo contrato (os rótulos "Hoje"/"Ontem"/"Esta semana"/data; "Semana passada" sai). Create `tests/unit/escale-ficha-aba-historico.test.tsx`:

```tsx
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/i18n/useT", () => ({ useT: () => (s: string) => s }));
vi.mock("@/hooks/i18n/useLocaleDeData", () => ({ useTagDeIdioma: () => "pt-BR" }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useUser: () => ({ id: "u1" }), useActiveOrg: () => ({ orgId: "o", role: "agent" }) }));
const hist = vi.hoisted(() => ({
  grupo: "todos",
  itens: [
    { id: "1", type: "task_completed", performed_at: new Date().toISOString(), payload: {}, metadata: {}, source_module: "tarefas", actor_kind: "user", actor_user_name: "Camilly Victória", reason: "Atividade Entrada de Lead concluída" },
    { id: "2", type: "stage_changed", performed_at: new Date(Date.now() - 86_400_000).toISOString(), payload: { from_stage_id: "e1", to_stage_id: "e2" }, metadata: {}, source_module: "crm", actor_kind: "user", actor_user_name: "Henrique", reason: "" },
    { id: "3", type: "note", performed_at: new Date(Date.now() - 2 * 86_400_000).toISOString(), payload: { nota_id: "x1" }, metadata: {}, source_module: "escale", actor_kind: "user", actor_user_name: "Ana", reason: "Nova nota" },
  ],
  temMais: true,
  carregarMais: vi.fn(),
}));
vi.mock("@/hooks/escale/useHistoricoDoNegocio", () => ({
  useHistoricoDoNegocio: (_lead: string, grupo: string) => {
    hist.grupo = grupo;
    return { itens: hist.itens, isLoading: false, isError: false, temMais: hist.temMais, carregarMais: hist.carregarMais, carregandoMais: false };
  },
}));
const notas = vi.hoisted(() => ({ excluir: vi.fn(async () => undefined) }));
vi.mock("@/hooks/escale/useNotasDoNegocio", () => ({
  useNotasDoNegocio: () => ({ data: [{ id: "x1", lead_id: "n1", user_id: "u1", user_nome: "Ana", texto: "Ligar amanhã cedo", created_at: "", updated_at: "" }] }),
  useExcluirNota: () => ({ mutateAsync: notas.excluir }),
  useCriarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useEditarNota: () => ({ mutateAsync: vi.fn(), isPending: false }),
}));

import { AbaHistorico } from "@/components/escale/negocio/abas/AbaHistorico";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";

/** FORK ESCALE · Fase 1H (C18, N12): o Histórico da Clint (prints 07 e 12). */
const LEAD = { id: "n1", contact_id: "c1" } as unknown as Lead;
const STAGES = [
  { id: "e1", name: "1. Entrada Lead", position: 0 },
  { id: "e2", name: "2. Qualificação", position: 1 },
] as unknown as Stage[];
beforeEach(() => vi.clearAllMocks());

describe("AbaHistorico", () => {
  it("seções Hoje/Ontem e os cartões com título, corpo e autor; a etapa com os nomes do quadro", () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    expect(screen.getByText("Hoje")).toBeInTheDocument();
    expect(screen.getByText("Ontem")).toBeInTheDocument();
    const etapa = screen.getByText("Mudou de etapa").closest("li") as HTMLElement;
    expect(within(etapa).getByText("1. Entrada Lead")).toBeInTheDocument();
    expect(within(etapa).getByText("2. Qualificação")).toBeInTheDocument();
    expect(within(etapa).getByText(/por/)).toHaveTextContent("Henrique");
  });

  it("a busca filtra na tela; o filtro de grupo vai ao hook", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar no histórico..." }), "qualifica");
    expect(screen.getByText("Mudou de etapa")).toBeInTheDocument();
    expect(screen.queryByText("Nova nota")).toBeNull();
    await userEvent.clear(screen.getByRole("searchbox", { name: "Buscar no histórico..." }));
    await userEvent.click(screen.getByRole("combobox", { name: "Selecione um grupo" }));
    await userEvent.click(await screen.findByRole("option", { name: "Notas" }));
    expect(hist.grupo).toBe("notas");
  });

  it("a nota mostra 'Ver nota'; expandida, o texto, 'Editar nota' e a lixeira com a confirmação", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.click(screen.getByRole("button", { name: "Ver nota" }));
    expect(screen.getByText("Ligar amanhã cedo")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Editar nota" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover nota" }));
    expect(await screen.findByText("Deseja remover a nota?")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Remover" }));
    expect(notas.excluir).toHaveBeenCalledWith("x1");
  });

  it("'Carregar mais' enquanto houver página; sem resultado, o texto da Clint", async () => {
    render(<AbaHistorico lead={LEAD} stages={STAGES} />);
    await userEvent.click(screen.getByRole("button", { name: "Carregar mais" }));
    expect(hist.carregarMais).toHaveBeenCalled();
    await userEvent.type(screen.getByRole("searchbox", { name: "Buscar no histórico..." }), "zzzz");
    expect(screen.getByText("Os resultados não foram encontrados.")).toBeInTheDocument();
  });
});
```

Apague o `describe` do Histórico de `escale-ficha-abas-atividades-historico.test.tsx` (ele pinava "Em breve").

- [ ] **Step 2: Rodar e ver falhar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-historico-regras.test.ts tests/unit/escale-ficha-aba-historico.test.tsx`
Expected: FAIL.

- [ ] **Step 3: As regras**

Em `lib/escale/negocio/regras.ts`, troque a `secoesDoHistorico` (e tire `domingoDe`/`ddmmaaaa` se ficarem sem uso) por:

```ts
export interface SecaoDoHistorico<T> {
  chave: string;
  /** "Hoje", "Ontem", "Esta semana" ou "DD MMM" (a Clint não tem "Semana passada"). */
  rotulo: string;
  /** O dia do evento mais novo da seção ("14 Out", ao lado do rótulo no print 07). */
  data: string;
  itens: T[];
}

const inicioDaSemana = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - ((d.getDay() + 6) % 7)); // segunda (ISO)

export function secoesDoHistorico<T extends { performed_at: string }>(
  itens: readonly T[],
  agora: Date = new Date(),
  idioma = "pt-BR",
): SecaoDoHistorico<T>[] {
  const hoje = chaveDoDia(agora);
  const ontem = chaveDoDia(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 1));
  const semana = inicioDaSemana(agora).getTime();
  const ordenados = [...itens].sort((a, b) => Date.parse(b.performed_at) - Date.parse(a.performed_at));
  const secoes = new Map<string, SecaoDoHistorico<T>>();
  for (const item of ordenados) {
    const quando = new Date(item.performed_at);
    const dia = chaveDoDia(quando);
    const chave = dia === hoje ? "hoje" : dia === ontem ? "ontem" : quando.getTime() >= semana ? "semana" : dia;
    const rotulo = chave === "hoje" ? "Hoje" : chave === "ontem" ? "Ontem" : chave === "semana" ? "Esta semana" : diaEMes(quando, idioma);
    const secao = secoes.get(chave) ?? { chave, rotulo, data: diaEMes(quando, idioma), itens: [] };
    secoes.set(chave, { ...secao, itens: [...secao.itens, item] });
  }
  return [...secoes.values()];
}
```

Create `lib/escale/negocio/historico.ts`:

```ts
/**
 * O HISTÓRICO DA CLINT (fork Escale, Fase 1H; C18, N12): grupos do filtro,
 * títulos e corpos dos cartões, e a busca na tela. Sem React e sem rede.
 *
 * Os 16 grupos são os da Clint (print 12). Cada um é uma lista de `type` do
 * original (enviada na rota); "Automações" não tem type próprio (o original
 * grava a ação da automação como "Sistema" com source_module webhook), então
 * filtra na tela. O antes/depois só existe para a etapa (ids no payload);
 * campos vêm só pelo nome (LGPD, doutrina do original).
 */
import { activityLabel, listaLegivel, type ActivityType } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";

export const PAGINA_DO_HISTORICO = 25;

export const GRUPOS_DO_HISTORICO = [
  { chave: "todos", rotulo: "Todos", tipos: "todos" },
  { chave: "agendamentos", rotulo: "Agendamentos", tipos: ["appointment_scheduled", "appointment_rescheduled", "appointment_cancelled", "appointment_completed", "appointment_no_show"] },
  { chave: "automacoes", rotulo: "Automações", tipos: "automacoes" },
  { chave: "atividades", rotulo: "Atividades", tipos: ["task_created", "task_completed", "task_plan_applied", "ai_turn", "send_vetoed", "handoff_triggered", "handoff_resolved", "next_action_approved", "next_action_dismissed", "promise_unowned", "conversation_claimed", "conversation_transferred", "conversation_released", "conversation_ai_paused"] },
  { chave: "notas", rotulo: "Notas", tipos: ["note"] },
  { chave: "email", rotulo: "Email", tipos: [] },
  { chave: "lembretes", rotulo: "Lembretes", tipos: ["followup_scheduled", "followup_cancelled", "followup_paused", "followup_resumed", "followup_snoozed", "followup_step_skipped", "reactivation_accepted", "reactivation_dismissed", "reactivation_expired"] },
  { chave: "ligacao", rotulo: "Ligação", tipos: ["voice_call", "voice_call_missed", "voice_call_unanswered"] },
  { chave: "negocio_criado", rotulo: "Negócio criado", tipos: ["lead_created"] },
  { chave: "clique_whatsapp", rotulo: "Clique para WhatsApp", tipos: [] },
  { chave: "alteracoes_negocio", rotulo: "Alterações negócio", tipos: ["stage_changed", "agent_move_corrected", "lead_cooled", "lead_reactivated", "demand_closed", "moved_from_pipeline", "lead_disqualified", "lead_needs_review", "consent_declined", "proposal_drafted", "proposal_sent", "proposal_accepted", "proposal_declined", "proposal_expired", "proposal_value_changed", "proposal_followup_skipped", "contact_marked_personal", "contact_unmarked_personal"] },
  { chave: "alteracao_de_campos", rotulo: "Alteração de campos", tipos: ["lead_edited"] },
  { chave: "integracoes", rotulo: "Integrações", tipos: [] },
  { chave: "campanhas", rotulo: "Campanhas", tipos: [] },
  { chave: "mescla_de_contatos", rotulo: "Mescla de contatos", tipos: ["contacts_merged"] },
  { chave: "anexos", rotulo: "Anexos", tipos: [] },
] as const satisfies readonly { chave: string; rotulo: string; tipos: readonly ActivityType[] | "todos" | "automacoes" }[];

export type ChaveDoGrupo = (typeof GRUPOS_DO_HISTORICO)[number]["chave"];

/** null = sem filtro na rota (todos, ou automações filtradas na tela). */
export function tiposDoGrupo(chave: ChaveDoGrupo): ActivityType[] | null {
  const g = GRUPOS_DO_HISTORICO.find((x) => x.chave === chave);
  if (!g || g.tipos === "todos" || g.tipos === "automacoes") return null;
  return [...g.tipos];
}

export function ehAutomacao(item: Pick<TimelineItemView, "source_module" | "actor_kind">): boolean {
  return item.source_module === "webhook" || item.actor_kind === "rule";
}

export function grupoDoEvento(item: Pick<TimelineItemView, "type" | "source_module" | "actor_kind">): ChaveDoGrupo {
  if (ehAutomacao(item)) return "automacoes";
  for (const g of GRUPOS_DO_HISTORICO) {
    if (Array.isArray(g.tipos) && (g.tipos as readonly string[]).includes(item.type)) return g.chave;
  }
  return "alteracoes_negocio";
}

export interface Trecho {
  texto: string;
  negrito?: boolean;
}
export interface TextoDoEvento {
  titulo: string;
  trechos: Trecho[];
}

const texto = (s: string): Trecho => ({ texto: s });
const negrito = (s: string): Trecho => ({ texto: s, negrito: true });
const campos = (item: TimelineItemView): string[] =>
  Array.isArray(item.payload?.fields) ? (item.payload.fields as unknown[]).map(String) : [];

export function textoDoEvento(
  item: TimelineItemView,
  nomesDasEtapas: Readonly<Record<string, string>>,
  t: (s: string) => string,
): TextoDoEvento {
  const reason = item.reason?.trim() ?? "";
  switch (item.type) {
    case "stage_changed": {
      const de = nomesDasEtapas[String(item.payload?.from_stage_id ?? "")];
      const para = nomesDasEtapas[String(item.payload?.to_stage_id ?? "")];
      if (de && para) {
        return {
          titulo: t("Mudou de etapa"),
          trechos: [texto(t("Esta oportunidade passou da etapa") + " "), negrito(de), texto(" " + t("para a etapa") + " "), negrito(para)],
        };
      }
      return { titulo: t("Mudou de etapa"), trechos: reason ? [texto(reason)] : [] };
    }
    case "lead_edited": {
      const lista = campos(item);
      if (lista.includes("owner_user_id") || lista.includes("owner_agent_id")) {
        return { titulo: t("Mudou de usuário"), trechos: reason ? [texto(reason)] : [] };
      }
      const titulo = lista.length > 1 ? t("Campos do negócio alterados") : t("Campo do negócio alterado");
      return { titulo, trechos: [texto(reason || (lista.length ? `${t("Alterou")} ${listaLegivel(lista)}` : ""))] };
    }
    case "note":
      return { titulo: t("Nova nota"), trechos: [] };
    case "lead_created":
      return { titulo: t("Negócio criado"), trechos: reason ? [texto(reason)] : [] };
    case "moved_from_pipeline":
      return { titulo: t("Mudou de origem"), trechos: reason ? [texto(reason)] : [] };
    default:
      return { titulo: t(activityLabel(item.type)), trechos: reason ? [texto(reason)] : [] };
  }
}

const semAcento = (s: string) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

export function casaComABusca(
  item: TimelineItemView,
  termo: string,
  t: (s: string) => string,
  nomesDasEtapas: Readonly<Record<string, string>>,
): boolean {
  const alvo = semAcento(termo.trim());
  if (!alvo) return true;
  const { titulo, trechos } = textoDoEvento(item, nomesDasEtapas, t);
  const pilha = [titulo, ...trechos.map((x) => x.texto), item.actor_user_name ?? "", item.actor_agent_name ?? ""];
  return semAcento(pilha.join(" ")).includes(alvo);
}
```

Se `ActivityType` não incluir algum nome da lista (o vocabulário muda), o `satisfies` acusa no typecheck: tire o nome que não existe mais; nunca invente type.

- [ ] **Step 4: O hook**

Create `hooks/escale/useHistoricoDoNegocio.ts`:

```ts
"use client";
import { useInfiniteQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";

import { useRealtimeChannel } from "@/hooks/realtime/useRealtimeChannel";
import { apiClient } from "@/lib/api/client";
import { PAGINA_DO_HISTORICO, ehAutomacao, tiposDoGrupo, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import type { TimelineItemView } from "@/lib/types/contacts";

/**
 * O HISTÓRICO PAGINADO (fork Escale, Fase 1H; C18). A rota do original pagina
 * por cursor e filtra por `type`; o `useLeadTimeline` lê só a primeira página,
 * por isso este hook. Tempo real: INSERT em crm_lead_activities invalida.
 */
type Pagina = { data: TimelineItemView[]; meta?: { has_more?: boolean; cursor?: string | null } };

export const chaveDoHistorico = (leadId: string, grupo: ChaveDoGrupo) => ["historico-do-negocio", leadId, grupo] as const;

export function useHistoricoDoNegocio(leadId: string, grupo: ChaveDoGrupo) {
  const qc = useQueryClient();
  const tipos = tiposDoGrupo(grupo);
  const consulta = useInfiniteQuery({
    queryKey: chaveDoHistorico(leadId, grupo),
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const busca = new URLSearchParams({ limit: String(PAGINA_DO_HISTORICO) });
      for (const tipo of tipos ?? []) busca.append("type", tipo);
      if (pageParam) busca.set("cursor", pageParam);
      return apiClient.get<Pagina>(`/api/v1/leads/${leadId}/timeline?${busca.toString()}`);
    },
    getNextPageParam: (ultima) => (ultima.meta?.has_more ? (ultima.meta.cursor ?? null) : null),
    enabled: tipos === null || tipos.length > 0,
  });

  useRealtimeChannel({
    name: `historico-${leadId}`,
    postgresChanges: { event: "INSERT", table: "crm_lead_activities", filter: `lead_id=eq.${leadId}` },
    onChange: () => void qc.invalidateQueries({ queryKey: ["historico-do-negocio", leadId] }),
  });

  const itens = useMemo(() => {
    const todos = consulta.data?.pages.flatMap((p) => p.data) ?? [];
    return grupo === "automacoes" ? todos.filter(ehAutomacao) : todos;
  }, [consulta.data, grupo]);

  return {
    itens,
    isLoading: consulta.isLoading,
    isError: consulta.isError,
    temMais: !!consulta.hasNextPage,
    carregarMais: () => void consulta.fetchNextPage(),
    carregandoMais: consulta.isFetchingNextPage,
  };
}
```

Grupo com `tipos: []` (Email, Campanhas…): a consulta fica desligada e a lista vazia mostra "Os resultados não foram encontrados.". Confira `useRealtimeChannel` (`hooks/realtime/useRealtimeChannel.ts`): se o nome do canal precisar de prefixo ou de `enabled`, siga o `useLeadTimeline` do original.

- [ ] **Step 5: O cartão e a aba**

Create `components/escale/negocio/abas/CartaoDoHistorico.tsx`:

```tsx
"use client";
import { useState } from "react";
import { toast } from "sonner";

import { JanelaDeNota } from "@/components/escale/negocio/JanelaDeNota";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useExcluirNota } from "@/hooks/escale/useNotasDoNegocio";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { grupoDoEvento, textoDoEvento, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import type { Nota } from "@/lib/escale/negocio/notas";
import { haQuantoTempo } from "@/lib/escale/negocio/regras";
import { actorName } from "@/lib/leads/activity-vocabulary";
import type { TimelineItemView } from "@/lib/types/contacts";
import {
  Bot,
  CalendarDays,
  CheckCircle2,
  Clock,
  ListChecks,
  Mail,
  Merge,
  MessageCircle,
  NotebookPen,
  Paperclip,
  Pencil,
  Phone,
  Plus,
  Send,
  Trash2,
  Zap,
  type LucideIcon,
} from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** O CARTÃO DO HISTÓRICO DA CLINT (fork Escale, Fase 1H; C18; print 07). */
const ICONE: Record<ChaveDoGrupo, LucideIcon> = {
  todos: ListChecks,
  agendamentos: CalendarDays,
  automacoes: Zap,
  atividades: CheckCircle2,
  notas: NotebookPen,
  email: Mail,
  lembretes: Clock,
  ligacao: Phone,
  negocio_criado: Plus,
  clique_whatsapp: MessageCircle,
  alteracoes_negocio: ListChecks,
  alteracao_de_campos: Pencil,
  integracoes: Send,
  campanhas: Send,
  mescla_de_contatos: Merge,
  anexos: Paperclip,
};
/** Q12: verde para atividade/agendamento, marca para o negócio, cinza para o resto. */
function corDoGrupo(grupo: ChaveDoGrupo): string {
  if (grupo === "atividades" || grupo === "agendamentos") return "bg-[var(--escale-status-ganho)] text-white";
  if (grupo === "alteracoes_negocio" || grupo === "negocio_criado" || grupo === "alteracao_de_campos") return "bg-casca-marca text-accent-foreground";
  return "bg-casca-borda text-casca-texto-2";
}

export function CartaoDoHistorico({
  item,
  nota,
  nomesDasEtapas,
  leadId,
  podeEditarNota,
}: {
  item: TimelineItemView;
  nota?: Nota;
  nomesDasEtapas: Readonly<Record<string, string>>;
  leadId: string;
  podeEditarNota: boolean;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const excluir = useExcluirNota(leadId);
  const [aberta, setAberta] = useState(false);
  const [editando, setEditando] = useState(false);
  const [removendo, setRemovendo] = useState(false);
  const grupo = grupoDoEvento(item);
  const Icone = item.actor_kind === "ai" ? Bot : ICONE[grupo];
  const { titulo, trechos } = textoDoEvento(item, nomesDasEtapas, t);
  const quem = actorName(item.actor_kind ?? null, { agente: item.actor_agent_name ?? null, usuario: item.actor_user_name ?? null }, t);

  async function remover() {
    setRemovendo(false);
    if (!nota) return;
    try {
      await excluir.mutateAsync(nota.id);
      toast.success(t("A nota foi removida com sucesso!"));
    } catch {
      toast.error(t("Ocorreu um erro ao remover a nota!"));
    }
  }

  return (
    <li className="flex gap-3 rounded-lg bg-casca-raia p-3">
      <span aria-hidden className={cn("grid size-8 shrink-0 place-items-center rounded-md", corDoGrupo(grupo))}>
        <Icone size={16} />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[13px] font-semibold text-casca-texto">{titulo}</p>
        {trechos.length ? (
          <p className="mt-0.5 text-[13px] text-casca-texto-2">
            {trechos.map((x, i) => (x.negrito ? <strong key={i} className="font-semibold text-casca-texto">{x.texto}</strong> : <span key={i}>{x.texto}</span>))}
          </p>
        ) : null}
        {nota ? (
          <div className="mt-1">
            <p className={cn("text-[13px] whitespace-pre-wrap text-casca-texto-2", !aberta && "line-clamp-2")}>{nota.texto}</p>
            <div className="mt-1 flex items-center gap-3">
              <button type="button" onClick={() => setAberta((a) => !a)} className="text-[12px] text-casca-marca hover:underline">
                {aberta ? t("Ocultar nota") : t("Ver nota")}
              </button>
              {aberta && podeEditarNota ? (
                <>
                  <BotaoDaCasca variante="texto" tamanho="sm" onClick={() => setEditando(true)}>
                    {t("Editar nota")}
                  </BotaoDaCasca>
                  <BotaoDaCasca variante="icone" tamanho="sm" aria-label={t("Remover nota")} onClick={() => setRemovendo(true)}>
                    <Trash2 aria-hidden />
                  </BotaoDaCasca>
                </>
              ) : null}
            </div>
          </div>
        ) : item.type === "note" ? (
          <p className="mt-0.5 text-[12px] text-casca-meta">{t("Esta nota foi removida.")}</p>
        ) : null}
        <p className="mt-1 flex items-center gap-1 text-[11px] text-casca-suave">
          <Clock size={12} aria-hidden />
          {haQuantoTempo(item.performed_at, new Date(), idioma)} {t("por")}
          <span className="grid size-4 place-items-center rounded-full bg-casca-marca-suave text-[9px] font-semibold text-casca-marca">{quem.charAt(0).toUpperCase()}</span>
          {quem}
        </p>
      </div>
      {nota ? (
        <>
          <JanelaDeNota leadId={leadId} aberta={editando} onFechar={() => setEditando(false)} nota={{ id: nota.id, texto: nota.texto }} />
          <AlertDialog open={removendo} onOpenChange={setRemovendo}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("Deseja remover a nota?")}</AlertDialogTitle>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>{t("Cancelar")}</AlertDialogCancel>
                <AlertDialogAction onClick={() => void remover()}>{t("Remover")}</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </>
      ) : null}
    </li>
  );
}
```

Replace `components/escale/negocio/abas/AbaHistorico.tsx` inteiro por:

```tsx
"use client";
import { useMemo, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useActiveOrg, useUser } from "@/hooks/auth/AuthProvider";
import { useHistoricoDoNegocio } from "@/hooks/escale/useHistoricoDoNegocio";
import { useNotasDoNegocio } from "@/hooks/escale/useNotasDoNegocio";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { ROLE_RANK } from "@/lib/auth/types";
import { GRUPOS_DO_HISTORICO, casaComABusca, type ChaveDoGrupo } from "@/lib/escale/negocio/historico";
import { secoesDoHistorico } from "@/lib/escale/negocio/regras";
import type { Stage } from "@/lib/kanban/types";
import type { Lead } from "@/lib/types/leads";
import { Search } from "@/lib/ui/icons-da-casca";

import { CartaoDoHistorico } from "./CartaoDoHistorico";

/**
 * A ABA HISTÓRICO DA FICHA (fork Escale, Fases 1G e 1H; C18, N12; prints 07 e 12).
 * Busca na tela, filtro por grupo (os 16 da Clint; o `type` vai na rota),
 * 25 por página com "Carregar mais", seções Hoje/Ontem/Esta semana/data, e as
 * notas com "Ver nota", "Editar nota" e a lixeira.
 */
export function AbaHistorico({ lead, stages }: { lead: Lead; stages: readonly Stage[] }) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const user = useUser();
  const org = useActiveOrg();
  const gerente = !!org && ROLE_RANK[org.role] >= ROLE_RANK.manager;
  const [busca, setBusca] = useState("");
  const [grupo, setGrupo] = useState<ChaveDoGrupo>("todos");
  const historico = useHistoricoDoNegocio(lead.id, grupo);
  const notas = useNotasDoNegocio(lead.id).data ?? [];
  const nomesDasEtapas = useMemo(() => Object.fromEntries(stages.map((s) => [s.id, s.name])), [stages]);
  const notaPorId = useMemo(() => new Map(notas.map((n) => [n.id, n])), [notas]);

  const visiveis = useMemo(
    () => historico.itens.filter((i) => casaComABusca(i, busca, t, nomesDasEtapas)),
    [historico.itens, busca, t, nomesDasEtapas],
  );
  const secoes = useMemo(() => secoesDoHistorico(visiveis, new Date(), idioma), [visiveis, idioma]);

  return (
    <div className="px-4 py-6">
      <div className="flex items-center gap-3">
        <span className="relative">
          <input
            type="search"
            aria-label={t("Buscar no histórico...")}
            placeholder={t("Buscar no histórico...")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-[148px] rounded-md bg-casca-busca pr-7 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:outline-2 focus-visible:outline-casca-marca"
          />
          <Search size={14} aria-hidden className="absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </span>
        <div className="w-[218px]">
          <SeletorDaCasca
            valor={grupo}
            opcoes={GRUPOS_DO_HISTORICO.map((g) => ({ valor: g.chave, rotulo: t(g.rotulo) }))}
            aria-label={t("Selecione um grupo")}
            buscaAPartirDe={99}
            className="h-8"
            aoMudar={(v) => setGrupo((v || "todos") as ChaveDoGrupo)}
          />
        </div>
      </div>
      {historico.isLoading ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Carregando…")}</p>
      ) : historico.isError ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Não consegui carregar o histórico.")}</p>
      ) : secoes.length === 0 ? (
        <p className="mt-6 text-xs text-casca-suave">{t("Os resultados não foram encontrados.")}</p>
      ) : (
        secoes.map((s) => (
          <section key={s.chave} className="mt-6">
            <h3 className="flex items-center gap-2 text-[11px] font-semibold text-casca-texto uppercase">
              <span>{t(s.rotulo)}</span>
              <span className="font-normal text-casca-meta normal-case">{s.data}</span>
              <span aria-hidden className="h-px flex-1 bg-casca-borda" />
            </h3>
            <ol className="mt-3 flex flex-col gap-2">
              {s.itens.map((item) => {
                const nota = item.type === "note" ? notaPorId.get(String(item.payload?.nota_id ?? "")) : undefined;
                return (
                  <CartaoDoHistorico
                    key={item.id}
                    item={item}
                    nota={nota}
                    nomesDasEtapas={nomesDasEtapas}
                    leadId={lead.id}
                    podeEditarNota={!!nota && (gerente || nota.user_id === user.id)}
                  />
                );
              })}
            </ol>
          </section>
        ))
      )}
      {historico.temMais ? (
        <div className="mt-6 flex justify-center">
          <BotaoDaCasca variante="texto" tamanho="md" onClick={historico.carregarMais} disabled={historico.carregandoMais}>
            {t("Carregar mais")}
          </BotaoDaCasca>
        </div>
      ) : null}
    </div>
  );
}
```

Em `ConteudoDaAba.tsx`: `case "historico": return <AbaHistorico lead={ficha.lead} stages={ficha.stages} />;`. O `SeletorDaCasca` sem opção vazia: confira se ele exige `vazio`; se exigir, passe `vazio={t("Selecione um grupo")}` com `vazioSoNoGatilho`.

- [ ] **Step 6: Rodar e ver passar**

Run: `corepack pnpm vitest run tests/unit/escale-ficha-historico-regras.test.ts tests/unit/escale-ficha-aba-historico.test.tsx tests/unit/escale-ficha-regras.test.ts tests/unit/escale-ficha-abas-atividades-historico.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx tests/unit/tailwind-tokens.test.ts tests/unit/controle-decorativo.test.ts && corepack pnpm prettier --write lib/escale/negocio/historico.ts hooks/escale/useHistoricoDoNegocio.ts components/escale/negocio/abas/CartaoDoHistorico.tsx tests/unit/escale-ficha-historico-regras.test.ts tests/unit/escale-ficha-aba-historico.test.tsx && corepack pnpm eslint lib/escale/negocio/historico.ts lib/escale/negocio/regras.ts hooks/escale/useHistoricoDoNegocio.ts components/escale/negocio/abas/CartaoDoHistorico.tsx components/escale/negocio/abas/AbaHistorico.tsx components/escale/negocio/ConteudoDaAba.tsx && corepack pnpm typecheck`
Expected: PASS. Se `escale-ficha-do-negocio.test.tsx` montar o Histórico, acrescente os mocks de `useHistoricoDoNegocio` e `useNotasDoNegocio`.

- [ ] **Step 7: Revisor (G1).** Dispare o `code-reviewer` com o diff desta task e a pergunta: "o filtro de grupo manda só types que existem no vocabulário; o cursor e o `has_more` seguem a rota; o tempo real invalida só este negócio; o texto da nota vem da tabela de notas, nunca do `reason`; editar/remover só para o autor ou gerente?". Corrija o que for CRITICAL/HIGH.

- [ ] **Step 8: Commit**

```bash
git add lib/escale/negocio/historico.ts lib/escale/negocio/regras.ts hooks/escale/useHistoricoDoNegocio.ts components/escale/negocio/abas/CartaoDoHistorico.tsx components/escale/negocio/abas/AbaHistorico.tsx components/escale/negocio/ConteudoDaAba.tsx tests/unit/escale-ficha-historico-regras.test.ts tests/unit/escale-ficha-aba-historico.test.tsx tests/unit/escale-ficha-regras.test.ts tests/unit/escale-ficha-abas-atividades-historico.test.tsx tests/unit/escale-ficha-do-negocio.test.tsx
git commit -m "feat(escale): Histórico da ficha com busca, grupos, Carregar mais e notas (Fase 1H, C18)

Co-Authored-By: Claude Fable 5.1 <noreply@anthropic.com>"
```

### Task 14: Espanhol do PR B, a rodada cheia, a conferência, o PRD e o PR B

- [ ] **Step 1: O espanhol.** O mesmo script da Task 6, com `CAB = "  // ─── FORK ESCALE · Fase 1H (PR B): notas, arquivos, conversas e histórico ───"` e esta lista:

| pt | es |
|---|---|
| Nova nota | Nueva nota |
| Editar nota | Editar nota |
| Ver nota | Ver nota |
| Ocultar nota | Ocultar nota |
| Remover nota | Quitar nota |
| Esta nota foi removida. | Esta nota fue eliminada. |
| Ao inserir e salvar uma nota, ela estará automaticamente disponível no histórico do contato. | Al insertar y guardar una nota, estará disponible automáticamente en el historial del contacto. |
| A nota foi salva com sucesso! | ¡La nota se guardó con éxito! |
| A nota foi editada com sucesso! | ¡La nota se editó con éxito! |
| Ocorreu um erro ao salvar a nota! | ¡Ocurrió un error al guardar la nota! |
| Deseja remover a nota? | ¿Quieres quitar la nota? |
| A nota foi removida com sucesso! | ¡La nota se eliminó con éxito! |
| Ocorreu um erro ao remover a nota! | ¡Ocurrió un error al eliminar la nota! |
| A nota precisa de texto, com até 4.000 caracteres. | La nota necesita texto, de hasta 4.000 caracteres. |
| Nota não encontrada. | Nota no encontrada. |
| Não consegui carregar as notas. | No pude cargar las notas. |
| Novo documento | Nuevo documento |
| Nenhum documento adicionado | Ningún documento agregado |
| Adicionar | Agregar |
| Filtrar por data de upload | Filtrar por fecha de carga |
| Filtrar por tipo de arquivo | Filtrar por tipo de archivo |
| Limpar filtros | Limpiar filtros |
| Faça upload de arquivos de até {maxMb} MB para anexar ao contato | Sube archivos de hasta {maxMb} MB para adjuntar al contacto |
| Mais opções | Más opciones |
| Baixar arquivo | Descargar archivo |
| Excluir | Eliminar |
| Tem certeza que deseja apagar este arquivo? | ¿Seguro que quieres borrar este archivo? |
| Arquivo excluído com sucesso | Archivo eliminado con éxito |
| Erro ao excluir arquivo | Error al eliminar el archivo |
| Arquivo(s) enviado(s) com sucesso | Archivo(s) enviado(s) con éxito |
| Erro ao enviar arquivo(s) | Error al enviar archivo(s) |
| O arquivo {fileName} excede o limite de {maxMb} MB. | El archivo {fileName} supera el límite de {maxMb} MB. |
| Tipo de arquivo não suportado. | Tipo de archivo no admitido. |
| Arquivo vazio. | Archivo vacío. |
| Envie o arquivo no campo file. | Envía el archivo en el campo file. |
| Contato não encontrado. | Contacto no encontrado. |
| Arquivo não encontrado. | Archivo no encontrado. |
| Não consegui carregar os arquivos. | No pude cargar los archivos. |
| Não consegui abrir o arquivo. | No pude abrir el archivo. |
| Em aberto | Abierta |
| Pendente | Pendiente |
| Em atendimento | En atención |
| Com o agente | Con el agente |
| Resolvida | Resuelta |
| Encerrada | Cerrada |
| Arquivada | Archivada |
| Atendente: | Agente: |
| Não foi possível carregar as conversas. | No se pudieron cargar las conversaciones. |
| Sem mensagem | Sin mensaje |
| Buscar no histórico... | Buscar en el historial... |
| Selecione um grupo | Selecciona un grupo |
| Carregar mais | Cargar más |
| Hoje | Hoy |
| Ontem | Ayer |
| Os resultados não foram encontrados. | No se encontraron resultados. |
| Agendamentos | Programaciones |
| Automações | Automatizaciones |
| Notas | Notas |
| Lembretes | Recordatorios |
| Ligação | Llamada |
| Negócio criado | Negocio creado |
| Clique para WhatsApp | Clic para WhatsApp |
| Alterações negócio | Cambios del negocio |
| Alteração de campos | Cambio de campos |
| Integrações | Integraciones |
| Campanhas | Campañas |
| Mescla de contatos | Fusión de contactos |
| Anexos | Adjuntos |
| Mudou de etapa | Cambió de etapa |
| Mudou de usuário | Cambió de usuario |
| Mudou de origem | Cambió de origen |
| Esta oportunidade passou da etapa | Esta oportunidad pasó de la etapa |
| para a etapa | a la etapa |
| Campo do negócio alterado | Campo del negocio modificado |
| Campos do negócio alterados | Campos del negocio modificados |
| Alterou | Modificó |

Rode `corepack pnpm vitest run tests/unit/i18n-espanhol-cobre-a-tela.test.ts tests/unit/escale-espanhol-registro-tu.test.ts` e o typecheck. Expected: PASS (acrescente à mão o que a gate listar). Commit `feat(escale): espanhol da ficha do negócio (1H, PR B)`.

- [ ] **Step 2: A rodada cheia, em segundo plano (G1).** Os mesmos comandos da Task 6 com os logs `1h-prb-*`, mais o banco:

```bash
( corepack pnpm test:db && corepack pnpm test:db:update ) > .superpowers/sdd/1h-prb-db.log 2>&1 &
```
Expected: `novas: 0`, `rapidos=0`, `test:db` verde (as duas lentas conhecidas podem falhar na rodada cheia e passam sozinhas).

- [ ] **Step 3: Conferência visual** (contrato, CAMINHO A ou B). Com a casca ligada: "Nova nota" pela ação e pelo ⋮; o Histórico com a nota, o filtro aberto (print 12) e "Carregar mais"; Arquivos vazio (print 06) e com um arquivo (01-001), o modal "Novo documento", os filtros; Conversas (print 05). Escreva a lista das diferenças que sobram (as já previstas: sem ícone por opção no filtro do Histórico; sem "ORIGEM: …" por evento; sem "via automação"/"Ver automação"; sem antes/depois de campo; sem o ícone do canal na foto da sessão; sem prévia em tela cheia do arquivo; sem medidor de cota; nota em texto simples). Com CAMINHO B, o PR registra "conferência visual pendente: depois do deploy".

- [ ] **Step 4: PRD.** Em `docs/modulos/1-negocios.md`, seção 8, linha `| 1H |`: `✅ PR A #NN; PR B aberto (notas, arquivos, conversas e histórico)`. Na tabela C: `| C16 |` ganha "sem filtros (a Clint atual não os tem; decisão de 17/10)" e `| C18 |` ganha "sem 'ver automação' e sem antes/depois de campo (o original não grava; decisão de 17/10)". Em `docs/roteiro.md`, se houver a seção de decisões numeradas, acrescente: "7. **Arquivos e notas (17/10/2026):** o arquivo é do contato, como na Clint; a nota é do negócio, com o contato. Migration 9008. A anonimização LGPD das duas tabelas fica para a Fase 2 (Contatos)."

- [ ] **Step 5: Push e PR B.**

```bash
git push -u escale-crm feat/fase-1h-notas-arquivos-historico
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-1h-notas-arquivos-historico --title "feat(escale): Fase 1H (B) — notas, arquivos, conversas e histórico da ficha, igual à Clint" --body-file .superpowers/sdd/1h-prb-pr.md
```

Corpo: o Goal (a parte das quatro abas); as decisões N7 a N12 e N15; a migration 9008 (tabelas, RLS, bucket) e como foi provada; os desvios previstos (Step 3); as perguntas Q6 a Q12 e Q14; os prints que faltam 5 a 10; a conferência visual; a verificação. Termina com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.

Mostre a URL ao usuário e PARE.

## Fora desta fase (registrado)

- **Empresa (C12, C13):** ver e vincular a empresa; os oito campos da Clint; a tela "Gerenciamento de campos" com grupos — Fase 2 (Q2, Q5).
- **Modo espião e abrir a conversa dentro da aba (C22):** Fase 3 (Q6).
- **"Ver automação" e "… via automação":** exige o original gravar `rule_id` na atividade (`lib/leads/activity-emitter.ts`, `lib/automation/actions/*`) — pedir ao usuário se quer o encaixe (Q10).
- **Antes/depois de campos:** o original grava só os nomes (LGPD) (Q11).
- **Origem por evento ("ORIGEM: GRUPO › ORIGEM" no cartão):** a atividade não guarda a origem; fica o desvio da 1G.
- **Ícone por opção no filtro do Histórico:** o `SeletorDaCasca` ganharia `icone?` na opção; fora desta fase.
- **Datepicker para campos de data:** quando houver print do da Clint (N2).
- **Seletor de país "BR ▾" no telefone:** quando houver pedido; hoje o DDI vai no texto (N4).
- **Apagar telefone/e-mail pela ficha:** o schema do original não aceita (Q4).
- **Tag com cor e descrição ao criar:** a cor fica no original (`/api/v1/tags/cores`) (Q13).
- **Prévia do arquivo em tela cheia, ordenação no servidor e cota de 5 GB:** fora (PRD §9; N8).
- **LGPD das tabelas novas:** `fn_lgpd_cascade_redact_contact` não alcança `crm_notas_do_negocio` nem `crm_arquivos_do_contato` (só o `on delete cascade`); Fase 2 (Contatos) (Q14).
- **Eventos de arquivo no Histórico ("Novo arquivo anexado", grupo "Anexos"):** quando houver pedido; a 1H não emite atividade no upload.
- **Nota em texto rico e menções:** quando houver pedido (Q9).
- **"Campo obrigatório nesta etapa" com a regra da 1F (`obrigatorio_em`/"ao sair") marcando o campo na ficha:** a `CampoEditavel.obrigatorioNaEtapa` já existe; ligar à regra é um ajuste depois da 1F PR B.
