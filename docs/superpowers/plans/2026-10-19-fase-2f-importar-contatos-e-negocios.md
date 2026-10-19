# Fase 2F — Importar contatos e negócios (o "Import Studio" da Clint) · Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task (inline; memória "Executar planos com executing-plans"). Steps use checkbox (`- [ ]`) syntax for tracking.

> **Itens do PRD:** B6 de `docs/modulos/2-contatos-e-empresas.md` (tabela B), que virou fase própria depois da 2D (Q7 da 2B, 17/10). Junta também o "Importar negócios" do quadro (1E, D6), que passa a abrir o mesmo assistente na aba Negócios. **Frente B**, worktree `wt-frente-b`, migration **9107** (a 9106 fica reservada à 2E). **Três PRs:** **A** = banco e motor (Tasks 1–9); **B** = o assistente de 5 passos e as entradas (Tasks 10–15); **C** = a página "Importações", o relatório e a revisão (Tasks 16–19).
> **Pré-requisito:** a 2C e a 2D mergeadas (catálogos de campos 9104, empresas 9105) e a bateria da Frente B (PR #43) na `main`. A Task 1 prova.

## Respostas do usuário (19/10)

| # | Pergunta | Resposta |
|---|---|---|
| Q1 | Contatos e Negócios no mesmo assistente? | **Sim, os dois**, como a Clint. O "Importar negócios" do quadro abre o mesmo assistente na aba Negócios, com a origem do quadro escolhida |
| Q2 | Quanto do Import Studio entra? | **Tudo igual à Clint:** 5 passos, níveis Conservador/Padrão/Agressivo, segundo plano, fila "Revisar pendências", "Relatório da importação" e a lista "Importações" |
| Q3 | Onde fica a lista "Importações"? | **Página própria no "Mais"** (o `/imports` da Clint), com a troca Importações / Exportações. As exportações da 2B aparecem lá também. O aviso "Ver importações" leva a ela |

**Prints que faltam** (nenhum bloqueia; onde falta, o plano segue o código e os textos da Clint citados abaixo):
1. ❌ Passos 2 a 5 com **Contatos** escolhido (há os de Negócios, v2-08 a v2-11).
2. ❌ O passo Decisões rolado até o fim (as categorias C, D e E e o resumo "auto-resolvem / vão para revisão").
3. ❌ A lista "Importações" (com e sem importações, uma "Aguardando revisão", uma em andamento) e a superfície "Exportações".
4. ❌ "Relatório da importação" e "Revisar pendências" (uma pendência de cada motivo).
5. ❌ O aviso depois de "Confirmar e importar".

**Goal:** Com a casca ligada, "Importar contatos" (lista de Contatos), "Importar negócios" (quadro) e "Nova importação" (página Importações) abrem o assistente da Clint em 5 passos (Arquivo, Mapeamento, Configurações, Decisões, Prévia e confirmação). O arquivo CSV (até 25 MB e 50.000 linhas) é importado em segundo plano: cria e atualiza contatos (com os campos personalizados e a empresa) e cria ou atualiza negócios; o que é seguro entra sozinho e o que tem risco vai para "Revisar pendências", conforme o nível de automação. A página "Importações" lista as importações e as exportações, com andamento, "Revisar", "Relatório" e "Cancelar".

**Architecture:**
- **Banco (9107):** `crm_importacoes` (a importação: tipo, arquivo, mapeamento, configuração, decisões, nível, status e contagens) e `crm_importacoes_linhas` (uma por linha do arquivo: o bruto, o normalizado, o status, o motivo, o detalhe, as resoluções e o que criou). **Só leitura pela sessão** (gerente ou acima da organização); toda escrita é do service role, nas rotas (depois do `requireRole("manager")`) e no consumidor. Funções invoker **fechadas ao `service_role`**: `fn_escale_enfileirar_importacao`, `fn_escale_contar_importacao`, `fn_escale_cancelar_importacao`, `fn_escale_reabrir_importacao`, `fn_escale_limpar_linhas_antigas`; e a definer `fn_escale_empresa_da_importacao` (acha ou cria a empresa e vincula o contato, usando as funções da 2D).
- **Motor (puro, testável sem banco):** `lib/escale/importacao/{regras,mapeamento,linhas,classificar}.ts`. `classificar` passa cada linha por "portões" na ordem da Clint e devolve **pular**, **revisar** (com o motivo) ou **importar** (com o plano). A mesma função serve ao consumidor e à resolução de uma linha na revisão.
- **Servidor:** `lib/escale/importacao/{contexto,aplicar,executar,banco}.ts`, o consumidor do `event_log` (molde da 2B: lotes de 100, 20 s por rodada, `retry`) e as rotas do fork em `/api/v1/importacoes/**`.
- **Telas:** `components/escale/importacao/**`: o assistente (generaliza a janela da 1E), a lista, o relatório e a revisão. Encaixes em `app/app/imports/page.tsx` e `app/app/imports/[id]/page.tsx` (com a casca, as telas do fork; sem ela, o B2B do original).

**Tech Stack:** Next.js 16 App Router, React 19, TypeScript estrito, TanStack Query 5, Radix, zod, Vitest + Testing Library, Tailwind 4 com os tokens da casca, `lucide-react` via `@/lib/ui/icons-da-casca`, Postgres (RLS, funções invoker e definer fechadas), `event_log` + worker.

## Referência visual (abrir a imagem antes de cada task de tela)

Os caminhos ficam **sem crase** (guarda `evidencia-citada`).

| # | Arquivo | O que define | Task |
|---|---|---|---|
| 2b-41 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-41-importar-passo1-contatos.jpg | passo 1 com **Contatos** escolhido | 10 |
| 2b-40 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-2b\2026-10-17-40-menu-novo-contato.jpg | o menu "Novo contato / Importar contatos" | 14 |
| v2-06 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-06-importar-1-arquivo.jpg | passo 1 (Negócios) | 10 |
| v2-07 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-07-importar-1-arquivo-pronto.jpg | arquivo escolhido ("Pronto para mapear") | 10 |
| v2-08 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-08-importar-2-mapeamento.jpg | passo 2: tabela "Coluna do arquivo / Mapear para", "+ Adicionar campo" | 11 |
| v2-09 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-09-importar-3-configuracoes.jpg | passo 3 (Negócios): tags, origem, etapa, status | 12 |
| v2-10 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-10-importar-4-decisoes.jpg | passo 4: os três níveis e "Ajuste cada situação" | 13 |
| v2-11 | C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-1e\v2-11-importar-5-previa.jpg | passo 5: o resumo e o aviso | 14 |

As medidas do assistente já foram tiradas desses prints na 1E e estão em `components/escale/quadro/{JanelaDeImportarNegocios,ConteudoDaImportacao,PassosDaImportacao}.tsx`: janela `min(1040px)` × `min(690px)`, faixa de passos de 64px com círculos de 32px, título 22px/500, subtítulo 13px `#5A5964`, colunas centrais de 640/720/560px, linhas da tabela de 56px, rodapé de 64px com botões de 32px. **A 2F move essas peças para `components/escale/importacao/` sem mudar as medidas.**

### Medidas das telas sem print (do código da Clint, `index-UPYK_E9J` e `index-DXIjyGaW`; Chakra: `xs` 12px, `sm` 14px, `2xl` 24px, espaço 1 = 4px)

| Peça | Medida |
|---|---|
| Decisões | coluna de 760px; título 22px/500 e subtítulo centrados; três cartões lado a lado (padding 16px, borda 1,5px, canto 8px; o ativo com borda e fundo `casca-marca` / `casca-marca-suave`; ícone 18px + nome 13px/600; "RECOMENDADO" 10px/600 maiúsculo `casca-marca` no Conservador; texto 12px `#5A5964` com altura mínima de 54px; rodapé com borda em cima: "{n} auto" verde 12px/600 e "{n} revisar" laranja 12px/600) |
| Situações | "Ajuste cada situação" 13px/600 à esquerda e "Partindo do preset "{nível}"" 12px `#5A5964` à direita; caixa com borda e canto 8px; cabeçalho de categoria 10px/600 maiúsculo, espaçamento 0,08em, fundo `#FAFAFC`; linha com padding 12px 16px: bolinha de 8px (verde CONFIG, laranja SOFT, vermelha HARD, roxa SOFT_LOCKED), nome 13px/500, descrição 12px `#5A5964`, e à direita os botões de 30px (texto 12px/500, padding 10px, canto 6px; o escolhido com borda e texto `casca-marca` e fundo `casca-marca-suave`; "Revisar" escolhido em laranja `#C2570C` com fundo `#FFEBD6`, com a bandeira 11px) |
| Resumo das decisões | faixa com borda, canto 8px, fundo `#F8F8FA`, padding 12px 16px: quadradinho 32px verde (✓) + número 16px/600 + "auto-resolvem" 10px; quadradinho 32px laranja (bandeira) + número + "vão para revisão"; à direita, quando há travadas, a nota 12px `#5A5964` de até 280px |
| Lista Importações | cabeçalho de 58px como Empresas (título 20px/500 a 30px da borda, "Nova importação" `BotaoDaCasca variante="marca"` só em Importações); barra com a troca "Importações / Exportações" e o filtro "Todas / Contatos / Negócios" (pílulas de 28px, como o seletor do tipo da 1E); tabela com cabeçalho 11px/600 maiúsculo; linha "Aguardando revisão" com fundo âmbar a 8% e borda esquerda de 3px âmbar; paginação de 20 por página só quando passa de 20 |
| Relatório | padding 24px; cinco cartões lado a lado (borda, canto 8px, padding 16px; ícone 17px num quadrado de 32px colorido; número 24px/600; rótulo 12px `#5A5964`); barra de 8px com quatro trechos (verde, laranja, cinza, vermelho); tabelas "Linha / Motivo / Detalhe" |
| Revisar pendências | padding 24px; a troca por motivo com contador; a faixa "Aplicar a todas as {n} deste motivo:" (fundo `#F8F8FA`, borda, canto 8px, padding 12px); lista à esquerda de 320px (cabeçalho "PENDÊNCIAS (n)" 12px/600 maiúsculo; item com nome 14px/600 e o motivo num selo cinza; o escolhido com borda esquerda de 3px `casca-marca`); detalhe à direita com padding 24px e coluna de 560px; caixas "No sistema" e "No arquivo" de altura mínima 72px (a do arquivo com borda e fundo da marca) e a seta entre elas |

### Textos da Clint usados nesta fase

Do bundle `C:\Documentos\projetos claude\reverse engenering - Copia\clint-model\raw-v2\js\pt-BR-DmQ11GIn.js.txt` (chaves `importStudio.*`, 260 textos) e dos componentes `index-UPYK_E9J.js.txt` (assistente) e `index-DXIjyGaW.js.txt` (lista, relatório e revisão). O espanhol sai das mesmas chaves em `es-ES--Nhr_a4A.js.txt` (Tasks 9, 15 e 19 trazem o script que extrai os pares). **"Clint" vira "Escale OS"** nos textos ("Ligue cada coluna do seu arquivo a um campo da Escale OS.", "A Escale OS não decide sozinha.").

- **Assistente:** "Arquivo"; "Mapeamento"; "Configurações"; "Decisões"; "Prévia e confirmação"; "Contatos"; "Negócios"; "Escolha o arquivo .CSV para criar contatos"; "Escolha o arquivo .CSV para criar negócios"; "Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Escale OS."; "Baixar arquivo de exemplo .CSV"; "Arraste o arquivo aqui ou clique para selecionar"; "Formato .CSV"; "Enviando arquivo…"; "Pronto para mapear"; "Selecione um arquivo .CSV válido."; "Mapeie os campos do seu arquivo"; "Ligue cada coluna do seu arquivo a um campo da Escale OS."; "Coluna do arquivo"; "Mapear para"; "Adicionar campo"; "Não importar esse campo"; "Nenhuma coluna está associada ao Nome da empresa. Os campos da empresa vão para a empresa atual do contato ou para uma nova empresa sem nome."; "Identificadores"; "ID do contato"; "ID do negócio"; "Datas do negócio"; "Data de ganho"; "Configurações da importação"; "Etiquete os contatos importados. Vale para todas as linhas do arquivo."; "Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos."; "Tags do contato"; "Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação."; "Adicionar tag"; "Origem de destino"; "Selecione a origem"; "Sem grupo"; "Etapa inicial padrão"; "Selecione a etapa"; "Selecione a etapa para continuar."; "Status"; "Aberto"; "Ganho"; "Perdido"; "Motivo de perda"; "Não informar"; "Escolha o nível de automação"; "Decisões seguras são aplicadas sozinhas. As de risco ficam numa fila de revisão — nada é substituído sem a sua confirmação."; "Recomendado"; "Conservador"; "Padrão"; "Agressivo"; os três textos dos níveis; "auto"; "revisar"; "Ajuste cada situação"; "Personalizado — você alterou um preset"; "Partindo do preset "{preset}""; "auto-resolvem"; "vão para revisão"; "Linhas que batem com dois contatos sempre vão para revisão — não dá para decidir com segurança automaticamente."; as cinco categorias; os 15 motivos (rótulo e descrição); os rótulos curtos e longos das 16 ações; "Confira e confirme a importação"; "Revise os detalhes antes de iniciar."; "Tipo"; "Campos mapeados"; "Nível de automação"; "{auto} auto · {review} para revisar"; "Personalizado"; "A importação conclui agora; as pendências ficam para revisar depois."; "Tudo que é seguro entra imediatamente. As linhas que precisam de decisão não entram até você resolvê-las na tela de revisão — mas o resto não fica esperando."; "Cancelar"; "Voltar"; "Continuar"; "Confirmar e importar"; "Não foi possível iniciar a importação."; "Ver importações".
- **Lista:** "Importações"; "Exportações"; "Nova importação"; "Todas"; "Importação"; "Exportação"; "Data"; "Status"; "Resultado"; "Na fila"; "Analisando"; "Importando"; "Aguardando revisão"; "Concluída"; "Cancelada"; "Erro"; "Aguardando início…"; "{count} linhas precisam de revisão"; "{ok} importados · {skipped} pulados · {error} erros"; "Origem: {origin}"; "Revisar"; "Relatório"; "Nenhuma importação ainda"; "Faça o upload de um arquivo CSV para criar ou atualizar contatos e negócios em massa."; "Nenhuma exportação ainda"; "Quando você exportar contatos, negócios, campanhas ou a carteira em CSV, os arquivos aparecem aqui."; "Baixar exportação"; "Gerando exportação"; "A importação falhou. Tente novamente ou fale com o suporte."; "Não foi possível ler o arquivo enviado. Envie a planilha novamente.".
- **Relatório:** "Relatório da importação"; "Importados"; "Avisos"; "Para revisar"; "Pulados"; "Erros"; "Exportar"; "Revisar {n} pendências"; "Linhas não importadas por motivo"; "Linha"; "Motivo"; "Detalhe"; "Linha {n}"; "Estas linhas foram importadas normalmente, mas um dado foi descartado durante o processo."; "Avisos agrupados por motivo"; "Telefone descartado: {phone}"; "ID descartado: {id}"; "Nada para revisar aqui. Todas as linhas foram importadas sem ressalvas."; "Este relatório mostra as primeiras {n} linhas. A importação processou mais do que isso."; "ID inválido" e a descrição dele.
- **Revisão:** "Revisar pendências"; "{n} linhas para revisar"; "{resolved} de {total} resolvidas"; "Todas"; "Aplicar a todas as {n} deste motivo:"; "Pendências"; "Selecione uma linha."; "Tudo revisado!"; "Voltar para a lista"; "Match por {field}"; "No sistema"; "No arquivo"; "Contexto do contato"; "Outras diferenças nesta linha"; "Por padrão mantemos o valor atual. Marque para atualizar com o valor do arquivo."; "Por padrão mantemos o valor atual. Use o botão abaixo para atualizar com o valor do arquivo."; "Valor atual"; "Valor do arquivo"; "e atualizar marcados"; "e atualizar {field}"; "Campos que serão preenchidos"; "Estavam vazios neste contato e serão preenchidos com o valor do arquivo."; "Esta linha não altera nenhum campo — os dados do arquivo já constam neste contato."; "O que fazer com esta linha?"; "em breve"; "Linha do arquivo"; "A · e-mail"; "B · telefone"; "Esse contato tem uma conversa de WhatsApp em andamento no telefone atual."; "Por isso uma importação não pode substituir o telefone atual deste contato."; "Telefone do arquivo (inválido)"; "Dados desta linha"; "Serão usados se você ignorar o telefone; o telefone inválido é descartado."; "ID do negócio no arquivo"; "Negócio em aberto (atual)"; "Negócio no arquivo"; "Origem no arquivo"; "Etapa no arquivo"; "Escolha uma origem"; "Escolha uma etapa"; "{label} (empresa)".
- **Textos nossos** (a Clint não tem, no tom dela): "O arquivo passa de 25 MB."; "O arquivo passa de 50.000 linhas."; "O arquivo não tem linhas para importar."; "Disponível para gerente ou acima."; "Só administrador importa negócio ganho."; "Importação iniciada"; "Os detalhes desta importação foram apagados depois de 30 dias."; "Dono descartado: {owner}"; "E-mail descartado: {email}"; "Campo descartado: {field}"; "A importação foi interrompida nesta linha."; "Importação cancelada."; "Esta linha já foi resolvida."; "Importação concluída"; "{n} linhas precisam de revisão"; "Contato já cadastrado com este e-mail, telefone ou CPF.".

### Comportamento da Clint conferido no código (`index-UPYK_E9J`, `index-DXIjyGaW`, `csv-import-CVAAfpnm`)

- **Assistente** (`go`): 5 passos fixos; o passo 1 tem a troca Contatos/Negócios (desligada enquanto envia); escolher o arquivo sobe o CSV e lê só o cabeçalho; o mapeamento nasce sugerido pelo cabeçalho (`Mt` por expressões e `yt` pelo rótulo exato do campo, sem repetir destino); "Continuar" do passo 1 exige o arquivo; o do 2 exige o mapeamento válido; o do 3, na aba Negócios, exige origem e etapa; Decisões começa no Conservador; "Confirmar e importar" inicia a importação (`import_studio_start` com `source_ref`, `target_table`, `preset`, `mapping`, `decisions`, `deal_target`) e fecha a janela; a lista volta à página 1 e pergunta a cada 5 s por 30 s.
- **Exemplo .CSV** (`uo`): contatos `nome,email,telefone,instagram,empresa,tag` com "Maria Silva…" e "João Souza…"; negócios acrescenta `titulo,valor,etapa,status`. Arquivo `exemplo-contatos.csv` / `exemplo-negocios.csv`, gerado no navegador.
- **Mapeamento** (`ao`): grupos Identificadores, Contato, Empresa, Negócio (só em Negócios) e Datas do negócio (só em Negócios); cada destino só uma vez; busca no seletor; "+ Adicionar campo" abre o cadastro de campo (contato e empresa; em Negócios também negócio); o aviso azul quando há campo de empresa sem "Nome da empresa".
- **Configurações** (`io`): Tags do contato (escolher ou criar); em Negócios, Origem de destino (agrupada pelo grupo, com busca), Etapa inicial padrão* (nasce na etapa de entrada da origem), Status (Aberto, Ganho, Perdido) e, em Perdido, Motivo de perda (os da origem e "Não informar").
- **Decisões** (`eo`, `M`, `N`, `G`, `pe`, `me`): 15 situações em 5 categorias; os níveis decidem por risco (Conservador ≤ 2, Padrão ≤ 3, Agressivo ≤ 4; acima, "Revisar"); só entram as situações que valem para o tipo e cujo campo foi mapeado; "A linha bate com dois contatos" está sempre em revisão; mexer numa situação vira "Personalizado"; as contagens "auto/revisar" do cartão e do resumo saem da mesma conta (conferida no print v2-10: com Telefone e Email mapeados em Negócios, Conservador 2/6, Padrão 4/4, Agressivo 6/2).
- **Lista** (`Bo`): pergunta a cada 5 s enquanto há importação na fila ou rodando; linha "Aguardando revisão" destacada em âmbar; "Revisar" (só aguardando revisão), "Relatório" (concluída, erro, cancelada ou aguardando revisão) e "Cancelar" (na fila ou rodando); a coluna Resultado mostra a barra de progresso, "{count} linhas precisam de revisão" ou os contadores.
- **Relatório** (`eo` do `DXIjyGaW`): cinco cartões, a barra, "Linhas não importadas por motivo" e a tabela das puladas e com erro; "Avisos" são as importadas com telefone ou ID descartado; até 500 linhas, com o aviso de corte; "Exportar" baixa o CSV (Linha, Motivo, Detalhe, com BOM) no navegador; "Revisar {n} pendências" abre a revisão.
- **Revisão** (`ao` do `DXIjyGaW`): lista à esquerda, detalhe à direita; a troca por motivo; com um motivo escolhido, "Aplicar a todas as {n} deste motivo:" com as opções dele; resolver uma linha tira ela da lista (ou recarrega, se ela voltou a pedir revisão por outro motivo); o progresso "{resolved} de {total} resolvidas"; "Juntar os dois contatos" aparece desligado com "· em breve".

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| N1 | **Quem importa:** gerente ou acima (PRD §5, `OWNER_IMPORT_CONFIG`). O "Importar contatos" e o "Importar negócios" ficam desligados para atendente e leitor, com a dica "Disponível para gerente ou acima.". **Muda a 1E** (D6 deixava o atendente importar negócios) | PRD §5 |
| N2 | **Quem vê:** a lista, o relatório e a revisão são de gerente ou acima, e mostram **todas** as importações da organização (a Clint lista as da conta); resolver e cancelar também. O admin é o único que importa negócio **ganho** (regra 9014 da 1K): Ganho fica desligado no passo 3 para quem não é admin, e a linha com status "Ganho" vira erro "Só administrador importa negócio ganho." | Clint; 1K |
| N3 | **Arquivo:** CSV, até 25 MB e 50.000 linhas de dados, até 200 colunas, célula cortada em 2.000 caracteres. Lido no servidor com `decodificarCsv` + `parseCsv` do original (UTF-8, cai para windows-1252, separador `,` `;` ou tab, sem BOM). O navegador lê só o cabeçalho, para o mapeamento. O arquivo **não** é guardado: as linhas vão para `crm_importacoes_linhas` | Clint aceita só CSV; 25 MB é o teto que a casca já usa (1H, `proxyClientMaxBodySize: "27mb"`) |
| N4 | **Segundo plano:** a rota cria a importação, grava as linhas (lotes de 1.000) e enfileira (`contatos.importacao_requested`); o consumidor `escale-importacao.v1` processa 100 linhas por lote, 20 s por rodada, e volta com `retry` (molde da 2B). Cada lote é marcado "processando" **antes** de agir (no máximo uma vez); a linha que ficou "processando" de uma rodada que caiu vira erro "A importação foi interrompida nesta linha." | 2B N9 |
| N5 | **Status da importação:** `preparando` → `na_fila` → `importando` → `aguardando_revisao` ou `concluida`; `cancelada` e `falhou`. Rótulos da Clint: Na fila, Importando, Aguardando revisão, Concluída, Cancelada, Erro. "Analisando" (CLASSIFYING) não existe: analisar e importar acontecem no mesmo passo. **Linha:** `na_fila`, `processando`, `importada`, `revisar`, `pulada`, `erro` | simplificação sem mudança visível |
| N6 | **Situações e portões:** os 15 motivos da Clint com as mesmas gravidades, riscos, padrões e opções (`regras.ts`). `classificar` avalia na ordem: A (sem dados, e-mail inválido, repetida no arquivo, telefone inválido) → C (bate com dois contatos) → B/D (telefone diferente ou com WhatsApp em andamento, Instagram diferente, campo preenchido diferente, preencher vazios) → E (ID do negócio, origem, etapa, valor, negócio aberto repetido). A primeira que pede "Revisar" para a linha com aquele motivo; "Descartar" pula; as outras escolhas seguem para o próximo portão. Ao resolver na revisão, a linha roda de novo com a escolha e pode parar num portão seguinte (a Clint recarrega quando volta `PENDING_REVIEW`) | Clint `M`, `oo` |
| N7 | **Contato:** casa pelo ID (quando mapeado e válido), senão pelo e-mail, senão pelo telefone (com as variantes do nono dígito), sempre entre os não mesclados. Novo contato é gravado como o importador do original (insert direto, `source: "import_csv"`, `source_metadata.importacao_id`, `contact.created`), **sem** abrir conversa. Atualizar usa `patchContactHandler` (eventos e auditoria do original); `custom_fields` vai inteiro, com as chaves mexidas. Tags do arquivo e da configuração **somam** às do contato (até 20). Instagram vai em `custom_fields.link_instagram` (`linkDoInstagram`). CPF só na criação (`camposCpfParaGravar`) | 2A, 2B, importador do original |
| N8 | **Diferenças:** comparam-se nome, e-mail, nascimento, empresa e os campos do catálogo (telefone e Instagram têm portões próprios). "Substituir pelo arquivo" (do nível ou da revisão) troca todos os diferentes; "Manter o que já existe" mantém, menos os marcados em "Outras diferenças" ("… e atualizar marcados"). O e-mail ou o telefone do arquivo que já é de **outro** contato é descartado com aviso (o índice único não deixa gravar) | Clint `oo`; índices parciais do original |
| N9 | **Empresa:** "Nome da empresa" acha a empresa pelo CNPJ (se mapeado), senão pelo nome (sem diferença de maiúsculas), senão cria; sem "Nome da empresa", os campos vão para a empresa atual do contato ou para uma empresa nova **sem nome** (texto da Clint). O vínculo usa `fn_escale_vincular_contato_a_empresa` da 2D (uma empresa por contato; vira principal se a empresa não tem). Os campos da empresa (Cidade, Estado, CNPJ e o catálogo) **só preenchem os vazios** | Clint `orgNameMissing`; 2D N4 |
| N10 | **Negócio:** cria com `createLeadHandler` (`via_planilha: true`, `source: "importacao_planilha"`, `exigirCamposDaEtapa: false`), na origem e etapa da linha ou da configuração; Ganho e Perdido por `encerraDemanda` logo depois; "Data de ganho" grava `closed_at`. Perdido sem motivo usa o canônico `other` (o banco exige motivo). "ID do negócio" e "Atualizar o negócio existente" atualizam título, valor, dono e campos por `updateLeadHandler` (etapa e status do negócio existente **não mudam**; nosso, sem como conferir na Clint). Dono pelo e-mail ou pelo nome de um membro ativo; não achado vira aviso "Dono descartado" | 1E; 1F; 1K |
| N11 | **Avisos da origem (1K):** negócio que nasce da planilha (`source = "importacao_planilha"`) não manda o push "Novo negócio" (senão seria um por linha). O follow-up já ignora (`metadata.via`). As automações de "negócio criado" continuam rodando, como no importador do original | 1K D15 |
| N12 | **Revisão:** resolver uma linha grava a escolha em `resolucoes` e roda a linha **na hora** (na rota, com o mesmo motor); resolver em lote grava a escolha em todas as linhas do motivo, devolve-as à fila e acorda o consumidor. "Escolher na lista" (origem ou etapa) só existe na revisão de uma linha. "Juntar os dois contatos" fica desligado "· em breve", como na Clint | Clint |
| N13 | **LGPD:** as linhas guardam dados pessoais. As linhas das importações terminadas há mais de 30 dias são apagadas no começo de cada importação nova da organização (sem cron, molde do `apagarVencidos` da 2B); a importação fica, com as contagens, e o relatório avisa "Os detalhes desta importação foram apagados depois de 30 dias." | LGPD |
| N14 | **Página "Importações":** `app/app/imports/page.tsx` e `[id]/page.tsx` com a casca (`lerPreferenciaDeMenu(cookie) === "topo"`) renderizam as telas do fork; sem a casca, o B2B do original. O item "Importações" do "Mais" já existe (catálogo, `minRole: "manager"`, módulo `crm_b2b`, ligado pela 2D); a descrição passa a "Importe contatos e negócios por planilha e acompanhe as exportações.". A importação B2B do original (empresas e pessoas) segue acessível sem a casca; com a casca, o assistente cobre o caso (contato com campos de empresa). `/app/imports/[id]?revisar=1` abre a revisão | Q3 |
| N15 | **Exportações:** a superfície "Exportações" lista as **minhas** exportações da 2B (`GET /api/v1/acoes-em-massa`, `acao = "exportar"`), com o status e "Baixar exportação" (`/api/v1/acoes-em-massa/[id]/arquivo`). A aprovação continua no botão "Exportações" da lista de contatos | Clint superfície `exports`; 2B Q4 |
| N16 | **Aviso de fim:** a janela fecha com o toast "Importação iniciada" e a ação "Ver importações". O hook `useAcompanharImportacoes` (molde de `useAcompanharAcoes`) avisa "Importação concluída" ou "{n} linhas precisam de revisão" (ação "Revisar") quando ela termina, enquanto a aba estiver aberta | 2B Q6 |
| N17 | **Sai do fork:** `components/escale/quadro/{JanelaDeImportarNegocios,ConteudoDaImportacao,PassosDaImportacao}.tsx` e `lib/escale/importar/{mapear,ler-arquivo}.ts` (e os testes deles) dão lugar a `components/escale/importacao/**` e `lib/escale/importacao/**`. A rota `/api/v1/leads/import` e o `ImportContactsDialog` do original **não mudam** (sem a casca, seguem como estão) | o assistente novo cobre os dois |

## Global Constraints

### Repositório, worktree e Git

- Repositório: `C:\Documentos\projetos claude\Deskcom CRM\repo` (**da Frente A**: não troque de branch nele, não faça stash, não mexa nos arquivos). **Worktree da Frente B:** `C:\Documentos\projetos claude\Deskcom CRM\wt-frente-b`. Todo comando roda dentro dela.
- **Branches:** PR A `feat/fase-2f-importacao-motor`; PR B `feat/fase-2f-importacao-assistente`; PR C `feat/fase-2f-importacao-telas`. Cada uma de `escale-crm/main` depois do merge da anterior (Tasks 1, 10 e 16 provam).
- **Base:** `escale-crm/main` com a 2C, a 2D e a bateria da Frente B mergeadas (a última migration da Frente B é a 9105; a 9106 é da 2E e pode existir ou não).
- **Migration:** **9107**, `supabase/migrations/20261107120000_9107_importacoes.sql`. Antes de criar: `bash scripts/checar-colisao-de-migration.sh escale-crm/main`; se 9107 já existir em outra branch, PARE e pergunte.
- **PR:** para `rgisjr/escale-crm`, base `main`. **Merge direto na `main` ao terminar cada PR** (regra de 18/10).
- **Proibido:** push em `origin` (Rafael), tag, release, VPS e gravar no banco de produção no meio da frente.

### Ambiente

- Git Bash: `export PATH="/c/Program Files/nodejs:$PATH"` e `corepack pnpm`.
- Typecheck e suítes grandes: `export NODE_OPTIONS=--max-old-space-size=6144`.
- `test:db` só na Task 5 (precisa do Docker Desktop; se `docker info` falhar, PARE e peça ao usuário).

### Forma das rotas (copie de `app/api/v1/acoes-em-massa/route.ts`)

```ts
const requestId = randomUUID();
const supportDenied = await requireSupportWrite();          // só nas escritas
if (supportDenied) return supportDenied;
const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
if (!authz.ok) return authz.response;
const t = (texto: string) => traduzir(texto, authz.user.idioma);
// erro de validação:   return fail("unprocessable_entity", t("..."), 422, { requestId });
// sucesso:             return ok(dados);   ou   return ok(dados, { status: 201 });
// auditoria:           void audit({ action, actorUserId: authz.user.id, organizationId, resourceType, resourceId, requestId, metadata });
// erro inesperado:     return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "..." }, t, requestId);
```

`fail(code, message, status, { requestId })` e `ok(data, { status?, meta? })` vêm de `@/lib/api/wrappers`; `lerJson(req)` de `@/lib/escale/origens/respostas`; `falhaInesperadaDoQuadro` de `@/lib/escale/capa/banco`; `createAdminClient` de `@/lib/supabase/admin`.

### Onde o fork entra nos arquivos do original

Cada trecho leva `FORK ESCALE · Fase 2F`. Sem a casca, nenhum muda o comportamento.

| Arquivo | Mudança | PR |
|---|---|---|
| `supabase/baseline.sql` | bloco da 9107 logo depois do bloco da 9105 (ou da 9106, se existir), antes da varredura de `anon` (memória "Ordem dos blocos no baseline") | A |
| `lib/event-log/register-handlers.ts` | `importacaoHandler` logo depois de `acaoEmMassaHandler` | A |
| `lib/audit/actions.ts` | ações novas logo depois das da 2D (`"companies.primary_changed",`) | A |
| `lib/i18n/dicionario.ts` | blocos novos logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───` | A, B, C |
| `lib/navigation/catalogo.ts` | a descrição do item "Importações" (N14) | C |
| `app/app/imports/page.tsx`, `app/app/imports/[id]/page.tsx` | com a casca, as telas do fork | C |

Os do fork que mudam: `components/escale/contatos/MenuNovoContato.tsx`, `app/app/pipelines/[id]/_client.tsx` (o trecho FORK da 1E), `lib/escale/notificacoes/avisos-da-origem.handler.ts`, `lib/ui/icons-da-casca.ts`.

### Testes de fases anteriores que esta fase muda de propósito

| Teste | O que pinava | Por que muda |
|---|---|---|
| `tests/unit/escale-importar-mapear.test.ts` | `lib/escale/importar/mapear.ts` | o módulo sai (N17); as regras novas têm testes próprios |
| `tests/unit/escale-janela-de-importar.test.tsx` | a janela de 4 passos da 1E | sai (N17); `escale-janela-de-importacao.test.tsx` cobre os 5 passos |
| `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx` | o import de `JanelaDeImportarNegocios` no quadro | passa a `JanelaDeImportacao` (Task 14) |
| `tests/unit/escale-avisos-da-origem*.test.ts` | o push em todo `lead.created` | não manda para negócio da planilha (Task 7) |

### Cercas que precisam ficar verdes

`controle-decorativo`, `tailwind-tokens`, `vocabulario-do-funil`, `evidencia-citada`, `escale-casca-v2-original-intacto` (o encaixe na `page.tsx` é permitido como na 2D), `navegacao-completude`, `navegacao-registry`, `porta-do-modulo-ligado`, `i18n-espanhol-cobre-a-tela` (Tasks 9, 15 e 19), `rls-completude-varredura` (duas tabelas novas com RLS e prova), `definer-membership-varredura`, `definer-nova-nasce-exposta`, `hardening-definer-varredura` (a definer nova fechada ao `service_role`), `manifest-x-migrations`, `audit-lista-do-painel-e-derivada`, `cron-routes-scheduled` (nenhuma rota de cron nova), `dispatcher-org-parada` (o consumidor declara `naOrgParada: "roda"`).

### Verificação (regra de 18/10: executa tudo, testa tudo, publica tudo)

1. **Em cada task:** os testes que a task cria ou altera, os guardas que leem os arquivos tocados, typecheck e eslint dos arquivos alterados.
2. **`test:db`:** só na Task 5.
3. **Nenhuma rodada cheia e nenhum revisor por PR.** A bateria e a revisão (Opus 5.5) ficam para o fim da Frente B.
4. Comandos longos em segundo plano.

### Commits e PR

- Commits terminam com `Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>` (ou o modelo da sessão); o PR, com `🤖 Generated with [Claude Code](https://claude.com/claude-code)`.
- Copie este plano para `docs/superpowers/plans/` do repositório na Task 1.
- Todo texto de tela por `t()` com literal. Datas, números e moeda no formato brasileiro (`toLocaleString("pt-BR")`, dd/mm/aaaa hh:mm).

## Arquivos

| Arquivo | Novo/alterado | PR | Responsabilidade |
|---|---|---|---|
| `lib/escale/importacao/regras.ts` | novo | A | tipos, motivos, ações, as regras da Clint, níveis, contagens |
| `lib/escale/importacao/textos.ts` | novo | A | rótulos (pt) dos motivos, ações, níveis, categorias e status |
| `lib/escale/importacao/mapeamento.ts` | novo | A | destinos, opções agrupadas, sugestão pelo cabeçalho, validade |
| `lib/escale/importacao/linhas.ts` | novo | A | ler a planilha, normalizar a linha, valor do campo, repetidas |
| `lib/escale/importacao/classificar.ts` | novo | A | os portões: pular, revisar ou importar (com o plano) |
| `lib/escale/importacao/tipos.ts` | novo | A | schemas do pedido e da resolução, tipos de leitura |
| `supabase/migrations/20261107120000_9107_importacoes.sql`, `supabase/baseline.sql` | novo / bloco | A | tabelas, RLS, funções |
| `lib/escale/importacao/contexto.ts` | novo | A | as leituras do lote (contatos, conversas, empresas, origens, negócios, membros) |
| `lib/escale/importacao/aplicar.ts` | novo | A | gravar o plano (contato, empresa, negócio) |
| `lib/escale/importacao/executar.ts`, `handler.ts` | novos | A | o consumidor e o processamento de linhas |
| `lib/escale/importacao/banco.ts` | novo | A | criar, listar, ler, linhas, cancelar, resolver |
| `app/api/v1/importacoes/route.ts`, `[id]/route.ts`, `[id]/cancelar/route.ts`, `[id]/linhas/route.ts`, `[id]/linhas/[linhaId]/resolver/route.ts`, `[id]/resolver-em-lote/route.ts` | novos | A | rotas |
| `lib/escale/notificacoes/avisos-da-origem.handler.ts` | alterado | A | N11 |
| `lib/event-log/register-handlers.ts`, `lib/audit/actions.ts`, `lib/i18n/dicionario.ts` | alterados | A | encaixes |
| `components/escale/importacao/{PassosDaImportacao,pecas,PassoArquivo,PassoMapeamento,PassoConfiguracoes,PassoDecisoes,PassoPrevia,JanelaDeImportacao}.tsx` | novos | B | o assistente |
| `hooks/escale/useImportacoes.ts` | novo | B | leitura, polling e mutações |
| `components/escale/contatos/MenuNovoContato.tsx`, `app/app/pipelines/[id]/_client.tsx` | alterados | B | entradas |
| `components/escale/quadro/{JanelaDeImportarNegocios,ConteudoDaImportacao,PassosDaImportacao}.tsx`, `lib/escale/importar/*` | removidos | B | N17 |
| `components/escale/importacao/{ListaDeImportacoes,TabelaDeExportacoes,RelatorioDaImportacao,RevisarPendencias,DetalheDaPendencia}.tsx`, `hooks/escale/useAcompanharImportacoes.ts` | novos | C | telas |
| `app/app/imports/page.tsx`, `app/app/imports/[id]/page.tsx`, `lib/navigation/catalogo.ts` | encaixes | C | a página no "Mais" |
| `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md` | alterado (fora do repositório) | A, C | linha da 2F e o B6 |

---

# PR A — Banco e motor

### Task 1: Worktree, base e as regras da Clint (situações, níveis e contagens)

**Files:**
- Create: `lib/escale/importacao/regras.ts`, `lib/escale/importacao/textos.ts`, `tests/unit/escale-importacao-regras.test.ts`
- Copy: este plano para `docs/superpowers/plans/2026-10-19-fase-2f-importar-contatos-e-negocios.md`

**Interfaces:**
- Produces (`regras.ts`): `TIPOS_DE_IMPORTACAO`, `TipoDeImportacao` (`"contato" | "negocio"`), `ACOES`, `Acao`, `MOTIVOS`, `Motivo`, `Gravidade`, `Regra`, `REGRAS`, `CATEGORIAS` (`{ id: "A"|"B"|"C"|"D"|"E"; rotulo: string }[]`), `NIVEIS`, `Nivel`, `LIMITE_DO_NIVEL`, `Decisoes` (`Partial<Record<Motivo, Acao>>`), `ColunaMapeada` (`{ csv: string; para: string }`), `decisoesDoNivel(nivel)`, `acaoValida(motivo, acao)`, `decisoesComAjustes(nivel, ajustes)`, `situacoesAjustaveis(tipo, mapa?)`, `situacoesTravadas(tipo, mapa?)`, `contagemDasDecisoes(decisoes, tipo, mapa?)` → `{ auto; revisar; travadas; total }`, `nivelDasDecisoes(decisoes, tipo, mapa?)` → `Nivel | "personalizado"`, `decisaoDe(motivo, decisoes)` → `Acao`, `opcoesDaSituacao(motivo)` (as opções sem "Escolher na lista", mais "Revisar").
- Produces (`textos.ts`): `ROTULO_DO_MOTIVO: Record<Motivo, { rotulo: string; descricao: string }>`, `ROTULO_DA_ACAO: Record<Acao, { rotulo: string; curto: string }>`, `rotuloDaAcao(acao, motivo)` (o "Criar novo negócio" nos motivos de negócio), `ROTULO_DO_NIVEL: Record<Nivel, { rotulo: string; texto: string }>`, `ROTULO_DO_TIPO: Record<TipoDeImportacao, string>`, `STATUS_DA_IMPORTACAO`, `StatusDaImportacao`, `STATUS_EM_ANDAMENTO`, `ROTULO_DO_STATUS`, `STATUS_DA_LINHA`, `StatusDaLinha`.

- [ ] **Step 1: Worktree e base**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
export PATH="/c/Program Files/nodejs:$PATH"
git status --short
git fetch escale-crm
git switch -c feat/fase-2f-importacao-motor escale-crm/main
ls supabase/migrations | grep -E "_910[0-9]_"
ls lib/escale/campos lib/escale/empresas
bash scripts/checar-colisao-de-migration.sh escale-crm/main
corepack pnpm install --frozen-lockfile
mkdir -p docs/superpowers/plans
cp "../docs/superpowers/plans/2026-10-19-fase-2f-importar-contatos-e-negocios.md" docs/superpowers/plans/
```

Expected: `git status` limpo (se a worktree tiver mudanças da bateria sem commit, PARE e pergunte); 9101 a 9105 na lista (a 9106 pode aparecer), **nenhuma 9107**; `lib/escale/campos` tem `regras.ts`, `banco.ts` e `da-ficha.ts`; `lib/escale/empresas` tem `banco.ts` e `regras.ts`. Sem a 2C ou a 2D, PARE.

- [ ] **Step 2: O teste (vai falhar)**

Create `tests/unit/escale-importacao-regras.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  REGRAS,
  acaoValida,
  contagemDasDecisoes,
  decisaoDe,
  decisoesComAjustes,
  decisoesDoNivel,
  nivelDasDecisoes,
  opcoesDaSituacao,
  situacoesAjustaveis,
  situacoesTravadas,
  type ColunaMapeada,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";

const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));

describe("regras do importador (Fase 2F)", () => {
  it("o print v2-10: Negócios com Telefone e Email — 2/6, 4/4 e 6/2", () => {
    const m = mapa("phone", "email", "none");
    expect(contagemDasDecisoes(decisoesDoNivel("conservador"), "negocio", m)).toMatchObject({ auto: 2, revisar: 6, travadas: 1 });
    expect(contagemDasDecisoes(decisoesDoNivel("padrao"), "negocio", m)).toMatchObject({ auto: 4, revisar: 4 });
    expect(contagemDasDecisoes(decisoesDoNivel("agressivo"), "negocio", m)).toMatchObject({ auto: 6, revisar: 2 });
  });

  it("Contatos não vê as situações de negócio; o campo não mapeado some", () => {
    const so = situacoesAjustaveis("contato", mapa("email", "name"));
    expect(so).toContain("MATCH_FILL_EMPTY_FIELDS");
    expect(so).not.toContain("DEAL_VALUE_INVALID");
    expect(so).not.toContain("INVALID_PHONE_FORMAT");
    expect(situacoesTravadas("contato", mapa("email", "name"))).toEqual([]);
    expect(situacoesTravadas("contato", mapa("email", "phone"))).toEqual(["MERGE_HINT_EMAIL_PHONE_SPLIT"]);
    expect(situacoesAjustaveis("negocio", mapa("stage_name"))).toContain("STAGE_NAME_NOT_FOUND");
    expect(situacoesAjustaveis("negocio", mapa("title"))).not.toContain("STAGE_NAME_NOT_FOUND");
  });

  it("o nível nasce das decisões; mexer vira personalizado", () => {
    const m = mapa("phone", "email");
    expect(nivelDasDecisoes(decisoesDoNivel("padrao"), "contato", m)).toBe("padrao");
    const ajustada = decisoesComAjustes("conservador", { MATCH_PHONE_DIFFERS: "OVERWRITE" });
    expect(nivelDasDecisoes(ajustada, "contato", m)).toBe("personalizado");
    expect(decisoesComAjustes("conservador", { MATCH_PHONE_DIFFERS: "UPDATE" }).MATCH_PHONE_DIFFERS).toBe("PENDING_REVIEW");
  });

  it("a decisão de cada motivo: duro descarta, travado revisa, o resto segue as decisões", () => {
    expect(decisaoDe("INVALID_EMAIL_FORMAT", {})).toBe("SKIP_ROW");
    expect(decisaoDe("MERGE_HINT_EMAIL_PHONE_SPLIT", {})).toBe("PENDING_REVIEW");
    expect(decisaoDe("MATCH_FILL_EMPTY_FIELDS", decisoesDoNivel("conservador"))).toBe("UPDATE");
    expect(decisaoDe("PHONE_HAS_ACTIVE_WHATSAPP", decisoesDoNivel("agressivo"))).toBe("PENDING_REVIEW");
    expect(decisaoDe("DEAL_ID_NOT_FOUND", {})).toBe("PENDING_REVIEW");
  });

  it("ações válidas e os botões de cada situação", () => {
    expect(acaoValida("MERGE_HINT_EMAIL_PHONE_SPLIT", "MERGE_CONTACTS")).toBe(false);
    expect(acaoValida("ORIGIN_NAME_NOT_FOUND", "PICK_MANUALLY")).toBe(true);
    expect(acaoValida("ORIGIN_NAME_NOT_FOUND", "OVERWRITE")).toBe(false);
    expect(opcoesDaSituacao("ORIGIN_NAME_NOT_FOUND")).toEqual(["USE_DEFAULT", "SKIP_ROW", "PENDING_REVIEW"]);
    expect(REGRAS.DUPLICATE_IN_BATCH.gravidade).toBe("HARD");
  });

  it("os textos da Clint, com a Escale OS no lugar da Clint", () => {
    expect(ROTULO_DO_MOTIVO.MERGE_HINT_EMAIL_PHONE_SPLIT.descricao).toContain("A Escale OS não decide sozinha.");
    expect(rotuloDaAcao("CREATE_NEW", "DEAL_DUPLICATE_OPEN").rotulo).toBe("Criar novo negócio");
    expect(rotuloDaAcao("CREATE_NEW", "DEAL_DUPLICATE_OPEN").curto).toBe("Criar");
    expect(rotuloDaAcao("SKIP_PHONE_KEEP_REST", "INVALID_PHONE_FORMAT").curto).toBe("Sem telefone");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-regras.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 3: As regras e os textos**

Create `lib/escale/importacao/regras.ts`:

```ts
/**
 * AS REGRAS DO IMPORTADOR (fork Escale, Fase 2F; Clint "Import Studio",
 * `index-UPYK_E9J`: constantes `M`, `N`, `G`, `pe`, `me`). Cada situação
 * ("motivo") tem a categoria da tela, a gravidade, a que tipo de importação
 * vale, o risco (1–5), a decisão padrão e as opções. Os níveis decidem por
 * risco; HARD sempre descarta; SOFT_LOCKED sempre vai para revisão.
 */
export const TIPOS_DE_IMPORTACAO = ["contato", "negocio"] as const;
export type TipoDeImportacao = (typeof TIPOS_DE_IMPORTACAO)[number];

export const ACOES = [
  "SKIP_ROW",
  "SKIP_PHONE_KEEP_REST",
  "UPDATE",
  "KEEP_DB",
  "OVERWRITE",
  "UPDATE_EMAIL_CONTACT",
  "UPDATE_PHONE_CONTACT",
  "MERGE_CONTACTS",
  "USE_DEFAULT",
  "PICK_MANUALLY",
  "USE_FIRST",
  "UPDATE_EXISTING",
  "CREATE_NEW",
  "CREATE_NO_VALUE",
  "CREATE_WITH_PARSED_VALUE",
  "PENDING_REVIEW",
] as const;
export type Acao = (typeof ACOES)[number];

export const MOTIVOS = [
  "MISSING_REQUIRED_FIELDS",
  "INVALID_EMAIL_FORMAT",
  "INVALID_PHONE_FORMAT",
  "MATCH_FILL_EMPTY_FIELDS",
  "MATCH_OVERWRITE_FILLED_FIELD",
  "MATCH_PHONE_DIFFERS",
  "MATCH_INSTAGRAM_DIFFERS",
  "MERGE_HINT_EMAIL_PHONE_SPLIT",
  "PHONE_HAS_ACTIVE_WHATSAPP",
  "DUPLICATE_IN_BATCH",
  "ORIGIN_NAME_NOT_FOUND",
  "STAGE_NAME_NOT_FOUND",
  "DEAL_DUPLICATE_OPEN",
  "DEAL_VALUE_INVALID",
  "DEAL_ID_NOT_FOUND",
] as const;
export type Motivo = (typeof MOTIVOS)[number];

export type Gravidade = "HARD" | "SOFT" | "CONFIG" | "SOFT_LOCKED";
export type Categoria = "A" | "B" | "C" | "D" | "E";

export interface Regra {
  categoria: Categoria;
  gravidade: Gravidade;
  alvo: "contato" | "negocio" | "ambos";
  risco: number;
  padrao: Acao;
  opcoes: readonly Acao[];
  desligadas?: readonly Acao[];
  exigeMapeado?: string;
}

export const REGRAS: Record<Motivo, Regra> = {
  MISSING_REQUIRED_FIELDS: { categoria: "A", gravidade: "HARD", alvo: "ambos", risco: 3, padrao: "SKIP_ROW", opcoes: [] },
  INVALID_EMAIL_FORMAT: { categoria: "A", gravidade: "HARD", alvo: "ambos", risco: 2, padrao: "SKIP_ROW", opcoes: [] },
  INVALID_PHONE_FORMAT: {
    categoria: "A", gravidade: "SOFT", alvo: "ambos", risco: 2, padrao: "SKIP_PHONE_KEEP_REST",
    opcoes: ["SKIP_PHONE_KEEP_REST", "SKIP_ROW"], exigeMapeado: "phone",
  },
  MATCH_FILL_EMPTY_FIELDS: {
    categoria: "B", gravidade: "CONFIG", alvo: "contato", risco: 1, padrao: "UPDATE", opcoes: ["UPDATE", "SKIP_ROW"],
  },
  MATCH_OVERWRITE_FILLED_FIELD: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 4, padrao: "KEEP_DB", opcoes: ["KEEP_DB", "OVERWRITE"],
  },
  MATCH_PHONE_DIFFERS: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 3, padrao: "KEEP_DB",
    opcoes: ["KEEP_DB", "OVERWRITE"], exigeMapeado: "phone",
  },
  MATCH_INSTAGRAM_DIFFERS: {
    categoria: "B", gravidade: "SOFT", alvo: "contato", risco: 3, padrao: "KEEP_DB",
    opcoes: ["KEEP_DB", "OVERWRITE"], exigeMapeado: "instagram",
  },
  MERGE_HINT_EMAIL_PHONE_SPLIT: {
    categoria: "C", gravidade: "SOFT_LOCKED", alvo: "contato", risco: 5, padrao: "PENDING_REVIEW",
    opcoes: ["UPDATE_EMAIL_CONTACT", "UPDATE_PHONE_CONTACT", "MERGE_CONTACTS", "SKIP_ROW"],
    desligadas: ["MERGE_CONTACTS"],
  },
  PHONE_HAS_ACTIVE_WHATSAPP: {
    categoria: "D", gravidade: "SOFT", alvo: "contato", risco: 5, padrao: "SKIP_PHONE_KEEP_REST",
    opcoes: ["SKIP_PHONE_KEEP_REST", "SKIP_ROW"], exigeMapeado: "phone",
  },
  DUPLICATE_IN_BATCH: { categoria: "D", gravidade: "HARD", alvo: "contato", risco: 2, padrao: "SKIP_ROW", opcoes: [] },
  ORIGIN_NAME_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "USE_DEFAULT",
    opcoes: ["USE_DEFAULT", "PICK_MANUALLY", "SKIP_ROW"], exigeMapeado: "origin_name",
  },
  STAGE_NAME_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "USE_FIRST",
    opcoes: ["USE_FIRST", "PICK_MANUALLY", "SKIP_ROW"], exigeMapeado: "stage_name",
  },
  DEAL_DUPLICATE_OPEN: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 4, padrao: "UPDATE_EXISTING",
    opcoes: ["UPDATE_EXISTING", "CREATE_NEW", "SKIP_ROW"],
  },
  DEAL_VALUE_INVALID: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 3, padrao: "CREATE_NO_VALUE",
    opcoes: ["CREATE_NO_VALUE", "CREATE_WITH_PARSED_VALUE", "SKIP_ROW"],
  },
  DEAL_ID_NOT_FOUND: {
    categoria: "E", gravidade: "SOFT", alvo: "negocio", risco: 5, padrao: "PENDING_REVIEW",
    opcoes: ["CREATE_NEW", "SKIP_ROW"], exigeMapeado: "deal_id",
  },
};

export const CATEGORIAS: ReadonlyArray<{ id: Categoria; rotulo: string }> = [
  { id: "A", rotulo: "Linhas novas e inválidas" },
  { id: "B", rotulo: "Contato já existe" },
  { id: "C", rotulo: "A linha bate com dois contatos" },
  { id: "D", rotulo: "Proteções de dados" },
  { id: "E", rotulo: "Negócios" },
];

export const NIVEIS = ["conservador", "padrao", "agressivo"] as const;
export type Nivel = (typeof NIVEIS)[number];
export const LIMITE_DO_NIVEL: Record<Nivel, number> = { conservador: 2, padrao: 3, agressivo: 4 };

export type Decisoes = Partial<Record<Motivo, Acao>>;
/** Uma coluna do arquivo e o destino dela (`"none"` = não importar). */
export interface ColunaMapeada {
  csv: string;
  para: string;
}

const AJUSTAVEIS = MOTIVOS.filter((m) => REGRAS[m].gravidade === "SOFT" || REGRAS[m].gravidade === "CONFIG");
const TRAVADOS = MOTIVOS.filter((m) => REGRAS[m].gravidade === "SOFT_LOCKED");
const IDENTIFICADORES = ["email", "phone", "instagram"];

const valeParaOTipo = (m: Motivo, tipo: TipoDeImportacao) => {
  const alvo = REGRAS[m].alvo;
  return alvo === "ambos" || tipo === "negocio" || alvo === "contato";
};

function mapeados(mapa: readonly ColunaMapeada[] | undefined): Set<string> | null {
  if (!mapa) return null;
  return new Set(mapa.map((c) => c.para).filter((p) => p && p !== "none"));
}

const aplicavel = (m: Motivo, usados: Set<string> | null) => {
  if (!usados) return true;
  const exige = REGRAS[m].exigeMapeado;
  if (exige && !usados.has(exige)) return false;
  if (m === "MERGE_HINT_EMAIL_PHONE_SPLIT") return IDENTIFICADORES.filter((i) => usados.has(i)).length >= 2;
  return true;
};

export function decisoesDoNivel(nivel: Nivel): Decisoes {
  const limite = LIMITE_DO_NIVEL[nivel];
  const saida: Decisoes = {};
  for (const m of AJUSTAVEIS) saida[m] = REGRAS[m].risco <= limite ? REGRAS[m].padrao : "PENDING_REVIEW";
  return saida;
}

export function acaoValida(m: Motivo, acao: Acao): boolean {
  const regra = REGRAS[m];
  if (acao === "PENDING_REVIEW") return true;
  return regra.opcoes.includes(acao) && !(regra.desligadas ?? []).includes(acao);
}

/** O nível com os ajustes da pessoa; ajuste inválido é ignorado (Clint `It`). */
export function decisoesComAjustes(nivel: Nivel, ajustes: Decisoes): Decisoes {
  const saida = decisoesDoNivel(nivel);
  for (const m of AJUSTAVEIS) {
    const a = ajustes[m];
    if (a && a !== "PICK_MANUALLY" && acaoValida(m, a)) saida[m] = a;
  }
  return saida;
}

export function situacoesAjustaveis(tipo: TipoDeImportacao, mapa?: readonly ColunaMapeada[]): Motivo[] {
  const usados = mapeados(mapa);
  return AJUSTAVEIS.filter((m) => valeParaOTipo(m, tipo) && aplicavel(m, usados));
}

export function situacoesTravadas(tipo: TipoDeImportacao, mapa?: readonly ColunaMapeada[]): Motivo[] {
  const usados = mapeados(mapa);
  return TRAVADOS.filter((m) => valeParaOTipo(m, tipo) && aplicavel(m, usados));
}

export function contagemDasDecisoes(
  decisoes: Decisoes,
  tipo: TipoDeImportacao,
  mapa?: readonly ColunaMapeada[],
): { auto: number; revisar: number; travadas: number; total: number } {
  const ajustaveis = situacoesAjustaveis(tipo, mapa);
  const travadas = situacoesTravadas(tipo, mapa).length;
  const revisar = ajustaveis.filter((m) => decisoes[m] === "PENDING_REVIEW").length;
  return { auto: ajustaveis.length - revisar, revisar: revisar + travadas, travadas, total: ajustaveis.length };
}

export function nivelDasDecisoes(
  decisoes: Decisoes,
  tipo: TipoDeImportacao,
  mapa?: readonly ColunaMapeada[],
): Nivel | "personalizado" {
  const ajustaveis = situacoesAjustaveis(tipo, mapa);
  return (
    NIVEIS.find((n) => {
      const doNivel = decisoesDoNivel(n);
      return ajustaveis.every((m) => decisoes[m] === doNivel[m]);
    }) ?? "personalizado"
  );
}

/** A decisão que vale para o motivo nesta importação. */
export function decisaoDe(m: Motivo, decisoes: Decisoes): Acao {
  const regra = REGRAS[m];
  if (regra.gravidade === "HARD") return regra.padrao;
  if (regra.gravidade === "SOFT_LOCKED") return "PENDING_REVIEW";
  const escolhida = decisoes[m];
  if (escolhida && escolhida !== "PICK_MANUALLY" && acaoValida(m, escolhida)) return escolhida;
  return decisoesDoNivel("conservador")[m] ?? regra.padrao;
}

/** Os botões da situação no passo Decisões (Clint `Zt`): as opções sem "Escolher na lista", mais "Revisar". */
export function opcoesDaSituacao(m: Motivo): Acao[] {
  return [...REGRAS[m].opcoes.filter((a) => a !== "PICK_MANUALLY"), "PENDING_REVIEW"];
}
```

Create `lib/escale/importacao/textos.ts`:

```ts
/**
 * Os textos do importador (fork Escale, Fase 2F), copiados das chaves
 * `importStudio.*` da Clint (`pt-BR-DmQ11GIn`), com a Escale OS no lugar da
 * Clint. Saem em pt; a tela traduz com `t()`.
 */
import type { Acao, Motivo, Nivel, TipoDeImportacao } from "./regras";

export const ROTULO_DO_MOTIVO: Record<Motivo, { rotulo: string; descricao: string }> = {
  MISSING_REQUIRED_FIELDS: {
    rotulo: "Sem nome, e-mail e telefone",
    descricao: "A linha não tem nenhum dado para identificar a pessoa. Não há o que importar.",
  },
  INVALID_EMAIL_FORMAT: {
    rotulo: "E-mail inválido",
    descricao: "O e-mail não tem um formato válido (falta @, falta domínio, etc.).",
  },
  INVALID_PHONE_FORMAT: {
    rotulo: "Telefone inválido",
    descricao: "O telefone é curto demais, tem caracteres estranhos ou um DDD que não existe.",
  },
  MATCH_FILL_EMPTY_FIELDS: {
    rotulo: "Preenche campos vazios",
    descricao: "A linha casou com um contato e traz dados em campos que ainda estavam vazios. Sem risco.",
  },
  MATCH_OVERWRITE_FILLED_FIELD: {
    rotulo: "Mudaria um campo já preenchido",
    descricao: "A linha traz um valor diferente em um campo que já está preenchido.",
  },
  MATCH_PHONE_DIFFERS: {
    rotulo: "Telefone diferente do cadastrado",
    descricao: "A linha casou pelo e-mail, mas traz um telefone diferente do que já está cadastrado.",
  },
  MATCH_INSTAGRAM_DIFFERS: {
    rotulo: "Instagram diferente do cadastrado",
    descricao: "A linha casou pelo e-mail, mas traz um Instagram diferente do que já está cadastrado.",
  },
  MERGE_HINT_EMAIL_PHONE_SPLIT: {
    rotulo: "A linha bate com dois contatos",
    descricao:
      "O e-mail desta linha pertence a um contato e o telefone pertence a outro. A Escale OS não decide sozinha.",
  },
  PHONE_HAS_ACTIVE_WHATSAPP: {
    rotulo: "Trocaria um telefone com WhatsApp em andamento",
    descricao:
      "A linha casou pelo e-mail e traz um telefone diferente, mas o atual tem uma conversa de WhatsApp em andamento.",
  },
  DUPLICATE_IN_BATCH: {
    rotulo: "Linha repetida no próprio arquivo",
    descricao:
      "Duas linhas do arquivo têm o mesmo e-mail ou telefone. A primeira é importada; a segunda é descartada.",
  },
  ORIGIN_NAME_NOT_FOUND: {
    rotulo: "Origem não encontrada",
    descricao: "A linha traz uma origem por nome que não existe na conta.",
  },
  STAGE_NAME_NOT_FOUND: {
    rotulo: "Etapa não encontrada",
    descricao: "A linha traz uma etapa por nome que não existe naquela origem.",
  },
  DEAL_DUPLICATE_OPEN: {
    rotulo: "Negócio em aberto repetido",
    descricao: "Esse contato já tem um negócio em aberto na mesma origem.",
  },
  DEAL_VALUE_INVALID: {
    rotulo: "Valor do negócio inválido",
    descricao: "A coluna de valor tem texto que não é um número.",
  },
  DEAL_ID_NOT_FOUND: {
    rotulo: "ID do negócio não encontrado",
    descricao: "O arquivo aponta um negócio por ID que não existe (excluído, de outra conta ou digitado errado).",
  },
};

export const ROTULO_DA_ACAO: Record<Acao, { rotulo: string; curto: string }> = {
  SKIP_ROW: { rotulo: "Descartar a linha", curto: "Descartar" },
  SKIP_PHONE_KEEP_REST: { rotulo: "Ignorar o telefone", curto: "Sem telefone" },
  UPDATE: { rotulo: "Atualizar (preencher vazios)", curto: "Preencher" },
  KEEP_DB: { rotulo: "Manter o que já existe", curto: "Manter atual" },
  OVERWRITE: { rotulo: "Substituir pelo arquivo", curto: "Substituir" },
  UPDATE_EMAIL_CONTACT: { rotulo: "Atualizar o contato do e-mail (A)", curto: "Atualizar A" },
  UPDATE_PHONE_CONTACT: { rotulo: "Atualizar o contato do telefone (B)", curto: "Atualizar B" },
  MERGE_CONTACTS: { rotulo: "Juntar os dois contatos", curto: "Juntar" },
  USE_DEFAULT: { rotulo: "Usar o padrão da importação", curto: "Padrão" },
  PICK_MANUALLY: { rotulo: "Escolher na lista", curto: "Escolher" },
  USE_FIRST: { rotulo: "Usar a 1ª etapa", curto: "1ª etapa" },
  UPDATE_EXISTING: { rotulo: "Atualizar o negócio existente", curto: "Atualizar" },
  CREATE_NEW: { rotulo: "Criar contato novo", curto: "Criar" },
  CREATE_NO_VALUE: { rotulo: "Criar sem valor", curto: "Sem valor" },
  CREATE_WITH_PARSED_VALUE: { rotulo: "Interpretar o valor", curto: "Interpretar" },
  PENDING_REVIEW: { rotulo: "Enviar para revisão", curto: "Revisar" },
};

const MOTIVOS_DE_NEGOCIO: readonly Motivo[] = ["DEAL_DUPLICATE_OPEN", "DEAL_ID_NOT_FOUND"];

/** Nos motivos de negócio, "Criar" é "Criar novo negócio" (Clint `dealLabel`). */
export function rotuloDaAcao(acao: Acao, motivo: Motivo): { rotulo: string; curto: string } {
  if (acao === "CREATE_NEW" && MOTIVOS_DE_NEGOCIO.includes(motivo)) {
    return { rotulo: "Criar novo negócio", curto: ROTULO_DA_ACAO.CREATE_NEW.curto };
  }
  return ROTULO_DA_ACAO[acao];
}

export const ROTULO_DO_NIVEL: Record<Nivel, { rotulo: string; texto: string }> = {
  conservador: {
    rotulo: "Conservador",
    texto: "Tudo que pode mudar um dado já cadastrado vai para revisão. Recomendado na primeira importação.",
  },
  padrao: {
    rotulo: "Padrão",
    texto:
      "Resolve sozinho o que é seguro; mudanças de campo, WhatsApp em andamento e negócios repetidos vão para revisão.",
  },
  agressivo: {
    rotulo: "Agressivo",
    texto:
      "Resolve quase tudo. Só telefone com WhatsApp em andamento e linhas que batem com dois contatos ficam para você.",
  },
};

export const ROTULO_DO_TIPO: Record<TipoDeImportacao, string> = { contato: "Contatos", negocio: "Negócios" };

export const STATUS_DA_IMPORTACAO = [
  "preparando",
  "na_fila",
  "importando",
  "aguardando_revisao",
  "concluida",
  "cancelada",
  "falhou",
] as const;
export type StatusDaImportacao = (typeof STATUS_DA_IMPORTACAO)[number];
export const STATUS_EM_ANDAMENTO: readonly StatusDaImportacao[] = ["preparando", "na_fila", "importando"];

export const ROTULO_DO_STATUS: Record<StatusDaImportacao, string> = {
  preparando: "Na fila",
  na_fila: "Na fila",
  importando: "Importando",
  aguardando_revisao: "Aguardando revisão",
  concluida: "Concluída",
  cancelada: "Cancelada",
  falhou: "Erro",
};

export const STATUS_DA_LINHA = ["na_fila", "processando", "importada", "revisar", "pulada", "erro"] as const;
export type StatusDaLinha = (typeof STATUS_DA_LINHA)[number];
```

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-regras.test.ts
corepack pnpm exec eslint lib/escale/importacao tests/unit/escale-importacao-regras.test.ts
git add lib/escale/importacao tests/unit/escale-importacao-regras.test.ts docs/superpowers/plans/2026-10-19-fase-2f-importar-contatos-e-negocios.md
git commit -m "feat(escale): regras do importador — situações, níveis e contagens da Clint (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Expected: 6 testes verdes. Se o print v2-10 não bater (2/6, 4/4, 6/2), a tabela `REGRAS` está diferente da Clint: confira contra `M` em `index-UPYK_E9J.js.txt` antes de mexer no teste.

### Task 2: O mapeamento — destinos, opções agrupadas e a sugestão pelo cabeçalho

**Files:**
- Create: `lib/escale/importacao/mapeamento.ts`, `tests/unit/escale-importacao-mapeamento.test.ts`

**Interfaces:**
- Consumes: `Catalogo` (`lib/escale/campos/regras.ts`); `TipoDeImportacao`, `ColunaMapeada` (Task 1).
- Produces: `PREFIXO_DO_CONTATO = "custom:"`, `PREFIXO_DA_EMPRESA = "org:"`, `PREFIXO_DO_NEGOCIO = "deal_custom:"`, `CatalogosDaImportacao` (`{ contato: Catalogo; empresa: Catalogo; negocio: Catalogo }`), `OpcaoDeDestino` (`{ valor: string; rotulo: string; grupo: string }`), `GRUPO_DO_DESTINO`, `opcoesDoMapeamento(tipo, catalogos)` → `OpcaoDeDestino[]`, `sugerirMapeamento(cabecalho, tipo, opcoes)` → `ColunaMapeada[]`, `mapeamentoValido(mapa, tipo)` → `boolean`, `semNomeDaEmpresa(mapa)` → `boolean`, `rotuloDoDestino(valor, opcoes)` → `string`.

Regras (Clint `Me`, `Mt`, `yt`, `Ot`):
- Grupos e destinos, nesta ordem: **Identificadores** (em Negócios, `deal_id` "ID do negócio"; depois `id` "ID do contato"); **Contato** (`name` "Nome", `email` "Email", `phone` "Telefone", `ddi` "DDI (código do país)", `instagram` "Instagram", `tag` "Tags", `birthdate` "Data de nascimento", `cpf` "CPF", e o catálogo do contato como `custom:<chave>`); **Empresa** (`company` "Nome da empresa", `org:cidade` "Cidade", `org:estado` "Estado", `org:cnpj` "CNPJ", e o catálogo da empresa como `org:<chave>`); **Negócio**, só em Negócios (`title` "Título", `value` "Valor", `origin_name` "Origem", `stage_name` "Etapa", `owner` "Dono", `status` "Status", e o catálogo do negócio como `deal_custom:<chave>`); **Datas do negócio**, só em Negócios (`won_at` "Data de ganho").
- Sugestão: primeiro a expressão (`Mt`, no código abaixo); depois, se o cabeçalho normalizado (minúsculas, sem acento, só letras e números) é igual ao rótulo normalizado de uma opção, vale a opção (menos quando a expressão deu `ddi`); destino que não existe para o tipo vira `none`; destino já usado por coluna anterior vira `none`. **Nosso:** em Negócios, `/(origem|origin|funil|pipeline)/` → `origin_name` (a Clint não mapeia origem por nome no `Mt`).
- Válido (o "Continuar" do passo 2): uma coluna que identifica o contato (`id`, `name`, `email`, `phone`) ou, em Negócios, também `title` ou `deal_id`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-mapeamento.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import type { Catalogo } from "@/lib/escale/campos/regras";
import {
  mapeamentoValido,
  opcoesDoMapeamento,
  rotuloDoDestino,
  semNomeDaEmpresa,
  sugerirMapeamento,
  type CatalogosDaImportacao,
} from "@/lib/escale/importacao/mapeamento";

const campo = (objeto: "contato" | "empresa" | "negocio", chave: string, label: string) => ({
  id: chave,
  objeto,
  chave,
  definicao: { label, type: "text" as const },
  grupo_id: null,
  papel_minimo: null,
  posicao: 0,
  padrao: false,
});
const cat = (...campos: ReturnType<typeof campo>[]): Catalogo => ({ grupos: [], campos });
const catalogos: CatalogosDaImportacao = {
  contato: cat(campo("contato", "cidade_natal", "Cidade natal")),
  empresa: cat(campo("empresa", "segmento", "Segmento")),
  negocio: cat(campo("negocio", "produto", "Produto")),
};

describe("mapeamento da importação (Fase 2F)", () => {
  it("Contatos não oferece os destinos de negócio; Negócios oferece", () => {
    const c = opcoesDoMapeamento("contato", catalogos).map((o) => o.valor);
    expect(c).toEqual(expect.arrayContaining(["id", "name", "email", "phone", "company", "org:segmento", "custom:cidade_natal"]));
    expect(c).not.toContain("title");
    expect(c).not.toContain("deal_id");
    const n = opcoesDoMapeamento("negocio", catalogos).map((o) => o.valor);
    expect(n.slice(0, 2)).toEqual(["deal_id", "id"]);
    expect(n).toEqual(expect.arrayContaining(["title", "value", "stage_name", "origin_name", "won_at", "deal_custom:produto"]));
  });

  it("sugere pelo cabeçalho, sem repetir destino (o print v2-08)", () => {
    const opcoes = opcoesDoMapeamento("negocio", catalogos);
    expect(sugerirMapeamento(["Cliente", "Celular", "Email", "Ticket", "Etiquetas"], "negocio", opcoes).map((c) => c.para)).toEqual([
      "none",
      "phone",
      "email",
      "none",
      "none",
    ]);
    expect(
      sugerirMapeamento(["Nome", "Nome da empresa", "Telefone", "WhatsApp", "Produto", "Origem"], "negocio", opcoes).map((c) => c.para),
    ).toEqual(["name", "company", "phone", "none", "deal_custom:produto", "origin_name"]);
    const deContato = opcoesDoMapeamento("contato", catalogos);
    expect(sugerirMapeamento(["Título", "Valor"], "contato", deContato).map((c) => c.para)).toEqual(["none", "none"]);
    expect(sugerirMapeamento(["DDI"], "contato", deContato)[0].para).toBe("ddi");
  });

  it("válido com um identificador; o aviso sem o nome da empresa", () => {
    expect(mapeamentoValido([{ csv: "a", para: "none" }], "contato")).toBe(false);
    expect(mapeamentoValido([{ csv: "a", para: "org:cidade" }], "contato")).toBe(false);
    expect(mapeamentoValido([{ csv: "a", para: "email" }], "contato")).toBe(true);
    expect(mapeamentoValido([{ csv: "a", para: "title" }], "negocio")).toBe(true);
    expect(semNomeDaEmpresa([{ csv: "a", para: "org:cidade" }])).toBe(true);
    expect(semNomeDaEmpresa([{ csv: "a", para: "org:cidade" }, { csv: "b", para: "company" }])).toBe(false);
  });

  it("rótulo do destino", () => {
    const opcoes = opcoesDoMapeamento("contato", catalogos);
    expect(rotuloDoDestino("custom:cidade_natal", opcoes)).toBe("Cidade natal");
    expect(rotuloDoDestino("org:segmento", opcoes)).toBe("Segmento");
    expect(rotuloDoDestino("sumiu", opcoes)).toBe("sumiu");
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-mapeamento.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 2: O mapeamento**

Create `lib/escale/importacao/mapeamento.ts`:

```ts
/**
 * O MAPEAMENTO DA IMPORTAÇÃO (fork Escale, Fase 2F; Clint `Me`, `Mt`, `yt`,
 * `Ot`): os destinos de cada coluna, agrupados como na Clint, e a sugestão
 * pelo cabeçalho. Os rótulos saem em pt; a tela traduz com `t()`.
 */
import type { Catalogo } from "@/lib/escale/campos/regras";

import type { ColunaMapeada, TipoDeImportacao } from "./regras";

export const PREFIXO_DO_CONTATO = "custom:";
export const PREFIXO_DA_EMPRESA = "org:";
export const PREFIXO_DO_NEGOCIO = "deal_custom:";

export interface CatalogosDaImportacao {
  contato: Catalogo;
  empresa: Catalogo;
  negocio: Catalogo;
}

export interface OpcaoDeDestino {
  valor: string;
  rotulo: string;
  grupo: string;
}

export const GRUPO_DO_DESTINO = {
  identificadores: "Identificadores",
  contato: "Contato",
  empresa: "Empresa",
  negocio: "Negócio",
  datas: "Datas do negócio",
} as const;

const FIXOS_DO_CONTATO: ReadonlyArray<[string, string]> = [
  ["name", "Nome"],
  ["email", "Email"],
  ["phone", "Telefone"],
  ["ddi", "DDI (código do país)"],
  ["instagram", "Instagram"],
  ["tag", "Tags"],
  ["birthdate", "Data de nascimento"],
  ["cpf", "CPF"],
];
const FIXOS_DA_EMPRESA: ReadonlyArray<[string, string]> = [
  ["company", "Nome da empresa"],
  ["org:cidade", "Cidade"],
  ["org:estado", "Estado"],
  ["org:cnpj", "CNPJ"],
];
const FIXOS_DO_NEGOCIO: ReadonlyArray<[string, string]> = [
  ["title", "Título"],
  ["value", "Valor"],
  ["origin_name", "Origem"],
  ["stage_name", "Etapa"],
  ["owner", "Dono"],
  ["status", "Status"],
];

const ordenados = (catalogo: Catalogo) =>
  [...catalogo.campos].sort((a, b) => a.posicao - b.posicao || a.chave.localeCompare(b.chave));

export function opcoesDoMapeamento(tipo: TipoDeImportacao, catalogos: CatalogosDaImportacao): OpcaoDeDestino[] {
  const lista: OpcaoDeDestino[] = [];
  const add = (valor: string, rotulo: string, grupo: string) => lista.push({ valor, rotulo, grupo });
  const g = GRUPO_DO_DESTINO;
  if (tipo === "negocio") add("deal_id", "ID do negócio", g.identificadores);
  add("id", "ID do contato", g.identificadores);
  for (const [v, r] of FIXOS_DO_CONTATO) add(v, r, g.contato);
  for (const c of ordenados(catalogos.contato)) add(`${PREFIXO_DO_CONTATO}${c.chave}`, c.definicao.label, g.contato);
  for (const [v, r] of FIXOS_DA_EMPRESA) add(v, r, g.empresa);
  for (const c of ordenados(catalogos.empresa)) add(`${PREFIXO_DA_EMPRESA}${c.chave}`, c.definicao.label, g.empresa);
  if (tipo === "negocio") {
    for (const [v, r] of FIXOS_DO_NEGOCIO) add(v, r, g.negocio);
    for (const c of ordenados(catalogos.negocio)) add(`${PREFIXO_DO_NEGOCIO}${c.chave}`, c.definicao.label, g.negocio);
    add("won_at", "Data de ganho", g.datas);
  }
  const vistos = new Set<string>();
  return lista.filter((o) => {
    if (vistos.has(o.valor)) return false;
    vistos.add(o.valor);
    return true;
  });
}

const normalizar = (texto: string) =>
  texto
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();

/** A regra por expressão da Clint (`Mt`), mais a origem por nome (nossa). */
function pelaExpressao(cabecalho: string, tipo: TipoDeImportacao): string {
  const o = cabecalho.toLowerCase().trim();
  const negocio = tipo === "negocio";
  if (/id.*contato|contato.*id|contact.?id/.test(o)) return "id";
  if (negocio && /id.*neg[óo]cio|neg[óo]cio.*id|deal.?id/.test(o)) return "deal_id";
  if (/^id$/.test(o)) return negocio ? "deal_id" : "id";
  if (/mail/.test(o)) return "email";
  if (/^(ddi|c[óo]d(igo)?\.?\s*(do\s+)?pa[íi]s|country.?code|dial.?code)$/.test(o)) return "ddi";
  if (/(phone|fone|telefone|celular|whats)/.test(o)) return "phone";
  if (/(nome|name)/.test(o)) return "name";
  if (/insta/.test(o)) return "instagram";
  if (/(empresa|company|organiza)/.test(o)) return "company";
  if (/tag/.test(o)) return "tag";
  if (/(t[íi]tulo|title)/.test(o)) return "title";
  if (/(valor|value|amount|pre[çc]o)/.test(o)) return "value";
  if (/(etapa|stage|fase)/.test(o)) return "stage_name";
  if (/(status|situa[çc][ãa]o)/.test(o)) return "status";
  if (negocio && /(data.*ganho|ganho.*data|data.*ganh|won.?date|win.?date)/.test(o)) return "won_at";
  if (negocio && /(origem|origin|funil|pipeline)/.test(o)) return "origin_name";
  return "none";
}

export function sugerirMapeamento(
  cabecalho: readonly string[],
  tipo: TipoDeImportacao,
  opcoes: readonly OpcaoDeDestino[],
): ColunaMapeada[] {
  const porRotulo = new Map<string, string>();
  for (const o of opcoes) {
    const chave = normalizar(o.rotulo);
    if (chave && !porRotulo.has(chave)) porRotulo.set(chave, o.valor);
  }
  const existentes = new Set(opcoes.map((o) => o.valor));
  const usados = new Set<string>();
  return cabecalho.map((csv) => {
    const regra = pelaExpressao(csv, tipo);
    const escolhido = regra === "ddi" ? regra : (porRotulo.get(normalizar(csv)) ?? regra);
    if (escolhido === "none" || !existentes.has(escolhido) || usados.has(escolhido)) return { csv, para: "none" };
    usados.add(escolhido);
    return { csv, para: escolhido };
  });
}

const IDENTIFICA_O_CONTATO = new Set(["id", "name", "email", "phone"]);
const IDENTIFICA_O_NEGOCIO = new Set(["title", "deal_id"]);

export function mapeamentoValido(mapa: readonly ColunaMapeada[], tipo: TipoDeImportacao): boolean {
  return mapa.some(
    (c) => IDENTIFICA_O_CONTATO.has(c.para) || (tipo === "negocio" && IDENTIFICA_O_NEGOCIO.has(c.para)),
  );
}

/** Há campo da empresa sem "Nome da empresa" (Clint `Ot`)? */
export function semNomeDaEmpresa(mapa: readonly ColunaMapeada[]): boolean {
  return mapa.some((c) => c.para.startsWith(PREFIXO_DA_EMPRESA)) && !mapa.some((c) => c.para === "company");
}

export function rotuloDoDestino(valor: string, opcoes: readonly OpcaoDeDestino[]): string {
  return opcoes.find((o) => o.valor === valor)?.rotulo ?? valor;
}
```

No segundo caso do teste: "Nome da empresa" bate pelo rótulo (vence a expressão, que daria `name`); "WhatsApp" daria `phone`, já usado pela coluna "Telefone", então vira `none`; "Produto" bate pelo rótulo do campo do negócio.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-mapeamento.test.ts
corepack pnpm exec eslint lib/escale/importacao/mapeamento.ts tests/unit/escale-importacao-mapeamento.test.ts
git add lib/escale/importacao/mapeamento.ts tests/unit/escale-importacao-mapeamento.test.ts
git commit -m "feat(escale): mapeamento da importação — destinos agrupados e sugestão pelo cabeçalho (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 3: As linhas — ler a planilha, normalizar cada linha e achar as repetidas

**Files:**
- Create: `lib/escale/importacao/linhas.ts`, `tests/unit/escale-importacao-linhas.test.ts`

**Interfaces:**
- Consumes: `decodificarCsv`, `parseCsv`, `normalizaData` (`lib/contacts/csv.ts`); `normalizarTags` (`lib/contacts/tag-normalizada.ts`); `normalizePhoneBR`, `phoneLookupVariants` (`lib/channels/phone-variants.ts`); `linkDoInstagram`, `telefoneE164` (`lib/escale/contatos/regras.ts`); `lerCnpj` (`lib/escale/empresas/regras.ts`); `numeroDoValor` (`lib/escale/filtros/campos.ts`); `dataIsoDeBr`, `dataHoraIsoDeBr` (`lib/escale/negocio/campos.ts`); `CustomFieldDef` (`lib/schemas/settings.ts`); `Catalogo` (2C); `ColunaMapeada`, `TipoDeImportacao` (Task 1); os prefixos e `CatalogosDaImportacao` (Task 2).
- Produces: `ARQUIVO_MAX_BYTES = 25 * 1024 * 1024`, `LINHAS_MAX = 50_000`, `COLUNAS_MAX = 200`, `CELULA_MAX = 2000`, `TAGS_MAX = 20`, `ValorDeCampo` (`string | number | boolean | string[]`), `DefinicaoDoCampo` (`Pick<CustomFieldDef, "type" | "label" | "options">`), `DefinicoesDosCampos` (`{ contato; empresa; negocio: Record<string, DefinicaoDoCampo> }`), `definicoesDosCatalogos(catalogos)`, `StatusDoNegocio` (`"open" | "won" | "lost"`), `DadosDoNegocio`, `DadosDaLinha`, `lerPlanilha(bytes)` → `{ cabecalho: string[]; linhas: string[][] } | { erro: string }`, `lerCabecalho(bytes)` → `string[] | null`, `valorDoCampo(def, texto)` → `{ ok: true; valor: ValorDeCampo } | { ok: false }`, `normalizarLinha(celulas, mapa, tipo, definicoes)` → `DadosDaLinha`, `marcarRepetidas(linhas: DadosDaLinha[])` → `Array<number | null>` (o índice da primeira linha com o mesmo e-mail ou telefone), `interpretarValor(texto)` → `number | null` (centavos).

`DadosDaLinha` e `DadosDoNegocio` (exatamente estes nomes, as Tasks 4, 6 e 7 dependem deles):

```ts
export interface DadosDoNegocio {
  id: string | null;
  titulo: string | null;
  valorCentavos: number | null;
  valorInvalido: string | null;
  origem: string | null;
  etapa: string | null;
  dono: string | null;
  status: StatusDoNegocio | null;
  ganhoEm: string | null;
  campos: Record<string, ValorDeCampo>;
}

export interface DadosDaLinha {
  id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  cpf: string | null;
  tags: string[];
  campos: Record<string, ValorDeCampo>;
  empresa: string | null;
  cnpj: { formatado: string; normalizado: string } | null;
  camposDaEmpresa: Record<string, ValorDeCampo>;
  negocio: DadosDoNegocio | null;
  invalidos: { id?: string; email?: string; telefone?: string; negocioId?: string };
  descartados: Array<{ campo: string; valor: string }>;
}
```

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-linhas.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  interpretarValor,
  lerCabecalho,
  lerPlanilha,
  marcarRepetidas,
  normalizarLinha,
  valorDoCampo,
  type DefinicoesDosCampos,
} from "@/lib/escale/importacao/linhas";
import type { ColunaMapeada } from "@/lib/escale/importacao/regras";

const bytes = (texto: string) => new TextEncoder().encode(texto);
const defs: DefinicoesDosCampos = {
  contato: {
    plano: { type: "select", label: "Plano", options: [{ value: "ouro", label: "Ouro" }, { value: "prata", label: "Prata" }] },
    renda: { type: "currency", label: "Renda" },
    visita: { type: "datetime", label: "Visita" },
  },
  empresa: { segmento: { type: "text", label: "Segmento" } },
  negocio: { produto: { type: "text", label: "Produto" } },
};
const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));

describe("linhas da importação (Fase 2F)", () => {
  it("lê a planilha: cabeçalho, linhas, vazio e limites", () => {
    expect(lerPlanilha(bytes("nome;email\nMaria;maria@x.com\n\n"))).toEqual({
      cabecalho: ["nome", "email"],
      linhas: [["Maria", "maria@x.com"]],
    });
    expect(lerPlanilha(bytes("nome\n"))).toEqual({ erro: "O arquivo não tem linhas para importar." });
    const grande = "nome\n" + "x\n".repeat(50_001);
    expect(lerPlanilha(bytes(grande))).toEqual({ erro: "O arquivo passa de 50.000 linhas." });
    expect(lerCabecalho(bytes("﻿Nome,Celular\nMaria,1"))).toEqual(["Nome", "Celular"]);
  });

  it("normaliza o contato: e-mail, telefone com e sem DDI, Instagram, tags, data e campos", () => {
    const l = normalizarLinha(
      ["Maria", " MARIA@X.COM ", "(64) 99944-6816", "@maria", "vip; Lead quente", "05/03/1990", "Ouro", "R$ 1.234,56", "10/01/2026 10:18"],
      mapa("name", "email", "phone", "instagram", "tag", "birthdate", "custom:plano", "custom:renda", "custom:visita"),
      "contato",
      defs,
    );
    expect(l).toMatchObject({
      nome: "Maria",
      email: "maria@x.com",
      telefone: "+5564999446816",
      instagram: "https://instagram.com/maria",
      tags: ["vip", "lead quente"],
      nascimento: "1990-03-05",
      campos: { plano: "ouro", renda: 1234.56, visita: "2026-01-10T10:18" },
      negocio: null,
    });
    expect(normalizarLinha(["351", "912345678"], mapa("ddi", "phone"), "contato", defs).telefone).toBe("+351912345678");
  });

  it("o inválido vai para `invalidos` ou `descartados`, sem derrubar a linha", () => {
    const l = normalizarLinha(
      ["nao-e-email", "123", "abc", "Diamante", "32/13/1990"],
      mapa("email", "phone", "id", "custom:plano", "birthdate"),
      "contato",
      defs,
    );
    expect(l.invalidos).toEqual({ email: "nao-e-email", telefone: "123", id: "abc" });
    expect(l.descartados).toEqual([
      { campo: "custom:plano", valor: "Diamante" },
      { campo: "birthdate", valor: "32/13/1990" },
    ]);
  });

  it("empresa e negócio", () => {
    const l = normalizarLinha(
      ["Acme", "11.222.333/0001-81", "go", "Varejo", "Proposta", "1.500,00", "Funil A", "Qualificação", "Ganho", "02/02/2026", "Kit"],
      mapa("company", "org:cnpj", "org:estado", "org:segmento", "title", "value", "origin_name", "stage_name", "status", "won_at", "deal_custom:produto"),
      "negocio",
      defs,
    );
    expect(l.empresa).toBe("Acme");
    expect(l.cnpj).toEqual({ formatado: "11.222.333/0001-81", normalizado: "11222333000181" });
    expect(l.camposDaEmpresa).toEqual({ estado: "GO", segmento: "Varejo" });
    expect(l.negocio).toMatchObject({
      titulo: "Proposta",
      valorCentavos: 150000,
      valorInvalido: null,
      origem: "Funil A",
      etapa: "Qualificação",
      status: "won",
      ganhoEm: "2026-02-02",
      campos: { produto: "Kit" },
    });
    expect(normalizarLinha(["mil reais"], mapa("value"), "negocio", defs).negocio).toMatchObject({
      valorCentavos: null,
      valorInvalido: "mil reais",
    });
    expect(interpretarValor("cerca de 2.000,50 reais")).toBe(200050);
    expect(interpretarValor("nada")).toBeNull();
  });

  it("valor do campo por tipo", () => {
    expect(valorDoCampo({ type: "boolean", label: "x" }, "Sim")).toEqual({ ok: true, valor: true });
    expect(valorDoCampo({ type: "boolean", label: "x" }, "talvez")).toEqual({ ok: false });
    expect(
      valorDoCampo({ type: "multiselect", label: "x", options: [{ value: "a", label: "Alfa" }, { value: "b", label: "Beta" }] }, "alfa; Beta"),
    ).toEqual({ ok: true, valor: ["a", "b"] });
    expect(valorDoCampo({ type: "email", label: "x" }, "x@y")).toEqual({ ok: false });
    expect(valorDoCampo({ type: "text", label: "x" }, "  oi ")).toEqual({ ok: true, valor: "oi" });
  });

  it("repetidas no arquivo: mesmo e-mail ou mesmo telefone (com e sem o nono dígito)", () => {
    const linha = (email: string | null, telefone: string | null) =>
      ({ ...normalizarLinha([], [], "contato", defs), email, telefone });
    expect(
      marcarRepetidas([
        linha("a@x.com", null),
        linha("A@x.com".toLowerCase(), null),
        linha(null, "+5564999446816"),
        linha(null, "+556499446816"),
        linha(null, null),
      ]),
    ).toEqual([null, 0, null, 2, null]);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-linhas.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 2: As linhas**

Create `lib/escale/importacao/linhas.ts`:

```ts
/**
 * AS LINHAS DA IMPORTAÇÃO (fork Escale, Fase 2F): ler o CSV (o leitor do
 * importador do original: UTF-8 ou windows-1252, `,` `;` ou tab), normalizar
 * cada linha pelo mapeamento e achar as repetidas no próprio arquivo. Puro:
 * roda na rota (o arquivo inteiro) e no navegador (só o cabeçalho).
 */
import { normalizePhoneBR, phoneLookupVariants } from "@/lib/channels/phone-variants";
import { decodificarCsv, normalizaData, parseCsv } from "@/lib/contacts/csv";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import type { Catalogo } from "@/lib/escale/campos/regras";
import { linkDoInstagram, telefoneE164 } from "@/lib/escale/contatos/regras";
import { lerCnpj } from "@/lib/escale/empresas/regras";
import { numeroDoValor } from "@/lib/escale/filtros/campos";
import { dataHoraIsoDeBr, dataIsoDeBr } from "@/lib/escale/negocio/campos";
import type { CustomFieldDef } from "@/lib/schemas/settings";

import {
  PREFIXO_DA_EMPRESA,
  PREFIXO_DO_CONTATO,
  PREFIXO_DO_NEGOCIO,
  type CatalogosDaImportacao,
} from "./mapeamento";
import type { ColunaMapeada, TipoDeImportacao } from "./regras";

export const ARQUIVO_MAX_BYTES = 25 * 1024 * 1024;
export const LINHAS_MAX = 50_000;
export const COLUNAS_MAX = 200;
export const CELULA_MAX = 2000;
export const TAGS_MAX = 20;

export type ValorDeCampo = string | number | boolean | string[];
export type DefinicaoDoCampo = Pick<CustomFieldDef, "type" | "label" | "options">;
export interface DefinicoesDosCampos {
  contato: Record<string, DefinicaoDoCampo>;
  empresa: Record<string, DefinicaoDoCampo>;
  negocio: Record<string, DefinicaoDoCampo>;
}
export type StatusDoNegocio = "open" | "won" | "lost";

export interface DadosDoNegocio {
  id: string | null;
  titulo: string | null;
  valorCentavos: number | null;
  valorInvalido: string | null;
  origem: string | null;
  etapa: string | null;
  dono: string | null;
  status: StatusDoNegocio | null;
  ganhoEm: string | null;
  campos: Record<string, ValorDeCampo>;
}

export interface DadosDaLinha {
  id: string | null;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  cpf: string | null;
  tags: string[];
  campos: Record<string, ValorDeCampo>;
  empresa: string | null;
  cnpj: { formatado: string; normalizado: string } | null;
  camposDaEmpresa: Record<string, ValorDeCampo>;
  negocio: DadosDoNegocio | null;
  invalidos: { id?: string; email?: string; telefone?: string; negocioId?: string };
  descartados: Array<{ campo: string; valor: string }>;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALOR_LIMPO = /^(r\$)?\s*-?[\d.,]+$/i;

function definicoesDe(catalogo: Catalogo): Record<string, DefinicaoDoCampo> {
  return Object.fromEntries(
    catalogo.campos.map((c) => [c.chave, { type: c.definicao.type, label: c.definicao.label, options: c.definicao.options }]),
  );
}

export function definicoesDosCatalogos(catalogos: CatalogosDaImportacao): DefinicoesDosCampos {
  return {
    contato: definicoesDe(catalogos.contato),
    empresa: definicoesDe(catalogos.empresa),
    negocio: definicoesDe(catalogos.negocio),
  };
}

const naoVazia = (linha: readonly string[]) => linha.some((c) => c.trim() !== "");

export function lerPlanilha(bytes: ArrayBuffer | Uint8Array): { cabecalho: string[]; linhas: string[][] } | { erro: string } {
  if (bytes.byteLength > ARQUIVO_MAX_BYTES) return { erro: "O arquivo passa de 25 MB." };
  const decodificado = decodificarCsv(bytes);
  if ("erro" in decodificado) return { erro: decodificado.erro };
  const todas = parseCsv(decodificado.texto).filter(naoVazia);
  const [cabecalho, ...linhas] = todas;
  if (!cabecalho || linhas.length === 0) return { erro: "O arquivo não tem linhas para importar." };
  if (linhas.length > LINHAS_MAX) return { erro: "O arquivo passa de 50.000 linhas." };
  if (cabecalho.length > COLUNAS_MAX) return { erro: "O arquivo passa de 200 colunas." };
  return { cabecalho: cabecalho.map((c) => c.trim()), linhas };
}

/** Só o cabeçalho (o navegador lê os primeiros 64 KB). */
export function lerCabecalho(bytes: ArrayBuffer | Uint8Array): string[] | null {
  const decodificado = decodificarCsv(bytes);
  if ("erro" in decodificado) return null;
  const primeira = parseCsv(decodificado.texto).find(naoVazia);
  return primeira ? primeira.map((c) => c.trim()).slice(0, COLUNAS_MAX) : null;
}

const semAcento = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .trim();

function opcaoDe(def: DefinicaoDoCampo, texto: string): string | null {
  const alvo = semAcento(texto);
  const achada = (def.options ?? []).find((o) => semAcento(o.label) === alvo || semAcento(o.value) === alvo);
  return achada?.value ?? null;
}

const SIM = new Set(["sim", "s", "yes", "y", "true", "1", "verdadeiro", "x"]);
const NAO = new Set(["nao", "n", "no", "false", "0", "falso"]);

export function valorDoCampo(def: DefinicaoDoCampo, texto: string): { ok: true; valor: ValorDeCampo } | { ok: false } {
  const v = texto.trim().slice(0, CELULA_MAX);
  switch (def.type) {
    case "number":
    case "currency": {
      const n = VALOR_LIMPO.test(v) ? numeroDoValor(v) : null;
      return n === null ? { ok: false } : { ok: true, valor: n };
    }
    case "date": {
      const d = dataIsoDeBr(v);
      return d ? { ok: true, valor: d } : { ok: false };
    }
    case "datetime": {
      const d = dataHoraIsoDeBr(v) ?? (dataIsoDeBr(v) ? `${dataIsoDeBr(v)}T00:00` : null);
      return d ? { ok: true, valor: d } : { ok: false };
    }
    case "select": {
      const o = opcaoDe(def, v);
      return o ? { ok: true, valor: o } : { ok: false };
    }
    case "multiselect": {
      const partes = v.split(/[;,|]/).map((p) => p.trim()).filter(Boolean);
      const valores = partes.map((p) => opcaoDe(def, p));
      return valores.length > 0 && valores.every((x): x is string => x !== null)
        ? { ok: true, valor: [...new Set(valores)] }
        : { ok: false };
    }
    case "boolean": {
      const b = semAcento(v);
      if (SIM.has(b)) return { ok: true, valor: true };
      if (NAO.has(b)) return { ok: true, valor: false };
      return { ok: false };
    }
    case "email":
      return EMAIL.test(v) ? { ok: true, valor: v.toLowerCase() } : { ok: false };
    default:
      return { ok: true, valor: v };
  }
}

function statusDoTexto(texto: string): StatusDoNegocio | null {
  const t = semAcento(texto);
  if (["aberto", "aberta", "em aberto", "open"].includes(t)) return "open";
  if (["ganho", "ganha", "won", "venda", "vendido"].includes(t)) return "won";
  if (["perdido", "perdida", "lost"].includes(t)) return "lost";
  return null;
}

/** "Interpretar o valor" (Clint `CREATE_WITH_PARSED_VALUE`): os números do texto, em centavos. */
export function interpretarValor(texto: string): number | null {
  const n = numeroDoValor(texto.replace(/[^\d,.-]/g, ""));
  return n === null || n < 0 ? null : Math.round(n * 100);
}

const negocioVazio = (): DadosDoNegocio => ({
  id: null,
  titulo: null,
  valorCentavos: null,
  valorInvalido: null,
  origem: null,
  etapa: null,
  dono: null,
  status: null,
  ganhoEm: null,
  campos: {},
});

export function normalizarLinha(
  celulas: readonly string[],
  mapa: readonly ColunaMapeada[],
  tipo: TipoDeImportacao,
  definicoes: DefinicoesDosCampos,
): DadosDaLinha {
  const l: DadosDaLinha = {
    id: null,
    nome: null,
    email: null,
    telefone: null,
    instagram: null,
    nascimento: null,
    cpf: null,
    tags: [],
    campos: {},
    empresa: null,
    cnpj: null,
    camposDaEmpresa: {},
    negocio: tipo === "negocio" ? negocioVazio() : null,
    invalidos: {},
    descartados: [],
  };
  const descartar = (campo: string, valor: string) => l.descartados.push({ campo, valor });
  let telefoneBruto: string | null = null;
  let ddi: string | null = null;

  mapa.forEach((coluna, i) => {
    const v = (celulas[i] ?? "").trim().slice(0, CELULA_MAX);
    const para = coluna.para;
    if (!v || !para || para === "none") return;
    const n = l.negocio;
    if (para === "id") {
      if (UUID.test(v)) l.id = v.toLowerCase();
      else l.invalidos.id = v;
    } else if (para === "deal_id") {
      if (n && UUID.test(v)) n.id = v.toLowerCase();
      else l.invalidos.negocioId = v;
    } else if (para === "name") l.nome = v.slice(0, 200);
    else if (para === "email") {
      const e = v.toLowerCase();
      if (EMAIL.test(e)) l.email = e;
      else l.invalidos.email = v;
    } else if (para === "phone") telefoneBruto = v;
    else if (para === "ddi") ddi = v.replace(/\D/g, "") || null;
    else if (para === "instagram") {
      const link = linkDoInstagram(v);
      if (link) l.instagram = link;
      else descartar(para, v);
    } else if (para === "tag") l.tags = normalizarTags(v.split(/[;,|]/)).slice(0, TAGS_MAX);
    else if (para === "birthdate") {
      const d = normalizaData(v);
      if (d) l.nascimento = d;
      else descartar(para, v);
    } else if (para === "cpf") {
      const d = v.replace(/\D/g, "");
      if (d.length === 11) l.cpf = d;
      else descartar(para, v);
    } else if (para === "company") l.empresa = v.slice(0, 200);
    else if (para === "org:cnpj") {
      const c = lerCnpj(v);
      if (c.ok && c.normalizado && c.formatado) l.cnpj = { formatado: c.formatado, normalizado: c.normalizado };
      else descartar(para, v);
    } else if (para === "org:cidade") l.camposDaEmpresa.cidade = v.slice(0, 200);
    else if (para === "org:estado") l.camposDaEmpresa.estado = v.toUpperCase().slice(0, 2);
    else if (para.startsWith(PREFIXO_DA_EMPRESA)) {
      const chave = para.slice(PREFIXO_DA_EMPRESA.length);
      const def = definicoes.empresa[chave];
      const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
      if (lido.ok) l.camposDaEmpresa[chave] = lido.valor;
      else descartar(para, v);
    } else if (para.startsWith(PREFIXO_DO_CONTATO)) {
      const chave = para.slice(PREFIXO_DO_CONTATO.length);
      const def = definicoes.contato[chave];
      const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
      if (lido.ok) l.campos[chave] = lido.valor;
      else descartar(para, v);
    } else if (n) {
      if (para === "title") n.titulo = v.slice(0, 200);
      else if (para === "value") {
        const valor = VALOR_LIMPO.test(v) ? numeroDoValor(v) : null;
        if (valor !== null && valor >= 0) n.valorCentavos = Math.round(valor * 100);
        else n.valorInvalido = v;
      } else if (para === "origin_name") n.origem = v;
      else if (para === "stage_name") n.etapa = v;
      else if (para === "owner") n.dono = v;
      else if (para === "status") {
        const s = statusDoTexto(v);
        if (s) n.status = s;
        else descartar(para, v);
      } else if (para === "won_at") {
        const d = dataIsoDeBr(v) ?? dataHoraIsoDeBr(v)?.slice(0, 10) ?? null;
        if (d) n.ganhoEm = d;
        else descartar(para, v);
      } else if (para.startsWith(PREFIXO_DO_NEGOCIO)) {
        const chave = para.slice(PREFIXO_DO_NEGOCIO.length);
        const def = definicoes.negocio[chave];
        const lido = def ? valorDoCampo(def, v) : ({ ok: false } as const);
        if (lido.ok) n.campos[chave] = lido.valor;
        else descartar(para, v);
      }
    }
  });

  if (telefoneBruto) {
    const e164 = ddi ? telefoneE164(ddi, telefoneBruto) : normalizePhoneBR(telefoneBruto);
    if (e164) l.telefone = e164;
    else l.invalidos.telefone = telefoneBruto;
  }
  return l;
}

/** O índice da primeira linha com o mesmo e-mail ou telefone (Clint `DUPLICATE_IN_BATCH`); null na primeira. */
export function marcarRepetidas(linhas: readonly DadosDaLinha[]): Array<number | null> {
  const vistas = new Map<string, number>();
  return linhas.map((l, i) => {
    const chaves = [
      ...(l.email ? [`e:${l.email}`] : []),
      ...(l.telefone ? phoneLookupVariants(l.telefone).map((v) => `t:${v}`) : []),
    ];
    const primeira = chaves.map((c) => vistas.get(c)).find((x) => x !== undefined);
    if (primeira !== undefined) return primeira;
    for (const c of chaves) vistas.set(c, i);
    return null;
  });
}
```

Confira antes de rodar: `normalizaData` aceita "05/03/1990" e recusa "32/13/1990" (`lib/contacts/csv.ts` L366); `dataIsoDeBr` e `dataHoraIsoDeBr` estão em `lib/escale/negocio/campos.ts` (2C); `lerCnpj` devolve `{ ok: true, normalizado, formatado }` (2D). O formato do "Data e Hora" (`YYYY-MM-DDTHH:mm`, sem fuso) é o que a ficha grava (2C, `dataHoraIsoDeBr`).

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-linhas.test.ts
corepack pnpm exec eslint lib/escale/importacao/linhas.ts tests/unit/escale-importacao-linhas.test.ts
git add lib/escale/importacao/linhas.ts tests/unit/escale-importacao-linhas.test.ts
git commit -m "feat(escale): linhas da importação — ler o CSV, normalizar e achar as repetidas (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 4: Os portões — classificar cada linha em pular, revisar ou importar

**Files:**
- Create: `lib/escale/importacao/classificar.ts`, `tests/unit/escale-importacao-classificar.test.ts`

**Interfaces:**
- Consumes: `samePhone` (`lib/channels/phone-variants.ts`); `DadosDaLinha`, `ValorDeCampo`, `StatusDoNegocio`, `TAGS_MAX`, `interpretarValor` (Task 3); `Acao`, `Decisoes`, `Motivo`, `TipoDeImportacao`, `decisaoDe` (Task 1).
- Produces (as Tasks 6, 7, 8 e 18 dependem destes nomes): `ContatoExistente`, `NegocioExistente`, `ContextoDoNegocio`, `ContextoDaLinha`, `Resolucao` (`{ acao: Acao; dados?: { origemId?: string; etapaId?: string; sobrescrever?: string[] } }`), `Resolucoes`, `ResumoDoContato`, `Diferenca`, `Avisos`, `Detalhe`, `NovoContato`, `MudancasDoContato`, `PlanoDoContato`, `PlanoDaEmpresa`, `PlanoDoNegocio`, `Plano`, `Desfecho`, `classificar(linha, repetidaDe, ctx, decisoes, resolucoes?)` → `Desfecho`, `MOTIVO_PADRAO_DE_PERDA = "other"`.

A ordem dos portões (N6) e o que cada escolha faz:

| Portão | Quando | Pular | Revisar | As outras escolhas |
|---|---|---|---|---|
| `MISSING_REQUIRED_FIELDS` | sem ID, nome, e-mail e telefone (nem inválidos) | sempre | — | — |
| `INVALID_EMAIL_FORMAT` | e-mail inválido | sempre | — | — |
| `DUPLICATE_IN_BATCH` | mesma chave de uma linha anterior | sempre | — | — |
| `INVALID_PHONE_FORMAT` | telefone inválido | `SKIP_ROW` | `PENDING_REVIEW` | `SKIP_PHONE_KEEP_REST`: aviso do telefone; sem mais nada que identifique, `MISSING_REQUIRED_FIELDS` |
| `MERGE_HINT_EMAIL_PHONE_SPLIT` | o e-mail é de A e o telefone de B (A ≠ B) | `SKIP_ROW` | sempre, até alguém escolher | `UPDATE_EMAIL_CONTACT`: alvo A, telefone descartado; `UPDATE_PHONE_CONTACT`: alvo B, e-mail descartado |
| `PHONE_HAS_ACTIVE_WHATSAPP` | casou, telefone diferente e o atual tem conversa em andamento | `SKIP_ROW` | `PENDING_REVIEW` | `SKIP_PHONE_KEEP_REST`: mantém o atual, aviso |
| `MATCH_PHONE_DIFFERS` | casou, telefone diferente, sem conversa | — | `PENDING_REVIEW` | `KEEP_DB` / `OVERWRITE` |
| `MATCH_INSTAGRAM_DIFFERS` | casou, Instagram diferente | — | `PENDING_REVIEW` | `KEEP_DB` / `OVERWRITE` |
| `MATCH_OVERWRITE_FILLED_FIELD` | casou e há campo preenchido diferente (nome, e-mail, nascimento, empresa, catálogo) | — | `PENDING_REVIEW` | `OVERWRITE`: troca todos; `KEEP_DB`: mantém, menos os de `dados.sobrescrever` |
| `MATCH_FILL_EMPTY_FIELDS` | casou (sempre) | `SKIP_ROW` | `PENDING_REVIEW` | `UPDATE`: preenche os vazios |
| `DEAL_ID_NOT_FOUND` | ID do negócio que não existe | `SKIP_ROW` | `PENDING_REVIEW` | `CREATE_NEW` |
| `ORIGIN_NAME_NOT_FOUND` | origem por nome que não existe | `SKIP_ROW` | `PENDING_REVIEW` | `USE_DEFAULT` (a da configuração); `PICK_MANUALLY` com `dados.origemId` |
| `STAGE_NAME_NOT_FOUND` | etapa por nome que não existe na origem | `SKIP_ROW` | `PENDING_REVIEW` | `USE_FIRST`; `PICK_MANUALLY` com `dados.etapaId` |
| `DEAL_VALUE_INVALID` | valor que não é número | `SKIP_ROW` | `PENDING_REVIEW` | `CREATE_NO_VALUE`; `CREATE_WITH_PARSED_VALUE` (`interpretarValor`) |
| `DEAL_DUPLICATE_OPEN` | sem ID do negócio, o contato já tem negócio aberto na origem | `SKIP_ROW` | `PENDING_REVIEW` | `UPDATE_EXISTING` (atualiza aquele); `CREATE_NEW` |

O e-mail ou o telefone do arquivo que já é de **outro** contato (não o alvo) é descartado com aviso antes dos portões B (N8). As tags do arquivo e da configuração somam às do contato, até 20.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-classificar.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import {
  classificar,
  type ContatoExistente,
  type ContextoDaLinha,
  type ContextoDoNegocio,
} from "@/lib/escale/importacao/classificar";
import { normalizarLinha, type DadosDaLinha } from "@/lib/escale/importacao/linhas";
import { decisoesDoNivel, type ColunaMapeada } from "@/lib/escale/importacao/regras";

const defs = { contato: { plano: { type: "text" as const, label: "Plano" } }, empresa: {}, negocio: {} };
const mapa = (...para: string[]): ColunaMapeada[] => para.map((p, i) => ({ csv: `c${i}`, para: p }));
const linha = (para: string[], celulas: string[], tipo: "contato" | "negocio" = "contato"): DadosDaLinha =>
  normalizarLinha(celulas, mapa(...para), tipo, defs);

const contato = (extra: Partial<ContatoExistente> = {}): ContatoExistente => ({
  id: "c-1",
  nome: "Maria",
  email: "maria@x.com",
  telefone: "+5564999446816",
  instagram: null,
  nascimento: null,
  campos: {},
  tags: ["antiga"],
  empresa: null,
  ...extra,
});
const ctx = (extra: Partial<ContextoDaLinha> = {}): ContextoDaLinha => ({
  tipo: "contato",
  porId: null,
  porEmail: null,
  porTelefone: null,
  whatsappAtivo: () => false,
  tagsDaImportacao: [],
  negocio: null,
  ...extra,
});
const conservador = decisoesDoNivel("conservador");
const agressivo = decisoesDoNivel("agressivo");

describe("classificar (Fase 2F)", () => {
  it("contato novo vira criar, com as tags da configuração", () => {
    const d = classificar(linha(["name", "email", "tag"], ["Ana", "ana@x.com", "vip"]), null, ctx({ tagsDaImportacao: ["feira"] }), conservador);
    expect(d).toMatchObject({
      tipo: "importar",
      plano: { contato: { tipo: "criar", dados: { nome: "Ana", email: "ana@x.com", tags: ["vip", "feira"] } }, negocio: null },
    });
  });

  it("A: sem dados, e-mail inválido e repetida são puladas", () => {
    expect(classificar(linha(["plano"], ["x"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "MISSING_REQUIRED_FIELDS" });
    expect(classificar(linha(["email"], ["x@"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "INVALID_EMAIL_FORMAT" });
    expect(classificar(linha(["email"], ["a@x.com"]), 0, ctx(), conservador)).toMatchObject({
      tipo: "pular",
      motivo: "DUPLICATE_IN_BATCH",
      detalhe: { primeiraLinha: 0 },
    });
  });

  it("telefone inválido: sem telefone com aviso; só telefone vira sem dados", () => {
    expect(classificar(linha(["name", "phone"], ["Ana", "12"]), null, ctx(), conservador)).toMatchObject({
      tipo: "importar",
      detalhe: { avisos: { telefone: "12" } },
    });
    expect(classificar(linha(["phone"], ["12"]), null, ctx(), conservador)).toMatchObject({ tipo: "pular", motivo: "MISSING_REQUIRED_FIELDS" });
    expect(
      classificar(linha(["name", "phone"], ["Ana", "12"]), null, ctx(), { ...conservador, INVALID_PHONE_FORMAT: "PENDING_REVIEW" }),
    ).toMatchObject({ tipo: "revisar", motivo: "INVALID_PHONE_FORMAT" });
  });

  it("C: e-mail de um e telefone de outro vai para revisão; a escolha decide o alvo", () => {
    const a = contato({ id: "a", telefone: null });
    const b = contato({ id: "b", email: null });
    const l = linha(["email", "phone"], ["maria@x.com", "(64) 99944-6816"]);
    const c = ctx({ porEmail: a, porTelefone: b });
    expect(classificar(l, null, c, agressivo)).toMatchObject({ tipo: "revisar", motivo: "MERGE_HINT_EMAIL_PHONE_SPLIT" });
    const d = classificar(l, null, c, agressivo, { MERGE_HINT_EMAIL_PHONE_SPLIT: { acao: "UPDATE_EMAIL_CONTACT" } });
    expect(d).toMatchObject({ tipo: "importar", plano: { contato: { tipo: "atualizar", id: "a" } }, detalhe: { avisos: { telefone: "+5564999446816" } } });
  });

  it("B: telefone diferente — Conservador revisa, Padrão mantém, Substituir troca", () => {
    const l = linha(["email", "phone"], ["maria@x.com", "(11) 98888-7777"]);
    const c = ctx({ porEmail: contato() });
    expect(classificar(l, null, c, conservador)).toMatchObject({ tipo: "revisar", motivo: "MATCH_PHONE_DIFFERS" });
    const mantem = classificar(l, null, c, decisoesDoNivel("padrao"));
    expect(mantem).toMatchObject({ tipo: "importar", plano: { contato: { tipo: "atualizar", id: "c-1" } } });
    expect(mantem.tipo === "importar" && mantem.plano.contato.tipo === "atualizar" && mantem.plano.contato.mudancas.telefone).toBeFalsy();
    const troca = classificar(l, null, c, conservador, { MATCH_PHONE_DIFFERS: { acao: "OVERWRITE" } });
    expect(troca).toMatchObject({ plano: { contato: { mudancas: { telefone: "+5511988887777" } } } });
  });

  it("D: telefone com WhatsApp em andamento nunca é trocado pelo nível", () => {
    const l = linha(["email", "phone"], ["maria@x.com", "(11) 98888-7777"]);
    const c = ctx({ porEmail: contato(), whatsappAtivo: () => true });
    expect(classificar(l, null, c, agressivo)).toMatchObject({ tipo: "revisar", motivo: "PHONE_HAS_ACTIVE_WHATSAPP" });
    expect(classificar(l, null, c, agressivo, { PHONE_HAS_ACTIVE_WHATSAPP: { acao: "SKIP_PHONE_KEEP_REST" } })).toMatchObject({
      tipo: "importar",
      detalhe: { avisos: { telefone: "+5511988887777" } },
    });
  });

  it("B: campo preenchido diferente; 'Manter e atualizar marcados'; preencher vazios", () => {
    const l = linha(["email", "name", "custom:plano"], ["maria@x.com", "Maria Silva", "ouro"]);
    const c = ctx({ porEmail: contato({ campos: { plano: "prata" } }) });
    const revisar = classificar(l, null, c, decisoesDoNivel("padrao"));
    expect(revisar).toMatchObject({
      tipo: "revisar",
      motivo: "MATCH_OVERWRITE_FILLED_FIELD",
      detalhe: { campo: "nome", valorAtual: "Maria", valorDoArquivo: "Maria Silva", outrasDiferencas: [{ campo: "campo:plano" }] },
    });
    const marcados = classificar(l, null, c, conservador, {
      MATCH_OVERWRITE_FILLED_FIELD: { acao: "KEEP_DB", dados: { sobrescrever: ["campo:plano"] } },
    });
    expect(marcados).toMatchObject({ plano: { contato: { mudancas: { campos: { plano: "ouro" } } } } });
    expect(marcados.tipo === "importar" && marcados.plano.contato.tipo === "atualizar" && marcados.plano.contato.mudancas.nome).toBeFalsy();
    const vazio = classificar(linha(["email", "custom:plano"], ["maria@x.com", "ouro"]), null, ctx({ porEmail: contato() }), conservador);
    expect(vazio).toMatchObject({
      tipo: "importar",
      detalhe: { preenchimentos: [{ campo: "campo:plano", valor: "ouro" }] },
      plano: { contato: { mudancas: { campos: { plano: "ouro" } } } },
    });
  });

  it("o e-mail que é de outro contato é descartado com aviso", () => {
    const d = classificar(
      linha(["id", "email"], ["0b6f2d7e-1c3a-4e5b-8f9a-1b2c3d4e5f60", "outro@x.com"]),
      null,
      ctx({ porId: contato({ id: "0b6f2d7e-1c3a-4e5b-8f9a-1b2c3d4e5f60", email: null }), porEmail: contato({ id: "z" }) }),
      conservador,
    );
    expect(d).toMatchObject({ tipo: "importar", detalhe: { avisos: { email: "outro@x.com" } } });
  });

  describe("negócios", () => {
    const negocio = (extra: Partial<ContextoDoNegocio> = {}): ContextoDoNegocio => ({
      porId: null,
      abertoNaOrigem: () => null,
      origemPorNome: (nome) => (nome === "Funil A" ? "o-a" : null),
      etapaPorNome: (origem, nome) => (origem === "o-a" && nome === "Proposta" ? "e-a2" : null),
      primeiraEtapa: (origem) => (origem === "o-a" ? "e-a1" : "e-p1"),
      donoPorTexto: (texto) => (texto === "joao@x.com" ? "u-joao" : null),
      padrao: { origemId: "o-p", etapaId: "e-p2", status: "open", motivoDePerda: null },
      ...extra,
    });
    const cn = (extra: Partial<ContextoDoNegocio> = {}) => ctx({ tipo: "negocio", negocio: negocio(extra) });

    it("cria na origem e etapa padrão, com dono e título", () => {
      const d = classificar(linha(["name", "title", "owner"], ["Ana", "Site novo", "joao@x.com"], "negocio"), null, cn(), conservador);
      expect(d).toMatchObject({
        tipo: "importar",
        plano: { negocio: { tipo: "criar", origemId: "o-p", etapaId: "e-p2", titulo: "Site novo", donoId: "u-joao", status: "open" } },
      });
    });

    it("origem e etapa por nome; não achadas seguem as decisões", () => {
      const achada = classificar(linha(["name", "origin_name", "stage_name"], ["Ana", "Funil A", "Proposta"], "negocio"), null, cn(), conservador);
      expect(achada).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a2" } } });
      const semEtapa = classificar(linha(["name", "origin_name", "stage_name"], ["Ana", "Funil A", "Xis"], "negocio"), null, cn(), decisoesDoNivel("padrao"));
      expect(semEtapa).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a1" } } });
      const semOrigem = classificar(linha(["name", "origin_name"], ["Ana", "Funil Z"], "negocio"), null, cn(), conservador);
      expect(semOrigem).toMatchObject({ tipo: "revisar", motivo: "ORIGIN_NAME_NOT_FOUND", detalhe: { origemDoArquivo: "Funil Z" } });
      const escolhida = classificar(linha(["name", "origin_name"], ["Ana", "Funil Z"], "negocio"), null, cn(), conservador, {
        ORIGIN_NAME_NOT_FOUND: { acao: "PICK_MANUALLY", dados: { origemId: "o-a" } },
      });
      expect(escolhida).toMatchObject({ plano: { negocio: { origemId: "o-a", etapaId: "e-a1" } } });
    });

    it("valor inválido, negócio aberto repetido e perdido sem motivo", () => {
      const valor = classificar(linha(["name", "value"], ["Ana", "uns 2.000,50"], "negocio"), null, cn(), conservador, {
        DEAL_VALUE_INVALID: { acao: "CREATE_WITH_PARSED_VALUE" },
      });
      expect(valor).toMatchObject({ plano: { negocio: { valorCentavos: 200050 } } });
      const repetido = classificar(
        linha(["email"], ["maria@x.com"], "negocio"),
        null,
        { ...cn({ abertoNaOrigem: () => ({ id: "n-1", titulo: "Antigo", origemId: "o-p", campos: {} }) }), porEmail: contato() },
        decisoesDoNivel("agressivo"),
      );
      expect(repetido).toMatchObject({ plano: { negocio: { tipo: "atualizar", id: "n-1" } } });
      const perdido = classificar(linha(["name", "status"], ["Ana", "Perdido"], "negocio"), null, cn(), conservador);
      expect(perdido).toMatchObject({ plano: { negocio: { status: "lost", motivoDePerda: "other" } } });
    });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-classificar.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 2: Os portões**

Create `lib/escale/importacao/classificar.ts`:

```ts
/**
 * OS PORTÕES DA IMPORTAÇÃO (fork Escale, Fase 2F; Clint "Import Studio": as
 * situações de `M` e a tela de revisão `oo`). Cada linha passa pelos portões
 * na ordem (A → C → B/D → E). O primeiro que pede "Revisar" para a linha com
 * aquele motivo; "Descartar" pula; as outras escolhas seguem adiante. Ao
 * resolver na revisão, a linha roda de novo com `resolucoes` e pode parar num
 * portão seguinte. Puro: o contexto (o que o banco já tem) vem pronto.
 */
import { samePhone } from "@/lib/channels/phone-variants";

import { TAGS_MAX, interpretarValor, type DadosDaLinha, type StatusDoNegocio, type ValorDeCampo } from "./linhas";
import { decisaoDe, type Acao, type Decisoes, type Motivo, type TipoDeImportacao } from "./regras";

export const MOTIVO_PADRAO_DE_PERDA = "other";

export interface ContatoExistente {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  campos: Record<string, unknown>;
  tags: string[];
  empresa: { id: string; nome: string | null } | null;
}

export interface NegocioExistente {
  id: string;
  titulo: string;
  origemId: string;
  campos: Record<string, unknown>;
}

export interface ContextoDoNegocio {
  porId: NegocioExistente | null;
  abertoNaOrigem: (contatoId: string, origemId: string) => NegocioExistente | null;
  origemPorNome: (nome: string) => string | null;
  etapaPorNome: (origemId: string, nome: string) => string | null;
  primeiraEtapa: (origemId: string) => string | null;
  donoPorTexto: (texto: string) => string | null;
  padrao: { origemId: string; etapaId: string; status: StatusDoNegocio; motivoDePerda: string | null };
}

export interface ContextoDaLinha {
  tipo: TipoDeImportacao;
  porId: ContatoExistente | null;
  porEmail: ContatoExistente | null;
  porTelefone: ContatoExistente | null;
  whatsappAtivo: (contatoId: string) => boolean;
  tagsDaImportacao: readonly string[];
  negocio: ContextoDoNegocio | null;
}

export interface Resolucao {
  acao: Acao;
  dados?: { origemId?: string; etapaId?: string; sobrescrever?: string[] };
}
export type Resolucoes = Partial<Record<Motivo, Resolucao>>;

export type CasouPor = "id" | "email" | "telefone";
export interface ResumoDoContato {
  id: string;
  nome: string | null;
  email: string | null;
  telefone: string | null;
  casouPor: CasouPor;
  whatsapp: boolean;
}
export interface Diferenca {
  campo: string;
  valorAtual: unknown;
  valorDoArquivo: unknown;
}
export interface Avisos {
  id?: string;
  negocioId?: string;
  email?: string;
  telefone?: string;
  dono?: string;
  campos?: Array<{ campo: string; valor: string }>;
}
export interface Detalhe {
  casouPor?: CasouPor;
  contato?: ResumoDoContato;
  contatos?: ResumoDoContato[];
  campo?: string;
  valorAtual?: unknown;
  valorDoArquivo?: unknown;
  outrasDiferencas?: Diferenca[];
  preenchimentos?: Array<{ campo: string; valor: unknown }>;
  telefoneAtual?: string;
  telefoneDoArquivo?: string;
  instagramAtual?: string;
  instagramDoArquivo?: string;
  emailInvalido?: string;
  telefoneInvalido?: string;
  primeiraLinha?: number;
  origemDoArquivo?: string;
  etapaDoArquivo?: string;
  origemId?: string;
  negocioIdDoArquivo?: string;
  negocioAtual?: string;
  valorInvalido?: string;
  avisos: Avisos;
}

export interface NovoContato {
  nome: string | null;
  email: string | null;
  telefone: string | null;
  instagram: string | null;
  nascimento: string | null;
  cpf: string | null;
  campos: Record<string, ValorDeCampo>;
  tags: string[];
}
export interface MudancasDoContato {
  nome?: string;
  email?: string;
  telefone?: string;
  instagram?: string;
  nascimento?: string;
  empresa?: string;
  campos?: Record<string, ValorDeCampo>;
  tags?: string[];
}
export type PlanoDoContato = { tipo: "criar"; dados: NovoContato } | { tipo: "atualizar"; id: string; mudancas: MudancasDoContato };
/** `nome` e `cnpj` nulos = a empresa atual do contato (ou uma nova sem nome). Os campos só preenchem vazios (N9). */
export interface PlanoDaEmpresa {
  nome: string | null;
  cnpj: { formatado: string; normalizado: string } | null;
  campos: Record<string, ValorDeCampo>;
}
export type PlanoDoNegocio =
  | {
      tipo: "criar";
      origemId: string;
      etapaId: string;
      titulo: string | null;
      valorCentavos: number | null;
      donoId: string | null;
      campos: Record<string, ValorDeCampo>;
      status: StatusDoNegocio;
      motivoDePerda: string | null;
      ganhoEm: string | null;
    }
  | {
      tipo: "atualizar";
      id: string;
      titulo: string | null;
      valorCentavos: number | null;
      donoId: string | null;
      campos: Record<string, ValorDeCampo>;
    };
export interface Plano {
  contato: PlanoDoContato;
  empresa: PlanoDaEmpresa | null;
  negocio: PlanoDoNegocio | null;
}
export type Desfecho =
  | { tipo: "pular"; motivo: Motivo; detalhe: Detalhe }
  | { tipo: "revisar"; motivo: Motivo; detalhe: Detalhe }
  | { tipo: "importar"; plano: Plano; detalhe: Detalhe };

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const igual = (a: unknown, b: unknown) => {
  if (typeof a === "string" && typeof b === "string") return a.trim().toLowerCase() === b.trim().toLowerCase();
  if (Array.isArray(a) && Array.isArray(b)) return JSON.stringify([...a].map(String).sort()) === JSON.stringify([...b].map(String).sort());
  return String(a) === String(b);
};

function somarTags(...listas: ReadonlyArray<readonly string[]>): string[] {
  return [...new Set(listas.flat())].slice(0, TAGS_MAX);
}

function resumo(c: ContatoExistente, casouPor: CasouPor, ctx: ContextoDaLinha): ResumoDoContato {
  return { id: c.id, nome: c.nome, email: c.email, telefone: c.telefone, casouPor, whatsapp: ctx.whatsappAtivo(c.id) };
}

function aplicar(m: MudancasDoContato, campo: string, valor: unknown): MudancasDoContato {
  if (campo.startsWith("campo:")) return { ...m, campos: { ...m.campos, [campo.slice(6)]: valor as ValorDeCampo } };
  const chave = { nome: "nome", email: "email", telefone: "telefone", instagram: "instagram", nascimento: "nascimento", empresa: "empresa" }[
    campo
  ] as keyof MudancasDoContato | undefined;
  return chave ? { ...m, [chave]: valor } : m;
}

export function classificar(
  l: DadosDaLinha,
  repetidaDe: number | null,
  ctx: ContextoDaLinha,
  decisoes: Decisoes,
  resolucoes: Resolucoes = {},
): Desfecho {
  const avisos: Avisos = {};
  if (l.invalidos.id) avisos.id = l.invalidos.id;
  if (l.invalidos.negocioId) avisos.negocioId = l.invalidos.negocioId;
  if (l.descartados.length > 0) avisos.campos = [...l.descartados];
  const detalhe: Detalhe = { avisos };
  const escolha = (m: Motivo): Resolucao => resolucoes[m] ?? { acao: decisaoDe(m, decisoes) };
  const parar = (m: Motivo, r: Resolucao): Desfecho | null => {
    if (r.acao === "SKIP_ROW") return { tipo: "pular", motivo: m, detalhe };
    if (r.acao === "PENDING_REVIEW") return { tipo: "revisar", motivo: m, detalhe };
    return null;
  };
  const pular = (m: Motivo): Desfecho => ({ tipo: "pular", motivo: m, detalhe });

  let telefone = l.telefone;
  let email = l.email;
  const semIdentidade = () => !l.id && !l.nome && !email && !telefone;

  // ── A: linhas novas e inválidas ──
  if (semIdentidade() && !l.invalidos.telefone && !l.invalidos.email) return pular("MISSING_REQUIRED_FIELDS");
  if (l.invalidos.email) {
    detalhe.emailInvalido = l.invalidos.email;
    return pular("INVALID_EMAIL_FORMAT");
  }
  if (repetidaDe !== null) {
    detalhe.primeiraLinha = repetidaDe;
    return pular("DUPLICATE_IN_BATCH");
  }
  if (l.invalidos.telefone) {
    detalhe.telefoneInvalido = l.invalidos.telefone;
    const fim = parar("INVALID_PHONE_FORMAT", escolha("INVALID_PHONE_FORMAT"));
    if (fim) return fim;
    avisos.telefone = l.invalidos.telefone;
    if (semIdentidade()) return pular("MISSING_REQUIRED_FIELDS");
  }

  // ── C: quem é o contato ──
  let alvo: ContatoExistente | null = null;
  let casouPor: CasouPor | null = null;
  if (ctx.porId) {
    alvo = ctx.porId;
    casouPor = "id";
  } else {
    const a = email ? ctx.porEmail : null;
    const b = telefone ? ctx.porTelefone : null;
    if (a && b && a.id !== b.id) {
      detalhe.contatos = [resumo(a, "email", ctx), resumo(b, "telefone", ctx)];
      const r = escolha("MERGE_HINT_EMAIL_PHONE_SPLIT");
      const fim = parar("MERGE_HINT_EMAIL_PHONE_SPLIT", r);
      if (fim) return fim;
      if (r.acao === "UPDATE_EMAIL_CONTACT") {
        alvo = a;
        casouPor = "email";
        if (telefone) avisos.telefone = telefone;
        telefone = null;
      } else {
        alvo = b;
        casouPor = "telefone";
        if (email) avisos.email = email;
        email = null;
      }
    } else if (a) {
      alvo = a;
      casouPor = "email";
    } else if (b) {
      alvo = b;
      casouPor = "telefone";
    }
  }
  // O e-mail ou o telefone que já é de OUTRO contato não pode ser gravado (N8).
  if (alvo && email && ctx.porEmail && ctx.porEmail.id !== alvo.id) {
    avisos.email = email;
    email = null;
  }
  if (alvo && telefone && ctx.porTelefone && ctx.porTelefone.id !== alvo.id) {
    avisos.telefone = telefone;
    telefone = null;
  }

  const empresaDaLinha: PlanoDaEmpresa | null =
    l.empresa || l.cnpj || Object.keys(l.camposDaEmpresa).length > 0
      ? { nome: l.empresa, cnpj: l.cnpj, campos: l.camposDaEmpresa }
      : null;

  let planoDoContato: PlanoDoContato;
  let empresa = empresaDaLinha;
  if (!alvo || !casouPor) {
    planoDoContato = {
      tipo: "criar",
      dados: {
        nome: l.nome,
        email,
        telefone,
        instagram: l.instagram,
        nascimento: l.nascimento,
        cpf: l.cpf,
        campos: l.campos,
        tags: somarTags(l.tags, ctx.tagsDaImportacao),
      },
    };
  } else {
    detalhe.casouPor = casouPor;
    detalhe.contato = resumo(alvo, casouPor, ctx);
    let mudancas: MudancasDoContato = {};
    const preenchimentos: Array<{ campo: string; valor: unknown }> = [];
    const diferencas: Diferenca[] = [];
    const comparar = (campo: string, atual: unknown, doArquivo: unknown) => {
      if (vazio(doArquivo)) return;
      if (vazio(atual)) preenchimentos.push({ campo, valor: doArquivo });
      else if (!igual(atual, doArquivo)) diferencas.push({ campo, valorAtual: atual, valorDoArquivo: doArquivo });
    };

    // ── B/D: telefone ──
    if (telefone) {
      if (!alvo.telefone) preenchimentos.push({ campo: "telefone", valor: telefone });
      else if (!samePhone(telefone, alvo.telefone)) {
        detalhe.telefoneAtual = alvo.telefone;
        detalhe.telefoneDoArquivo = telefone;
        const m: Motivo = ctx.whatsappAtivo(alvo.id) ? "PHONE_HAS_ACTIVE_WHATSAPP" : "MATCH_PHONE_DIFFERS";
        const r = escolha(m);
        const fim = parar(m, r);
        if (fim) return fim;
        if (r.acao === "OVERWRITE") mudancas = aplicar(mudancas, "telefone", telefone);
        else if (m === "PHONE_HAS_ACTIVE_WHATSAPP") avisos.telefone = telefone;
      }
    }
    // ── B: Instagram ──
    if (l.instagram) {
      if (!alvo.instagram) preenchimentos.push({ campo: "instagram", valor: l.instagram });
      else if (!igual(alvo.instagram, l.instagram)) {
        detalhe.instagramAtual = alvo.instagram;
        detalhe.instagramDoArquivo = l.instagram;
        const r = escolha("MATCH_INSTAGRAM_DIFFERS");
        const fim = parar("MATCH_INSTAGRAM_DIFFERS", r);
        if (fim) return fim;
        if (r.acao === "OVERWRITE") mudancas = aplicar(mudancas, "instagram", l.instagram);
      }
    }
    // ── B: os outros campos ──
    comparar("nome", alvo.nome, l.nome);
    if (email && casouPor !== "email") comparar("email", alvo.email, email);
    comparar("nascimento", alvo.nascimento, l.nascimento);
    if (l.empresa) comparar("empresa", alvo.empresa?.nome ?? null, l.empresa);
    for (const [chave, valor] of Object.entries(l.campos)) comparar(`campo:${chave}`, alvo.campos[chave], valor);

    if (diferencas.length > 0) {
      const [primeira, ...outras] = diferencas;
      detalhe.campo = primeira.campo;
      detalhe.valorAtual = primeira.valorAtual;
      detalhe.valorDoArquivo = primeira.valorDoArquivo;
      detalhe.outrasDiferencas = outras;
      const r = escolha("MATCH_OVERWRITE_FILLED_FIELD");
      const fim = parar("MATCH_OVERWRITE_FILLED_FIELD", r);
      if (fim) return fim;
      const trocar = r.acao === "OVERWRITE" ? diferencas.map((d) => d.campo) : (r.dados?.sobrescrever ?? []);
      for (const d of diferencas) if (trocar.includes(d.campo)) mudancas = aplicar(mudancas, d.campo, d.valorDoArquivo);
    }

    detalhe.preenchimentos = preenchimentos;
    const r = escolha("MATCH_FILL_EMPTY_FIELDS");
    const fim = parar("MATCH_FILL_EMPTY_FIELDS", r);
    if (fim) return fim;
    for (const p of preenchimentos) mudancas = aplicar(mudancas, p.campo, p.valor);
    const tags = somarTags(alvo.tags, l.tags, ctx.tagsDaImportacao);
    if (tags.length !== alvo.tags.length) mudancas = { ...mudancas, tags };
    planoDoContato = { tipo: "atualizar", id: alvo.id, mudancas };

    // Empresa diferente mantida: os campos vão para a empresa atual (N9).
    if (empresa && alvo.empresa && l.empresa && !igual(alvo.empresa.nome ?? "", l.empresa) && !mudancas.empresa) {
      empresa = { nome: null, cnpj: null, campos: l.camposDaEmpresa };
    }
  }

  // ── E: negócios ──
  let negocio: PlanoDoNegocio | null = null;
  const n = l.negocio;
  const cn = ctx.negocio;
  if (ctx.tipo === "negocio" && n && cn) {
    const contatoId = alvo?.id ?? null;
    let existente = n.id ? cn.porId : null;
    if (n.id && !existente) {
      detalhe.negocioIdDoArquivo = n.id;
      const fim = parar("DEAL_ID_NOT_FOUND", escolha("DEAL_ID_NOT_FOUND"));
      if (fim) return fim;
    }

    let origemId = cn.padrao.origemId;
    if (n.origem) {
      const achada = cn.origemPorNome(n.origem);
      if (achada) origemId = achada;
      else {
        detalhe.origemDoArquivo = n.origem;
        const r = escolha("ORIGIN_NAME_NOT_FOUND");
        const fim = parar("ORIGIN_NAME_NOT_FOUND", r);
        if (fim) return fim;
        if (r.acao === "PICK_MANUALLY" && r.dados?.origemId) origemId = r.dados.origemId;
      }
    }

    let etapaId = origemId === cn.padrao.origemId ? cn.padrao.etapaId : cn.primeiraEtapa(origemId);
    if (n.etapa) {
      const achada = cn.etapaPorNome(origemId, n.etapa);
      if (achada) etapaId = achada;
      else {
        detalhe.etapaDoArquivo = n.etapa;
        detalhe.origemId = origemId;
        const r = escolha("STAGE_NAME_NOT_FOUND");
        const fim = parar("STAGE_NAME_NOT_FOUND", r);
        if (fim) return fim;
        etapaId = r.acao === "PICK_MANUALLY" && r.dados?.etapaId ? r.dados.etapaId : cn.primeiraEtapa(origemId);
      }
    }

    let valorCentavos = n.valorCentavos;
    if (n.valorInvalido) {
      detalhe.valorInvalido = n.valorInvalido;
      const r = escolha("DEAL_VALUE_INVALID");
      const fim = parar("DEAL_VALUE_INVALID", r);
      if (fim) return fim;
      valorCentavos = r.acao === "CREATE_WITH_PARSED_VALUE" ? interpretarValor(n.valorInvalido) : null;
    }

    if (!existente && !n.id && contatoId) {
      const aberto = cn.abertoNaOrigem(contatoId, origemId);
      if (aberto) {
        detalhe.negocioAtual = aberto.titulo;
        const r = escolha("DEAL_DUPLICATE_OPEN");
        const fim = parar("DEAL_DUPLICATE_OPEN", r);
        if (fim) return fim;
        if (r.acao === "UPDATE_EXISTING") existente = aberto;
      }
    }

    const donoId = n.dono ? cn.donoPorTexto(n.dono) : null;
    if (n.dono && !donoId) avisos.dono = n.dono;

    if (existente) {
      negocio = { tipo: "atualizar", id: existente.id, titulo: n.titulo, valorCentavos, donoId, campos: n.campos };
    } else {
      if (!etapaId) return pular("STAGE_NAME_NOT_FOUND");
      const status = n.status ?? cn.padrao.status;
      negocio = {
        tipo: "criar",
        origemId,
        etapaId,
        titulo: n.titulo ?? l.nome ?? alvo?.nome ?? null,
        valorCentavos,
        donoId,
        campos: n.campos,
        status,
        motivoDePerda: status === "lost" ? (cn.padrao.motivoDePerda ?? MOTIVO_PADRAO_DE_PERDA) : null,
        ganhoEm: status === "won" ? n.ganhoEm : null,
      };
    }
  }

  return { tipo: "importar", plano: { contato: planoDoContato, empresa, negocio }, detalhe };
}
```

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-classificar.test.ts tests/unit/escale-importacao-linhas.test.ts tests/unit/escale-importacao-regras.test.ts
corepack pnpm exec eslint lib/escale/importacao/classificar.ts tests/unit/escale-importacao-classificar.test.ts
git add lib/escale/importacao/classificar.ts tests/unit/escale-importacao-classificar.test.ts
git commit -m "feat(escale): os portões da importação — pular, revisar ou importar cada linha (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 5: Migration 9107 — as tabelas, a leitura do gerente e as funções do service role

**Files:**
- Create: `supabase/migrations/20261107120000_9107_importacoes.sql`, `tests/unit/escale-importacoes-migration.test.ts`, `tests/invariants/escale-importacoes.test.ts`
- Modify: `supabase/baseline.sql` (bloco depois do da 9105, ou da 9106 se existir, antes da varredura de `anon`)

**Interfaces:**
- Produces (tabelas): `crm_importacoes` (`id`, `organization_id`, `user_id`, `tipo`, `arquivo`, `mapeamento`, `configuracao`, `decisoes`, `nivel`, `status`, `total`, `importadas`, `revisar`, `puladas`, `erros`, `avisos`, `codigo_do_erro`, `linhas_apagadas_em`, `concluida_em`, `created_at`, `updated_at`) e `crm_importacoes_linhas` (`id`, `importacao_id`, `organization_id`, `numero`, `bruto`, `normalizado`, `repetida_de`, `status`, `motivo`, `detalhe`, `com_aviso`, `resolucoes`, `contato_id`, `negocio_id`, `mensagem`, `created_at`, `updated_at`).
- Produces (funções invoker, fechadas a `public, anon, authenticated`, abertas ao `service_role`): `fn_escale_enfileirar_importacao(p_importacao uuid) returns integer`, `fn_escale_contar_importacao(p_importacao uuid) returns text` (refaz as contagens e fecha a importação quando não sobra linha na fila; devolve o status), `fn_escale_cancelar_importacao(p_importacao uuid) returns text`, `fn_escale_reabrir_importacao(p_importacao uuid, p_motivo text, p_resolucao jsonb) returns integer`, `fn_escale_limpar_linhas_antigas(p_org uuid) returns integer`.
- Produces (definer, fechada ao `service_role`): `fn_escale_empresa_da_importacao(p_org uuid, p_autor uuid, p_contato uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text) returns uuid`.
- Evento: `contatos.importacao_requested`, `entity_kind` `crm_importacao`, payload `{ importacao_id }`.

- [ ] **Step 1: A migration**

```bash
bash scripts/checar-colisao-de-migration.sh escale-crm/main
```

Create `supabase/migrations/20261107120000_9107_importacoes.sql`:

```sql
-- manifest: **Importar contatos e negócios (fork Escale, Fase 2F).** A importação (`crm_importacoes`: tipo, arquivo, mapeamento, configuração, decisões, nível, status e contagens) e as linhas do arquivo (`crm_importacoes_linhas`: bruto, normalizado, status, motivo, detalhe, resoluções e o que criou), só leitura para gerente ou acima da organização; toda escrita é do service role (as rotas, depois de conferir o papel, e o consumidor do `event_log`). Funções fechadas ao `service_role`: `fn_escale_enfileirar_importacao` (conta as linhas, põe na fila e emite `contatos.importacao_requested`), `fn_escale_contar_importacao` (refaz as contagens e fecha a importação), `fn_escale_cancelar_importacao`, `fn_escale_reabrir_importacao` (resolver em lote), `fn_escale_limpar_linhas_antigas` (LGPD: linhas de importações terminadas há mais de 30 dias) e a definer `fn_escale_empresa_da_importacao` (acha ou cria a empresa e vincula o contato pela `fn_escale_vincular_contato_a_empresa` da 2D).
-- 9107: importar contatos e negócios (fork Escale, Frente B).

-- ── 1. As tabelas ────────────────────────────────────────────────────────────
create table if not exists public.crm_importacoes (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  user_id uuid not null,
  tipo text not null,
  arquivo text not null,
  mapeamento jsonb not null default '[]'::jsonb,
  configuracao jsonb not null default '{}'::jsonb,
  decisoes jsonb not null default '{}'::jsonb,
  nivel text not null default 'conservador',
  status text not null default 'preparando',
  total integer not null default 0,
  importadas integer not null default 0,
  revisar integer not null default 0,
  puladas integer not null default 0,
  erros integer not null default 0,
  avisos integer not null default 0,
  codigo_do_erro text,
  linhas_apagadas_em timestamptz,
  concluida_em timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_importacoes_tipo_valido check (tipo in ('contato', 'negocio')),
  constraint crm_importacoes_arquivo_valido check (char_length(arquivo) between 1 and 200),
  constraint crm_importacoes_mapeamento_lista
    check (jsonb_typeof(mapeamento) = 'array' and octet_length(mapeamento::text) <= 65536),
  constraint crm_importacoes_configuracao_objeto
    check (jsonb_typeof(configuracao) = 'object' and octet_length(configuracao::text) <= 8192),
  constraint crm_importacoes_decisoes_objeto
    check (jsonb_typeof(decisoes) = 'object' and octet_length(decisoes::text) <= 8192),
  constraint crm_importacoes_nivel_valido check (nivel in ('conservador', 'padrao', 'agressivo', 'personalizado')),
  constraint crm_importacoes_status_valido
    check (status in ('preparando', 'na_fila', 'importando', 'aguardando_revisao', 'concluida', 'cancelada', 'falhou')),
  constraint crm_importacoes_contagens
    check (total between 0 and 50000 and importadas >= 0 and revisar >= 0 and puladas >= 0 and erros >= 0 and avisos >= 0),
  constraint crm_importacoes_pessoa_fk foreign key (user_id, organization_id)
    references public.user_organizations (user_id, organization_id) on delete cascade
);

create index if not exists idx_crm_importacoes_lista
  on public.crm_importacoes (organization_id, created_at desc);
create index if not exists idx_crm_importacoes_antigas
  on public.crm_importacoes (organization_id, concluida_em) where linhas_apagadas_em is null;

create table if not exists public.crm_importacoes_linhas (
  id uuid primary key default gen_random_uuid(),
  importacao_id uuid not null references public.crm_importacoes(id) on delete cascade,
  organization_id uuid not null references public.organizations(id) on delete cascade,
  numero integer not null,
  bruto jsonb not null,
  normalizado jsonb not null default '{}'::jsonb,
  repetida_de integer,
  status text not null default 'na_fila',
  motivo text,
  detalhe jsonb not null default '{}'::jsonb,
  com_aviso boolean not null default false,
  resolucoes jsonb not null default '{}'::jsonb,
  contato_id uuid,
  negocio_id uuid,
  mensagem text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint crm_importacoes_linhas_numero_unico unique (importacao_id, numero),
  constraint crm_importacoes_linhas_status_valido
    check (status in ('na_fila', 'processando', 'importada', 'revisar', 'pulada', 'erro')),
  constraint crm_importacoes_linhas_bruto_lista
    check (jsonb_typeof(bruto) = 'array' and octet_length(bruto::text) <= 65536),
  constraint crm_importacoes_linhas_objetos
    check (jsonb_typeof(normalizado) = 'object' and jsonb_typeof(detalhe) = 'object' and jsonb_typeof(resolucoes) = 'object'),
  constraint crm_importacoes_linhas_motivo_quando_revisa check (status <> 'revisar' or motivo is not null)
);

create index if not exists idx_crm_importacoes_linhas_fila
  on public.crm_importacoes_linhas (importacao_id, status, numero);
create index if not exists idx_crm_importacoes_linhas_motivo
  on public.crm_importacoes_linhas (importacao_id, motivo) where status = 'revisar';

-- ── 2. RLS: só leitura, gerente ou acima da organização ─────────────────────
alter table public.crm_importacoes enable row level security;
alter table public.crm_importacoes_linhas enable row level security;

drop policy if exists crm_importacoes_select on public.crm_importacoes;
drop policy if exists crm_importacoes_linhas_select on public.crm_importacoes_linhas;

create policy crm_importacoes_select on public.crm_importacoes
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

create policy crm_importacoes_linhas_select on public.crm_importacoes_linhas
  for select using (
    public.fn_is_platform_admin()
    or ((organization_id in (select public.fn_user_org_ids()))
        and public.fn_role_at_least(organization_id, 'manager'))
  );

revoke all on public.crm_importacoes from anon, authenticated;
revoke all on public.crm_importacoes_linhas from anon, authenticated;
grant select on public.crm_importacoes to authenticated;
grant select on public.crm_importacoes_linhas to authenticated;
grant all on public.crm_importacoes to service_role;
grant all on public.crm_importacoes_linhas to service_role;

drop trigger if exists trg_crm_importacoes_updated_at on public.crm_importacoes;
create trigger trg_crm_importacoes_updated_at
  before update on public.crm_importacoes
  for each row execute function public.fn_set_updated_at();
drop trigger if exists trg_crm_importacoes_linhas_updated_at on public.crm_importacoes_linhas;
create trigger trg_crm_importacoes_linhas_updated_at
  before update on public.crm_importacoes_linhas
  for each row execute function public.fn_set_updated_at();

comment on table public.crm_importacoes is
  'Importações de contatos e negócios da casca (fork Escale, migration 9107), como o import_job da Clint. Gerente+ lê; o service role escreve (rotas e consumidor do event_log).';
comment on table public.crm_importacoes_linhas is
  'As linhas do arquivo de cada importação (fork Escale, migration 9107), como o import_row da Clint. Apagadas 30 dias depois do fim (LGPD).';

-- ── 3. Contar e fechar ───────────────────────────────────────────────────────
-- Refaz as contagens pelas linhas. Importando sem linha na fila (nem processando)
-- fecha: "aguardando_revisao" se sobrou revisão, senão "concluida". Aguardando
-- revisão que zerou as revisões também conclui.
create or replace function public.fn_escale_contar_importacao(p_importacao uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_status text;
  v_na_fila integer;
  v_revisar integer;
begin
  select count(*) filter (where l.status in ('na_fila', 'processando')),
         count(*) filter (where l.status = 'revisar')
    into v_na_fila, v_revisar
    from public.crm_importacoes_linhas l
   where l.importacao_id = p_importacao;

  update public.crm_importacoes i
     set importadas = c.importadas,
         revisar = c.revisar,
         puladas = c.puladas,
         erros = c.erros,
         avisos = c.avisos
    from (
      select count(*) filter (where status = 'importada') as importadas,
             count(*) filter (where status = 'revisar') as revisar,
             count(*) filter (where status = 'pulada') as puladas,
             count(*) filter (where status = 'erro') as erros,
             count(*) filter (where status = 'importada' and com_aviso) as avisos
        from public.crm_importacoes_linhas
       where importacao_id = p_importacao
    ) c
   where i.id = p_importacao
  returning i.status into v_status;

  if v_status in ('importando', 'aguardando_revisao') and v_na_fila = 0 then
    v_status := case when v_revisar > 0 then 'aguardando_revisao' else 'concluida' end;
    update public.crm_importacoes
       set status = v_status,
           concluida_em = case when v_status = 'concluida' then now() else null end
     where id = p_importacao;
  end if;
  return v_status;
end;
$$;

-- ── 4. Pôr na fila ───────────────────────────────────────────────────────────
create or replace function public.fn_escale_enfileirar_importacao(p_importacao uuid)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_total integer;
begin
  select organization_id into v_org
    from public.crm_importacoes
   where id = p_importacao and status = 'preparando'
   for update;
  if not found then
    raise exception 'importacao_nao_preparada: a importação não está em preparo' using errcode = 'P0001';
  end if;
  select count(*) into v_total from public.crm_importacoes_linhas where importacao_id = p_importacao;
  if v_total = 0 then
    raise exception 'importacao_vazia: nenhuma linha para importar' using errcode = 'P0001';
  end if;
  update public.crm_importacoes set total = v_total, status = 'na_fila' where id = p_importacao;
  perform public.emit_event(
    'contatos.importacao_requested',
    'crm_importacao',
    p_importacao,
    jsonb_build_object('importacao_id', p_importacao),
    '{}'::jsonb,
    v_org
  );
  return v_total;
end;
$$;

-- ── 5. Cancelar (na fila ou importando) ──────────────────────────────────────
create or replace function public.fn_escale_cancelar_importacao(p_importacao uuid)
returns text
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
begin
  update public.crm_importacoes
     set status = 'cancelada', concluida_em = now()
   where id = p_importacao and status in ('na_fila', 'importando');
  if not found then
    raise exception 'importacao_nao_cancelavel: só se cancela na fila ou importando' using errcode = 'P0001';
  end if;
  update public.crm_importacoes_linhas
     set status = 'pulada', mensagem = 'Importação cancelada.'
   where importacao_id = p_importacao and status in ('na_fila', 'processando');
  perform public.fn_escale_contar_importacao(p_importacao);
  return 'cancelada';
end;
$$;

-- ── 6. Resolver em lote: as linhas do motivo voltam à fila com a escolha ─────
create or replace function public.fn_escale_reabrir_importacao(p_importacao uuid, p_motivo text, p_resolucao jsonb)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_org uuid;
  v_linhas integer;
begin
  select organization_id into v_org
    from public.crm_importacoes
   where id = p_importacao and status in ('aguardando_revisao', 'importando')
   for update;
  if not found then
    raise exception 'importacao_nao_aguarda: a importação não espera revisão' using errcode = 'P0001';
  end if;
  update public.crm_importacoes_linhas
     set resolucoes = resolucoes || jsonb_build_object(p_motivo, p_resolucao),
         status = 'na_fila',
         motivo = null
   where importacao_id = p_importacao and status = 'revisar' and motivo = p_motivo;
  get diagnostics v_linhas = row_count;
  if v_linhas > 0 then
    update public.crm_importacoes set status = 'importando', concluida_em = null where id = p_importacao;
    perform public.fn_escale_contar_importacao(p_importacao);
    perform public.emit_event(
      'contatos.importacao_requested',
      'crm_importacao',
      p_importacao,
      jsonb_build_object('importacao_id', p_importacao),
      jsonb_build_object('resolvidas', v_linhas),
      v_org
    );
  end if;
  return v_linhas;
end;
$$;

-- ── 7. LGPD: as linhas das importações terminadas há mais de 30 dias ─────────
create or replace function public.fn_escale_limpar_linhas_antigas(p_org uuid)
returns integer
language plpgsql
security invoker
set search_path = public, pg_temp
as $$
declare
  v_ids uuid[];
  v_linhas integer;
begin
  select coalesce(array_agg(id), '{}'::uuid[]) into v_ids
    from public.crm_importacoes
   where organization_id = p_org
     and status in ('concluida', 'cancelada', 'falhou')
     and linhas_apagadas_em is null
     and coalesce(concluida_em, updated_at) < now() - interval '30 days';
  delete from public.crm_importacoes_linhas where importacao_id = any(v_ids);
  get diagnostics v_linhas = row_count;
  update public.crm_importacoes set linhas_apagadas_em = now() where id = any(v_ids);
  return v_linhas;
end;
$$;

revoke all on function public.fn_escale_contar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_enfileirar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_cancelar_importacao(uuid) from public, anon, authenticated;
revoke all on function public.fn_escale_reabrir_importacao(uuid, text, jsonb) from public, anon, authenticated;
revoke all on function public.fn_escale_limpar_linhas_antigas(uuid) from public, anon, authenticated;
grant execute on function public.fn_escale_contar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_enfileirar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_cancelar_importacao(uuid) to service_role;
grant execute on function public.fn_escale_reabrir_importacao(uuid, text, jsonb) to service_role;
grant execute on function public.fn_escale_limpar_linhas_antigas(uuid) to service_role;

-- ── 8. A empresa da linha (N9) ───────────────────────────────────────────────
-- Pelo CNPJ, senão pelo nome (sem maiúsculas), senão — sem nome e sem CNPJ — a
-- empresa atual do contato; não achou, cria (sem nome, se o nome veio vazio).
-- Vincula pela função da 2D (uma empresa por contato; vira principal se a empresa
-- não tem). Definer como as da 2D: a RLS do original pede gerente em
-- `people`/`company_people`; fechada ao service role, que é quem a chama.
create or replace function public.fn_escale_empresa_da_importacao(
  p_org uuid, p_autor uuid, p_contato uuid, p_nome text, p_cnpj text, p_cnpj_normalizado text
)
returns uuid
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_empresa uuid;
  v_nome text := nullif(btrim(coalesce(p_nome, '')), '');
  v_cnpj text := nullif(btrim(coalesce(p_cnpj_normalizado, '')), '');
begin
  perform 1 from public.contacts where id = p_contato and organization_id = p_org;
  if not found then
    raise exception 'contato_nao_encontrado' using errcode = 'P0002';
  end if;
  if v_cnpj is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and normalized_cnpj = v_cnpj
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is not null then
    select id into v_empresa from public.companies
     where organization_id = p_org and lower(btrim(coalesce(trade_name, legal_name, ''))) = lower(v_nome)
     order by created_at limit 1;
  end if;
  if v_empresa is null and v_nome is null and v_cnpj is null then
    select cp.company_id into v_empresa
      from public.contacts c
      join public.company_people cp on cp.person_id = c.person_id and cp.organization_id = p_org
     where c.id = p_contato and c.organization_id = p_org
     order by cp.is_primary desc, cp.created_at
     limit 1;
  end if;
  if v_empresa is null then
    insert into public.companies (organization_id, trade_name, cnpj, normalized_cnpj, created_by)
    values (p_org, v_nome, case when v_cnpj is null then null else nullif(btrim(p_cnpj), '') end, v_cnpj, p_autor)
    returning id into v_empresa;
  end if;
  perform public.fn_escale_vincular_contato_a_empresa(p_org, p_contato, v_empresa, false);
  return v_empresa;
end;
$$;

revoke all on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) from public, anon, authenticated;
grant execute on function public.fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text) to service_role;

-- ── travas do suporte, depois de toda tabela nova (migration 0274) ─────────
do $f$ begin perform public.fn_aplicar_travas_de_suporte(); end $f$;

notify pgrst, 'reload schema';
```

Antes de seguir, abra `supabase/migrations/20261105120000_9105_empresas.sql` e confira: `fn_escale_vincular_contato_a_empresa(p_org uuid, p_contato uuid, p_empresa uuid, p_principal boolean)` existe com essa assinatura; a coluna `companies.created_by` existe (0448). Se a 9105 registrou as definers numa lista de teste (procure `fn_escale_criar_empresa(uuid, uuid, text, text, text, text, uuid)` em `tests/`), acrescente `fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text)` na mesma lista.

- [ ] **Step 2: O bloco no baseline**

Copie o corpo da migration (sem a linha `-- manifest:` e sem o `notify`) para `supabase/baseline.sql`, com o cabeçalho `-- ---- FORK ESCALE · importar contatos e negócios (migration 9107) ----`, logo **depois** do bloco da 9105 (ou da 9106) e **antes** da varredura de `anon` (memória "Ordem dos blocos no baseline": o bloco das empresas já está tarde; o da 9107 vem depois dele porque usa `fn_escale_vincular_contato_a_empresa`).

- [ ] **Step 3: O teste do arquivo (vai falhar antes do Step 1, passa depois)**

Create `tests/unit/escale-importacoes-migration.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const raiz = process.cwd();
const migration = readFileSync(join(raiz, "supabase/migrations/20261107120000_9107_importacoes.sql"), "utf8");
const baseline = readFileSync(join(raiz, "supabase/baseline.sql"), "utf8");

describe("migration 9107 — importações (Fase 2F)", () => {
  it("as duas tabelas, só leitura para gerente+", () => {
    expect(migration).toMatch(/create table if not exists public\.crm_importacoes \(/);
    expect(migration).toMatch(/create table if not exists public\.crm_importacoes_linhas \(/);
    expect(migration).toMatch(/fn_role_at_least\(organization_id, 'manager'\)/);
    expect(migration).toMatch(/revoke all on public\.crm_importacoes from anon, authenticated;/);
    expect(migration).not.toMatch(/grant (insert|update|delete)[^;]*to authenticated/);
  });

  it("as funções fechadas ao service role", () => {
    for (const assinatura of [
      "fn_escale_contar_importacao(uuid)",
      "fn_escale_enfileirar_importacao(uuid)",
      "fn_escale_cancelar_importacao(uuid)",
      "fn_escale_reabrir_importacao(uuid, text, jsonb)",
      "fn_escale_limpar_linhas_antigas(uuid)",
      "fn_escale_empresa_da_importacao(uuid, uuid, uuid, text, text, text)",
    ]) {
      expect(migration).toContain(`revoke all on function public.${assinatura} from public, anon, authenticated;`);
      expect(migration).toContain(`grant execute on function public.${assinatura} to service_role;`);
    }
  });

  it("o evento e o bloco no baseline", () => {
    expect(migration).toContain("'contatos.importacao_requested'");
    expect(baseline).toContain("-- ---- FORK ESCALE · importar contatos e negócios (migration 9107) ----");
    expect(baseline.indexOf("migration 9107")).toBeGreaterThan(baseline.indexOf("migration 9105"));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacoes-migration.test.ts`
Expected: PASS.

- [ ] **Step 4: A prova no Postgres**

Create `tests/invariants/escale-importacoes.test.ts`:

```ts
import { beforeAll, describe, expect, it } from "vitest";

import { GOV_ADMIN, GOV_AGENT_A, GOV_MANAGER, GOV_ORG, countAs, seedGov, sql, writeCountAs } from "./gov-helpers";

/**
 * IMPORTAÇÕES (fork Escale, migration 9107) — prova contra Postgres real: gerente+
 * lê as importações da organização e o atendente não; ninguém escreve pela sessão;
 * enfileirar conta e emite o evento; contar fecha; reabrir devolve à fila; cancelar
 * pula a fila; a empresa da linha é achada, criada e vinculada. Roda via `pnpm test:db`.
 */
const IMP = "e5ca1e00-9107-4000-8000-000000000001";
const IMP_2 = "e5ca1e00-9107-4000-8000-000000000002";
const C1 = "e5ca1e00-9107-4000-8000-0000000000c1";

const tentar = (fn: () => number) => {
  try {
    return fn();
  } catch {
    return -1;
  }
};
const statusDe = (id: string) => sql(`select status from public.crm_importacoes where id = '${id}';`).trim();
const linha = (imp: string, numero: number, status = "na_fila", motivo: string | null = null) =>
  `insert into public.crm_importacoes_linhas (importacao_id, organization_id, numero, bruto, status, motivo)
   values ('${imp}', '${GOV_ORG}', ${numero}, '["x"]'::jsonb, '${status}', ${motivo ? `'${motivo}'` : "null"});`;

beforeAll(() => {
  seedGov();
  sql(`
    delete from public.crm_importacoes where organization_id = '${GOV_ORG}';
    delete from public.contacts where id = '${C1}';
    insert into public.contacts (id, organization_id, display_name) values ('${C1}', '${GOV_ORG}', 'Importado Um');
    insert into public.crm_importacoes (id, organization_id, user_id, tipo, arquivo)
      values ('${IMP}', '${GOV_ORG}', '${GOV_MANAGER}', 'contato', 'a.csv'),
             ('${IMP_2}', '${GOV_ORG}', '${GOV_ADMIN}', 'negocio', 'b.csv');
    ${linha(IMP, 2)}
    ${linha(IMP, 3)}
  `);
});

describe("crm_importacoes (9107)", () => {
  it("gerente e admin leem; atendente não", () => {
    expect(countAs(GOV_MANAGER, `select count(*) from public.crm_importacoes where organization_id = '${GOV_ORG}'`)).toBe(2);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_importacoes where organization_id = '${GOV_ORG}'`)).toBe(0);
    expect(countAs(GOV_AGENT_A, `select count(*) from public.crm_importacoes_linhas where importacao_id = '${IMP}'`)).toBe(0);
  });

  it("ninguém escreve pela sessão", () => {
    expect(
      tentar(() =>
        writeCountAs(
          GOV_ADMIN,
          `insert into public.crm_importacoes (organization_id, user_id, tipo, arquivo) values ('${GOV_ORG}', '${GOV_ADMIN}', 'contato', 'x.csv')`,
        ),
      ),
    ).toBeLessThanOrEqual(0);
    expect(tentar(() => writeCountAs(GOV_ADMIN, `update public.crm_importacoes set status = 'concluida' where id = '${IMP}'`))).toBeLessThanOrEqual(0);
    expect(tentar(() => countAs(GOV_ADMIN, `select count(*) from (select public.fn_escale_enfileirar_importacao('${IMP}')) x`))).toBe(-1);
  });

  it("enfileirar conta as linhas e emite o evento", () => {
    expect(sql(`select public.fn_escale_enfileirar_importacao('${IMP}');`).trim()).toBe("2");
    expect(statusDe(IMP)).toBe("na_fila");
    expect(
      Number(sql(`select count(*) from public.event_log where event_type = 'contatos.importacao_requested' and entity_id = '${IMP}';`).trim()),
    ).toBe(1);
  });

  it("contar fecha: revisão sobrando aguarda; zerada conclui", () => {
    sql(`
      update public.crm_importacoes set status = 'importando' where id = '${IMP}';
      update public.crm_importacoes_linhas set status = 'importada' where importacao_id = '${IMP}' and numero = 2;
      update public.crm_importacoes_linhas set status = 'revisar', motivo = 'MATCH_PHONE_DIFFERS' where importacao_id = '${IMP}' and numero = 3;
    `);
    expect(sql(`select public.fn_escale_contar_importacao('${IMP}');`).trim()).toBe("aguardando_revisao");
    expect(sql(`select importadas || '/' || revisar from public.crm_importacoes where id = '${IMP}';`).trim()).toBe("1/1");
  });

  it("reabrir devolve as linhas do motivo à fila com a escolha", () => {
    expect(sql(`select public.fn_escale_reabrir_importacao('${IMP}', 'MATCH_PHONE_DIFFERS', '{"acao":"OVERWRITE"}'::jsonb);`).trim()).toBe("1");
    expect(statusDe(IMP)).toBe("importando");
    expect(sql(`select resolucoes->'MATCH_PHONE_DIFFERS'->>'acao' from public.crm_importacoes_linhas where importacao_id = '${IMP}' and numero = 3;`).trim()).toBe(
      "OVERWRITE",
    );
  });

  it("cancelar pula o que estava na fila", () => {
    expect(sql(`select public.fn_escale_cancelar_importacao('${IMP}');`).trim()).toBe("cancelada");
    expect(sql(`select status from public.crm_importacoes_linhas where importacao_id = '${IMP}' and numero = 3;`).trim()).toBe("pulada");
  });

  it("a empresa da linha: cria sem nome, acha pelo nome e vincula", () => {
    const nova = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', 'Acme Importada', null, null);`).trim();
    expect(nova).toMatch(/^[0-9a-f-]{36}$/);
    const achada = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', 'ACME importada', null, null);`).trim();
    expect(achada).toBe(nova);
    const atual = sql(`select public.fn_escale_empresa_da_importacao('${GOV_ORG}', '${GOV_ADMIN}', '${C1}', null, null, null);`).trim();
    expect(atual).toBe(nova);
    expect(
      Number(
        sql(`select count(*) from public.company_people cp join public.contacts c on c.person_id = cp.person_id where c.id = '${C1}';`).trim(),
      ),
    ).toBe(1);
  });
});
```

Run (Docker Desktop aberto):

```bash
docker info > /dev/null && echo docker-ok
corepack pnpm test:db tests/invariants/escale-importacoes.test.ts
```

Expected: 7 testes verdes. Se `writeCountAs` devolver um número em vez de lançar, o `tentar` aceita 0 (nada escrito).

- [ ] **Step 5: Commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacoes-migration.test.ts
git add supabase/migrations/20261107120000_9107_importacoes.sql supabase/baseline.sql tests/unit/escale-importacoes-migration.test.ts tests/invariants/escale-importacoes.test.ts
git commit -m "feat(escale): migration 9107 — importações, linhas e as funções do service role (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 6: Criar a importação — o pedido, as leituras do lote e as rotas de criar e listar

**Files:**
- Create: `lib/escale/importacao/tipos.ts`, `lib/escale/importacao/contexto.ts`, `lib/escale/importacao/banco.ts`, `app/api/v1/importacoes/route.ts`, `app/api/v1/importacoes/[id]/route.ts`, `tests/unit/escale-importacao-tipos.test.ts`, `tests/unit/escale-importacoes-rota.test.ts`
- Modify: `lib/audit/actions.ts` (depois de `"companies.primary_changed",`)

**Interfaces:**
- Consumes: Tasks 1–5; `lerCatalogo` (2C); `createAdminClient`; `createClient` (`lib/supabase/server`).
- Produces (`tipos.ts`): `configuracaoSchema`, `Configuracao` (`{ tags: string[]; origemId: string | null; etapaId: string | null; status: StatusDoNegocio; motivoDePerda: string | null }`), `pedidoDeImportacaoSchema`, `PedidoDeImportacao`, `resolucaoSchema`, `loteSchema`, `ImportacaoLida`, `LinhaLida`, `PAGINA_DA_LISTA = 20`.
- Produces (`contexto.ts`): `LinhaParaProcessar` (`{ id: string; numero: number; normalizado: DadosDaLinha; repetida_de: number | null; resolucoes: Resolucoes }`), `Importacao` (a linha de `crm_importacoes` que o motor usa), `Membro` (`{ userId: string; email: string | null; nome: string | null }`), `ContextoDaRodada`, `lerContextoDaRodada(db, importacao, membros)`, `lerContextoDoLote(db, rodada, linhas)` → `(linha: LinhaParaProcessar) => ContextoDaLinha`, `STATUS_DE_CONVERSA_EM_ANDAMENTO`.
- Produces (`banco.ts`): `ErroDaImportacao` (`codigo: "arquivo" | "mapeamento" | "origem" | "ganho" | "nao_encontrada" | "estado"`), `catalogosDaOrganizacao(sb, orgId)`, `criarImportacao(sb, admin, ctx)` → `{ id: string; total: number }`, `listarImportacoes(sb, orgId, consulta)` → `{ itens: ImportacaoLida[]; total: number }`, `lerImportacao(sb, orgId, id)` → `ImportacaoLida | null`.
- Rotas: `POST /api/v1/importacoes` (multipart: `arquivo` = o CSV; `pedido` = JSON do `PedidoDeImportacao`) → 201 `{ id, total }`; `GET /api/v1/importacoes?tipo=todas|contato|negocio&p=1` → `{ itens, total }`; `GET /api/v1/importacoes/[id]` → `ImportacaoLida`.
- Auditoria: `contacts.import_started`, `contacts.import_canceled`, `contacts.import_row_resolved`, `contacts.import_rows_resolved`.

- [ ] **Step 1: O teste dos tipos (vai falhar)**

Create `tests/unit/escale-importacao-tipos.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { pedidoDeImportacaoSchema, resolucaoSchema } from "@/lib/escale/importacao/tipos";

const base = {
  tipo: "contato",
  nivel: "conservador",
  decisoes: { MATCH_PHONE_DIFFERS: "PENDING_REVIEW" },
  mapeamento: [{ csv: "Email", para: "email" }],
  configuracao: { tags: ["feira"] },
};
const ORIGEM = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const ETAPA = "9e2a3c1b-4d5e-4f6a-9b0c-1d2e3f4a5b6c";

describe("pedido da importação (Fase 2F)", () => {
  it("contato: configuração com padrões", () => {
    expect(pedidoDeImportacaoSchema.parse(base).configuracao).toEqual({
      tags: ["feira"],
      origemId: null,
      etapaId: null,
      status: "open",
      motivoDePerda: null,
    });
  });

  it("negócio exige origem e etapa", () => {
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, tipo: "negocio" }).success).toBe(false);
    expect(
      pedidoDeImportacaoSchema.safeParse({ ...base, tipo: "negocio", configuracao: { origemId: ORIGEM, etapaId: ETAPA } }).success,
    ).toBe(true);
  });

  it("recusa motivo, ação ou destino desconhecidos", () => {
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, decisoes: { INVENTADO: "SKIP_ROW" } }).success).toBe(false);
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, decisoes: { MATCH_PHONE_DIFFERS: "VOAR" } }).success).toBe(false);
    expect(pedidoDeImportacaoSchema.safeParse({ ...base, mapeamento: [] }).success).toBe(false);
  });

  it("resolução: ação e dados opcionais", () => {
    expect(resolucaoSchema.parse({ acao: "KEEP_DB", dados: { sobrescrever: ["campo:plano"] } })).toMatchObject({ acao: "KEEP_DB" });
    expect(resolucaoSchema.safeParse({ acao: "KEEP_DB", dados: { origemId: "x" } }).success).toBe(false);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-tipos.test.ts`
Expected: FAIL (módulo não existe).

- [ ] **Step 2: Os tipos**

Create `lib/escale/importacao/tipos.ts`:

```ts
/** O pedido, a resolução e o que a tela lê das importações (fork Escale, Fase 2F). */
import { z } from "zod";

import { COLUNAS_MAX, type StatusDoNegocio } from "./linhas";
import { ACOES, MOTIVOS, NIVEIS, TIPOS_DE_IMPORTACAO, type ColunaMapeada, type Motivo, type TipoDeImportacao } from "./regras";
import type { StatusDaImportacao, StatusDaLinha } from "./textos";
import type { Detalhe, Resolucoes } from "./classificar";

export const PAGINA_DA_LISTA = 20;
const uuid = z.string().uuid();

export const configuracaoSchema = z
  .object({
    tags: z.array(z.string().trim().min(1).max(40)).max(20).default([]),
    origemId: uuid.nullable().default(null),
    etapaId: uuid.nullable().default(null),
    status: z.enum(["open", "won", "lost"]).default("open"),
    motivoDePerda: z.string().trim().min(1).max(500).nullable().default(null),
  })
  .strict();
export type Configuracao = z.infer<typeof configuracaoSchema> & { status: StatusDoNegocio };

export const pedidoDeImportacaoSchema = z
  .object({
    tipo: z.enum(TIPOS_DE_IMPORTACAO),
    nivel: z.enum([...NIVEIS, "personalizado"]),
    decisoes: z.partialRecord(z.enum(MOTIVOS), z.enum(ACOES)),
    mapeamento: z
      .array(z.object({ csv: z.string().max(200), para: z.string().min(1).max(80) }).strict())
      .min(1)
      .max(COLUNAS_MAX),
    configuracao: configuracaoSchema,
  })
  .strict()
  .refine((p) => p.tipo === "contato" || (p.configuracao.origemId !== null && p.configuracao.etapaId !== null), {
    path: ["configuracao"],
  });
export type PedidoDeImportacao = z.infer<typeof pedidoDeImportacaoSchema>;

export const resolucaoSchema = z
  .object({
    acao: z.enum(ACOES),
    dados: z
      .object({
        origemId: uuid.optional(),
        etapaId: uuid.optional(),
        sobrescrever: z.array(z.string().max(80)).max(200).optional(),
      })
      .strict()
      .optional(),
  })
  .strict();

export const loteSchema = z.object({ motivo: z.enum(MOTIVOS), acao: z.enum(ACOES) }).strict();

export interface ImportacaoLida {
  id: string;
  user_id: string;
  tipo: TipoDeImportacao;
  arquivo: string;
  nivel: string;
  status: StatusDaImportacao;
  total: number;
  importadas: number;
  revisar: number;
  puladas: number;
  erros: number;
  avisos: number;
  codigo_do_erro: string | null;
  linhas_apagadas_em: string | null;
  mapeamento: ColunaMapeada[];
  configuracao: Configuracao;
  origem_nome: string | null;
  created_at: string;
  concluida_em: string | null;
}

export interface LinhaLida {
  id: string;
  numero: number;
  status: StatusDaLinha;
  motivo: Motivo | null;
  normalizado: Record<string, unknown>;
  detalhe: Detalhe;
  resolucoes: Resolucoes;
  mensagem: string | null;
  com_aviso: boolean;
}
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-tipos.test.ts`
Expected: PASS.

- [ ] **Step 3: As leituras do lote**

Create `lib/escale/importacao/contexto.ts`:

```ts
/**
 * AS LEITURAS DE CADA RODADA E DE CADA LOTE (fork Escale, Fase 2F). A rodada lê
 * uma vez as origens, as etapas e os membros; o lote lê, para as suas 100 linhas,
 * os contatos (por ID, e-mail e telefone, sem os mesclados), as conversas de
 * WhatsApp em andamento, a empresa de cada contato e os negócios. Devolve, para
 * cada linha, o `ContextoDaLinha` que `classificar` usa.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { phoneLookupVariants } from "@/lib/channels/phone-variants";

import type {
  ContatoExistente,
  ContextoDaLinha,
  ContextoDoNegocio,
  NegocioExistente,
  Resolucoes,
} from "./classificar";
import type { DadosDaLinha, StatusDoNegocio } from "./linhas";
import type { Decisoes, TipoDeImportacao } from "./regras";
import type { Configuracao } from "./tipos";

/** "Em andamento" é o mesmo conjunto de `lib/escale/negocio/conversas.ts` (aberta, pendente, assumida, com a IA). */
export const STATUS_DE_CONVERSA_EM_ANDAMENTO = ["open", "pending", "claimed", "ai_handling"] as const;

export interface Importacao {
  id: string;
  organization_id: string;
  user_id: string;
  tipo: TipoDeImportacao;
  status: string;
  decisoes: Decisoes;
  configuracao: Configuracao;
}

export interface LinhaParaProcessar {
  id: string;
  numero: number;
  normalizado: DadosDaLinha;
  repetida_de: number | null;
  resolucoes: Resolucoes;
}

export interface Membro {
  userId: string;
  email: string | null;
  nome: string | null;
}

interface EtapaLida {
  id: string;
  nome: string;
  posicao: number;
}
export interface ContextoDaRodada {
  importacao: Importacao;
  podeGanhar: boolean;
  origens: Map<string, { nome: string; etapas: EtapaLida[] }>;
  origemPorNome: Map<string, string>;
  membroPorTexto: Map<string, string>;
}

const chave = (t: string) =>
  t
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim();

export async function lerContextoDaRodada(
  db: SupabaseClient,
  importacao: Importacao,
  membros: readonly Membro[],
): Promise<ContextoDaRodada> {
  const org = importacao.organization_id;
  const papel = await db
    .from("user_organizations")
    .select("role")
    .eq("organization_id", org)
    .eq("user_id", importacao.user_id)
    .is("revoked_at", null)
    .maybeSingle();
  if (papel.error) throw new Error(papel.error.message);

  const origens = new Map<string, { nome: string; etapas: EtapaLida[] }>();
  const origemPorNome = new Map<string, string>();
  if (importacao.tipo === "negocio") {
    const { data, error } = await db
      .from("crm_pipelines")
      .select("id, name, crm_stages(id, name, position, is_archived, is_won, is_lost)")
      .eq("organization_id", org)
      .eq("is_archived", false)
      .order("position", { ascending: true });
    if (error) throw new Error(error.message);
    for (const p of (data ?? []) as Array<{
      id: string;
      name: string;
      crm_stages: Array<{ id: string; name: string; position: number | string; is_archived: boolean; is_won: boolean; is_lost: boolean }> | null;
    }>) {
      const etapas = (p.crm_stages ?? [])
        .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
        .map((s) => ({ id: s.id, nome: s.name, posicao: Number(s.position) }))
        .sort((a, b) => a.posicao - b.posicao);
      origens.set(p.id, { nome: p.name, etapas });
      if (!origemPorNome.has(chave(p.name))) origemPorNome.set(chave(p.name), p.id);
    }
  }

  const membroPorTexto = new Map<string, string>();
  for (const m of membros) {
    if (m.email) membroPorTexto.set(chave(m.email), m.userId);
    if (m.nome && !membroPorTexto.has(chave(m.nome))) membroPorTexto.set(chave(m.nome), m.userId);
  }

  return {
    importacao,
    podeGanhar: (papel.data as { role?: string } | null)?.role === "admin",
    origens,
    origemPorNome,
    membroPorTexto,
  };
}

type ContatoLido = {
  id: string;
  name: string | null;
  display_name: string | null;
  email: string | null;
  phone_number: string | null;
  birthdate: string | null;
  custom_fields: Record<string, unknown> | null;
  tags: string[] | null;
  person_id: string | null;
};
const COLUNAS_DO_CONTATO = "id, name, display_name, email, phone_number, birthdate, custom_fields, tags, person_id";

const unicos = <T>(lista: Array<T | null | undefined>) => [...new Set(lista.filter((x): x is T => x !== null && x !== undefined))];

async function contatosPor(db: SupabaseClient, org: string, coluna: "id" | "email_normalized" | "phone_number", valores: string[]) {
  if (valores.length === 0) return [] as ContatoLido[];
  const { data, error } = await db
    .from("contacts")
    .select(COLUNAS_DO_CONTATO)
    .eq("organization_id", org)
    .is("is_merged_into", null)
    .in(coluna, valores);
  if (error) throw new Error(error.message);
  return (data ?? []) as ContatoLido[];
}

export async function lerContextoDoLote(
  db: SupabaseClient,
  rodada: ContextoDaRodada,
  linhas: readonly LinhaParaProcessar[],
): Promise<(linha: LinhaParaProcessar) => ContextoDaLinha> {
  const imp = rodada.importacao;
  const org = imp.organization_id;
  const dados = linhas.map((l) => l.normalizado);

  const [porIdLidos, porEmailLidos, porTelefoneLidos] = await Promise.all([
    contatosPor(db, org, "id", unicos(dados.map((d) => d.id))),
    contatosPor(db, org, "email_normalized", unicos(dados.map((d) => d.email))),
    contatosPor(db, org, "phone_number", unicos(dados.flatMap((d) => (d.telefone ? phoneLookupVariants(d.telefone) : [])))),
  ]);
  const todos = new Map<string, ContatoLido>();
  for (const c of [...porIdLidos, ...porEmailLidos, ...porTelefoneLidos]) todos.set(c.id, c);
  const ids = [...todos.keys()];

  // A empresa de cada contato: o vínculo principal, senão o mais antigo (2D N4).
  const pessoas = unicos([...todos.values()].map((c) => c.person_id));
  const empresaDaPessoa = new Map<string, string>();
  const nomeDaEmpresa = new Map<string, string | null>();
  if (pessoas.length > 0) {
    const v = await db
      .from("company_people")
      .select("company_id, person_id, is_primary, created_at")
      .eq("organization_id", org)
      .in("person_id", pessoas)
      .order("is_primary", { ascending: false })
      .order("created_at", { ascending: true });
    if (v.error) throw new Error(v.error.message);
    for (const l of (v.data ?? []) as Array<{ company_id: string; person_id: string }>) {
      if (!empresaDaPessoa.has(l.person_id)) empresaDaPessoa.set(l.person_id, l.company_id);
    }
    const empresas = unicos([...empresaDaPessoa.values()]);
    if (empresas.length > 0) {
      const e = await db.from("companies").select("id, trade_name, legal_name").eq("organization_id", org).in("id", empresas);
      if (e.error) throw new Error(e.error.message);
      for (const c of (e.data ?? []) as Array<{ id: string; trade_name: string | null; legal_name: string | null }>) {
        nomeDaEmpresa.set(c.id, c.trade_name ?? c.legal_name ?? null);
      }
    }
  }

  const comWhatsapp = new Set<string>();
  if (ids.length > 0) {
    const w = await db
      .from("conversations")
      .select("contact_id")
      .eq("organization_id", org)
      .eq("channel", "whatsapp")
      .in("status", [...STATUS_DE_CONVERSA_EM_ANDAMENTO])
      .in("contact_id", ids);
    if (w.error) throw new Error(w.error.message);
    for (const c of (w.data ?? []) as Array<{ contact_id: string }>) comWhatsapp.add(c.contact_id);
  }

  const existente = (c: ContatoLido | undefined): ContatoExistente | null => {
    if (!c) return null;
    const campos = c.custom_fields ?? {};
    const empresaId = c.person_id ? empresaDaPessoa.get(c.person_id) : undefined;
    return {
      id: c.id,
      nome: c.name ?? c.display_name ?? null,
      email: c.email,
      telefone: c.phone_number,
      instagram: typeof campos.link_instagram === "string" ? campos.link_instagram : null,
      nascimento: c.birthdate,
      campos,
      tags: c.tags ?? [],
      empresa: empresaId ? { id: empresaId, nome: nomeDaEmpresa.get(empresaId) ?? null } : null,
    };
  };
  const porEmail = new Map(porEmailLidos.map((c) => [String(c.email ?? "").toLowerCase().trim(), c]));
  const porTelefone = new Map<string, ContatoLido>();
  for (const c of porTelefoneLidos) for (const v of phoneLookupVariants(c.phone_number ?? "")) porTelefone.set(v, c);
  const porId = new Map(porIdLidos.map((c) => [c.id, c]));

  let negocio: ((l: LinhaParaProcessar) => ContextoDoNegocio) | null = null;
  if (imp.tipo === "negocio") {
    const idsDeNegocio = unicos(dados.map((d) => d.negocio?.id ?? null));
    const negociosPorId = new Map<string, NegocioExistente>();
    if (idsDeNegocio.length > 0) {
      const n = await db.from("crm_leads").select("id, title, pipeline_id, custom_fields").eq("organization_id", org).in("id", idsDeNegocio);
      if (n.error) throw new Error(n.error.message);
      for (const l of (n.data ?? []) as Array<{ id: string; title: string; pipeline_id: string; custom_fields: Record<string, unknown> | null }>) {
        negociosPorId.set(l.id, { id: l.id, titulo: l.title, origemId: l.pipeline_id, campos: l.custom_fields ?? {} });
      }
    }
    const abertos: Array<NegocioExistente & { contatoId: string }> = [];
    if (ids.length > 0) {
      const a = await db
        .from("crm_leads")
        .select("id, title, pipeline_id, contact_id, custom_fields")
        .eq("organization_id", org)
        .eq("status", "open")
        .in("contact_id", ids)
        .order("created_at", { ascending: true });
      if (a.error) throw new Error(a.error.message);
      for (const l of (a.data ?? []) as Array<{ id: string; title: string; pipeline_id: string; contact_id: string; custom_fields: Record<string, unknown> | null }>) {
        abertos.push({ id: l.id, titulo: l.title, origemId: l.pipeline_id, contatoId: l.contact_id, campos: l.custom_fields ?? {} });
      }
    }
    const cfg = imp.configuracao;
    const padrao = {
      origemId: cfg.origemId ?? "",
      etapaId: cfg.etapaId ?? "",
      status: cfg.status as StatusDoNegocio,
      motivoDePerda: cfg.motivoDePerda,
    };
    negocio = (l) => ({
      porId: l.normalizado.negocio?.id ? (negociosPorId.get(l.normalizado.negocio.id) ?? null) : null,
      abertoNaOrigem: (contatoId, origemId) => abertos.find((n) => n.contatoId === contatoId && n.origemId === origemId) ?? null,
      origemPorNome: (nome) => rodada.origemPorNome.get(chave(nome)) ?? null,
      etapaPorNome: (origemId, nome) => rodada.origens.get(origemId)?.etapas.find((e) => chave(e.nome) === chave(nome))?.id ?? null,
      primeiraEtapa: (origemId) => rodada.origens.get(origemId)?.etapas[0]?.id ?? null,
      donoPorTexto: (texto) => rodada.membroPorTexto.get(chave(texto)) ?? null,
      padrao,
    });
  }

  return (l) => {
    const d = l.normalizado;
    const telefoneAchado = d.telefone ? phoneLookupVariants(d.telefone).map((v) => porTelefone.get(v)).find(Boolean) : undefined;
    return {
      tipo: imp.tipo,
      porId: d.id ? existente(porId.get(d.id)) : null,
      porEmail: d.email ? existente(porEmail.get(d.email)) : null,
      porTelefone: existente(telefoneAchado),
      whatsappAtivo: (id) => comWhatsapp.has(id),
      tagsDaImportacao: imp.configuracao.tags,
      negocio: negocio ? negocio(l) : null,
    };
  };
}
```

- [ ] **Step 4: O banco — criar, listar e ler**

Create `lib/escale/importacao/banco.ts`:

```ts
/**
 * AS ESCRITAS E LEITURAS DAS IMPORTAÇÕES (fork Escale, Fase 2F). Leitura pela
 * sessão (a RLS só deixa gerente+); escrita pelo service role, sempre depois de
 * a rota conferir o papel e com a organização da sessão.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { lerCatalogo } from "@/lib/escale/campos/banco";

import type { CatalogosDaImportacao } from "./mapeamento";
import { definicoesDosCatalogos, lerPlanilha, marcarRepetidas, normalizarLinha } from "./linhas";
import { PAGINA_DA_LISTA, type ImportacaoLida, type PedidoDeImportacao } from "./tipos";

export class ErroDaImportacao extends Error {
  constructor(
    public readonly codigo: "arquivo" | "mapeamento" | "origem" | "ganho" | "nao_encontrada" | "estado",
    mensagem: string,
  ) {
    super(mensagem);
  }
}

const LOTE_DE_GRAVACAO = 1000;
const COLUNAS_DA_IMPORTACAO =
  "id, user_id, tipo, arquivo, nivel, status, total, importadas, revisar, puladas, erros, avisos, codigo_do_erro, linhas_apagadas_em, mapeamento, configuracao, created_at, concluida_em";

export async function catalogosDaOrganizacao(sb: SupabaseClient, orgId: string): Promise<CatalogosDaImportacao> {
  const [contato, empresa, negocio] = await Promise.all([
    lerCatalogo(sb, orgId, "contato"),
    lerCatalogo(sb, orgId, "empresa"),
    lerCatalogo(sb, orgId, "negocio"),
  ]);
  return { contato, empresa, negocio };
}

/** A origem e a etapa da configuração são da organização, não arquivadas, e a etapa é aberta. */
async function conferirDestino(sb: SupabaseClient, orgId: string, pedido: PedidoDeImportacao) {
  if (pedido.tipo !== "negocio") return;
  const { origemId, etapaId } = pedido.configuracao;
  const { data } = await sb
    .from("crm_stages")
    .select("id, pipeline_id, is_archived, is_won, is_lost, crm_pipelines!inner(is_archived)")
    .eq("organization_id", orgId)
    .eq("id", etapaId ?? "")
    .maybeSingle();
  const e = data as { pipeline_id: string; is_archived: boolean; is_won: boolean; is_lost: boolean; crm_pipelines: { is_archived: boolean } } | null;
  if (!e || e.pipeline_id !== origemId || e.is_archived || e.is_won || e.is_lost || e.crm_pipelines.is_archived) {
    throw new ErroDaImportacao("origem", "Selecione a etapa para continuar.");
  }
}

export async function criarImportacao(
  sb: SupabaseClient,
  admin: SupabaseClient,
  ctx: { orgId: string; userId: string; papel: string; pedido: PedidoDeImportacao; nomeDoArquivo: string; bytes: Uint8Array },
): Promise<{ id: string; total: number }> {
  const { orgId, userId, pedido } = ctx;
  if (pedido.tipo === "negocio" && pedido.configuracao.status === "won" && ctx.papel !== "admin") {
    throw new ErroDaImportacao("ganho", "Só administrador importa negócio ganho.");
  }
  await conferirDestino(sb, orgId, pedido);

  const lida = lerPlanilha(ctx.bytes);
  if ("erro" in lida) throw new ErroDaImportacao("arquivo", lida.erro);
  const mesmoCabecalho =
    lida.cabecalho.length === pedido.mapeamento.length && lida.cabecalho.every((c, i) => c === pedido.mapeamento[i]?.csv);
  if (!mesmoCabecalho) throw new ErroDaImportacao("mapeamento", "O arquivo mudou. Escolha o arquivo de novo.");

  const definicoes = definicoesDosCatalogos(await catalogosDaOrganizacao(sb, orgId));
  const normalizadas = lida.linhas.map((celulas) => normalizarLinha(celulas, pedido.mapeamento, pedido.tipo, definicoes));
  const repetidas = marcarRepetidas(normalizadas);

  const criada = await admin
    .from("crm_importacoes")
    .insert({
      organization_id: orgId,
      user_id: userId,
      tipo: pedido.tipo,
      arquivo: ctx.nomeDoArquivo.slice(0, 200) || "arquivo.csv",
      mapeamento: pedido.mapeamento,
      configuracao: pedido.configuracao,
      decisoes: pedido.decisoes,
      nivel: pedido.nivel,
    })
    .select("id")
    .single();
  if (criada.error) throw criada.error;
  const id = (criada.data as { id: string }).id;

  try {
    for (let i = 0; i < lida.linhas.length; i += LOTE_DE_GRAVACAO) {
      const lote = lida.linhas.slice(i, i + LOTE_DE_GRAVACAO).map((celulas, j) => {
        const k = i + j;
        const repetida = repetidas[k];
        return {
          importacao_id: id,
          organization_id: orgId,
          numero: k + 2,
          bruto: celulas,
          normalizado: normalizadas[k],
          repetida_de: repetida === null ? null : repetida + 2,
        };
      });
      const { error } = await admin.from("crm_importacoes_linhas").insert(lote);
      if (error) throw error;
    }
    await admin.rpc("fn_escale_limpar_linhas_antigas", { p_org: orgId });
    const fila = await admin.rpc("fn_escale_enfileirar_importacao", { p_importacao: id });
    if (fila.error) throw fila.error;
    return { id, total: Number(fila.data) };
  } catch (err) {
    await admin.from("crm_importacoes").delete().eq("id", id);
    throw err;
  }
}

export async function listarImportacoes(
  sb: SupabaseClient,
  orgId: string,
  consulta: { tipo: "todas" | "contato" | "negocio"; pagina: number },
): Promise<{ itens: ImportacaoLida[]; total: number }> {
  const de = (consulta.pagina - 1) * PAGINA_DA_LISTA;
  let q = sb
    .from("crm_importacoes")
    .select(COLUNAS_DA_IMPORTACAO, { count: "exact" })
    .eq("organization_id", orgId)
    .neq("status", "preparando")
    .order("created_at", { ascending: false })
    .range(de, de + PAGINA_DA_LISTA - 1);
  if (consulta.tipo !== "todas") q = q.eq("tipo", consulta.tipo);
  const { data, error, count } = await q;
  if (error) throw error;
  const itens = (data ?? []) as unknown as ImportacaoLida[];
  const origens = [...new Set(itens.map((i) => i.configuracao?.origemId).filter((x): x is string => !!x))];
  const nomes = new Map<string, string>();
  if (origens.length > 0) {
    const o = await sb.from("crm_pipelines").select("id, name").eq("organization_id", orgId).in("id", origens);
    for (const p of (o.data ?? []) as Array<{ id: string; name: string }>) nomes.set(p.id, p.name);
  }
  return {
    itens: itens.map((i) => ({ ...i, origem_nome: i.configuracao?.origemId ? (nomes.get(i.configuracao.origemId) ?? null) : null })),
    total: count ?? 0,
  };
}

export async function lerImportacao(sb: SupabaseClient, orgId: string, id: string): Promise<ImportacaoLida | null> {
  const { data, error } = await sb.from("crm_importacoes").select(COLUNAS_DA_IMPORTACAO).eq("organization_id", orgId).eq("id", id).maybeSingle();
  if (error) throw error;
  if (!data) return null;
  const i = data as unknown as ImportacaoLida;
  let origem_nome: string | null = null;
  if (i.configuracao?.origemId) {
    const o = await sb.from("crm_pipelines").select("name").eq("organization_id", orgId).eq("id", i.configuracao.origemId).maybeSingle();
    origem_nome = (o.data as { name?: string } | null)?.name ?? null;
  }
  return { ...i, origem_nome };
}
```

- [ ] **Step 5: As rotas de criar, listar e ler**

Create `app/api/v1/importacoes/route.ts`:

```ts
/**
 * POST/GET /api/v1/importacoes — criar uma importação de contatos ou negócios e
 * listar as da organização (fork Escale, Fase 2F; migration 9107). Gerente ou
 * acima (PRD §5). O POST é multipart: `arquivo` (o CSV, até 25 MB) e `pedido`
 * (o JSON do assistente). As linhas ficam gravadas e o consumidor do `event_log`
 * importa em segundo plano.
 */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, criarImportacao, listarImportacoes } from "@/lib/escale/importacao/banco";
import { ARQUIVO_MAX_BYTES } from "@/lib/escale/importacao/linhas";
import { pedidoDeImportacaoSchema } from "@/lib/escale/importacao/tipos";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const ROTA = "/api/v1/importacoes";

export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const recusa = (texto: string) => fail("unprocessable_entity", t(texto), 422, { requestId });

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return recusa("Selecione um arquivo .CSV válido.");
  }
  const arquivo = form.get("arquivo");
  const textoDoPedido = form.get("pedido");
  if (!(arquivo instanceof File) || typeof textoDoPedido !== "string") return recusa("Selecione um arquivo .CSV válido.");
  if (arquivo.size > ARQUIVO_MAX_BYTES) return recusa("O arquivo passa de 25 MB.");
  let json: unknown;
  try {
    json = JSON.parse(textoDoPedido);
  } catch {
    return recusa("Não foi possível iniciar a importação.");
  }
  const lido = pedidoDeImportacaoSchema.safeParse(json);
  if (!lido.success) return recusa("Não foi possível iniciar a importação.");

  const orgId = authz.org.orgId;
  try {
    const resultado = await criarImportacao(await createClient(), createAdminClient(), {
      orgId,
      userId: authz.user.id,
      papel: authz.org.role,
      pedido: lido.data,
      nomeDoArquivo: arquivo.name,
      bytes: new Uint8Array(await arquivo.arrayBuffer()),
    });
    void audit({
      action: "contacts.import_started",
      actorUserId: authz.user.id,
      organizationId: orgId,
      resourceType: "crm_importacao",
      resourceId: resultado.id,
      requestId,
      metadata: { tipo: lido.data.tipo, nivel: lido.data.nivel, total: resultado.total },
    });
    return ok(resultado, { status: 201 });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return recusa(err.message);
    return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "criar" }, t, requestId);
  }
}

export async function GET(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const tipoLido = req.nextUrl.searchParams.get("tipo");
  const tipo = tipoLido === "contato" || tipoLido === "negocio" ? tipoLido : "todas";
  const pagina = Math.max(1, Math.min(10_000, Number(req.nextUrl.searchParams.get("p")) || 1));
  try {
    return ok(await listarImportacoes(await createClient(), authz.org.orgId, { tipo, pagina }));
  } catch (err) {
    return falhaInesperadaDoQuadro(err, { rota: ROTA, operacao: "listar" }, t, requestId);
  }
}
```

Create `app/api/v1/importacoes/[id]/route.ts`:

```ts
/** GET /api/v1/importacoes/[id] — uma importação (fork Escale, Fase 2F). Gerente ou acima. */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { lerImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!UUID.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  try {
    const importacao = await lerImportacao(await createClient(), authz.org.orgId, id);
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    return ok(importacao);
  } catch (err) {
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/[id]", operacao: "ler" }, t, requestId);
  }
}
```

Em `lib/audit/actions.ts`, logo depois de `"companies.primary_changed",`:

```ts
  // FORK ESCALE · Fase 2F: importar contatos e negócios (migration 9107).
  "contacts.import_started",
  "contacts.import_canceled",
  "contacts.import_row_resolved",
  "contacts.import_rows_resolved",
```

Se a cerca `audit-lista-do-painel-e-derivada` pedir o rótulo da ação no painel de auditoria, acrescente os quatro rótulos onde a 2D acrescentou os dela ("Importação iniciada", "Importação cancelada", "Linha da importação resolvida", "Linhas da importação resolvidas").

- [ ] **Step 6: O teste da rota (vai falhar antes do Step 5)**

Create `tests/unit/escale-importacoes-rota.test.ts` no molde de `tests/unit/escale-acoes-em-massa-rotas.test.ts` (o mesmo `vi.mock` de `@/lib/auth/require-role`, `@/lib/impersonate/support`, `@/lib/supabase/server`, `@/lib/supabase/admin` e `@/lib/audit`), com estes casos:

```ts
import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/impersonate/support", () => ({ requireSupportWrite: vi.fn(async () => null) }));
vi.mock("@/lib/audit", () => ({ audit: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn(async () => ({})) }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: vi.fn(() => ({})) }));
vi.mock("@/lib/auth/require-role", () => ({ requireRole: vi.fn() }));
vi.mock("@/lib/escale/importacao/banco", async (original) => ({
  ...(await original<typeof import("@/lib/escale/importacao/banco")>()),
  criarImportacao: vi.fn(async () => ({ id: "imp-1", total: 2 })),
  listarImportacoes: vi.fn(async () => ({ itens: [], total: 0 })),
}));

import { POST, GET } from "@/app/api/v1/importacoes/route";
import { requireRole } from "@/lib/auth/require-role";
import { criarImportacao, ErroDaImportacao } from "@/lib/escale/importacao/banco";

const autorizado = (role = "manager") =>
  vi.mocked(requireRole).mockResolvedValue({
    ok: true,
    user: { id: "u-1", idioma: "pt-BR" },
    org: { orgId: "org-1", role },
  } as never);

const pedido = {
  tipo: "contato",
  nivel: "conservador",
  decisoes: {},
  mapeamento: [{ csv: "Email", para: "email" }],
  configuracao: {},
};
const requisicao = (corpo: { arquivo?: File; pedido?: string }) => {
  const form = new FormData();
  if (corpo.arquivo) form.append("arquivo", corpo.arquivo);
  if (corpo.pedido) form.append("pedido", corpo.pedido);
  return new NextRequest("http://x/api/v1/importacoes", { method: "POST", body: form });
};
const csv = () => new File(["Email\na@x.com\n"], "a.csv", { type: "text/csv" });

describe("POST /api/v1/importacoes (Fase 2F)", () => {
  beforeEach(() => vi.clearAllMocks());

  it("gerente cria: 201 com id e total", async () => {
    autorizado();
    const res = await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }));
    expect(res.status).toBe(201);
    expect((await res.json()).data).toEqual({ id: "imp-1", total: 2 });
    expect(vi.mocked(criarImportacao).mock.calls[0][2]).toMatchObject({ orgId: "org-1", userId: "u-1", nomeDoArquivo: "a.csv" });
  });

  it("atendente: o 403 do requireRole", async () => {
    vi.mocked(requireRole).mockResolvedValue({ ok: false, response: new Response(null, { status: 403 }) } as never);
    expect((await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }))).status).toBe(403);
  });

  it("sem arquivo, pedido inválido ou erro da importação: 422", async () => {
    autorizado();
    expect((await POST(requisicao({ pedido: JSON.stringify(pedido) }))).status).toBe(422);
    expect((await POST(requisicao({ arquivo: csv(), pedido: "{" }))).status).toBe(422);
    vi.mocked(criarImportacao).mockRejectedValueOnce(new ErroDaImportacao("arquivo", "O arquivo não tem linhas para importar."));
    const res = await POST(requisicao({ arquivo: csv(), pedido: JSON.stringify(pedido) }));
    expect(res.status).toBe(422);
    expect((await res.json()).error.message).toBe("O arquivo não tem linhas para importar.");
  });

  it("GET lista com o tipo e a página", async () => {
    autorizado();
    const res = await GET(new NextRequest("http://x/api/v1/importacoes?tipo=negocio&p=2"));
    expect(res.status).toBe(200);
  });
});
```

Confira o formato do erro de `fail` (`{ error: { message } }`) em `lib/api/wrappers.ts` e ajuste só o caminho do `message` se for outro.

- [ ] **Step 7: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-tipos.test.ts tests/unit/escale-importacoes-rota.test.ts
corepack pnpm exec eslint lib/escale/importacao app/api/v1/importacoes tests/unit/escale-importacao-tipos.test.ts tests/unit/escale-importacoes-rota.test.ts
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add lib/escale/importacao app/api/v1/importacoes lib/audit/actions.ts tests/unit/escale-importacao-tipos.test.ts tests/unit/escale-importacoes-rota.test.ts
git commit -m "feat(escale): criar e listar importações — pedido, leituras do lote e rotas (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 7: O consumidor — gravar o plano e processar as linhas em segundo plano

**Files:**
- Create: `lib/escale/importacao/aplicar.ts`, `lib/escale/importacao/executar.ts`, `lib/escale/importacao/handler.ts`, `tests/unit/escale-importacao-executar.test.ts`
- Modify: `lib/event-log/register-handlers.ts` (logo depois de `acaoEmMassaHandler`), `lib/escale/notificacoes/avisos-da-origem.handler.ts` (N11), `tests/unit/escale-avisos-da-origem-handler.test.ts`

**Interfaces:**
- Consumes: `classificar`, `Plano` (Task 4); `lerContextoDaRodada`, `lerContextoDoLote`, `Importacao`, `LinhaParaProcessar`, `Membro`, `ContextoDaRodada` (Task 6); `patchContactHandler` (`app/api/v1/contacts/_handler.ts`), `createLeadHandler` e `updateLeadHandler` (`app/api/v1/leads/_handler.ts`), `encerraDemanda` (`lib/leads/encerramento.ts`), `camposCpfParaGravar` (`lib/contacts/cpf.ts`), `ORIGEM_DA_PLANILHA` (`lib/leads/planilha.ts`); `EventHandler`, `EventRow`, `HandlerResult` (`lib/event-log/dispatcher.ts`).
- Produces (`aplicar.ts`): `ErroDaLinha`, `DependenciasDaGravacao`, `ImportacaoQueGrava` (`{ id; organization_id; user_id; podeGanhar: boolean }`), `gravarPlano(deps, ctx, imp, plano)` → `{ contatoId: string; negocioId: string | null }`.
- Produces (`executar.ts`): `CONSUMIDOR_DA_IMPORTACAO = "escale-importacao.v1"`, `EVENTO_DA_IMPORTACAO = "contatos.importacao_requested"`, `LOTE = 100`, `ORCAMENTO_MS = 20_000`, `MENSAGEM_DA_INTERROMPIDA`, `Dependencias` (estende `DependenciasDaGravacao` com `agora()` e `lerMembros(orgId)`), `processarLinhas(deps, rodada, linhas)`, `processarImportacao(row, deps)` → `HandlerResult`, `contarImportacao(deps, id)` → `Promise<string>` (o status).
- Produces (`handler.ts`): `importacaoHandler: EventHandler`, `dependenciasReais(db)` → `Dependencias`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-executar.test.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";
import { describe, expect, it, vi } from "vitest";

import { ErroDaLinha, gravarPlano, type DependenciasDaGravacao } from "@/lib/escale/importacao/aplicar";
import type { Plano } from "@/lib/escale/importacao/classificar";
import type { ContextoDaRodada, LinhaParaProcessar } from "@/lib/escale/importacao/contexto";
import { processarLinhas, type Dependencias } from "@/lib/escale/importacao/executar";
import { normalizarLinha } from "@/lib/escale/importacao/linhas";
import { decisoesDoNivel } from "@/lib/escale/importacao/regras";

type Resposta = { data: unknown; error: null };
type Chamada = { alvo: string; op: string; valor?: unknown };

/** Um cliente de mentira: anota insert/update/rpc e responde o mínimo que o motor lê. */
function bancoFalso() {
  const chamadas: Chamada[] = [];
  const r = (data: unknown): Resposta => ({ data, error: null });
  const consulta = (alvo: string) => {
    const q: Record<string, unknown> = {};
    for (const m of ["select", "eq", "in", "is", "order", "limit", "neq"]) q[m] = () => q;
    q.insert = (valor: unknown) => {
      chamadas.push({ alvo, op: "insert", valor });
      return q;
    };
    q.update = (valor: unknown) => {
      chamadas.push({ alvo, op: "update", valor });
      return q;
    };
    q.single = async () => r(alvo === "contacts" ? { id: "novo-1" } : null);
    q.maybeSingle = async () =>
      r(alvo === "companies" ? { city: null, state: "SP", cnpj: null, custom_fields: {} } : { custom_fields: { antigo: 1 } });
    q.then = (seguir: (x: Resposta) => unknown) => seguir(r(null));
    return q;
  };
  const rpc = async (nome: string, args: unknown) => {
    chamadas.push({ alvo: nome, op: "rpc", valor: args });
    return r(nome === "fn_escale_empresa_da_importacao" ? "emp-1" : null);
  };
  return { chamadas, db: { from: consulta, rpc } as unknown as SupabaseClient };
}

function deps(db: SupabaseClient): Dependencias {
  return {
    db,
    agora: () => 0,
    lerMembros: async () => [],
    mudarContato: vi.fn(async () => ({})),
    criarNegocio: vi.fn(async () => ({ id: "neg-1" })),
    mudarNegocio: vi.fn(async () => ({})),
    encerrar: vi.fn(async () => ({})),
    cpf: vi.fn(async () => ({ cpf_hash: "h", cpf_encrypted: new Uint8Array([1]) })),
  };
}
const ctx = { organization_id: "org-1", actor: { type: "user" as const, id: "u-1" }, requestId: "imp-1" };
const imp = { id: "imp-1", organization_id: "org-1", user_id: "u-1", podeGanhar: false };
const criar = (extra: Partial<Plano> = {}): Plano => ({
  contato: {
    tipo: "criar",
    dados: { nome: "Ana", email: "ana@x.com", telefone: null, instagram: "https://instagram.com/ana", nascimento: null, cpf: "12345678909", campos: {}, tags: ["feira"] },
  },
  empresa: null,
  negocio: null,
  ...extra,
});

describe("gravar o plano (Fase 2F)", () => {
  it("contato novo: insert como o importador do original e o evento contact.created", async () => {
    const { chamadas, db } = bancoFalso();
    const r = await gravarPlano(deps(db) as DependenciasDaGravacao, ctx, imp, criar());
    expect(r).toEqual({ contatoId: "novo-1", negocioId: null });
    expect(chamadas.find((c) => c.alvo === "contacts" && c.op === "insert")?.valor).toMatchObject({
      organization_id: "org-1",
      created_by_user_id: "u-1",
      name: "Ana",
      email: "ana@x.com",
      tags: ["feira"],
      custom_fields: { link_instagram: "https://instagram.com/ana" },
      source: "import_csv",
      source_metadata: { importacao_id: "imp-1" },
      cpf_hash: "h",
    });
    expect(chamadas.find((c) => c.alvo === "emit_event")?.valor).toMatchObject({ p_event_type: "contact.created", p_entity_id: "novo-1" });
  });

  it("contato existente: PATCH com o custom_fields inteiro", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    await gravarPlano(d, ctx, imp, {
      contato: { tipo: "atualizar", id: "c-1", mudancas: { campos: { plano: "ouro" }, instagram: "https://instagram.com/x", tags: ["a", "b"] } },
      empresa: null,
      negocio: null,
    });
    expect(d.mudarContato).toHaveBeenCalledWith(ctx, "c-1", {
      tags: ["a", "b"],
      custom_fields: { antigo: 1, plano: "ouro", link_instagram: "https://instagram.com/x" },
    });
  });

  it("empresa: acha ou cria pela função e só preenche os vazios", async () => {
    const { chamadas, db } = bancoFalso();
    await gravarPlano(deps(db), ctx, imp, criar({ empresa: { nome: "Acme", cnpj: null, campos: { cidade: "Goiânia", estado: "GO", segmento: "Varejo" } } }));
    expect(chamadas.find((c) => c.alvo === "fn_escale_empresa_da_importacao")?.valor).toMatchObject({
      p_org: "org-1",
      p_contato: "novo-1",
      p_nome: "Acme",
    });
    expect(chamadas.find((c) => c.alvo === "companies" && c.op === "update")?.valor).toEqual({
      city: "Goiânia",
      custom_fields: { segmento: "Varejo" },
    });
  });

  it("negócio ganho sem ser admin: erro antes de gravar qualquer coisa", async () => {
    const { chamadas, db } = bancoFalso();
    const plano = criar({
      negocio: { tipo: "criar", origemId: "o", etapaId: "e", titulo: "X", valorCentavos: null, donoId: null, campos: {}, status: "won", motivoDePerda: null, ganhoEm: null },
    });
    await expect(gravarPlano(deps(db), ctx, imp, plano)).rejects.toBeInstanceOf(ErroDaLinha);
    expect(chamadas).toEqual([]);
  });

  it("negócio perdido: cria pela planilha e encerra com o motivo", async () => {
    const { db } = bancoFalso();
    const d = deps(db);
    const r = await gravarPlano(d, ctx, imp, criar({
      negocio: { tipo: "criar", origemId: "o", etapaId: "e", titulo: "A", valorCentavos: 100, donoId: null, campos: {}, status: "lost", motivoDePerda: "other", ganhoEm: null },
    }));
    expect(r.negocioId).toBe("neg-1");
    expect(d.criarNegocio).toHaveBeenCalledWith(ctx, expect.objectContaining({
      pipeline_id: "o",
      stage_id: "e",
      title: "Novo negócio",
      contact_id: "novo-1",
      source: "importacao_planilha",
      via_planilha: true,
    }));
    expect(d.encerrar).toHaveBeenCalledWith(ctx, { leadId: "neg-1", desfecho: "lost", motivo: "other" });
  });
});

describe("processar as linhas (Fase 2F)", () => {
  const defs = { contato: {}, empresa: {}, negocio: {} };
  const linha = (id: string, celulas: string[], repetida: number | null = null): LinhaParaProcessar => ({
    id,
    numero: 2,
    normalizado: normalizarLinha(celulas, [{ csv: "n", para: "name" }, { csv: "e", para: "email" }], "contato", defs),
    repetida_de: repetida,
    resolucoes: {},
  });
  const rodada: ContextoDaRodada = {
    importacao: {
      id: "imp-1",
      organization_id: "org-1",
      user_id: "u-1",
      tipo: "contato",
      status: "importando",
      decisoes: decisoesDoNivel("conservador"),
      configuracao: { tags: [], origemId: null, etapaId: null, status: "open", motivoDePerda: null },
    },
    podeGanhar: false,
    origens: new Map(),
    origemPorNome: new Map(),
    membroPorTexto: new Map(),
  };

  it("importa a nova e pula a repetida, gravando o desfecho de cada linha", async () => {
    const { chamadas, db } = bancoFalso();
    await processarLinhas(deps(db), rodada, [linha("l-1", ["Ana", "ana@x.com"]), linha("l-2", ["Ana", "ana@x.com"], 2)]);
    const desfechos = chamadas.filter((c) => c.alvo === "crm_importacoes_linhas" && c.op === "update").map((c) => c.valor);
    expect(desfechos[0]).toMatchObject({ status: "importada", contato_id: "novo-1", com_aviso: false });
    expect(desfechos[1]).toMatchObject({ status: "pulada", motivo: "DUPLICATE_IN_BATCH" });
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-executar.test.ts`
Expected: FAIL (módulos não existem).

- [ ] **Step 2: Gravar o plano**

Create `lib/escale/importacao/aplicar.ts`:

```ts
/**
 * GRAVAR O PLANO DE UMA LINHA (fork Escale, Fase 2F). Contato novo como o
 * importador do original (insert direto, `source: "import_csv"`, o evento
 * `contact.created`, sem abrir conversa); contato existente pelo PATCH do
 * original (eventos e auditoria); a empresa pela função da 9107; o negócio pelo
 * `createLeadHandler` (via planilha) e o `encerraDemanda` (ganho e perda).
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import type { HandlerCtx } from "@/lib/api/handlers/types";
import { ORIGEM_DA_PLANILHA } from "@/lib/leads/planilha";

import type { Plano, PlanoDaEmpresa, PlanoDoContato, PlanoDoNegocio } from "./classificar";

export class ErroDaLinha extends Error {}

export interface DependenciasDaGravacao {
  db: SupabaseClient;
  mudarContato: (ctx: HandlerCtx, id: string, patch: Record<string, unknown>) => Promise<unknown>;
  criarNegocio: (ctx: HandlerCtx, input: Record<string, unknown>) => Promise<Record<string, unknown>>;
  mudarNegocio: (ctx: HandlerCtx, id: string, input: Record<string, unknown>) => Promise<unknown>;
  encerrar: (ctx: HandlerCtx, input: { leadId: string; desfecho: "won" | "lost"; motivo: string | null }) => Promise<unknown>;
  cpf: (cpf: string) => Promise<Record<string, unknown>>;
}

export interface ImportacaoQueGrava {
  id: string;
  organization_id: string;
  user_id: string;
  podeGanhar: boolean;
}

const vazio = (v: unknown) => v === null || v === undefined || v === "" || (Array.isArray(v) && v.length === 0);
const SOURCE = "import_csv";

async function camposAtuais(deps: DependenciasDaGravacao, tabela: "contacts" | "crm_leads", org: string, id: string) {
  const { data, error } = await deps.db.from(tabela).select("custom_fields").eq("organization_id", org).eq("id", id).maybeSingle();
  if (error) throw new ErroDaLinha(error.message);
  return ((data as { custom_fields?: Record<string, unknown> | null } | null)?.custom_fields ?? {}) as Record<string, unknown>;
}

async function gravarContato(deps: DependenciasDaGravacao, ctx: HandlerCtx, imp: ImportacaoQueGrava, plano: PlanoDoContato): Promise<string> {
  const org = imp.organization_id;
  if (plano.tipo === "criar") {
    const d = plano.dados;
    const linha: Record<string, unknown> = {
      organization_id: org,
      created_by_user_id: imp.user_id,
      name: d.nome,
      email: d.email,
      phone_number: d.telefone,
      birthdate: d.nascimento,
      tags: d.tags,
      custom_fields: { ...d.campos, ...(d.instagram ? { link_instagram: d.instagram } : {}) },
      source: SOURCE,
      source_metadata: { importacao_id: imp.id },
      consent: {},
    };
    if (d.cpf) Object.assign(linha, await deps.cpf(d.cpf));
    const { data, error } = await deps.db.from("contacts").insert(linha).select("id").single();
    if (error) {
      throw new ErroDaLinha(
        error.code === "23505" ? "Contato já cadastrado com este e-mail, telefone ou CPF." : error.message,
      );
    }
    const id = String((data as { id: string }).id);
    await deps.db.rpc("emit_event", {
      p_event_type: "contact.created",
      p_entity_kind: "contact",
      p_entity_id: id,
      p_payload: { source: SOURCE, has_email: !!d.email, has_phone: !!d.telefone, has_cpf: !!d.cpf },
      p_metadata: { actor_type: "user", importacao_id: imp.id },
      p_organization_id: org,
    });
    return id;
  }
  const m = plano.mudancas;
  const patch: Record<string, unknown> = {};
  if (m.nome !== undefined) patch.name = m.nome;
  if (m.email !== undefined) patch.email = m.email;
  if (m.telefone !== undefined) patch.phone_number = m.telefone;
  if (m.nascimento !== undefined) patch.birthdate = m.nascimento;
  if (m.tags !== undefined) patch.tags = m.tags;
  if (m.campos !== undefined || m.instagram !== undefined) {
    patch.custom_fields = {
      ...(await camposAtuais(deps, "contacts", org, plano.id)),
      ...(m.campos ?? {}),
      ...(m.instagram !== undefined ? { link_instagram: m.instagram } : {}),
    };
  }
  if (Object.keys(patch).length > 0) await deps.mudarContato(ctx, plano.id, patch);
  return plano.id;
}

async function gravarEmpresa(deps: DependenciasDaGravacao, imp: ImportacaoQueGrava, contatoId: string, e: PlanoDaEmpresa) {
  const org = imp.organization_id;
  const achada = await deps.db.rpc("fn_escale_empresa_da_importacao", {
    p_org: org,
    p_autor: imp.user_id,
    p_contato: contatoId,
    p_nome: e.nome,
    p_cnpj: e.cnpj?.formatado ?? null,
    p_cnpj_normalizado: e.cnpj?.normalizado ?? null,
  });
  if (achada.error) throw new ErroDaLinha(achada.error.message);
  const empresaId = String(achada.data);
  if (Object.keys(e.campos).length === 0 && !e.cnpj) return;

  const { data, error } = await deps.db
    .from("companies")
    .select("city, state, cnpj, custom_fields")
    .eq("organization_id", org)
    .eq("id", empresaId)
    .maybeSingle();
  if (error) throw new ErroDaLinha(error.message);
  const atual = (data ?? {}) as { city?: string | null; state?: string | null; cnpj?: string | null; custom_fields?: Record<string, unknown> | null };
  const mudanca: Record<string, unknown> = {};
  const campos = { ...(atual.custom_fields ?? {}) };
  let mexeuNosCampos = false;
  for (const [chave, valor] of Object.entries(e.campos)) {
    if (chave === "cidade") {
      if (vazio(atual.city)) mudanca.city = valor;
    } else if (chave === "estado") {
      if (vazio(atual.state)) mudanca.state = valor;
    } else if (vazio(campos[chave])) {
      campos[chave] = valor;
      mexeuNosCampos = true;
    }
  }
  if (mexeuNosCampos) mudanca.custom_fields = campos;
  if (e.cnpj && vazio(atual.cnpj)) {
    mudanca.cnpj = e.cnpj.formatado;
    mudanca.normalized_cnpj = e.cnpj.normalizado;
  }
  if (Object.keys(mudanca).length === 0) return;
  let gravado = await deps.db.from("companies").update(mudanca).eq("organization_id", org).eq("id", empresaId);
  if (gravado.error?.code === "23505") {
    // O CNPJ já é de outra empresa: grava o resto, sem ele.
    const { cnpj: _c, normalized_cnpj: _n, ...semCnpj } = mudanca;
    gravado = Object.keys(semCnpj).length > 0
      ? await deps.db.from("companies").update(semCnpj).eq("organization_id", org).eq("id", empresaId)
      : gravado;
  }
  if (gravado.error && gravado.error.code !== "23505") throw new ErroDaLinha(gravado.error.message);
}

async function gravarNegocio(
  deps: DependenciasDaGravacao,
  ctx: HandlerCtx,
  imp: ImportacaoQueGrava,
  contatoId: string,
  n: PlanoDoNegocio,
): Promise<string> {
  const org = imp.organization_id;
  if (n.tipo === "atualizar") {
    const input: Record<string, unknown> = {};
    if (n.titulo && n.titulo.trim().length >= 2) input.title = n.titulo.trim().slice(0, 200);
    if (n.valorCentavos !== null) input.value_cents = n.valorCentavos;
    if (n.donoId) input.owner_user_id = n.donoId;
    if (Object.keys(n.campos).length > 0) input.custom_fields = { ...(await camposAtuais(deps, "crm_leads", org, n.id)), ...n.campos };
    if (Object.keys(input).length > 0) await deps.mudarNegocio(ctx, n.id, input);
    return n.id;
  }
  const titulo = n.titulo && n.titulo.trim().length >= 2 ? n.titulo.trim().slice(0, 200) : "Novo negócio";
  const criado = await deps.criarNegocio(ctx, {
    pipeline_id: n.origemId,
    stage_id: n.etapaId,
    title: titulo,
    contact_id: contatoId,
    value_cents: n.valorCentavos,
    owner_user_id: n.donoId,
    tags: [],
    source: ORIGEM_DA_PLANILHA,
    source_metadata: { importacao_id: imp.id },
    custom_fields: n.campos,
    via_planilha: true,
  });
  const id = String(criado.id);
  if (n.status !== "open") {
    await deps.encerrar(ctx, { leadId: id, desfecho: n.status, motivo: n.status === "lost" ? n.motivoDePerda : null });
  }
  if (n.status === "won" && n.ganhoEm) {
    await deps.db.from("crm_leads").update({ closed_at: `${n.ganhoEm}T12:00:00Z` }).eq("organization_id", org).eq("id", id);
  }
  return id;
}

export async function gravarPlano(
  deps: DependenciasDaGravacao,
  ctx: HandlerCtx,
  imp: ImportacaoQueGrava,
  plano: Plano,
): Promise<{ contatoId: string; negocioId: string | null }> {
  if (plano.negocio?.tipo === "criar" && plano.negocio.status === "won" && !imp.podeGanhar) {
    throw new ErroDaLinha("Só administrador importa negócio ganho.");
  }
  const contatoId = await gravarContato(deps, ctx, imp, plano.contato);
  if (plano.empresa) await gravarEmpresa(deps, imp, contatoId, plano.empresa);
  const negocioId = plano.negocio ? await gravarNegocio(deps, ctx, imp, contatoId, plano.negocio) : null;
  return { contatoId, negocioId };
}
```

O `title` do negócio: a linha do teste "negócio perdido" manda `"A"` (menos de 2 letras, o mínimo de `createLeadSchema`), então vira "Novo negócio".

- [ ] **Step 3: O consumidor**

Create `lib/escale/importacao/executar.ts`:

```ts
/**
 * O CONSUMIDOR DA IMPORTAÇÃO (fork Escale, Fase 2F; migration 9107; molde de
 * `lib/escale/massa/executar.ts`). Roda no worker com o service role:
 * - 100 linhas por lote, 20 s por rodada; acabou o tempo, `retry`.
 * - O lote é marcado "processando" ANTES de agir (no máximo uma vez); a linha
 *   que ficou "processando" de uma rodada que caiu vira erro.
 * - Depois de cada lote, `fn_escale_contar_importacao` refaz as contagens e fecha
 *   a importação quando não sobra linha na fila.
 * - Importação cancelada para no lote seguinte.
 */
import type { HandlerCtx } from "@/lib/api/handlers/types";
import type { EventRow, HandlerResult } from "@/lib/event-log/dispatcher";

import { gravarPlano, type DependenciasDaGravacao } from "./aplicar";
import { classificar } from "./classificar";
import {
  lerContextoDaRodada,
  lerContextoDoLote,
  type ContextoDaRodada,
  type Importacao,
  type LinhaParaProcessar,
  type Membro,
} from "./contexto";

export const CONSUMIDOR_DA_IMPORTACAO = "escale-importacao.v1";
export const EVENTO_DA_IMPORTACAO = "contatos.importacao_requested";
export const LOTE = 100;
export const ORCAMENTO_MS = 20_000;
export const MENSAGEM_DA_INTERROMPIDA = "A importação foi interrompida nesta linha.";
const TENTATIVAS_ANTES_DE_DESISTIR = 4;
const COLUNAS_DA_LINHA = "id, numero, normalizado, repetida_de, resolucoes";

export interface Dependencias extends DependenciasDaGravacao {
  agora: () => number;
  lerMembros: (orgId: string) => Promise<Membro[]>;
}

const resultado = (status: HandlerResult["status"], detail?: string, retry_at?: string): HandlerResult => ({
  consumer_key: CONSUMIDOR_DA_IMPORTACAO,
  status,
  ...(detail ? { detail } : {}),
  ...(retry_at ? { retry_at } : {}),
});

const motivoDaFalha = (e: unknown) => (e instanceof Error ? e.message : String(e));
const ctxDe = (imp: Importacao): HandlerCtx => ({
  organization_id: imp.organization_id,
  actor: { type: "user", id: imp.user_id },
  requestId: imp.id,
});

export async function contarImportacao(deps: Pick<Dependencias, "db">, id: string): Promise<string> {
  const { data, error } = await deps.db.rpc("fn_escale_contar_importacao", { p_importacao: id });
  if (error) throw new Error(error.message);
  return String(data);
}

export async function processarLinhas(
  deps: Dependencias,
  rodada: ContextoDaRodada,
  linhas: readonly LinhaParaProcessar[],
): Promise<void> {
  if (linhas.length === 0) return;
  const imp = rodada.importacao;
  const contexto = await lerContextoDoLote(deps.db, rodada, linhas);
  const ctx = ctxDe(imp);
  const quemGrava = { id: imp.id, organization_id: imp.organization_id, user_id: imp.user_id, podeGanhar: rodada.podeGanhar };
  for (const linha of linhas) {
    const desfecho = classificar(linha.normalizado, linha.repetida_de, contexto(linha), imp.decisoes, linha.resolucoes);
    let mudanca: Record<string, unknown>;
    if (desfecho.tipo === "importar") {
      try {
        const r = await gravarPlano(deps, ctx, quemGrava, desfecho.plano);
        mudanca = {
          status: "importada",
          motivo: null,
          detalhe: desfecho.detalhe,
          com_aviso: Object.keys(desfecho.detalhe.avisos).length > 0,
          contato_id: r.contatoId,
          negocio_id: r.negocioId,
          mensagem: null,
        };
      } catch (e) {
        mudanca = { status: "erro", motivo: null, detalhe: desfecho.detalhe, com_aviso: false, mensagem: motivoDaFalha(e).slice(0, 500) };
      }
    } else {
      mudanca = {
        status: desfecho.tipo === "pular" ? "pulada" : "revisar",
        motivo: desfecho.motivo,
        detalhe: desfecho.detalhe,
        com_aviso: false,
        mensagem: null,
      };
    }
    const { error } = await deps.db.from("crm_importacoes_linhas").update(mudanca).eq("id", linha.id);
    if (error) throw new Error(error.message);
  }
}

export async function processarImportacao(row: EventRow, deps: Dependencias): Promise<HandlerResult> {
  const id = typeof row.payload?.importacao_id === "string" ? row.payload.importacao_id : null;
  if (!id) return resultado("skipped", "sem_importacao_id");
  const lida = await deps.db
    .from("crm_importacoes")
    .select("id, organization_id, user_id, tipo, status, decisoes, configuracao")
    .eq("id", id)
    .eq("organization_id", row.organization_id)
    .maybeSingle();
  if (lida.error) return resultado("error", lida.error.message);
  if (!lida.data) return resultado("skipped", "importacao_inexistente");
  const imp = lida.data as Importacao;
  if (imp.status !== "na_fila" && imp.status !== "importando") return resultado("ok", "fora_da_fila");

  try {
    if (imp.status === "na_fila") {
      const marcada = await deps.db.from("crm_importacoes").update({ status: "importando" }).eq("id", imp.id).eq("status", "na_fila");
      if (marcada.error) throw new Error(marcada.error.message);
    }
    const sobras = await deps.db
      .from("crm_importacoes_linhas")
      .update({ status: "erro", mensagem: MENSAGEM_DA_INTERROMPIDA })
      .eq("importacao_id", imp.id)
      .eq("status", "processando");
    if (sobras.error) throw new Error(sobras.error.message);

    const rodada = await lerContextoDaRodada(deps.db, { ...imp, status: "importando" }, await deps.lerMembros(imp.organization_id));
    const inicio = deps.agora();
    while (deps.agora() - inicio < ORCAMENTO_MS) {
      const estado = await deps.db.from("crm_importacoes").select("status").eq("id", imp.id).maybeSingle();
      if ((estado.data as { status?: string } | null)?.status === "cancelada") return resultado("ok", "cancelada");
      const { data, error } = await deps.db
        .from("crm_importacoes_linhas")
        .select(COLUNAS_DA_LINHA)
        .eq("importacao_id", imp.id)
        .eq("status", "na_fila")
        .order("numero", { ascending: true })
        .limit(LOTE);
      if (error) throw new Error(error.message);
      const linhas = (data ?? []) as LinhaParaProcessar[];
      if (linhas.length === 0) {
        await contarImportacao(deps, imp.id);
        return resultado("ok");
      }
      const marcadas = await deps.db
        .from("crm_importacoes_linhas")
        .update({ status: "processando" })
        .in(
          "id",
          linhas.map((l) => l.id),
        )
        .eq("status", "na_fila");
      if (marcadas.error) throw new Error(marcadas.error.message);
      await processarLinhas(deps, rodada, linhas);
      await contarImportacao(deps, imp.id);
    }
    return resultado("retry", "orcamento", new Date(deps.agora() + 1000).toISOString());
  } catch (e) {
    if (row.attempts >= TENTATIVAS_ANTES_DE_DESISTIR) {
      await deps.db
        .from("crm_importacoes")
        .update({ status: "falhou", codigo_do_erro: "PIPELINE_FAILED", concluida_em: new Date(deps.agora()).toISOString() })
        .eq("id", imp.id);
      return resultado("ok", "falhou");
    }
    return resultado("error", motivoDaFalha(e));
  }
}
```

Create `lib/escale/importacao/handler.ts`:

```ts
import type { SupabaseClient } from "@supabase/supabase-js";

import { patchContactHandler } from "@/app/api/v1/contacts/_handler";
import { createLeadHandler, updateLeadHandler } from "@/app/api/v1/leads/_handler";
import { camposCpfParaGravar } from "@/lib/contacts/cpf";
import type { EventHandler } from "@/lib/event-log/dispatcher";
import { encerraDemanda } from "@/lib/leads/encerramento";
import { createAdminClient } from "@/lib/supabase/admin";

import type { Membro } from "./contexto";
import { CONSUMIDOR_DA_IMPORTACAO, EVENTO_DA_IMPORTACAO, processarImportacao, type Dependencias } from "./executar";

/** Os membros ativos (atendente ou acima), com o e-mail e o nome da conta, para achar o dono pelo texto da planilha. */
async function lerMembros(db: SupabaseClient, orgId: string): Promise<Membro[]> {
  const { data, error } = await db
    .from("user_organizations")
    .select("user_id, role")
    .eq("organization_id", orgId)
    .is("revoked_at", null)
    .neq("role", "viewer");
  if (error) throw new Error(error.message);
  return Promise.all(
    ((data ?? []) as Array<{ user_id: string }>).map(async (m) => {
      const { data: conta } = await db.auth.admin.getUserById(m.user_id);
      return {
        userId: m.user_id,
        email: conta?.user?.email ?? null,
        nome: (conta?.user?.user_metadata?.full_name as string | undefined) ?? null,
      };
    }),
  );
}

export function dependenciasReais(db: SupabaseClient): Dependencias {
  return {
    db,
    agora: () => Date.now(),
    lerMembros: (orgId) => lerMembros(db, orgId),
    mudarContato: (ctx, id, patch) => patchContactHandler(db, ctx, id, patch as Parameters<typeof patchContactHandler>[3]),
    criarNegocio: (ctx, input) =>
      createLeadHandler(db, ctx, input as Parameters<typeof createLeadHandler>[2], { exigirCamposDaEtapa: false }),
    mudarNegocio: (ctx, id, input) => updateLeadHandler(db, ctx, id, input as Parameters<typeof updateLeadHandler>[3]),
    encerrar: (ctx, input) => encerraDemanda(db, ctx, input),
    cpf: (cpf) => camposCpfParaGravar(db, cpf),
  };
}

/**
 * Consumidor do `event_log` das importações (fork Escale, Fase 2F). "roda" na
 * organização parada: é escrita interna pedida por alguém da própria organização,
 * sem custo e sem sair para fora (régua de `tests/unit/dispatcher-org-parada.test.ts`).
 */
export const importacaoHandler: EventHandler = {
  key: CONSUMIDOR_DA_IMPORTACAO,
  naOrgParada: "roda",
  events: [EVENTO_DA_IMPORTACAO],
  async handle(row) {
    return processarImportacao(row, dependenciasReais(createAdminClient()));
  },
};
```

Em `lib/event-log/register-handlers.ts`: o import logo depois do da 2B e o registro logo depois de `registerHandler(acaoEmMassaHandler);`:

```ts
// FORK ESCALE · Fase 2F: as importações de contatos e negócios.
import { importacaoHandler } from "@/lib/escale/importacao/handler";
```

```ts
  registerHandler(importacaoHandler);
```

- [ ] **Step 4: Os avisos da origem ignoram o negócio da planilha (N11)**

Em `lib/escale/notificacoes/avisos-da-origem.handler.ts`: some `source` ao select do negócio, ao tipo `l`, e a recusa logo depois do `if (!lead) …`:

```ts
import { ORIGEM_DA_PLANILHA } from "@/lib/leads/planilha";
```

```ts
    .select("id, title, pipeline_id, owner_user_id, created_by_user_id, source")
```

```ts
  // FORK ESCALE · Fase 2F (N11): a importação cria um negócio por linha; um push por linha seria barulho.
  if (evento === "lead.created" && (lead as { source?: string | null }).source === ORIGEM_DA_PLANILHA) {
    return resultado("skipped", "veio_da_planilha");
  }
```

Em `tests/unit/escale-avisos-da-origem-handler.test.ts`, um caso novo no `describe`:

```ts
  it("negócio que veio da planilha não manda o push de novo negócio (Fase 2F)", async () => {
    adminFalso({
      crm_leads: [{ id: "lead-1", title: "Maria", pipeline_id: "p-1", owner_user_id: null, created_by_user_id: null, source: "importacao_planilha" }],
      crm_pipelines: [{ id: "p-1", name: "Clayton", group_id: null, settings: { escale_notificacoes: { novo_negocio: { pessoas: [A] } } } }],
      user_organizations: [{ user_id: A, role: "agent" }],
    });
    const r = await avisosDaOrigemHandler.handle(evento("lead.created"));
    expect(r.status).toBe("skipped");
    expect(enviarPushAoUsuario).not.toHaveBeenCalled();
  });
```

- [ ] **Step 5: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-executar.test.ts tests/unit/escale-avisos-da-origem-handler.test.ts tests/unit/dispatcher-org-parada.test.ts
corepack pnpm exec eslint lib/escale/importacao lib/event-log/register-handlers.ts lib/escale/notificacoes/avisos-da-origem.handler.ts tests/unit/escale-importacao-executar.test.ts
git add lib/escale/importacao lib/event-log/register-handlers.ts lib/escale/notificacoes/avisos-da-origem.handler.ts tests/unit/escale-importacao-executar.test.ts tests/unit/escale-avisos-da-origem-handler.test.ts
git commit -m "feat(escale): consumidor da importação — gravar contato, empresa e negócio em segundo plano (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

Se `dispatcher-org-parada` pedir a chave nova numa lista (as que "rodam" na organização parada), acrescente `escale-importacao.v1` ao lado de `escale-acao-em-massa.v1`.

### Task 8: Cancelar, ler as linhas e resolver (uma ou em lote)

**Files:**
- Create: `app/api/v1/importacoes/[id]/cancelar/route.ts`, `app/api/v1/importacoes/[id]/linhas/route.ts`, `app/api/v1/importacoes/[id]/linhas/[linhaId]/resolver/route.ts`, `app/api/v1/importacoes/[id]/resolver-em-lote/route.ts`, `tests/unit/escale-importacoes-revisao-rotas.test.ts`
- Modify: `lib/escale/importacao/banco.ts`

**Interfaces:**
- Consumes: `processarLinhas`, `contarImportacao`, `Dependencias` (Task 7); `dependenciasReais` (Task 7); `lerContextoDaRodada` (Task 6); `resolucaoSchema`, `loteSchema`, `LinhaLida` (Task 6); `acaoValida`, `REGRAS` (Task 1).
- Produces (`banco.ts`): `LINHAS_DO_RELATORIO_MAX = 500`, `linhasDaImportacao(sb, orgId, id, quais: "revisar" | "relatorio")` → `LinhaLida[]` (até 500 na revisão; até 501 no relatório, para a tela saber que cortou), `cancelarImportacao(admin, id)`, `resolverLinha(sb, deps, ctx: { orgId; importacaoId; linhaId; resolucao })` → `{ status: StatusDaLinha; motivo: Motivo | null; importacao: string }`, `resolverEmLote(admin, ctx: { importacaoId; motivo; acao })` → `number`.
- Rotas: `POST /api/v1/importacoes/[id]/cancelar` → `{ status: "cancelada" }`; `GET /api/v1/importacoes/[id]/linhas?quais=revisar|relatorio` → `LinhaLida[]`; `POST /api/v1/importacoes/[id]/linhas/[linhaId]/resolver` (`{ acao, dados? }`) → `{ status, motivo, importacao }`; `POST /api/v1/importacoes/[id]/resolver-em-lote` (`{ motivo, acao }`) → `{ linhas }`.

Regras da resolução (N12): a ação tem de ser uma das opções do motivo (`acaoValida`), nunca "Revisar"; "Escolher na lista" só em `ORIGIN_NAME_NOT_FOUND` (com `dados.origemId` de uma origem não arquivada da organização) e `STAGE_NAME_NOT_FOUND` (com `dados.etapaId` de uma etapa aberta da origem do detalhe); em lote, "Escolher na lista" é recusado. A linha passa de `revisar` a `processando` numa escrita só (`.eq("status", "revisar")`): se outra pessoa já resolveu, 409 "Esta linha já foi resolvida.". Depois roda **na hora** (`processarLinhas` com a linha) e recontam-se as contagens.

- [ ] **Step 1: O banco da revisão**

Em `lib/escale/importacao/banco.ts`, acrescente:

```ts
import type { HandlerCtx } from "@/lib/api/handlers/types";

import { acaoValida, type Acao, type Motivo } from "./regras";
import type { Resolucao } from "./classificar";
import { lerContextoDaRodada, type Importacao, type LinhaParaProcessar } from "./contexto";
import { contarImportacao, processarLinhas, type Dependencias } from "./executar";
import type { LinhaLida } from "./tipos";
import type { StatusDaLinha } from "./textos";

export const LINHAS_DO_RELATORIO_MAX = 500;
const COLUNAS_DA_LINHA_LIDA = "id, numero, status, motivo, normalizado, detalhe, resolucoes, mensagem, com_aviso";

export async function linhasDaImportacao(
  sb: SupabaseClient,
  orgId: string,
  id: string,
  quais: "revisar" | "relatorio",
): Promise<LinhaLida[]> {
  let q = sb.from("crm_importacoes_linhas").select(COLUNAS_DA_LINHA_LIDA).eq("organization_id", orgId).eq("importacao_id", id);
  q =
    quais === "revisar"
      ? q.eq("status", "revisar").order("motivo", { ascending: true }).order("numero", { ascending: true }).limit(500)
      : q.or("status.in.(pulada,erro),com_aviso.eq.true").order("numero", { ascending: true }).limit(LINHAS_DO_RELATORIO_MAX + 1);
  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as unknown as LinhaLida[];
}

export async function cancelarImportacao(admin: SupabaseClient, id: string): Promise<void> {
  const { error } = await admin.rpc("fn_escale_cancelar_importacao", { p_importacao: id });
  if (error) throw new ErroDaImportacao("estado", "Só se cancela uma importação na fila ou importando.");
}

async function conferirEscolha(sb: SupabaseClient, orgId: string, motivo: Motivo, r: Resolucao, detalhe: Record<string, unknown>) {
  if (r.acao !== "PICK_MANUALLY") return;
  if (motivo === "ORIGIN_NAME_NOT_FOUND") {
    const { data } = await sb
      .from("crm_pipelines")
      .select("id")
      .eq("organization_id", orgId)
      .eq("id", r.dados?.origemId ?? "")
      .eq("is_archived", false)
      .maybeSingle();
    if (!data) throw new ErroDaImportacao("origem", "Escolha uma origem");
    return;
  }
  const { data } = await sb
    .from("crm_stages")
    .select("id, pipeline_id, is_archived, is_won, is_lost")
    .eq("organization_id", orgId)
    .eq("id", r.dados?.etapaId ?? "")
    .maybeSingle();
  const e = data as { pipeline_id: string; is_archived: boolean; is_won: boolean; is_lost: boolean } | null;
  if (!e || e.pipeline_id !== detalhe.origemId || e.is_archived || e.is_won || e.is_lost) {
    throw new ErroDaImportacao("origem", "Escolha uma etapa");
  }
}

export async function resolverLinha(
  sb: SupabaseClient,
  deps: Dependencias,
  ctx: { orgId: string; importacaoId: string; linhaId: string; resolucao: Resolucao },
): Promise<{ status: StatusDaLinha; motivo: Motivo | null; importacao: string }> {
  const { orgId, importacaoId, linhaId, resolucao } = ctx;
  const { data: lida, error } = await sb
    .from("crm_importacoes_linhas")
    .select("id, status, motivo, detalhe, resolucoes")
    .eq("organization_id", orgId)
    .eq("importacao_id", importacaoId)
    .eq("id", linhaId)
    .maybeSingle();
  if (error) throw error;
  if (!lida) throw new ErroDaImportacao("nao_encontrada", "Importação não encontrada.");
  const linha = lida as { status: string; motivo: Motivo | null; detalhe: Record<string, unknown>; resolucoes: Record<string, unknown> };
  if (linha.status !== "revisar" || !linha.motivo) throw new ErroDaImportacao("estado", "Esta linha já foi resolvida.");
  const motivo = linha.motivo;
  const permitida =
    resolucao.acao !== "PENDING_REVIEW" &&
    acaoValida(motivo, resolucao.acao) &&
    (resolucao.acao !== "PICK_MANUALLY" || motivo === "ORIGIN_NAME_NOT_FOUND" || motivo === "STAGE_NAME_NOT_FOUND");
  if (!permitida) throw new ErroDaImportacao("estado", "Não foi possível iniciar a importação.");
  await conferirEscolha(sb, orgId, motivo, resolucao, linha.detalhe);

  const imp = await deps.db
    .from("crm_importacoes")
    .select("id, organization_id, user_id, tipo, status, decisoes, configuracao")
    .eq("organization_id", orgId)
    .eq("id", importacaoId)
    .maybeSingle();
  if (imp.error) throw imp.error;
  const importacao = imp.data as Importacao | null;
  if (!importacao || (importacao.status !== "aguardando_revisao" && importacao.status !== "importando")) {
    throw new ErroDaImportacao("estado", "Esta linha já foi resolvida.");
  }

  const tomada = await deps.db
    .from("crm_importacoes_linhas")
    .update({ status: "processando", motivo: null, resolucoes: { ...linha.resolucoes, [motivo]: resolucao } })
    .eq("id", linhaId)
    .eq("status", "revisar")
    .select(COLUNAS_PARA_PROCESSAR);
  if (tomada.error) throw tomada.error;
  const linhas = (tomada.data ?? []) as LinhaParaProcessar[];
  if (linhas.length === 0) throw new ErroDaImportacao("estado", "Esta linha já foi resolvida.");

  const rodada = await lerContextoDaRodada(deps.db, importacao, await deps.lerMembros(orgId));
  await processarLinhas(deps, rodada, linhas);
  const statusDaImportacao = await contarImportacao(deps, importacaoId);
  const depois = await deps.db.from("crm_importacoes_linhas").select("status, motivo").eq("id", linhaId).maybeSingle();
  const d = (depois.data ?? { status: "erro", motivo: null }) as { status: StatusDaLinha; motivo: Motivo | null };
  return { status: d.status, motivo: d.motivo, importacao: statusDaImportacao };
}

const COLUNAS_PARA_PROCESSAR = "id, numero, normalizado, repetida_de, resolucoes";

export async function resolverEmLote(
  admin: SupabaseClient,
  ctx: { importacaoId: string; motivo: Motivo; acao: Acao },
): Promise<number> {
  if (ctx.acao === "PENDING_REVIEW" || ctx.acao === "PICK_MANUALLY" || !acaoValida(ctx.motivo, ctx.acao)) {
    throw new ErroDaImportacao("estado", "Não foi possível iniciar a importação.");
  }
  const { data, error } = await admin.rpc("fn_escale_reabrir_importacao", {
    p_importacao: ctx.importacaoId,
    p_motivo: ctx.motivo,
    p_resolucao: { acao: ctx.acao },
  });
  if (error) throw new ErroDaImportacao("estado", "Esta linha já foi resolvida.");
  return Number(data);
}
```

Mova a constante `COLUNAS_PARA_PROCESSAR` para cima de `resolverLinha` (fica abaixo só aqui, por legibilidade). O tipo `HandlerCtx` não é usado neste arquivo: tire o import se o eslint reclamar.

- [ ] **Step 2: As rotas**

Create `app/api/v1/importacoes/[id]/cancelar/route.ts`:

```ts
/** POST /api/v1/importacoes/[id]/cancelar — cancelar a importação na fila ou importando (fork Escale, Fase 2F). Gerente ou acima. */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, cancelarImportacao, lerImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(_req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  try {
    const importacao = /^[0-9a-f-]{36}$/i.test(id) ? await lerImportacao(await createClient(), authz.org.orgId, id) : null;
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    await cancelarImportacao(createAdminClient(), id);
    void audit({
      action: "contacts.import_canceled",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: {},
    });
    return ok({ status: "cancelada" });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return fail("conflict", t(err.message), 409, { requestId });
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/[id]/cancelar", operacao: "cancelar" }, t, requestId);
  }
}
```

Create `app/api/v1/importacoes/[id]/linhas/route.ts`:

```ts
/** GET /api/v1/importacoes/[id]/linhas?quais=revisar|relatorio — as linhas da revisão ou do relatório (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { linhasDaImportacao } from "@/lib/escale/importacao/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  const quais = req.nextUrl.searchParams.get("quais") === "relatorio" ? "relatorio" : "revisar";
  try {
    return ok(await linhasDaImportacao(await createClient(), authz.org.orgId, id, quais));
  } catch (err) {
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/[id]/linhas", operacao: "ler" }, t, requestId);
  }
}
```

Create `app/api/v1/importacoes/[id]/linhas/[linhaId]/resolver/route.ts`:

```ts
/** POST /api/v1/importacoes/[id]/linhas/[linhaId]/resolver — resolver uma pendência e importar a linha na hora (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, resolverLinha } from "@/lib/escale/importacao/banco";
import { dependenciasReais } from "@/lib/escale/importacao/handler";
import { resolucaoSchema } from "@/lib/escale/importacao/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const STATUS_DO_ERRO = { arquivo: 422, mapeamento: 422, origem: 422, ganho: 422, nao_encontrada: 404, estado: 409 } as const;

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string; linhaId: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id, linhaId } = await params;
  if (!UUID.test(id) || !UUID.test(linhaId)) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = resolucaoSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Não foi possível iniciar a importação."), 422, { requestId });
  try {
    const r = await resolverLinha(await createClient(), dependenciasReais(createAdminClient()), {
      orgId: authz.org.orgId,
      importacaoId: id,
      linhaId,
      resolucao: lido.data,
    });
    void audit({
      action: "contacts.import_row_resolved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: { linha: linhaId, acao: lido.data.acao, resultado: r.status },
    });
    return ok(r);
  } catch (err) {
    if (err instanceof ErroDaImportacao) {
      return fail(err.codigo === "nao_encontrada" ? "not_found" : "conflict", t(err.message), STATUS_DO_ERRO[err.codigo], { requestId });
    }
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/[id]/linhas/[linhaId]/resolver", operacao: "resolver" }, t, requestId);
  }
}
```

Create `app/api/v1/importacoes/[id]/resolver-em-lote/route.ts`:

```ts
/** POST /api/v1/importacoes/[id]/resolver-em-lote — aplicar uma escolha a todas as pendências de um motivo (fork Escale, Fase 2F). */
import { randomUUID } from "node:crypto";
import { type NextRequest } from "next/server";

import { fail, ok } from "@/lib/api/wrappers";
import { audit } from "@/lib/audit";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { ErroDaImportacao, lerImportacao, resolverEmLote } from "@/lib/escale/importacao/banco";
import { loteSchema } from "@/lib/escale/importacao/tipos";
import { lerJson } from "@/lib/escale/origens/respostas";
import { traduzir } from "@/lib/i18n/dicionario";
import { requireSupportWrite } from "@/lib/impersonate/support";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }): Promise<Response> {
  const requestId = randomUUID();
  const supportDenied = await requireSupportWrite();
  if (supportDenied) return supportDenied;
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const { id } = await params;
  const corpo = await lerJson(req);
  if (!corpo.ok) return fail("invalid_request", t("Corpo não é JSON válido."), 400, { requestId });
  const lido = loteSchema.safeParse(corpo.json);
  if (!lido.success) return fail("unprocessable_entity", t("Não foi possível iniciar a importação."), 422, { requestId });
  try {
    const importacao = /^[0-9a-f-]{36}$/i.test(id) ? await lerImportacao(await createClient(), authz.org.orgId, id) : null;
    if (!importacao) return fail("not_found", t("Importação não encontrada."), 404, { requestId });
    const linhas = await resolverEmLote(createAdminClient(), { importacaoId: id, motivo: lido.data.motivo, acao: lido.data.acao });
    void audit({
      action: "contacts.import_rows_resolved",
      actorUserId: authz.user.id,
      organizationId: authz.org.orgId,
      resourceType: "crm_importacao",
      resourceId: id,
      requestId,
      metadata: { motivo: lido.data.motivo, acao: lido.data.acao, linhas },
    });
    return ok({ linhas });
  } catch (err) {
    if (err instanceof ErroDaImportacao) return fail("conflict", t(err.message), 409, { requestId });
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/[id]/resolver-em-lote", operacao: "lote" }, t, requestId);
  }
}
```

- [ ] **Step 3: O teste das rotas**

Create `tests/unit/escale-importacoes-revisao-rotas.test.ts` com os mesmos mocks do teste da Task 6 (`require-role`, `support`, `supabase/server`, `supabase/admin`, `audit`) e `vi.mock("@/lib/escale/importacao/banco", …)` substituindo `resolverLinha`, `resolverEmLote`, `cancelarImportacao`, `lerImportacao` e `linhasDaImportacao`; mais `vi.mock("@/lib/escale/importacao/handler", () => ({ dependenciasReais: vi.fn(() => ({})) }))`. Casos:

```ts
const ID = "8d1f2b0a-3c4d-4e5f-8a9b-0c1d2e3f4a5b";
const LINHA = "9e2a3c1b-4d5e-4f6a-9b0c-1d2e3f4a5b6c";
const json = (url: string, corpo: unknown) =>
  new NextRequest(url, { method: "POST", body: JSON.stringify(corpo), headers: { "content-type": "application/json" } });

it("resolver: 200 com o status novo da linha", async () => {
  autorizado();
  vi.mocked(resolverLinha).mockResolvedValue({ status: "importada", motivo: null, importacao: "concluida" });
  const res = await resolverPOST(json(`http://x/api/v1/importacoes/${ID}/linhas/${LINHA}/resolver`, { acao: "OVERWRITE" }), {
    params: Promise.resolve({ id: ID, linhaId: LINHA }),
  });
  expect(res.status).toBe(200);
  expect((await res.json()).data).toEqual({ status: "importada", motivo: null, importacao: "concluida" });
});

it("resolver: linha já resolvida é 409; ação desconhecida é 422; id ruim é 404", async () => {
  autorizado();
  vi.mocked(resolverLinha).mockRejectedValue(new ErroDaImportacao("estado", "Esta linha já foi resolvida."));
  const p = { params: Promise.resolve({ id: ID, linhaId: LINHA }) };
  expect((await resolverPOST(json(`http://x/a`, { acao: "KEEP_DB" }), p)).status).toBe(409);
  expect((await resolverPOST(json(`http://x/a`, { acao: "VOAR" }), p)).status).toBe(422);
  expect((await resolverPOST(json(`http://x/a`, { acao: "KEEP_DB" }), { params: Promise.resolve({ id: "x", linhaId: LINHA }) })).status).toBe(404);
});

it("em lote: devolve quantas linhas voltaram à fila", async () => {
  autorizado();
  vi.mocked(lerImportacao).mockResolvedValue({ id: ID } as never);
  vi.mocked(resolverEmLote).mockResolvedValue(7);
  const res = await lotePOST(json(`http://x/a`, { motivo: "MATCH_PHONE_DIFFERS", acao: "KEEP_DB" }), { params: Promise.resolve({ id: ID }) });
  expect((await res.json()).data).toEqual({ linhas: 7 });
});

it("cancelar: 409 quando já terminou", async () => {
  autorizado();
  vi.mocked(lerImportacao).mockResolvedValue({ id: ID } as never);
  vi.mocked(cancelarImportacao).mockRejectedValue(new ErroDaImportacao("estado", "Só se cancela uma importação na fila ou importando."));
  expect((await cancelarPOST(new NextRequest("http://x/a", { method: "POST" }), { params: Promise.resolve({ id: ID }) })).status).toBe(409);
});
```

com `import { POST as resolverPOST } from "@/app/api/v1/importacoes/[id]/linhas/[linhaId]/resolver/route";`, `import { POST as lotePOST } from "@/app/api/v1/importacoes/[id]/resolver-em-lote/route";` e `import { POST as cancelarPOST } from "@/app/api/v1/importacoes/[id]/cancelar/route";`, e o mesmo `autorizado()` da Task 6.

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacoes-revisao-rotas.test.ts tests/unit/escale-importacoes-rota.test.ts
corepack pnpm exec eslint lib/escale/importacao app/api/v1/importacoes tests/unit/escale-importacoes-revisao-rotas.test.ts
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add lib/escale/importacao app/api/v1/importacoes tests/unit/escale-importacoes-revisao-rotas.test.ts
git commit -m "feat(escale): cancelar, ler as linhas e resolver pendências da importação (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 9: Espanhol das rotas e do motor, PRD e o PR A

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`), `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`

- [ ] **Step 1: Os pares pt → es da Clint**

Os textos dos motivos, das ações, dos níveis e das categorias saem do bundle espanhol da Clint pelas mesmas chaves. Rode (o script fica fora do repositório, como manda o LOG.md):

```bash
cat > /tmp/pares-importstudio.cjs <<'EOF'
const fs = require("fs");
const base = "C:/Documentos/projetos claude/reverse engenering - Copia/clint-model/raw-v2/js/";
const ler = (f) => {
  const texto = fs.readFileSync(base + f, "utf8");
  const mapa = new Map();
  for (const m of texto.matchAll(/"(importStudio\.[^"]+)":"((?:[^"\\]|\\.)*)"/g)) mapa.set(m[1], JSON.parse(`"${m[2]}"`));
  return mapa;
};
const pt = ler("pt-BR-DmQ11GIn.js.txt");
const es = ler("es-ES--Nhr_a4A.js.txt");
for (const [chave, valor] of pt) {
  const outro = es.get(chave);
  if (!outro) continue;
  const p = valor.replace(/Clint/g, "Escale OS");
  const e = outro.replace(/Clint/g, "Escale OS");
  console.log(`  ${JSON.stringify(p)}: { es: ${JSON.stringify(e)} },`);
}
EOF
node /tmp/pares-importstudio.cjs > /tmp/pares-importstudio.txt
wc -l /tmp/pares-importstudio.txt
```

Expected: cerca de 260 linhas.

- [ ] **Step 2: O bloco do PR A**

Cole, logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`, o cabeçalho `  // ─── FORK ESCALE · Fase 2F (PR A): importar contatos e negócios ───` e, dos pares gerados, só os que **as rotas e o motor** usam: os 15 rótulos e as 15 descrições dos motivos (`importStudio.rc.*`), os 16 rótulos longos e curtos das ações (`importStudio.action.*`), "Criar novo negócio", os níveis (`importStudio.preset.*`), as categorias (`importStudio.category.*`) e os status (`importStudio.status.*`). Depois, os textos nossos das rotas (sem par na Clint):

```ts
  "O arquivo passa de 25 MB.": { es: "El archivo supera los 25 MB." },
  "O arquivo passa de 50.000 linhas.": { es: "El archivo supera las 50.000 filas." },
  "O arquivo passa de 200 colunas.": { es: "El archivo supera las 200 columnas." },
  "O arquivo não tem linhas para importar.": { es: "El archivo no tiene filas para importar." },
  "O arquivo mudou. Escolha o arquivo de novo.": { es: "El archivo cambió. Elige el archivo de nuevo." },
  "Só administrador importa negócio ganho.": { es: "Solo un administrador importa negocios ganados." },
  "Importação não encontrada.": { es: "Importación no encontrada." },
  "Esta linha já foi resolvida.": { es: "Esta fila ya fue resuelta." },
  "Só se cancela uma importação na fila ou importando.": { es: "Solo se cancela una importación en cola o importando." },
  "A importação foi interrompida nesta linha.": { es: "La importación se interrumpió en esta fila." },
  "Importação cancelada.": { es: "Importación cancelada." },
  "Contato já cadastrado com este e-mail, telefone ou CPF.": { es: "Contacto ya registrado con este correo, teléfono o CPF." },
```

Não repita chave que já existe no dicionário (a cerca acusa duplicata): antes de colar, `grep -n '"Status":\|"Cancelar":\|"Voltar":\|"Continuar":' lib/i18n/dicionario.ts` e tire do bloco o que já estiver lá.

- [ ] **Step 3: O PRD**

Em `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`:
- na tabela B, a linha B6 passa de `| 2B |` para `| 2F |`, e "adaptar: reaproveitar o assistente de importação da 1E" vira "adotar: o Import Studio da Clint (5 passos, níveis, revisão, relatório e lista), generalizando o assistente da 1E";
- na seção 8, depois da linha da 2E, a linha nova:

```markdown
| 2F | **Importar contatos e negócios:** B6 | O "Import Studio" da Clint: o assistente de 5 passos (Contatos e Negócios), a importação em segundo plano com os níveis Conservador/Padrão/Agressivo, "Revisar pendências", "Relatório da importação" e a página "Importações" no "Mais", com as exportações da 2B; igual aos prints v2-06 a v2-11 e 2b-41 | PR A em execução (plano `2026-10-19-fase-2f-importar-contatos-e-negocios.md`) |
```

- [ ] **Step 4: Verificar e abrir o PR A**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-*.test.ts tests/unit/escale-importacoes-*.test.ts tests/unit/escale-avisos-da-origem-handler.test.ts tests/unit/i18n-*.test.ts tests/unit/audit-*.test.ts tests/unit/manifest-*.test.ts
corepack pnpm exec eslint lib/escale/importacao app/api/v1/importacoes lib/i18n/dicionario.ts lib/audit/actions.ts
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol do motor e das rotas da importação (Fase 2F, PR A)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u escale-crm feat/fase-2f-importacao-motor
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-2f-importacao-motor \
  --title "Fase 2F (PR A): importação de contatos e negócios — banco e motor" \
  --body "$(cat <<'EOF'
## O que entra
- Migration 9107: `crm_importacoes` e `crm_importacoes_linhas` (só leitura para gerente+; escrita do service role) e as funções de enfileirar, contar, cancelar, reabrir, apagar as linhas antigas (LGPD, 30 dias) e a empresa da linha.
- O motor do "Import Studio" da Clint: as 15 situações com os riscos e as opções dela, os níveis Conservador/Padrão/Agressivo, o mapeamento com sugestão pelo cabeçalho, a normalização das linhas e os portões (pular, revisar ou importar).
- O consumidor `escale-importacao.v1` (lotes de 100, 20 s por rodada) que cria e atualiza contatos, empresas e negócios.
- As rotas `/api/v1/importacoes/**`: criar (multipart), listar, ler, cancelar, ler as linhas, resolver uma linha e resolver em lote.
- Negócio que nasce da planilha não manda o push de "Novo negócio" (1K).

## Testes
- Unitários do motor, das rotas e do consumidor; `test:db` da 9107 verde.
- A bateria cheia e a revisão ficam para o fim da Frente B (regra de 18/10).

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge -R rgisjr/escale-crm --merge --delete-branch=false
```

Expected: o PR mergeado na `main` (regra de 18/10: merge direto ao terminar).

---

# PR B — O assistente de 5 passos e as entradas

Todas as tasks de tela: **abra o print da Clint antes** (tabela "Referência visual") e compare lado a lado no fim da task. As medidas do assistente são as da 1E (já tiradas dos prints v2-06 a v2-11); não as mude.

### Task 10: Branch, as peças do assistente, o passo Arquivo e os hooks

**Files:**
- Create: `components/escale/importacao/pecas.tsx`, `components/escale/importacao/PassosDaImportacao.tsx` (movido de `components/escale/quadro/`), `components/escale/importacao/PassoArquivo.tsx`, `hooks/escale/useImportacoes.ts`, `lib/escale/importacao/exemplo.ts`, `app/api/v1/importacoes/destinos/route.ts`, `tests/unit/escale-importacao-passo-arquivo.test.tsx`
- Modify: `lib/ui/icons-da-casca.ts` (acrescente `Shield` ao `export { … } from "lucide-react"` mais recente)

**Interfaces:**
- Produces (`pecas.tsx`): `TITULO`, `SUBTITULO`, `ColunaCentral({ largura, children })`, `Titulo({ titulo, subtitulo })`, `BOTAO_DA_MARCA`, `BOTAO_DE_CONTORNO`, `BotaoDoRodape({ desabilitado, dica?, aoClicar, children })`, `SeletorDoTipo({ tipo, aoMudar, desabilitado })`.
- Produces (`PassosDaImportacao.tsx`): `PassosDaImportacao({ atual, rotulos })` (o mesmo da 1E).
- Produces (`PassoArquivo.tsx`): `PassoArquivo({ tipo, aoMudarTipo, travarTipo, nomeDoArquivo, lendo, erro, aoEscolher })`.
- Produces (`exemplo.ts`): `csvDeExemplo(tipo)` → `string`, `nomeDoExemplo(tipo)` → `"exemplo-contatos.csv" | "exemplo-negocios.csv"`.
- Produces (`useImportacoes.ts`): `CHAVE_DAS_IMPORTACOES`, `useImportacoes(tipo, pagina, perguntarRapido)`, `useImportacao(id)`, `useLinhasDaImportacao(id, quais)`, `useDestinosDaImportacao(ativo)` (→ `DestinoDaImportacao[]`), `useCriarImportacao()`, `useResolverLinha(id)`, `useResolverEmLote(id)`, `useCancelarImportacao()`, `DestinoDaImportacao` (`{ id; nome; grupo: string | null; etapas: Array<{ id; nome }>; motivos: Array<{ valor; rotulo }> }`).
- Rota: `GET /api/v1/importacoes/destinos` (gerente ou acima) → `DestinoDaImportacao[]` (origens não arquivadas na ordem do quadro, com o nome do grupo, as etapas abertas e os motivos de perda; sem motivos na origem, os canônicos do original, como a 1G).

- [ ] **Step 1: Branch**

```bash
cd "/c/Documentos/projetos claude/Deskcom CRM/wt-frente-b"
git fetch escale-crm
git switch -c feat/fase-2f-importacao-assistente escale-crm/main
ls lib/escale/importacao
```

Expected: `aplicar.ts banco.ts classificar.ts contexto.ts executar.ts handler.ts linhas.ts mapeamento.ts regras.ts textos.ts tipos.ts` (o PR A na `main`). Sem eles, PARE.

- [ ] **Step 2: As peças e os passos**

```bash
git mv components/escale/quadro/PassosDaImportacao.tsx components/escale/importacao/PassosDaImportacao.tsx
```

No arquivo movido, troque o cabeçalho do comentário para "(fork Escale, Fase 1E; generalizado na 2F)". O conteúdo não muda.

Create `components/escale/importacao/pecas.tsx` (as peças que a 1E tinha soltas em `JanelaDeImportarNegocios` e `ConteudoDaImportacao`, com as mesmas classes):

```tsx
"use client";
import type { ReactNode } from "react";

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useT } from "@/hooks/i18n/useT";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { cn } from "@/lib/utils";

/** As peças do assistente de importação (fork Escale, Fase 2F; medidas da 1E, prints v2-06 a v2-11). */
export const TITULO = "text-[22px] leading-8 font-medium text-casca-texto";
export const SUBTITULO = "mt-1 text-[13px] leading-5 text-[#5A5964]";

const BOTAO_BASE =
  "inline-flex h-8 items-center justify-center gap-1.5 rounded-[6px] px-3.5 text-[13px] whitespace-nowrap focus-visible:outline-hidden focus-visible:ring-2 focus-visible:ring-casca-marca focus-visible:ring-offset-2";
export const BOTAO_DA_MARCA = `${BOTAO_BASE} bg-casca-marca font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:pointer-events-none disabled:opacity-45`;
export const BOTAO_DE_CONTORNO = `${BOTAO_BASE} border border-[#D9D8E0] text-casca-texto hover:bg-casca-raia disabled:pointer-events-none disabled:opacity-45`;

export function ColunaCentral({ largura, children }: { largura: string; children: ReactNode }) {
  return <div className={cn("mx-auto w-full", largura)}>{children}</div>;
}

export function Titulo({ titulo, subtitulo }: { titulo: string; subtitulo: string }) {
  return (
    <div className="text-center">
      <h2 className={TITULO}>{titulo}</h2>
      <p className={SUBTITULO}>{subtitulo}</p>
    </div>
  );
}

/** O balão escuro da Clint explica um "Continuar" desligado; o botão desligado não recebe o mouse, então o gatilho é o que o envolve. */
export function BotaoDoRodape({
  desabilitado,
  dica,
  aoClicar,
  children,
}: {
  desabilitado: boolean;
  dica?: string;
  aoClicar: () => void;
  children: ReactNode;
}) {
  const botao = (
    <button type="button" disabled={desabilitado} onClick={aoClicar} className={BOTAO_DA_MARCA}>
      {children}
    </button>
  );
  if (!desabilitado || !dica) return botao;
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span className="inline-flex">{botao}</span>
      </TooltipTrigger>
      <TooltipContent side="top">{dica}</TooltipContent>
    </Tooltip>
  );
}

/** "Contatos / Negócios": pílulas de 28px, a ativa branca com sombra curta (print 2b-41). */
export function SeletorDoTipo({
  tipo,
  aoMudar,
  desabilitado,
}: {
  tipo: TipoDeImportacao;
  aoMudar: (tipo: TipoDeImportacao) => void;
  desabilitado: boolean;
}) {
  const t = useT();
  const pilula = "h-7 rounded-[6px] px-3 text-[12px] font-medium disabled:cursor-not-allowed";
  const opcoes: Array<[TipoDeImportacao, string]> = [
    ["contato", t("Contatos")],
    ["negocio", t("Negócios")],
  ];
  return (
    <div role="tablist" className="inline-flex gap-0.5 rounded-[8px] bg-[#F4F4F7] p-0.5">
      {opcoes.map(([valor, rotulo]) => (
        <button
          key={valor}
          type="button"
          role="tab"
          aria-selected={tipo === valor}
          disabled={desabilitado}
          onClick={() => aoMudar(valor)}
          className={cn(pilula, tipo === valor ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]")}
        >
          {rotulo}
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: O exemplo .CSV (Clint `uo`)**

Create `lib/escale/importacao/exemplo.ts`:

```ts
/** O arquivo de exemplo da Clint (`uo`), gerado no navegador (fork Escale, Fase 2F). */
import type { TipoDeImportacao } from "./regras";

const DO_CONTATO = ["nome", "email", "telefone", "instagram", "empresa", "tag"];
const DO_NEGOCIO = ["titulo", "valor", "etapa", "status"];
const CONTATOS = [
  ["Maria Silva", "maria@exemplo.com", "11999990000", "@mariasilva", "Acme", "Lead quente"],
  ["João Souza", "joao@exemplo.com", "21988887777", "", "Beta Ltda", "Cliente"],
];
const NEGOCIOS = [
  ["Proposta site", "1500", "Qualificação", "OPEN"],
  ["Renovação", "900", "Negociação", "OPEN"],
];

export function csvDeExemplo(tipo: TipoDeImportacao): string {
  const negocio = tipo === "negocio";
  const cabecalho = negocio ? [...DO_CONTATO, ...DO_NEGOCIO] : DO_CONTATO;
  const linhas = CONTATOS.map((c, i) => (negocio ? [...c, ...NEGOCIOS[i]] : c));
  return [cabecalho, ...linhas].map((l) => l.join(",")).join("\n");
}

export const nomeDoExemplo = (tipo: TipoDeImportacao) => (tipo === "negocio" ? "exemplo-negocios.csv" : "exemplo-contatos.csv");
```

O status "OPEN" do exemplo é lido como Aberto: acrescente `"open"` à lista do `statusDoTexto` em `lib/escale/importacao/linhas.ts` (já está) e confira com `normalizarLinha(["OPEN"], [{csv:"s",para:"status"}], "negocio", defs).negocio?.status === "open"` no teste das linhas.

- [ ] **Step 4: Os destinos (origem, etapas e motivos)**

Create `app/api/v1/importacoes/destinos/route.ts`:

```ts
/**
 * GET /api/v1/importacoes/destinos — as origens que o passo Configurações oferece
 * (fork Escale, Fase 2F): não arquivadas, na ordem do quadro, com o grupo, as
 * etapas abertas e os motivos de perda (sem motivos na origem, os canônicos do
 * original, como a ficha da 1G). Lido com a sessão (a RLS decide). Gerente+.
 */
import { randomUUID } from "node:crypto";

import { ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { falhaInesperadaDoQuadro } from "@/lib/escale/capa/banco";
import { traduzir } from "@/lib/i18n/dicionario";
import { motivosDoFunil } from "@/lib/leads/motivos-de-perda-do-funil";
import { CANONICAL_LOST_REASONS, ROTULO_DO_MOTIVO_CANONICO } from "@/lib/schemas/leads";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type Etapa = { id: string; name: string; position: number | string; is_archived: boolean; is_won: boolean; is_lost: boolean };
type Origem = { id: string; name: string; group_id: string | null; settings: unknown; crm_stages: Etapa[] | null };

const CANONICOS = CANONICAL_LOST_REASONS.filter((m) => m in ROTULO_DO_MOTIVO_CANONICO).map((m) => ({
  valor: m,
  rotulo: ROTULO_DO_MOTIVO_CANONICO[m as keyof typeof ROTULO_DO_MOTIVO_CANONICO],
}));

export async function GET(): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "crm_importacoes" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  try {
    const sb = await createClient();
    const orgId = authz.org.orgId;
    const [origens, grupos] = await Promise.all([
      sb
        .from("crm_pipelines")
        .select("id, name, group_id, settings, crm_stages(id, name, position, is_archived, is_won, is_lost)")
        .eq("organization_id", orgId)
        .eq("is_archived", false)
        .order("position", { ascending: true }),
      sb.from("crm_pipeline_groups").select("id, name").eq("organization_id", orgId),
    ]);
    if (origens.error) throw origens.error;
    const nomeDoGrupo = new Map(((grupos.data ?? []) as Array<{ id: string; name: string }>).map((g) => [g.id, g.name]));
    return ok(
      ((origens.data ?? []) as unknown as Origem[]).map((o) => {
        const proprios = motivosDoFunil(o.settings);
        return {
          id: o.id,
          nome: o.name,
          grupo: o.group_id ? (nomeDoGrupo.get(o.group_id) ?? null) : null,
          etapas: [...(o.crm_stages ?? [])]
            .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
            .sort((a, b) => Number(a.position) - Number(b.position))
            .map((s) => ({ id: s.id, nome: s.name })),
          motivos: proprios.length > 0 ? proprios.map((m) => ({ valor: m, rotulo: m })) : CANONICOS,
        };
      }),
    );
  } catch (err) {
    return falhaInesperadaDoQuadro(err, { rota: "/api/v1/importacoes/destinos", operacao: "ler" }, t, requestId);
  }
}
```

Confira `ROTULO_DO_MOTIVO_CANONICO` em `lib/schemas/leads.ts` (L111): o motivo do sistema (`moved_to_another_pipeline`) não tem rótulo lá e fica fora pelo filtro.

- [ ] **Step 5: Os hooks**

Create `hooks/escale/useImportacoes.ts`:

```ts
"use client";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

import { apiClient } from "@/lib/api/client";
import type { Resolucao } from "@/lib/escale/importacao/classificar";
import type { Acao, Motivo } from "@/lib/escale/importacao/regras";
import { STATUS_EM_ANDAMENTO, type StatusDaLinha } from "@/lib/escale/importacao/textos";
import type { ImportacaoLida, LinhaLida, PedidoDeImportacao } from "@/lib/escale/importacao/tipos";

/** Ler e mexer nas importações (fork Escale, Fase 2F). */
export const CHAVE_DAS_IMPORTACOES = ["importacoes"] as const;
const INTERVALO_MS = 5000;

export type DestinoDaImportacao = {
  id: string;
  nome: string;
  grupo: string | null;
  etapas: Array<{ id: string; nome: string }>;
  motivos: Array<{ valor: string; rotulo: string }>;
};

const emAndamento = (lista: readonly ImportacaoLida[] | undefined) =>
  (lista ?? []).some((i) => STATUS_EM_ANDAMENTO.includes(i.status));

/** A lista: pergunta a cada 5 s enquanto há importação na fila ou rodando, ou quando `perguntarRapido` (30 s depois de criar). */
export function useImportacoes(tipo: "todas" | "contato" | "negocio", pagina: number, perguntarRapido: boolean) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "lista", tipo, pagina],
    queryFn: async () =>
      (await apiClient.get<{ data: { itens: ImportacaoLida[]; total: number } }>(`/api/v1/importacoes?tipo=${tipo}&p=${pagina}`)).data,
    refetchInterval: (q) => (perguntarRapido || emAndamento(q.state.data?.itens) ? INTERVALO_MS : false),
  });
}

export function useImportacao(id: string) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "uma", id],
    queryFn: async () => (await apiClient.get<{ data: ImportacaoLida }>(`/api/v1/importacoes/${id}`)).data,
    refetchInterval: (q) => (q.state.data && STATUS_EM_ANDAMENTO.includes(q.state.data.status) ? INTERVALO_MS : false),
  });
}

export function useLinhasDaImportacao(id: string, quais: "revisar" | "relatorio") {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "linhas", id, quais],
    queryFn: async () => (await apiClient.get<{ data: LinhaLida[] }>(`/api/v1/importacoes/${id}/linhas?quais=${quais}`)).data,
  });
}

export function useDestinosDaImportacao(ativo: boolean) {
  return useQuery({
    queryKey: [...CHAVE_DAS_IMPORTACOES, "destinos"],
    queryFn: async () => (await apiClient.get<{ data: DestinoDaImportacao[] }>("/api/v1/importacoes/destinos")).data,
    enabled: ativo,
    staleTime: 60_000,
  });
}

/** Multipart (o arquivo vai inteiro): por isso `fetch` e não o `apiClient`. Um proxy (413, 502) responde HTML, não JSON. */
export function useCriarImportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ arquivo, pedido }: { arquivo: File; pedido: PedidoDeImportacao }) => {
      const form = new FormData();
      form.append("arquivo", arquivo);
      form.append("pedido", JSON.stringify(pedido));
      const res = await fetch("/api/v1/importacoes", { method: "POST", body: form });
      const json = (await res.json().catch(() => null)) as { data?: { id: string; total: number }; error?: { message?: string } } | null;
      if (res.status === 413) throw new Error("O arquivo passa de 25 MB.");
      if (!res.ok || !json?.data) throw new Error(json?.error?.message ?? "Não foi possível iniciar a importação.");
      return json.data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}

export function useResolverLinha(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ linhaId, resolucao }: { linhaId: string; resolucao: Resolucao }) =>
      (
        await apiClient.post<{ data: { status: StatusDaLinha; motivo: Motivo | null; importacao: string } }>(
          `/api/v1/importacoes/${id}/linhas/${linhaId}/resolver`,
          resolucao,
        )
      ).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: [...CHAVE_DAS_IMPORTACOES, "uma", id] }),
  });
}

export function useResolverEmLote(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (lote: { motivo: Motivo; acao: Acao }) =>
      (await apiClient.post<{ data: { linhas: number } }>(`/api/v1/importacoes/${id}/resolver-em-lote`, lote)).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}

export function useCancelarImportacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => (await apiClient.post<{ data: { status: string } }>(`/api/v1/importacoes/${id}/cancelar`, {})).data,
    onSuccess: () => qc.invalidateQueries({ queryKey: CHAVE_DAS_IMPORTACOES }),
  });
}
```

- [ ] **Step 6: O passo Arquivo (prints 2b-41, v2-06 e v2-07)**

Create `components/escale/importacao/PassoArquivo.tsx` — o `PassoArquivo` da 1E (mesmas classes, linhas 92–178 de `components/escale/quadro/ConteudoDaImportacao.tsx`) com estas mudanças: o seletor do tipo liga; o título muda com o tipo; o exemplo é gerado no navegador; "Enviando arquivo…" enquanto lê o cabeçalho (com o `Loader2` girando no quadrado roxo):

```tsx
"use client";
import { useState, type DragEvent } from "react";

import { useT } from "@/hooks/i18n/useT";
import { csvDeExemplo, nomeDoExemplo } from "@/lib/escale/importacao/exemplo";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { CheckCircle2, CloudUpload, Download, Loader2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, SeletorDoTipo, TITULO } from "./pecas";

function baixarExemplo(tipo: TipoDeImportacao) {
  const url = URL.createObjectURL(new Blob([csvDeExemplo(tipo)], { type: "text/csv;charset=utf-8;" }));
  const a = document.createElement("a");
  a.href = url;
  a.download = nomeDoExemplo(tipo);
  a.click();
  URL.revokeObjectURL(url);
}

export function PassoArquivo({
  tipo,
  aoMudarTipo,
  travarTipo,
  nomeDoArquivo,
  lendo,
  erro,
  aoEscolher,
}: {
  tipo: TipoDeImportacao;
  aoMudarTipo: (tipo: TipoDeImportacao) => void;
  travarTipo: boolean;
  nomeDoArquivo: string | null;
  lendo: boolean;
  erro: string | null;
  aoEscolher: (arquivo: File) => void;
}) {
  const t = useT();
  const [arrastando, setArrastando] = useState(false);
  const pronto = nomeDoArquivo !== null && !lendo;

  function soltar(e: DragEvent<HTMLLabelElement>) {
    e.preventDefault();
    setArrastando(false);
    const arquivo = e.dataTransfer.files[0];
    if (arquivo) aoEscolher(arquivo);
  }

  return (
    <ColunaCentral largura="max-w-[640px]">
      <SeletorDoTipo tipo={tipo} aoMudar={aoMudarTipo} desabilitado={travarTipo || lendo} />
      <h2 className={cn(TITULO, "mt-9")}>
        {tipo === "negocio" ? t("Escolha o arquivo .CSV para criar negócios") : t("Escolha o arquivo .CSV para criar contatos")}
      </h2>
      <p className="mt-3 text-[13px] leading-5 text-[#5A5964]">
        {t(
          "Seu arquivo precisa ter os campos importantes para mapear com a plataforma. No próximo passo você liga cada coluna a um campo da Escale OS.",
        )}
      </p>
      <button
        type="button"
        onClick={() => baixarExemplo(tipo)}
        className="mt-2 inline-flex items-center gap-1.5 text-[13px] text-casca-marca hover:underline"
      >
        <Download size={14} aria-hidden />
        {t("Baixar arquivo de exemplo .CSV")}
      </button>
      <label
        onDragOver={(e) => {
          e.preventDefault();
          setArrastando(true);
        }}
        onDragLeave={() => setArrastando(false)}
        onDrop={soltar}
        className={cn(
          "mt-8 flex h-[76px] cursor-pointer items-center gap-4 rounded-[8px] border border-dashed px-4 focus-within:ring-2 focus-within:ring-casca-marca",
          pronto ? "border-[#2FB36B] bg-[#EEFBF2]" : "border-[#E4E4E9] bg-[#F8F8FA]",
          arrastando && "border-casca-marca",
        )}
      >
        <input
          type="file"
          accept=".csv,text/csv"
          aria-label={t("Arquivo .CSV")}
          className="sr-only"
          disabled={lendo}
          onChange={(e) => {
            const arquivo = e.target.files?.[0];
            e.target.value = "";
            if (arquivo) aoEscolher(arquivo);
          }}
        />
        <span
          aria-hidden
          className={cn("grid size-11 shrink-0 place-items-center rounded-[6px] text-white", pronto ? "bg-[#2FB36B]" : "bg-casca-marca")}
        >
          {lendo ? <Loader2 size={20} className="animate-spin" /> : pronto ? <CheckCircle2 size={22} /> : <CloudUpload size={22} />}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-[13px] leading-5 font-medium text-casca-texto">
            {pronto ? nomeDoArquivo : lendo ? t("Enviando arquivo…") : t("Arraste o arquivo aqui ou clique para selecionar")}
          </span>
          <span className="block text-[12px] leading-5 text-[#5A5964]">{pronto ? t("Pronto para mapear") : t("Formato .CSV")}</span>
        </span>
      </label>
      {erro ? (
        <p role="alert" className="mt-3 text-[12px] text-casca-alerta">
          {erro}
        </p>
      ) : null}
    </ColunaCentral>
  );
}
```

Em `lib/ui/icons-da-casca.ts`, acrescente `Shield` (o ícone do Conservador, Clint `qe`) ao último `export { … } from "lucide-react"`.

- [ ] **Step 7: O teste do passo (vai falhar antes do Step 6)**

Create `tests/unit/escale-importacao-passo-arquivo.test.tsx` no molde de `tests/unit/escale-janela-de-importar.test.tsx` (o mesmo `renderComT`/provedor de idioma que ele usa):

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PassoArquivo } from "@/components/escale/importacao/PassoArquivo";
import { csvDeExemplo } from "@/lib/escale/importacao/exemplo";

describe("passo Arquivo (Fase 2F; print 2b-41)", () => {
  it("Contatos: o título de contatos e a troca para Negócios", () => {
    const aoMudarTipo = vi.fn();
    render(<PassoArquivo tipo="contato" aoMudarTipo={aoMudarTipo} travarTipo={false} nomeDoArquivo={null} lendo={false} erro={null} aoEscolher={vi.fn()} />);
    expect(screen.getByRole("heading", { name: "Escolha o arquivo .CSV para criar contatos" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("tab", { name: "Negócios" }));
    expect(aoMudarTipo).toHaveBeenCalledWith("negocio");
  });

  it("travado (vindo do quadro): a troca fica desligada", () => {
    render(<PassoArquivo tipo="negocio" aoMudarTipo={vi.fn()} travarTipo nomeDoArquivo={null} lendo={false} erro={null} aoEscolher={vi.fn()} />);
    expect(screen.getByRole("tab", { name: "Contatos" })).toBeDisabled();
  });

  it("arquivo pronto e o erro", () => {
    render(<PassoArquivo tipo="contato" aoMudarTipo={vi.fn()} travarTipo={false} nomeDoArquivo="a.csv" lendo={false} erro="Selecione um arquivo .CSV válido." aoEscolher={vi.fn()} />);
    expect(screen.getByText("a.csv")).toBeInTheDocument();
    expect(screen.getByText("Pronto para mapear")).toBeInTheDocument();
    expect(screen.getByRole("alert")).toHaveTextContent("Selecione um arquivo .CSV válido.");
  });

  it("o exemplo da Clint", () => {
    expect(csvDeExemplo("contato").split("\n")[0]).toBe("nome,email,telefone,instagram,empresa,tag");
    expect(csvDeExemplo("negocio").split("\n")[0]).toBe("nome,email,telefone,instagram,empresa,tag,titulo,valor,etapa,status");
  });
});
```

Se o teste da 1E envolve a tela num provedor (ex.: `TooltipProvider` ou o de idioma), use o mesmo aqui.

- [ ] **Step 8: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-passo-arquivo.test.tsx
corepack pnpm exec eslint components/escale/importacao hooks/escale/useImportacoes.ts lib/escale/importacao/exemplo.ts app/api/v1/importacoes/destinos lib/ui/icons-da-casca.ts
git add -A components/escale/importacao components/escale/quadro hooks/escale/useImportacoes.ts lib/escale/importacao/exemplo.ts app/api/v1/importacoes/destinos lib/ui/icons-da-casca.ts tests/unit/escale-importacao-passo-arquivo.test.tsx
git commit -m "feat(escale): peças do assistente, passo Arquivo com Contatos e Negócios, destinos e hooks (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

O `PassosDaImportacao` foi movido: o import em `JanelaDeImportarNegocios.tsx` (que sai na Task 14) passa a apontar para `@/components/escale/importacao/PassosDaImportacao` agora, para o typecheck seguir verde até lá.

### Task 11: O passo Mapeamento (print v2-08)

**Files:**
- Create: `components/escale/importacao/PassoMapeamento.tsx`, `tests/unit/escale-importacao-passo-mapeamento.test.tsx`

**Interfaces:**
- Consumes: `opcoesDoMapeamento`, `semNomeDaEmpresa`, `OpcaoDeDestino`, `CatalogosDaImportacao` (Task 2); `ColunaMapeada` (Task 1); `SeletorDaCasca` (`components/escale/ui/SeletorDaCasca.tsx`, com `grupo` e `buscaAPartirDe`); `JanelaDeGerenciarCampos` (2C).
- Produces: `PassoMapeamento({ tipo, mapa, opcoes, podeCriarCampo, aoMudar })` — `aoMudar(indice, para)`; o "+ Adicionar campo" abre `JanelaDeGerenciarCampos` com `objetoInicial` = `"contato"` (Contatos) ou `"negocio"` (Negócios), só para admin (`podeCriarCampo`); fechada, o catálogo é relido (`useCatalogoDeCampos` invalida sozinho) e as opções novas aparecem.

Diferenças para a 1E: as opções vêm agrupadas em Identificadores / Contato / Empresa / Negócio / Datas do negócio (o `grupo` do `SeletorDaCasca`), a busca aparece sempre (`buscaAPartirDe={0}`, a Clint é `searchable`), destino já usado em outra coluna some da lista (Clint `b`), e o aviso azul "Nenhuma coluna está associada ao Nome da empresa…" aparece acima da tabela quando `semNomeDaEmpresa(mapa)`.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-passo-mapeamento.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/components/escale/campos/JanelaDeGerenciarCampos", () => ({ JanelaDeGerenciarCampos: () => null }));

import { PassoMapeamento } from "@/components/escale/importacao/PassoMapeamento";
import { opcoesDoMapeamento } from "@/lib/escale/importacao/mapeamento";

const vazio = { grupos: [], campos: [] };
const opcoes = opcoesDoMapeamento("contato", { contato: vazio, empresa: vazio, negocio: vazio });

describe("passo Mapeamento (Fase 2F; print v2-08)", () => {
  it("uma linha por coluna, com o destino escolhido ou 'Não importar esse campo'", () => {
    render(
      <PassoMapeamento
        tipo="contato"
        mapa={[{ csv: "Cliente", para: "none" }, { csv: "Celular", para: "phone" }]}
        opcoes={opcoes}
        podeCriarCampo={false}
        aoMudar={vi.fn()}
      />,
    );
    expect(screen.getByRole("heading", { name: "Mapeie os campos do seu arquivo" })).toBeInTheDocument();
    expect(screen.getByText("Cliente")).toBeInTheDocument();
    expect(screen.getByRole("combobox", { name: "Campo da coluna Celular" })).toHaveTextContent("Telefone");
    expect(screen.getByRole("combobox", { name: "Campo da coluna Cliente" })).toHaveTextContent("Não importar esse campo");
    expect(screen.getByRole("button", { name: /Adicionar campo/ })).toBeDisabled();
  });

  it("o aviso sem o nome da empresa", () => {
    render(<PassoMapeamento tipo="contato" mapa={[{ csv: "Cidade", para: "org:cidade" }]} opcoes={opcoes} podeCriarCampo aoMudar={vi.fn()} />);
    expect(screen.getByText(/Nenhuma coluna está associada ao Nome da empresa/)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Adicionar campo/ })).toBeEnabled();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-passo-mapeamento.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O passo**

Create `components/escale/importacao/PassoMapeamento.tsx`:

```tsx
"use client";
import { useState } from "react";

import { JanelaDeGerenciarCampos } from "@/components/escale/campos/JanelaDeGerenciarCampos";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { semNomeDaEmpresa, type OpcaoDeDestino } from "@/lib/escale/importacao/mapeamento";
import type { ColunaMapeada, TipoDeImportacao } from "@/lib/escale/importacao/regras";
import { Columns2, Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

const ROTULO_DA_COLUNA = "text-[10px] font-medium tracking-[0.06em] text-[#86858F] uppercase";

function LinhaDoMapa({
  indice,
  coluna,
  mapa,
  opcoes,
  aoMudar,
}: {
  indice: number;
  coluna: ColunaMapeada;
  mapa: readonly ColunaMapeada[];
  opcoes: readonly OpcaoDeDestino[];
  aoMudar: (indice: number, para: string) => void;
}) {
  const t = useT();
  const nome = coluna.csv.trim() || `${t("Coluna")} ${indice + 1}`;
  const atual = coluna.para === "none" ? "" : coluna.para;
  const usados = new Set(mapa.filter((_, i) => i !== indice).map((c) => c.para));
  const lista = opcoes
    .filter((o) => !usados.has(o.valor))
    .map((o) => ({ valor: o.valor, rotulo: t(o.rotulo), grupo: t(o.grupo) }));
  return (
    <li className="grid h-14 grid-cols-[1fr_390px] items-center border-t border-[#ECEBF1] px-4 first:border-t-0">
      <span className="flex min-w-0 items-center gap-2">
        <Columns2 size={14} aria-hidden className="shrink-0 text-[#86858F]" />
        <span className={cn("truncate text-[13px]", atual ? "text-casca-texto" : "text-[#86858F]")}>{nome}</span>
      </span>
      <div className="relative">
        <SeletorDaCasca
          valor={atual}
          opcoes={lista}
          aoMudar={(v) => aoMudar(indice, v === "" ? "none" : v)}
          vazio={t("Não importar esse campo")}
          buscaAPartirDe={0}
          aria-label={`${t("Campo da coluna")} ${nome}`}
          className="h-8"
        />
        {atual ? (
          <button
            type="button"
            aria-label={`${t("Não importar esse campo")}: ${nome}`}
            onClick={() => aoMudar(indice, "none")}
            className="absolute top-1/2 right-9 grid size-5 -translate-y-1/2 place-items-center rounded-full text-[#86858F] hover:text-casca-texto"
          >
            <X size={14} aria-hidden />
          </button>
        ) : (
          <X size={14} aria-hidden className="pointer-events-none absolute top-1/2 right-9.5 -translate-y-1/2 text-[#86858F]" />
        )}
      </div>
    </li>
  );
}

export function PassoMapeamento({
  tipo,
  mapa,
  opcoes,
  podeCriarCampo,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  opcoes: readonly OpcaoDeDestino[];
  podeCriarCampo: boolean;
  aoMudar: (indice: number, para: string) => void;
}) {
  const t = useT();
  const [criando, setCriando] = useState(false);
  return (
    <>
      <Titulo titulo={t("Mapeie os campos do seu arquivo")} subtitulo={t("Ligue cada coluna do seu arquivo a um campo da Escale OS.")} />
      <ColunaCentral largura="max-w-[720px]">
        <div className="mt-4 mb-3 flex justify-end">
          <button
            type="button"
            disabled={!podeCriarCampo}
            title={podeCriarCampo ? undefined : t("Disponível para administrador.")}
            onClick={() => setCriando(true)}
            className="inline-flex items-center gap-1.5 text-[13px] font-medium text-casca-marca disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar campo")}
          </button>
        </div>
        {semNomeDaEmpresa(mapa) ? (
          <p role="status" className="mb-3 rounded-[8px] bg-[#EFF3FF] px-3 py-2 text-[12px] leading-5 text-[#2F4A9A]">
            {t(
              "Nenhuma coluna está associada ao Nome da empresa. Os campos da empresa vão para a empresa atual do contato ou para uma nova empresa sem nome.",
            )}
          </p>
        ) : null}
        <div className="overflow-hidden rounded-[8px] border border-[#ECEBF1]">
          <div className="grid h-8 grid-cols-[1fr_390px] items-center bg-[#FAFAFC] px-4">
            <span className={ROTULO_DA_COLUNA}>{t("Coluna do arquivo")}</span>
            <span className={ROTULO_DA_COLUNA}>{t("Mapear para")}</span>
          </div>
          <ul>
            {mapa.map((coluna, i) => (
              <LinhaDoMapa key={`${coluna.csv}-${i}`} indice={i} coluna={coluna} mapa={mapa} opcoes={opcoes} aoMudar={aoMudar} />
            ))}
          </ul>
        </div>
      </ColunaCentral>
      {criando ? (
        <JanelaDeGerenciarCampos aberta aoFechar={() => setCriando(false)} objetoInicial={tipo === "negocio" ? "negocio" : "contato"} />
      ) : null}
    </>
  );
}
```

O azul do aviso (`#EFF3FF` / `#2F4A9A`) é o `status="info" variant="subtle"` da Clint; se a casca já tiver um token de aviso informativo (procure `casca-info` em `app/globals.css`), use o token no lugar dos dois hexadecimais (cerca `tailwind-tokens`).

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-passo-mapeamento.test.tsx
corepack pnpm exec eslint components/escale/importacao/PassoMapeamento.tsx
git add components/escale/importacao/PassoMapeamento.tsx tests/unit/escale-importacao-passo-mapeamento.test.tsx
git commit -m "feat(escale): passo Mapeamento com grupos, busca, Adicionar campo e o aviso da empresa (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 12: O passo Configurações (print v2-09)

**Files:**
- Create: `components/escale/importacao/PassoConfiguracoes.tsx`, `tests/unit/escale-importacao-passo-configuracoes.test.tsx`

**Interfaces:**
- Consumes: `Configuracao` (Task 6); `DestinoDaImportacao` (Task 10); `useContactTagVocabulary` (`hooks/contacts/useContactTagVocabulary.ts`), `useAuth` (`hooks/auth/AuthProvider.tsx`); `normalizarTags`; `CaixaDaCasca`, `PainelSuspenso`, `SeletorDaCasca`; os ícones `CircleMinus`, `CheckCircle2`, `CircleX`, `Plus`, `X`.
- Produces: `PassoConfiguracoes({ tipo, config, destinos, podeGanhar, aoMudar })` e `podeContinuarConfiguracoes(tipo, config)` → `boolean`.

O passo da 1E (`PassoConfiguracoes`, linhas 375–469 de `ConteudoDaImportacao.tsx`) com:
- **Tags do contato:** as do vocabulário da organização (`useContactTagVocabulary(activeOrg.orgId)`), com busca, e "Criar a tag "{tag}"" quando o texto digitado não existe (Clint `canCreate`); as escolhidas em chips com o X. Em Contatos o subtítulo é "Etiquete os contatos importados. Vale para todas as linhas do arquivo.".
- **Só em Negócios:** "Origem de destino" (o `SeletorDaCasca` com `grupo` = o nome do grupo ou "Sem grupo", busca sempre), "Etapa inicial padrão*" (nasce na primeira etapa aberta da origem; desligada sem origem; sem etapa, o erro "Selecione a etapa para continuar."), "Status" (Aberto, Ganho, Perdido — Ganho desligado com a dica "Só administrador importa negócio ganho." para quem não é admin) e, em Perdido, "Motivo de perda" ("Não informar" e os motivos da origem).

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-passo-configuracoes.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1" } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: ["vip", "feira"] }) }));

import { PassoConfiguracoes, podeContinuarConfiguracoes } from "@/components/escale/importacao/PassoConfiguracoes";

const destinos = [
  { id: "o-1", nome: "Leads INSS Whatsapp", grupo: null, etapas: [{ id: "e-1", nome: "1. Entrada Lead" }], motivos: [{ valor: "price", rotulo: "Preço" }] },
];
const base = { tags: [], origemId: null, etapaId: null, status: "open" as const, motivoDePerda: null };

describe("passo Configurações (Fase 2F; print v2-09)", () => {
  it("Contatos: só as tags, com o subtítulo de contatos", () => {
    render(<PassoConfiguracoes tipo="contato" config={base} destinos={[]} podeGanhar={false} aoMudar={vi.fn()} />);
    expect(screen.getByText("Etiquete os contatos importados. Vale para todas as linhas do arquivo.")).toBeInTheDocument();
    expect(screen.queryByText("Origem de destino")).not.toBeInTheDocument();
  });

  it("Negócios: escolher a origem leva à primeira etapa; Ganho desligado para quem não é admin", () => {
    const aoMudar = vi.fn();
    render(<PassoConfiguracoes tipo="negocio" config={base} destinos={destinos} podeGanhar={false} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("combobox", { name: "Origem de destino" }));
    fireEvent.click(screen.getByRole("option", { name: "Leads INSS Whatsapp" }));
    expect(aoMudar).toHaveBeenCalledWith({ ...base, origemId: "o-1", etapaId: "e-1", motivoDePerda: null });
    expect(screen.getByRole("button", { name: /Ganho/ })).toBeDisabled();
  });

  it("Perdido mostra o motivo; continuar exige origem e etapa em Negócios", () => {
    render(
      <PassoConfiguracoes tipo="negocio" config={{ ...base, origemId: "o-1", etapaId: "e-1", status: "lost" }} destinos={destinos} podeGanhar aoMudar={vi.fn()} />,
    );
    expect(screen.getByRole("combobox", { name: "Motivo de perda" })).toHaveTextContent("Não informar");
    expect(podeContinuarConfiguracoes("negocio", base)).toBe(false);
    expect(podeContinuarConfiguracoes("negocio", { ...base, origemId: "o-1", etapaId: "e-1" })).toBe(true);
    expect(podeContinuarConfiguracoes("contato", base)).toBe(true);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-passo-configuracoes.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O passo**

Create `components/escale/importacao/PassoConfiguracoes.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useContactTagVocabulary } from "@/hooks/contacts/useContactTagVocabulary";
import { useT } from "@/hooks/i18n/useT";
import type { DestinoDaImportacao } from "@/hooks/escale/useImportacoes";
import { normalizarTags } from "@/lib/contacts/tag-normalizada";
import type { TipoDeImportacao } from "@/lib/escale/importacao/regras";
import type { Configuracao } from "@/lib/escale/importacao/tipos";
import { CheckCircle2, CircleMinus, CircleX, Plus, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

export function podeContinuarConfiguracoes(tipo: TipoDeImportacao, config: Configuracao): boolean {
  return tipo === "contato" || (!!config.origemId && !!config.etapaId);
}

function Campo({ rotulo, obrigatorio, erro, children }: { rotulo: string; obrigatorio?: boolean; erro?: string | null; children: ReactNode }) {
  return (
    <div className="mt-6">
      <p className="mb-2 text-[13px] leading-5 font-medium text-casca-texto">
        {rotulo}
        {obrigatorio ? (
          <span aria-hidden className="ml-1 text-casca-alerta">
            *
          </span>
        ) : null}
      </p>
      {children}
      {erro ? <p className="mt-1 text-[12px] text-casca-alerta">{erro}</p> : null}
    </div>
  );
}

function EscolhaDeTags({ escolhidas, aoMudar }: { escolhidas: readonly string[]; aoMudar: (tags: string[]) => void }) {
  const t = useT();
  const { activeOrg } = useAuth();
  const vocabulario = useContactTagVocabulary(activeOrg?.orgId ?? null).data ?? [];
  const [busca, setBusca] = useState("");
  const nova = normalizarTags([busca])[0] ?? "";
  const lista = vocabulario.filter((tag) => tag.includes(busca.trim().toLowerCase()));
  const alternar = (tag: string, marcada: boolean) => aoMudar(marcada ? [...escolhidas, tag] : escolhidas.filter((x) => x !== tag));
  return (
    <div className="mt-3 flex flex-wrap items-center gap-2">
      <Popover>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="inline-flex h-8 items-center gap-2 rounded-[6px] border border-[#D9D8E0] px-3 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
          >
            <Plus size={14} aria-hidden />
            {t("Adicionar tag")}
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-64 p-2" sideOffset={6}>
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar tag")}
            aria-label={t("Buscar tag")}
            className="mb-2 h-8 w-full rounded-[6px] bg-casca-busca px-2 text-[12px] outline-hidden"
          />
          <ul className="max-h-60 space-y-2 overflow-y-auto p-1">
            {lista.map((tag) => (
              <li key={tag}>
                <CaixaDaCasca marcada={escolhidas.includes(tag)} aoMudar={(m) => alternar(tag, m)} rotulo={tag} />
              </li>
            ))}
          </ul>
          {nova && !vocabulario.includes(nova) && !escolhidas.includes(nova) ? (
            <button
              type="button"
              onClick={() => {
                aoMudar([...escolhidas, nova]);
                setBusca("");
              }}
              className="mt-1 w-full rounded-[6px] px-2 py-1.5 text-left text-[12px] text-casca-marca hover:bg-casca-raia"
            >
              {t("Criar a tag")} &quot;{nova}&quot;
            </button>
          ) : null}
        </PainelSuspenso>
      </Popover>
      {escolhidas.map((tag) => (
        <span
          key={tag}
          className="inline-flex h-6 items-center gap-1 rounded-full bg-casca-marca-suave pr-1 pl-2.5 text-[12px] font-medium text-casca-marca"
        >
          <span>{tag}</span>
          <button
            type="button"
            aria-label={`${t("Remover tag")} ${tag}`}
            onClick={() => alternar(tag, false)}
            className="grid size-4 place-items-center rounded-full hover:bg-white"
          >
            <X size={12} aria-hidden />
          </button>
        </span>
      ))}
    </div>
  );
}

const STATUS_BASE = "flex h-10 items-center justify-center gap-2 rounded-[6px] border text-[13px] disabled:cursor-not-allowed disabled:opacity-60";

export function PassoConfiguracoes({
  tipo,
  config,
  destinos,
  podeGanhar,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  config: Configuracao;
  destinos: readonly DestinoDaImportacao[];
  podeGanhar: boolean;
  aoMudar: (config: Configuracao) => void;
}) {
  const t = useT();
  const origem = destinos.find((d) => d.id === config.origemId) ?? null;
  const semGrupo = t("Sem grupo");
  const status: Array<{ valor: Configuracao["status"]; rotulo: string; icone: ReactNode; cor: string; desligado: boolean }> = [
    { valor: "open", rotulo: t("Aberto"), icone: <CircleMinus size={16} aria-hidden />, cor: "text-casca-marca", desligado: false },
    { valor: "won", rotulo: t("Ganho"), icone: <CheckCircle2 size={16} aria-hidden />, cor: "text-[#1F9D55]", desligado: !podeGanhar },
    { valor: "lost", rotulo: t("Perdido"), icone: <CircleX size={16} aria-hidden />, cor: "text-[#D1264F]", desligado: false },
  ];
  return (
    <>
      <Titulo
        titulo={t("Configurações da importação")}
        subtitulo={
          tipo === "negocio"
            ? t("Origem, etapa e status padrão dos negócios e a etiqueta aplicada aos contatos.")
            : t("Etiquete os contatos importados. Vale para todas as linhas do arquivo.")
        }
      />
      <ColunaCentral largura="max-w-[560px]">
        <div className="mt-5">
          <p className="text-[13px] leading-5 font-medium text-casca-texto">{t("Tags do contato")}</p>
          <p className="text-[12px] leading-5 text-[#5A5964]">{t("Opcional. Aplicada a todos os contatos criados ou atualizados nesta importação.")}</p>
          <EscolhaDeTags escolhidas={config.tags} aoMudar={(tags) => aoMudar({ ...config, tags })} />
        </div>
        {tipo === "negocio" ? (
          <>
            <Campo rotulo={t("Origem de destino")}>
              <SeletorDaCasca
                valor={config.origemId ?? ""}
                opcoes={destinos.map((d) => ({ valor: d.id, rotulo: d.nome, grupo: d.grupo ?? semGrupo }))}
                aoMudar={(v) => {
                  const nova = destinos.find((d) => d.id === v);
                  aoMudar({ ...config, origemId: nova?.id ?? null, etapaId: nova?.etapas[0]?.id ?? null, motivoDePerda: null });
                }}
                vazio={t("Selecione a origem")}
                vazioSoNoGatilho
                buscaAPartirDe={0}
                aria-label={t("Origem de destino")}
                className="h-8"
              />
            </Campo>
            <Campo
              rotulo={t("Etapa inicial padrão")}
              obrigatorio
              erro={config.origemId && !config.etapaId ? t("Selecione a etapa para continuar.") : null}
            >
              <SeletorDaCasca
                valor={config.etapaId ?? ""}
                opcoes={(origem?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }))}
                aoMudar={(v) => aoMudar({ ...config, etapaId: v || null })}
                vazio={t("Selecione a etapa")}
                vazioSoNoGatilho
                desabilitado={!origem}
                aria-label={t("Etapa inicial padrão")}
                className="h-8"
              />
            </Campo>
            <Campo rotulo={t("Status")}>
              <div className="grid grid-cols-3 gap-2">
                {status.map((s) => {
                  const botao = (
                    <button
                      key={s.valor}
                      type="button"
                      aria-pressed={config.status === s.valor}
                      disabled={s.desligado}
                      onClick={() => aoMudar({ ...config, status: s.valor, motivoDePerda: s.valor === "lost" ? config.motivoDePerda : null })}
                      className={cn(
                        STATUS_BASE,
                        s.cor,
                        config.status === s.valor ? "border-casca-marca bg-casca-marca-suave" : "border-[#E4E4E9]",
                      )}
                    >
                      {s.icone}
                      {s.rotulo}
                    </button>
                  );
                  return s.desligado ? (
                    <Tooltip key={s.valor}>
                      <TooltipTrigger asChild>
                        <span className="inline-flex [&>button]:w-full">{botao}</span>
                      </TooltipTrigger>
                      <TooltipContent side="top">{t("Só administrador importa negócio ganho.")}</TooltipContent>
                    </Tooltip>
                  ) : (
                    botao
                  );
                })}
              </div>
            </Campo>
            {config.status === "lost" ? (
              <Campo rotulo={t("Motivo de perda")}>
                <SeletorDaCasca
                  valor={config.motivoDePerda ?? ""}
                  opcoes={(origem?.motivos ?? []).map((m) => ({ valor: m.valor, rotulo: t(m.rotulo) }))}
                  aoMudar={(v) => aoMudar({ ...config, motivoDePerda: v || null })}
                  vazio={t("Não informar")}
                  aria-label={t("Motivo de perda")}
                  className="h-8"
                />
              </Campo>
            ) : null}
          </>
        ) : null}
      </ColunaCentral>
    </>
  );
}
```

O teste do Step 1 roda dentro de um `TooltipProvider` (o tooltip do Ganho): envolva o `render` com `<TooltipProvider>` de `@/components/ui/tooltip`, como o teste da 1E.

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-passo-configuracoes.test.tsx
corepack pnpm exec eslint components/escale/importacao/PassoConfiguracoes.tsx
git add components/escale/importacao/PassoConfiguracoes.tsx tests/unit/escale-importacao-passo-configuracoes.test.tsx
git commit -m "feat(escale): passo Configurações — tags, origem, etapa, status e motivo de perda (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 13: O passo Decisões (print v2-10)

**Files:**
- Create: `components/escale/importacao/PassoDecisoes.tsx`, `tests/unit/escale-importacao-passo-decisoes.test.tsx`

**Interfaces:**
- Consumes: `CATEGORIAS`, `NIVEIS`, `REGRAS`, `contagemDasDecisoes`, `decisoesDoNivel`, `nivelDasDecisoes`, `opcoesDaSituacao`, `situacoesAjustaveis`, `situacoesTravadas`, `Decisoes`, `Nivel` (Task 1); `ROTULO_DO_MOTIVO`, `ROTULO_DO_NIVEL`, `rotuloDaAcao` (Task 1); os ícones `Shield`, `SlidersHorizontal`, `Zap`, `Check`, `Flag`.
- Produces: `PassoDecisoes({ tipo, mapa, decisoes, aoMudar })`.

O passo (Clint `eo`, `Qt`, `Zt`; medidas na tabela "Medidas das telas sem print"): título "Escolha o nível de automação" e o subtítulo; os três cartões (Conservador com "RECOMENDADO"; cada um com o ícone, o texto e "{n} auto" / "{n} revisar" da conta daquele nível); "Ajuste cada situação" com "Partindo do preset "{nível}"" ou "Personalizado — você alterou um preset"; a caixa com as categorias que têm situação aplicável, cada situação com a bolinha da gravidade, o nome, a descrição e os botões (`opcoesDaSituacao`, rótulo curto); o resumo "auto-resolvem" / "vão para revisão" e a nota das travadas. Clicar num cartão troca todas as decisões pelas do nível; clicar num botão muda só aquela situação.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-importacao-passo-decisoes.test.tsx`:

```tsx
import { fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { PassoDecisoes } from "@/components/escale/importacao/PassoDecisoes";
import { decisoesDoNivel } from "@/lib/escale/importacao/regras";

const mapa = [
  { csv: "Celular", para: "phone" },
  { csv: "Email", para: "email" },
];

describe("passo Decisões (Fase 2F; print v2-10)", () => {
  it("os três níveis com as contagens do print", () => {
    render(<PassoDecisoes tipo="negocio" mapa={mapa} decisoes={decisoesDoNivel("conservador")} aoMudar={vi.fn()} />);
    const conservador = screen.getByRole("button", { name: /Conservador/ });
    expect(within(conservador).getByText("Recomendado")).toBeInTheDocument();
    expect(conservador).toHaveTextContent("2 auto");
    expect(conservador).toHaveTextContent("6 revisar");
    expect(screen.getByRole("button", { name: /Padrão/ })).toHaveTextContent("4 auto");
    expect(screen.getByRole("button", { name: /Agressivo/ })).toHaveTextContent("2 revisar");
    expect(screen.getByText('Partindo do preset "Conservador"')).toBeInTheDocument();
  });

  it("escolher um nível troca tudo; um botão muda só a situação", () => {
    const aoMudar = vi.fn();
    render(<PassoDecisoes tipo="negocio" mapa={mapa} decisoes={decisoesDoNivel("conservador")} aoMudar={aoMudar} />);
    fireEvent.click(screen.getByRole("button", { name: /Padrão/ }));
    expect(aoMudar).toHaveBeenLastCalledWith(decisoesDoNivel("padrao"));
    const telefone = screen.getByRole("group", { name: "Telefone inválido" });
    fireEvent.click(within(telefone).getByRole("button", { name: "Descartar" }));
    expect(aoMudar).toHaveBeenLastCalledWith({ ...decisoesDoNivel("conservador"), INVALID_PHONE_FORMAT: "SKIP_ROW" });
  });

  it("Contatos sem telefone: as situações de telefone e de negócio somem; a nota das travadas também", () => {
    render(<PassoDecisoes tipo="contato" mapa={[{ csv: "Email", para: "email" }]} decisoes={decisoesDoNivel("conservador")} aoMudar={vi.fn()} />);
    expect(screen.queryByRole("group", { name: "Telefone inválido" })).not.toBeInTheDocument();
    expect(screen.queryByText("Negócios")).not.toBeInTheDocument();
    expect(screen.queryByText(/Linhas que batem com dois contatos/)).not.toBeInTheDocument();
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-passo-decisoes.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O passo**

Create `components/escale/importacao/PassoDecisoes.tsx`:

```tsx
"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  CATEGORIAS,
  NIVEIS,
  REGRAS,
  contagemDasDecisoes,
  decisoesDoNivel,
  nivelDasDecisoes,
  opcoesDaSituacao,
  situacoesAjustaveis,
  situacoesTravadas,
  type ColunaMapeada,
  type Decisoes,
  type Gravidade,
  type Nivel,
  type TipoDeImportacao,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, ROTULO_DO_NIVEL, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import { Check, Flag, Shield, SlidersHorizontal, Zap } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

const ICONE_DO_NIVEL: Record<Nivel, (cor: string) => ReactNode> = {
  conservador: (cor) => <Shield size={18} className={cor} aria-hidden />,
  padrao: (cor) => <SlidersHorizontal size={18} className={cor} aria-hidden />,
  agressivo: (cor) => <Zap size={18} className={cor} aria-hidden />,
};
const COR_DA_GRAVIDADE: Record<Gravidade, string> = {
  CONFIG: "bg-[#2FB36B]",
  SOFT: "bg-[#F08A24]",
  HARD: "bg-[#D1264F]",
  SOFT_LOCKED: "bg-casca-marca",
};

function CartaoDoNivel({
  nivel,
  ativo,
  tipo,
  mapa,
  aoEscolher,
}: {
  nivel: Nivel;
  ativo: boolean;
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  aoEscolher: () => void;
}) {
  const t = useT();
  const conta = contagemDasDecisoes(decisoesDoNivel(nivel), tipo, mapa);
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoEscolher}
      className={cn(
        "flex flex-1 flex-col rounded-[8px] border-[1.5px] p-4 text-left",
        ativo ? "border-casca-marca bg-casca-marca-suave shadow-sm" : "border-[#ECEBF1] bg-white",
      )}
    >
      <span className="mb-2 flex items-center gap-2">
        {ICONE_DO_NIVEL[nivel](ativo ? "text-casca-marca" : "text-[#86858F]")}
        <span className="text-[13px] font-semibold text-casca-texto">{t(ROTULO_DO_NIVEL[nivel].rotulo)}</span>
        {nivel === "conservador" ? (
          <span className="ml-auto rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-casca-marca uppercase">
            {t("Recomendado")}
          </span>
        ) : null}
      </span>
      <span className="min-h-[54px] text-[12px] leading-[1.5] text-[#5A5964]">{t(ROTULO_DO_NIVEL[nivel].texto)}</span>
      <span className="mt-2.5 flex gap-3 border-t border-[#F1F0F5] pt-2.5 text-[12px] font-semibold">
        <span className="text-[#1F9D55]">
          {conta.auto} {t("auto")}
        </span>
        <span className="text-[#C2570C]">
          {conta.revisar} {t("revisar")}
        </span>
      </span>
    </button>
  );
}

export function PassoDecisoes({
  tipo,
  mapa,
  decisoes,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  decisoes: Decisoes;
  aoMudar: (decisoes: Decisoes) => void;
}) {
  const t = useT();
  const nivel = nivelDasDecisoes(decisoes, tipo, mapa);
  const conta = contagemDasDecisoes(decisoes, tipo, mapa);
  const situacoes = situacoesAjustaveis(tipo, mapa);
  const temTravadas = situacoesTravadas(tipo, mapa).length > 0;
  return (
    <>
      <Titulo
        titulo={t("Escolha o nível de automação")}
        subtitulo={t("Decisões seguras são aplicadas sozinhas. As de risco ficam numa fila de revisão — nada é substituído sem a sua confirmação.")}
      />
      <ColunaCentral largura="max-w-[760px]">
        <div className="mt-4 flex gap-3">
          {NIVEIS.map((n) => (
            <CartaoDoNivel key={n} nivel={n} ativo={nivel === n} tipo={tipo} mapa={mapa} aoEscolher={() => aoMudar(decisoesDoNivel(n))} />
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-casca-texto">{t("Ajuste cada situação")}</p>
          <p className="text-[12px] text-[#5A5964]">
            {nivel === "personalizado"
              ? t("Personalizado — você alterou um preset")
              : t('Partindo do preset "{preset}"').replace("{preset}", t(ROTULO_DO_NIVEL[nivel].rotulo))}
          </p>
        </div>
        <div className="mt-3 overflow-hidden rounded-[8px] border border-[#ECEBF1]">
          {CATEGORIAS.map((categoria) => {
            const daCategoria = situacoes.filter((m) => REGRAS[m].categoria === categoria.id);
            if (daCategoria.length === 0) return null;
            return (
              <section key={categoria.id}>
                <h3 className="border-b border-[#F1F0F5] bg-[#FAFAFC] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[#86858F] uppercase">
                  {t(categoria.rotulo)}
                </h3>
                {daCategoria.map((m) => (
                  <div
                    key={m}
                    role="group"
                    aria-label={t(ROTULO_DO_MOTIVO[m].rotulo)}
                    className="flex items-center gap-3 border-b border-[#F1F0F5] px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", COR_DA_GRAVIDADE[REGRAS[m].gravidade])} />
                        <span className="text-[13px] font-medium text-casca-texto">{t(ROTULO_DO_MOTIVO[m].rotulo)}</span>
                      </p>
                      <p className="mt-0.5 ml-4 text-[12px] leading-[1.45] text-[#5A5964]">{t(ROTULO_DO_MOTIVO[m].descricao)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {opcoesDaSituacao(m).map((acao) => {
                        const escolhida = decisoes[m] === acao;
                        const revisar = acao === "PENDING_REVIEW";
                        return (
                          <button
                            key={acao}
                            type="button"
                            aria-pressed={escolhida}
                            onClick={() => aoMudar({ ...decisoes, [m]: acao })}
                            className={cn(
                              "inline-flex h-[30px] items-center gap-1 rounded-[6px] border px-2.5 text-[12px] font-medium whitespace-nowrap",
                              escolhida && revisar && "border-[#F08A24] bg-[#FFEBD6] text-[#C2570C]",
                              escolhida && !revisar && "border-casca-marca bg-casca-marca-suave text-casca-marca",
                              !escolhida && "border-[#ECEBF1] bg-white text-[#5A5964]",
                            )}
                          >
                            {revisar ? <Flag size={11} aria-hidden /> : null}
                            {t(rotuloDaAcao(acao, m).curto)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-[8px] border border-[#ECEBF1] bg-[#F8F8FA] px-4 py-3">
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center rounded-[6px] border border-[#BFE8CF] bg-[#EEFBF2] text-[#1F9D55]">
              <Check size={16} />
            </span>
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[16px] font-semibold text-casca-texto">{conta.auto}</span>
              <span className="text-[10px] text-[#5A5964]">{t("auto-resolvem")}</span>
            </span>
          </span>
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center rounded-[6px] border border-[#FAD3AE] bg-[#FFEBD6] text-[#C2570C]">
              <Flag size={15} />
            </span>
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[16px] font-semibold text-casca-texto">{conta.revisar}</span>
              <span className="text-[10px] text-[#5A5964]">{t("vão para revisão")}</span>
            </span>
          </span>
          {temTravadas ? (
            <p className="ml-auto max-w-[280px] text-right text-[12px] leading-[1.4] text-[#5A5964]">
              {t("Linhas que batem com dois contatos sempre vão para revisão — não dá para decidir com segurança automaticamente.")}
            </p>
          ) : null}
        </div>
      </ColunaCentral>
    </>
  );
}
```

As cores fixas (verde `#1F9D55`/`#2FB36B`, laranja `#C2570C`/`#F08A24`/`#FFEBD6`, vermelho `#D1264F`) são as que a 1E já usa para Ganho, Perdido e o aviso da Prévia; se a cerca `tailwind-tokens` recusar algum hexadecimal novo (`#BFE8CF`, `#FAD3AE`), use a mesma cor com opacidade (`border-[#2FB36B]/30`, `border-[#F08A24]/30`).

- [ ] **Step 3: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-passo-decisoes.test.tsx
corepack pnpm exec eslint components/escale/importacao/PassoDecisoes.tsx
git add components/escale/importacao/PassoDecisoes.tsx tests/unit/escale-importacao-passo-decisoes.test.tsx
git commit -m "feat(escale): passo Decisões — níveis, situações e o resumo da Clint (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 14: A Prévia, a janela inteira e as entradas (Contatos e quadro)

**Files:**
- Create: `components/escale/importacao/PassoPrevia.tsx`, `components/escale/importacao/JanelaDeImportacao.tsx`, `tests/unit/escale-janela-de-importacao.test.tsx`
- Modify: `components/escale/contatos/MenuNovoContato.tsx`, `components/escale/contatos/ListaDeContatos.tsx` (L233), `components/escale/quadro/MenuNegocioMais.tsx`, `app/app/pipelines/[id]/_client.tsx` (os trechos FORK da 1E, L55–57, L104, L226–234, L347–357), `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`
- Delete: `components/escale/quadro/JanelaDeImportarNegocios.tsx`, `components/escale/quadro/ConteudoDaImportacao.tsx`, `lib/escale/importar/mapear.ts`, `lib/escale/importar/ler-arquivo.ts`, `tests/unit/escale-importar-mapear.test.ts`, `tests/unit/escale-janela-de-importar.test.tsx`

**Interfaces:**
- Consumes: os passos (Tasks 10–13); `useCriarImportacao`, `useDestinosDaImportacao` (Task 10); `useCatalogoDeCampos` (2C); `opcoesDoMapeamento`, `sugerirMapeamento`, `mapeamentoValido` (Task 2); `lerCabecalho`, `ARQUIVO_MAX_BYTES` (Task 3); `decisoesDoNivel`, `nivelDasDecisoes`, `contagemDasDecisoes` (Task 1); `useAuth`; `roleAtLeast` (`lib/auth/types.ts`).
- Produces: `PassoPrevia({ tipo, nomeDoArquivo, mapa, decisoes })`; `JanelaDeImportacao({ aberta, aoFechar, tipoInicial, travarTipo?, origemInicial?, aoImportar? })` — `aoImportar(id)` depois que a importação nasce.

- [ ] **Step 1: A Prévia (print v2-11)**

Create `components/escale/importacao/PassoPrevia.tsx` — a `PassoPrevia` da 1E (linhas 471–530 de `ConteudoDaImportacao.tsx`, mesmas classes) com as linhas da Clint (Arquivo, Tipo, Campos mapeados, Nível de automação, Decisões) e o aviso da Clint:

```tsx
"use client";
import { useT } from "@/hooks/i18n/useT";
import {
  contagemDasDecisoes,
  nivelDasDecisoes,
  type ColunaMapeada,
  type Decisoes,
  type TipoDeImportacao,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_NIVEL, ROTULO_DO_TIPO } from "@/lib/escale/importacao/textos";
import { Flag } from "@/lib/ui/icons-da-casca";

import { ColunaCentral, Titulo } from "./pecas";

function LinhaDoResumo({ rotulo, valor }: { rotulo: string; valor: string }) {
  return (
    <div className="flex h-9 items-center justify-between border-t border-[#ECEBF1] px-4 text-[13px] first:border-t-0">
      <dt className="text-[#5A5964]">{rotulo}</dt>
      <dd className="min-w-0 truncate pl-4 text-casca-texto">{valor}</dd>
    </div>
  );
}

export function PassoPrevia({
  tipo,
  nomeDoArquivo,
  mapa,
  decisoes,
}: {
  tipo: TipoDeImportacao;
  nomeDoArquivo: string;
  mapa: readonly ColunaMapeada[];
  decisoes: Decisoes;
}) {
  const t = useT();
  const nivel = nivelDasDecisoes(decisoes, tipo, mapa);
  const conta = contagemDasDecisoes(decisoes, tipo, mapa);
  return (
    <>
      <Titulo titulo={t("Confira e confirme a importação")} subtitulo={t("Revise os detalhes antes de iniciar.")} />
      <ColunaCentral largura="max-w-[640px]">
        <dl data-testid="resumo-da-importacao" className="mt-5 rounded-[8px] border border-[#ECEBF1]">
          <LinhaDoResumo rotulo={t("Arquivo")} valor={nomeDoArquivo || "—"} />
          <LinhaDoResumo rotulo={t("Tipo")} valor={t(ROTULO_DO_TIPO[tipo])} />
          <LinhaDoResumo rotulo={t("Campos mapeados")} valor={String(mapa.filter((c) => c.para !== "none").length)} />
          <LinhaDoResumo
            rotulo={t("Nível de automação")}
            valor={nivel === "personalizado" ? t("Personalizado") : t(ROTULO_DO_NIVEL[nivel].rotulo)}
          />
          <LinhaDoResumo
            rotulo={t("Decisões")}
            valor={t("{auto} auto · {review} para revisar").replace("{auto}", String(conta.auto)).replace("{review}", String(conta.revisar))}
          />
        </dl>
        <div className="mt-5 flex gap-3 rounded-[8px] border border-[#ECEBF1] bg-[#F8F8FA] p-4">
          <span aria-hidden className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-[#FFEBD6] text-[#C2570C]">
            <Flag size={16} />
          </span>
          <div>
            <p className="text-[13px] leading-5 font-medium text-casca-texto">
              {t("A importação conclui agora; as pendências ficam para revisar depois.")}
            </p>
            <p className="text-[12px] leading-5 text-[#5A5964]">
              {t(
                "Tudo que é seguro entra imediatamente. As linhas que precisam de decisão não entram até você resolvê-las na tela de revisão — mas o resto não fica esperando.",
              )}
            </p>
          </div>
        </div>
      </ColunaCentral>
    </>
  );
}
```

- [ ] **Step 2: A janela**

Create `components/escale/importacao/JanelaDeImportacao.tsx`:

```tsx
"use client";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { toast } from "sonner";

import { DialogOverlay, DialogPortal, DialogTitle } from "@/components/ui/dialog";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@/hooks/auth/AuthProvider";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useCriarImportacao, useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import { roleAtLeast } from "@/lib/auth/types";
import { CATALOGO_VAZIO } from "@/lib/escale/campos/regras";
import { ARQUIVO_MAX_BYTES, lerCabecalho } from "@/lib/escale/importacao/linhas";
import { mapeamentoValido, opcoesDoMapeamento, sugerirMapeamento } from "@/lib/escale/importacao/mapeamento";
import { decisoesDoNivel, nivelDasDecisoes, type ColunaMapeada, type Decisoes, type TipoDeImportacao } from "@/lib/escale/importacao/regras";
import type { Configuracao } from "@/lib/escale/importacao/tipos";
import { ChevronRight, Upload } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { BOTAO_DA_MARCA, BOTAO_DE_CONTORNO, BotaoDoRodape } from "./pecas";
import { PassoArquivo } from "./PassoArquivo";
import { PassoConfiguracoes, podeContinuarConfiguracoes } from "./PassoConfiguracoes";
import { PassoDecisoes } from "./PassoDecisoes";
import { PassoMapeamento } from "./PassoMapeamento";
import { PassoPrevia } from "./PassoPrevia";
import { PassosDaImportacao } from "./PassosDaImportacao";

export interface JanelaDeImportacaoProps {
  aberta: boolean;
  aoFechar: () => void;
  tipoInicial: TipoDeImportacao;
  /** Vindo do quadro: a troca Contatos/Negócios fica presa em Negócios. */
  travarTipo?: boolean;
  /** Vindo do quadro: a origem do quadro já escolhida no passo 3. */
  origemInicial?: string | null;
  aoImportar?: (id: string) => void;
}

const CABECALHO_MAX_BYTES = 64 * 1024;

/**
 * "IMPORTAR" (fork Escale, Fase 2F; Clint "Import Studio" `go`, prints 2b-41 e
 * v2-06 a v2-11): o assistente de 5 passos para contatos e negócios. Sem X:
 * fecha por Cancelar, Esc ou clique fora. Só monta aberta, então cada uso começa
 * no passo 1.
 */
export function JanelaDeImportacao(props: JanelaDeImportacaoProps) {
  if (!props.aberta) return null;
  return <JanelaAberta {...props} />;
}

function JanelaAberta({ aoFechar, tipoInicial, travarTipo = false, origemInicial = null, aoImportar }: JanelaDeImportacaoProps) {
  const t = useT();
  const router = useRouter();
  const { activeOrg } = useAuth();
  const admin = roleAtLeast(activeOrg?.role, "admin");
  const [passo, setPasso] = useState(0);
  const [tipo, setTipo] = useState<TipoDeImportacao>(tipoInicial);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [cabecalho, setCabecalho] = useState<string[] | null>(null);
  const [lendo, setLendo] = useState(false);
  const [erroDoArquivo, setErroDoArquivo] = useState<string | null>(null);
  const [mapa, setMapa] = useState<ColunaMapeada[]>([]);
  const [config, setConfig] = useState<Configuracao>({ tags: [], origemId: origemInicial, etapaId: null, status: "open", motivoDePerda: null });
  const [decisoes, setDecisoes] = useState<Decisoes>(() => decisoesDoNivel("conservador"));
  const [erroDoEnvio, setErroDoEnvio] = useState<string | null>(null);
  const escolhaAtual = useRef(0);
  const criar = useCriarImportacao();

  const contato = useCatalogoDeCampos("contato").catalogo ?? CATALOGO_VAZIO;
  const empresa = useCatalogoDeCampos("empresa").catalogo ?? CATALOGO_VAZIO;
  const negocio = useCatalogoDeCampos("negocio", tipo === "negocio").catalogo ?? CATALOGO_VAZIO;
  const opcoes = useMemo(() => opcoesDoMapeamento(tipo, { contato, empresa, negocio }), [tipo, contato, empresa, negocio]);
  const destinos = useDestinosDaImportacao(tipo === "negocio").data ?? [];

  // A origem do quadro chega sem etapa: quando os destinos carregam, vale a primeira etapa aberta (Clint: a etapa de entrada).
  useEffect(() => {
    if (config.origemId && !config.etapaId) {
      const etapa = destinos.find((d) => d.id === config.origemId)?.etapas[0]?.id;
      if (etapa) setConfig((c) => ({ ...c, etapaId: etapa }));
    }
  }, [destinos, config.origemId, config.etapaId]);

  const rotulos = [t("Arquivo"), t("Mapeamento"), t("Configurações"), t("Decisões"), t("Prévia e confirmação")];

  async function escolherArquivo(escolhido: File) {
    const minha = ++escolhaAtual.current;
    if (!/\.csv$/i.test(escolhido.name)) {
      setErroDoArquivo(t("Selecione um arquivo .CSV válido."));
      return;
    }
    if (escolhido.size > ARQUIVO_MAX_BYTES) {
      setErroDoArquivo(t("O arquivo passa de 25 MB."));
      return;
    }
    setErroDoArquivo(null);
    setLendo(true);
    const lido = lerCabecalho(await escolhido.slice(0, CABECALHO_MAX_BYTES).arrayBuffer());
    if (minha !== escolhaAtual.current) return;
    setLendo(false);
    if (!lido || lido.length === 0) {
      setArquivo(null);
      setErroDoArquivo(t("Não foi possível ler o arquivo enviado. Envie a planilha novamente."));
      return;
    }
    setArquivo(escolhido);
    setCabecalho(lido);
    setMapa(sugerirMapeamento(lido, tipo, opcoes));
  }

  function mudarTipo(novo: TipoDeImportacao) {
    setTipo(novo);
    if (cabecalho) setMapa(sugerirMapeamento(cabecalho, novo, opcoesDoMapeamento(novo, { contato, empresa, negocio })));
  }

  async function confirmar() {
    if (!arquivo) return;
    setErroDoEnvio(null);
    try {
      const criada = await criar.mutateAsync({
        arquivo,
        pedido: { tipo, nivel: nivelDasDecisoes(decisoes, tipo, mapa), decisoes, mapeamento: mapa, configuracao: config },
      });
      toast.success(t("Importação iniciada"), {
        action: { label: t("Ver importações"), onClick: () => router.push("/app/imports") },
      });
      aoImportar?.(criada.id);
      aoFechar();
    } catch (e) {
      setErroDoEnvio(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  const podeContinuar = [
    !!arquivo && !lendo,
    mapeamentoValido(mapa, tipo),
    podeContinuarConfiguracoes(tipo, config),
    true,
  ][passo];

  function corpo(): ReactNode {
    if (passo === 0) {
      return (
        <PassoArquivo
          tipo={tipo}
          aoMudarTipo={mudarTipo}
          travarTipo={travarTipo}
          nomeDoArquivo={arquivo?.name ?? null}
          lendo={lendo}
          erro={erroDoArquivo}
          aoEscolher={(f) => void escolherArquivo(f)}
        />
      );
    }
    if (passo === 1) {
      return (
        <PassoMapeamento
          tipo={tipo}
          mapa={mapa}
          opcoes={opcoes}
          podeCriarCampo={admin}
          aoMudar={(i, para) => setMapa((atual) => atual.map((c, j) => (j === i ? { ...c, para } : c)))}
        />
      );
    }
    if (passo === 2) return <PassoConfiguracoes tipo={tipo} config={config} destinos={destinos} podeGanhar={admin} aoMudar={setConfig} />;
    if (passo === 3) return <PassoDecisoes tipo={tipo} mapa={mapa} decisoes={decisoes} aoMudar={setDecisoes} />;
    return <PassoPrevia tipo={tipo} nomeDoArquivo={arquivo?.name ?? ""} mapa={mapa} decisoes={decisoes} />;
  }

  return (
    <DialogPrimitive.Root
      open
      onOpenChange={(aberta) => {
        if (!aberta && !criar.isPending) aoFechar();
      }}
    >
      <DialogPortal>
        <DialogOverlay className="bg-black/48" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className="fixed top-[50%] left-[50%] z-50 flex h-[min(690px,calc(100dvh-2rem))] w-[min(1040px,calc(100vw-2rem))] translate-x-[-50%] translate-y-[-50%] flex-col overflow-hidden rounded-[12px] bg-surface text-casca-texto shadow-casca-painel"
        >
          <DialogTitle className="sr-only">{tipo === "negocio" ? t("Importar negócios") : t("Importar contatos")}</DialogTitle>
          <TooltipProvider delayDuration={100}>
            <PassosDaImportacao atual={passo + 1} rotulos={rotulos} />
            <div className="min-h-0 flex-1 overflow-y-auto px-6 py-6">{corpo()}</div>
            <div className="flex h-16 shrink-0 items-center justify-between border-t border-[#F1F0F5] px-6">
              <button
                type="button"
                disabled={criar.isPending}
                onClick={() => (passo === 0 ? aoFechar() : setPasso(passo - 1))}
                className={BOTAO_DE_CONTORNO}
              >
                {passo === 0 ? t("Cancelar") : t("Voltar")}
              </button>
              <div className="flex items-center gap-3">
                {erroDoEnvio ? (
                  <p role="alert" className="text-[13px] text-casca-alerta">
                    {erroDoEnvio}
                  </p>
                ) : null}
                {passo === 4 ? (
                  <button type="button" disabled={criar.isPending} onClick={() => void confirmar()} className={cn(BOTAO_DA_MARCA)}>
                    <Upload size={14} aria-hidden />
                    {t("Confirmar e importar")}
                  </button>
                ) : (
                  <BotaoDoRodape
                    desabilitado={!podeContinuar}
                    dica={passo === 1 ? t("Para continuar, ligue ao menos uma coluna ao nome, e-mail ou telefone.") : undefined}
                    aoClicar={() => setPasso(passo + 1)}
                  >
                    {t("Continuar")}
                    <ChevronRight size={14} aria-hidden />
                  </BotaoDoRodape>
                )}
              </div>
            </div>
          </TooltipProvider>
        </DialogPrimitive.Content>
      </DialogPortal>
    </DialogPrimitive.Root>
  );
}
```

Confira antes: `useCatalogoDeCampos(objeto, ativo)` devolve `{ catalogo, carregando, erro }` (2C, `hooks/escale/useCatalogoDeCampos.ts` L17); `roleAtLeast(role, min)` está em `lib/auth/types.ts` L44. A dica do "Continuar" do passo 2 é nossa (a Clint não mostra; mantém o balão que a 1E já tinha).

- [ ] **Step 3: O teste da janela (vai falhar antes do Step 2)**

Create `tests/unit/escale-janela-de-importacao.test.tsx` no molde de `tests/unit/escale-janela-de-importar.test.tsx` (o arquivo da 1E que sai neste task: copie dele o `QueryClientProvider`, o mock de `next/navigation` e o de `sonner` antes de apagá-lo):

```tsx
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));
vi.mock("@/hooks/auth/AuthProvider", () => ({ useAuth: () => ({ activeOrg: { orgId: "org-1", role: "manager" } }) }));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({ useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }) }));
vi.mock("@/hooks/contacts/useContactTagVocabulary", () => ({ useContactTagVocabulary: () => ({ data: [] }) }));
const criar = vi.fn(async () => ({ id: "imp-1", total: 1 }));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useCriarImportacao: () => ({ mutateAsync: criar, isPending: false }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";

const montar = (aoImportar = vi.fn()) =>
  render(
    <QueryClientProvider client={new QueryClient()}>
      <JanelaDeImportacao aberta aoFechar={vi.fn()} tipoInicial="contato" aoImportar={aoImportar} />
    </QueryClientProvider>,
  );

describe("JanelaDeImportacao (Fase 2F)", () => {
  it("cinco passos, do arquivo à confirmação", async () => {
    const aoImportar = vi.fn();
    montar(aoImportar);
    expect(screen.getByRole("list", { name: "Passos da importação" })).toHaveTextContent("Prévia e confirmação");
    const arquivo = new File(["Nome,Email\nAna,ana@x.com\n"], "contatos.csv", { type: "text/csv" });
    fireEvent.change(screen.getByLabelText("Arquivo .CSV"), { target: { files: [arquivo] } });
    await screen.findByText("Pronto para mapear");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByRole("combobox", { name: "Campo da coluna Email" })).toHaveTextContent("Email");
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByRole("heading", { name: "Escolha o nível de automação" })).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /Continuar/ }));
    expect(screen.getByTestId("resumo-da-importacao")).toHaveTextContent("contatos.csv");
    fireEvent.click(screen.getByRole("button", { name: /Confirmar e importar/ }));
    await waitFor(() => expect(aoImportar).toHaveBeenCalledWith("imp-1"));
    expect(criar).toHaveBeenCalledWith(
      expect.objectContaining({
        pedido: expect.objectContaining({
          tipo: "contato",
          nivel: "conservador",
          mapeamento: [
            { csv: "Nome", para: "name" },
            { csv: "Email", para: "email" },
          ],
        }),
      }),
    );
  });

  it("arquivo que não é .CSV mostra o erro", async () => {
    montar();
    fireEvent.change(screen.getByLabelText("Arquivo .CSV"), { target: { files: [new File(["x"], "planilha.xlsx")] } });
    expect(await screen.findByRole("alert")).toHaveTextContent("Selecione um arquivo .CSV válido.");
  });
});
```

O jsdom precisa de `Blob.prototype.arrayBuffer` (o `File.slice(...).arrayBuffer()`); se faltar no ambiente de teste, o teste da 1E já resolveu (ele lia o arquivo com `lerArquivoCsv`): reaproveite o mesmo polyfill do setup dele.

- [ ] **Step 4: As entradas**

`components/escale/contatos/MenuNovoContato.tsx`: tire o import de `ImportContactsDialog`; acrescente a prop `podeImportar: boolean`; o item "Importar contatos" fica `disabled={!podeImportar}` com `title={podeImportar ? undefined : t("Disponível para gerente ou acima.")}`; e no lugar da janela do original:

```tsx
import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";
```

```tsx
      <JanelaDeImportacao aberta={importar} aoFechar={() => setImportar(false)} tipoInicial="contato" />
```

`components/escale/contatos/ListaDeContatos.tsx` L233:

```tsx
          <MenuNovoContato origens={origens} podeCriar={podeCriar} podeImportar={ROLE_RANK[papel] >= ROLE_RANK.manager} />
```

`components/escale/quadro/MenuNegocioMais.tsx`: a prop nova `podeImportar: boolean`; o item "Importar negócios" ganha `disabled={!podeImportar}` e, desligado, `title={t("Disponível para gerente ou acima.")}` (o `MenuPrimitive.Item` aceita `disabled`).

`app/app/pipelines/[id]/_client.tsx`:
- import: troque `import { JanelaDeImportarNegocios } from "@/components/escale/quadro/JanelaDeImportarNegocios";` por `import { JanelaDeImportacao } from "@/components/escale/importacao/JanelaDeImportacao";` (o comentário FORK vira "Fase 1E, 2F");
- logo depois de `const podeCriar = …` (L115): `const podeImportar = ROLE_RANK[role] >= ROLE_RANK.manager; // FORK ESCALE · Fase 2F (N1)`;
- no `MenuNegocioMais`: `podeImportar={podeImportar}`;
- o trecho da janela (L347–357) vira:

```tsx
      {/* FORK ESCALE · Fase 1E, 2F: "Importar negócios" do menu "Negócio +" abre o importador na aba Negócios, nesta origem. */}
      {cascaNova ? (
        <JanelaDeImportacao
          aberta={importando}
          aoFechar={() => setImportando(false)}
          tipoInicial="negocio"
          travarTipo
          origemInicial={pipelineId}
          aoImportar={() => void refetch()}
        />
      ) : null}
```

A variável `tagsDoQuadro` só servia à janela da 1E: se o eslint acusar que ficou sem uso, apague a declaração dela.

- [ ] **Step 5: O que sai (N17)**

```bash
git rm components/escale/quadro/JanelaDeImportarNegocios.tsx components/escale/quadro/ConteudoDaImportacao.tsx lib/escale/importar/mapear.ts lib/escale/importar/ler-arquivo.ts tests/unit/escale-importar-mapear.test.ts tests/unit/escale-janela-de-importar.test.tsx
grep -rn "JanelaDeImportarNegocios\|ConteudoDaImportacao\|lib/escale/importar/" --include=*.ts --include=*.tsx . | grep -v node_modules
```

Expected: o `grep` vazio, a não ser `tests/unit/escale-quadro-do-funil-com-filtros.test.tsx`: troque nele o mock/import de `JanelaDeImportarNegocios` por `JanelaDeImportacao` de `@/components/escale/importacao/JanelaDeImportacao`.

- [ ] **Step 6: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-janela-de-importacao.test.tsx tests/unit/escale-importacao-passo-*.test.tsx tests/unit/escale-quadro-do-funil-com-filtros.test.tsx tests/unit/escale-lista-de-contatos*.test.tsx
corepack pnpm exec eslint components/escale/importacao components/escale/contatos components/escale/quadro "app/app/pipelines/[id]/_client.tsx"
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add -A components/escale/importacao components/escale/contatos components/escale/quadro "app/app/pipelines/[id]/_client.tsx" lib/escale/importar tests/unit
git commit -m "feat(escale): a janela de importação de 5 passos em Contatos e no quadro; sai o importador da 1E (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 15: Espanhol do assistente e o PR B

**Files:**
- Modify: `lib/i18n/dicionario.ts` (bloco logo ANTES de `  // ─── FORK ESCALE · Fase 1G (PR A): a ficha do negócio ───`)

- [ ] **Step 1: O bloco do PR B**

Rode de novo o script da Task 9 (`node /tmp/pares-importstudio.cjs > /tmp/pares-importstudio.txt`; se `/tmp` foi limpo, recrie o script igual). Cole, com o cabeçalho `  // ─── FORK ESCALE · Fase 2F (PR B): o assistente de importação ───`, os pares das chaves `importStudio.wizard.*`, `importStudio.upload.*`, `importStudio.map.*`, `importStudio.mapping.*`, `importStudio.settings.*`, `importStudio.dealTarget.*`, `importStudio.dealStatus.*`, `importStudio.decisions.*`, `importStudio.preview.*`, `importStudio.table.*` e `importStudio.field.*` que ainda não estão no dicionário, mais os textos nossos e os da casca que a tela usa:

```ts
  "Importar contatos": { es: "Importar contactos" },
  "Importação iniciada": { es: "Importación iniciada" },
  "Ver importações": { es: "Ver importaciones" },
  "Disponível para gerente ou acima.": { es: "Disponible para gerente o superior." },
  "Disponível para administrador.": { es: "Disponible para administrador." },
  "Para continuar, ligue ao menos uma coluna ao nome, e-mail ou telefone.": {
    es: "Para continuar, vincula al menos una columna al nombre, correo o teléfono.",
  },
  "Buscar tag": { es: "Buscar etiqueta" },
  "Criar a tag": { es: "Crear la etiqueta" },
  "Campo da coluna": { es: "Campo de la columna" },
  "Arquivo .CSV": { es: "Archivo .CSV" },
  "Email": { es: "Correo" },
  "DDI (código do país)": { es: "Código de país" },
  "Título": { es: "Título" },
  "Origem": { es: "Origen" },
  "Dono": { es: "Responsable" },
```

Antes de colar, tire do bloco toda chave que já existe no dicionário (as da 1E — "Arquivo", "Mapeamento", "Configurações", "Prévia e confirmação", "Continuar", "Voltar", "Cancelar", "Confirmar e importar", "Adicionar tag", "Origem de destino", "Etapa inicial padrão", "Status", "Aberto", "Ganho", "Perdido", "Tags do contato" etc.): `grep -c` de cada uma em `lib/i18n/dicionario.ts` antes de colar.

- [ ] **Step 2: Verificar e abrir o PR B**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-*.test.ts* tests/unit/escale-janela-de-importacao.test.tsx tests/unit/i18n-*.test.ts tests/unit/escale-casca-v2-original-intacto*.test.ts tests/unit/controle-decorativo*.test.ts tests/unit/tailwind-tokens*.test.ts
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add lib/i18n/dicionario.ts
git commit -m "feat(escale): espanhol do assistente de importação (Fase 2F, PR B)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u escale-crm feat/fase-2f-importacao-assistente
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-2f-importacao-assistente \
  --title "Fase 2F (PR B): o assistente de importação de 5 passos, igual à Clint" \
  --body "$(cat <<'EOF'
## O que entra
- A janela "Importar" da Clint em 5 passos (Arquivo, Mapeamento, Configurações, Decisões, Prévia e confirmação), com a troca Contatos / Negócios, o exemplo .CSV, o mapeamento agrupado com busca e "Adicionar campo", as configurações (tags, origem, etapa, status, motivo de perda) e os níveis Conservador / Padrão / Agressivo com o ajuste de cada situação.
- "Importar contatos" (lista de Contatos) e "Importar negócios" (quadro) abrem a janela nova; importar passa a ser de gerente ou acima (PRD §5).
- Sai o importador da 1E (janela de 4 passos) e os módulos dele.

## Telas conferidas contra
v2-06 a v2-11 (Negócios) e 2b-41 (Contatos). Faltam os prints dos passos 2 a 5 em Contatos e do Decisões rolado até o fim.

## Testes
Os testes de cada passo e da janela inteira. A bateria cheia e a revisão ficam para o fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge -R rgisjr/escale-crm --merge --delete-branch=false
```

---

# PR C — A página "Importações", o relatório e a revisão

Estas telas **não têm print** (itens 3 e 4 dos prints que faltam). O plano segue o código da Clint (`index-DXIjyGaW`) e a tabela "Medidas das telas sem print". Ao entregar, liste no PR que a conferência visual dessas três telas fica pendente do print.

### Task 16: A página "Importações" (lista e exportações)

**Files:**
- Create: `lib/escale/importacao/relatorio.ts`, `components/escale/importacao/ListaDeImportacoes.tsx`, `components/escale/importacao/TabelaDeExportacoes.tsx`, `tests/unit/escale-importacao-relatorio.test.ts`, `tests/unit/escale-lista-de-importacoes.test.tsx`
- Modify: `app/app/imports/page.tsx`, `lib/navigation/catalogo.ts` (a descrição do item `/app/imports`, N14)

**Interfaces:**
- Consumes: `useImportacoes`, `useCancelarImportacao` (Task 10); `useAcoesEmMassa` (2B, `hooks/escale/useAcoesEmMassa.ts`); `JanelaDeImportacao` (Task 14); `PaginacaoDaCasca`, `BotaoDaCasca`; `ROTULO_DO_STATUS`, `ROTULO_DO_TIPO`, `STATUS_EM_ANDAMENTO` (Task 1); `ImportacaoLida`, `LinhaLida`, `PAGINA_DA_LISTA` (Task 6).
- Produces (`relatorio.ts`, puro): `dataEHora(iso)` → `"dd/mm/aaaa hh:mm"`, `processadas(i: ImportacaoLida)` → `number`, `porcentagem(parte, total)`, `ChaveDoMotivo` (`Motivo | "erro" | "aviso:telefone" | "aviso:email" | "aviso:id" | "aviso:dono" | "aviso:campo"`), `ROTULO_DA_CHAVE: Record<string, string>`, `chavesDaLinha(l: LinhaLida)` → `ChaveDoMotivo[]`, `agruparPorChave(linhas)` → `Array<[ChaveDoMotivo, number]>` (do maior para o menor), `detalheDaLinha(l)` → `{ titulo: string; meio: string | null; avisos: string[]; erro: string | null }`, `csvDoRelatorio(linhas, t)` → `string` (com BOM, Linha / Motivo / Detalhe, guarda de fórmula).
- Produces: `ListaDeImportacoes()`; `TabelaDeExportacoes()`.

- [ ] **Step 1: O teste das regras do relatório (vai falhar)**

Create `tests/unit/escale-importacao-relatorio.test.ts`:

```ts
import { describe, expect, it } from "vitest";

import { agruparPorChave, chavesDaLinha, csvDoRelatorio, dataEHora, detalheDaLinha, processadas } from "@/lib/escale/importacao/relatorio";
import type { ImportacaoLida, LinhaLida } from "@/lib/escale/importacao/tipos";

const linha = (extra: Partial<LinhaLida>): LinhaLida => ({
  id: "l",
  numero: 2,
  status: "pulada",
  motivo: null,
  normalizado: { nome: "Ana", email: "ana@x.com", telefone: null },
  detalhe: { avisos: {} },
  resolucoes: {},
  mensagem: null,
  com_aviso: false,
  ...extra,
});

describe("relatório da importação (Fase 2F)", () => {
  it("data no formato brasileiro e o progresso", () => {
    expect(dataEHora("2026-10-19T13:05:00Z")).toMatch(/^19\/10\/2026 \d{2}:05$/);
    expect(processadas({ importadas: 3, puladas: 1, erros: 1, revisar: 2 } as ImportacaoLida)).toBe(7);
  });

  it("os motivos da linha: o da pulada, o do erro e os avisos da importada", () => {
    expect(chavesDaLinha(linha({ motivo: "INVALID_EMAIL_FORMAT" }))).toEqual(["INVALID_EMAIL_FORMAT"]);
    expect(chavesDaLinha(linha({ status: "erro", mensagem: "x" }))).toEqual(["erro"]);
    expect(
      chavesDaLinha(linha({ status: "importada", com_aviso: true, detalhe: { avisos: { telefone: "12", dono: "zé" } } })),
    ).toEqual(["aviso:telefone", "aviso:dono"]);
  });

  it("agrupa do maior para o menor e monta o detalhe", () => {
    const linhas = [linha({ motivo: "DUPLICATE_IN_BATCH" }), linha({ motivo: "DUPLICATE_IN_BATCH" }), linha({ motivo: "INVALID_EMAIL_FORMAT" })];
    expect(agruparPorChave(linhas)).toEqual([
      ["DUPLICATE_IN_BATCH", 2],
      ["INVALID_EMAIL_FORMAT", 1],
    ]);
    expect(detalheDaLinha(linha({ status: "importada", detalhe: { avisos: { telefone: "12" } } }))).toEqual({
      titulo: "Ana",
      meio: "ana@x.com",
      avisos: ["Telefone descartado: 12"],
      erro: null,
    });
  });

  it("o CSV do relatório: BOM, cabeçalho e a guarda de fórmula", () => {
    const csv = csvDoRelatorio([linha({ motivo: "INVALID_EMAIL_FORMAT", normalizado: { nome: "=SOMA(1)" } })], (x) => x);
    expect(csv.startsWith("\uFEFFLinha,Motivo,Detalhe\n")).toBe(true);
    expect(csv).toContain(`2,E-mail inválido,'=SOMA(1)`);
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-importacao-relatorio.test.ts`
Expected: FAIL.

- [ ] **Step 2: As regras do relatório**

Create `lib/escale/importacao/relatorio.ts`:

```ts
/** As contas e os textos do relatório e da lista de importações (fork Escale, Fase 2F; Clint `index-DXIjyGaW`). */
import type { Motivo } from "./regras";
import { ROTULO_DO_MOTIVO } from "./textos";
import type { ImportacaoLida, LinhaLida } from "./tipos";

export function dataEHora(iso: string): string {
  return new Date(iso).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" }).replace(",", "");
}

export const processadas = (i: Pick<ImportacaoLida, "importadas" | "puladas" | "erros" | "revisar">) =>
  i.importadas + i.puladas + i.erros + i.revisar;

export const porcentagem = (parte: number, total: number) => (total > 0 ? Math.round((parte / total) * 100) : 0);

export type ChaveDoMotivo = Motivo | "erro" | "aviso:telefone" | "aviso:email" | "aviso:id" | "aviso:dono" | "aviso:campo";

export const ROTULO_DA_CHAVE: Record<string, string> = {
  ...Object.fromEntries(Object.entries(ROTULO_DO_MOTIVO).map(([m, r]) => [m, r.rotulo])),
  erro: "Erro",
  "aviso:telefone": ROTULO_DO_MOTIVO.INVALID_PHONE_FORMAT.rotulo,
  "aviso:email": "E-mail descartado",
  "aviso:id": "ID inválido",
  "aviso:dono": "Dono descartado",
  "aviso:campo": "Campo descartado",
};

export function chavesDaLinha(l: LinhaLida): ChaveDoMotivo[] {
  if (l.status === "erro") return ["erro"];
  if (l.status !== "importada") return l.motivo ? [l.motivo] : ["erro"];
  const a = l.detalhe?.avisos ?? {};
  const chaves: ChaveDoMotivo[] = [];
  if (a.telefone) chaves.push("aviso:telefone");
  if (a.email) chaves.push("aviso:email");
  if (a.id || a.negocioId) chaves.push("aviso:id");
  if (a.dono) chaves.push("aviso:dono");
  if (a.campos?.length) chaves.push("aviso:campo");
  return chaves;
}

export function agruparPorChave(linhas: readonly LinhaLida[]): Array<[ChaveDoMotivo, number]> {
  const contagem = new Map<ChaveDoMotivo, number>();
  for (const l of linhas) for (const c of chavesDaLinha(l)) contagem.set(c, (contagem.get(c) ?? 0) + 1);
  return [...contagem.entries()].sort((a, b) => b[1] - a[1]);
}

const texto = (v: unknown) => (typeof v === "string" && v.trim() ? v.trim() : null);

export function detalheDaLinha(l: LinhaLida): { titulo: string; meio: string | null; avisos: string[]; erro: string | null } {
  const n = l.normalizado ?? {};
  const negocio = (n.negocio ?? null) as { titulo?: string } | null;
  const titulo = texto(n.nome) ?? texto(n.email) ?? texto(n.telefone) ?? texto(negocio?.titulo) ?? "-";
  const meio = [texto(n.email), texto(n.telefone)].filter(Boolean).join(" · ") || null;
  const a = l.detalhe?.avisos ?? {};
  const avisos = [
    a.telefone ? `Telefone descartado: ${a.telefone}` : null,
    a.email ? `E-mail descartado: ${a.email}` : null,
    a.id ? `ID descartado: ${a.id}` : null,
    a.negocioId ? `ID descartado: ${a.negocioId}` : null,
    a.dono ? `Dono descartado: ${a.dono}` : null,
    ...(a.campos ?? []).map((c) => `Campo descartado: ${c.campo}`),
  ].filter((x): x is string => x !== null);
  return { titulo, meio: meio === titulo ? null : meio, avisos, erro: l.mensagem };
}

const celula = (v: string) => {
  const seguro = /^[=+\-@]/.test(v) ? `'${v}` : v;
  return /[",\n]/.test(seguro) ? `"${seguro.replace(/"/g, '""')}"` : seguro;
};

export function csvDoRelatorio(linhas: readonly LinhaLida[], t: (texto: string) => string): string {
  const corpo = linhas.map((l) => {
    const d = detalheDaLinha(l);
    const motivo = chavesDaLinha(l).map((c) => t(ROTULO_DA_CHAVE[c] ?? c)).join(" · ");
    const detalhe = d.erro ?? [d.titulo, ...d.avisos].join(" · ");
    return [String(l.numero), motivo, detalhe].map(celula).join(",");
  });
  return `\uFEFF${[[t("Linha"), t("Motivo"), t("Detalhe")].join(","), ...corpo].join("\n")}`;
}
```

O detalhe do aviso sai em pt; a tela traduz a frase com `t()` montando-a a partir das peças ("Telefone descartado: {phone}" etc.) na Task 17.

- [ ] **Step 3: A lista**

Create `components/escale/importacao/ListaDeImportacoes.tsx`:

```tsx
"use client";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { useCancelarImportacao, useImportacoes } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import { dataEHora, porcentagem, processadas } from "@/lib/escale/importacao/relatorio";
import { ROTULO_DO_STATUS, ROTULO_DO_TIPO, STATUS_EM_ANDAMENTO, type StatusDaImportacao } from "@/lib/escale/importacao/textos";
import { PAGINA_DA_LISTA, type ImportacaoLida } from "@/lib/escale/importacao/tipos";
import { FileText, Upload } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { AcompanharImportacoes } from "./AcompanharImportacoes";
import { JanelaDeImportacao } from "./JanelaDeImportacao";
import { TabelaDeExportacoes } from "./TabelaDeExportacoes";

const PILULA = "h-7 rounded-[6px] px-3 text-[12px] font-medium";
const COR_DO_STATUS: Record<StatusDaImportacao, string> = {
  preparando: "bg-[#F4F4F7] text-[#5A5964]",
  na_fila: "bg-[#F4F4F7] text-[#5A5964]",
  importando: "bg-[#EFF3FF] text-[#2F4A9A]",
  aguardando_revisao: "bg-[#FFF4D6] text-[#9A6700]",
  concluida: "bg-[#EEFBF2] text-[#1F9D55]",
  cancelada: "bg-[#F4F4F7] text-[#5A5964]",
  falhou: "bg-[#FDECEF] text-[#D1264F]",
};
const RELATORIO: readonly StatusDaImportacao[] = ["concluida", "falhou", "cancelada", "aguardando_revisao"];

function Pilulas<V extends string>({ valor, opcoes, aoMudar, rotulo }: { valor: V; opcoes: Array<[V, string]>; aoMudar: (v: V) => void; rotulo: string }) {
  return (
    <div role="tablist" aria-label={rotulo} className="inline-flex gap-0.5 rounded-[8px] bg-[#F4F4F7] p-0.5">
      {opcoes.map(([v, r]) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={valor === v}
          onClick={() => aoMudar(v)}
          className={cn(PILULA, valor === v ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]")}
        >
          {r}
        </button>
      ))}
    </div>
  );
}

function Resultado({ i }: { i: ImportacaoLida }) {
  const t = useT();
  if (STATUS_EM_ANDAMENTO.includes(i.status)) {
    const feitas = processadas(i);
    if (feitas === 0) return <span className="text-[12px] text-[#5A5964]">{t("Aguardando início…")}</span>;
    return (
      <div className="flex min-w-[160px] flex-col gap-1">
        <div className="h-1.5 overflow-hidden rounded-full bg-[#ECEBF1]">
          <div className="h-full rounded-full bg-[#2F6BFF]" style={{ width: `${porcentagem(feitas, i.total)}%` }} />
        </div>
        <span className="text-[12px] text-[#5A5964]">
          {feitas.toLocaleString("pt-BR")} / {i.total.toLocaleString("pt-BR")}
        </span>
      </div>
    );
  }
  if (i.status === "aguardando_revisao") {
    return (
      <span className="text-[13px] font-medium text-[#9A6700]">
        {t("{count} linhas precisam de revisão").replace("{count}", i.revisar.toLocaleString("pt-BR"))}
      </span>
    );
  }
  const contadores = (
    <span className="text-[12px] text-[#5A5964]">
      {t("{ok} importados · {skipped} pulados · {error} erros")
        .replace("{ok}", i.importadas.toLocaleString("pt-BR"))
        .replace("{skipped}", i.puladas.toLocaleString("pt-BR"))
        .replace("{error}", i.erros.toLocaleString("pt-BR"))}
    </span>
  );
  if (i.status === "falhou") {
    return (
      <div className="flex flex-col gap-0.5">
        <span className="line-clamp-2 max-w-[320px] text-[13px] text-[#D1264F]">{t("A importação falhou. Tente novamente ou fale com o suporte.")}</span>
        {processadas(i) > 0 ? contadores : null}
      </div>
    );
  }
  return contadores;
}

export function ListaDeImportacoes() {
  const t = useT();
  const router = useRouter();
  const busca = useSearchParams();
  const [superficie, setSuperficie] = useState<"importacoes" | "exportacoes">(busca.get("superficie") === "exportacoes" ? "exportacoes" : "importacoes");
  const [tipo, setTipo] = useState<"todas" | "contato" | "negocio">("todas");
  const [pagina, setPagina] = useState(1);
  const [nova, setNova] = useState(false);
  const [perguntarRapido, setPerguntarRapido] = useState(false);
  const lista = useImportacoes(tipo, pagina, perguntarRapido);
  const cancelar = useCancelarImportacao();

  useEffect(() => {
    if (!perguntarRapido) return;
    const id = setTimeout(() => setPerguntarRapido(false), 30_000);
    return () => clearTimeout(id);
  }, [perguntarRapido]);

  const itens = lista.data?.itens ?? [];
  const total = lista.data?.total ?? 0;
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";

  return (
    <div className="flex min-h-[28rem] flex-col bg-surface">
      <AcompanharImportacoes />
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <h1 className="text-[20px] font-medium text-casca-texto">{superficie === "exportacoes" ? t("Exportações") : t("Importações")}</h1>
        {superficie === "importacoes" ? (
          <BotaoDaCasca type="button" variante="marca" onClick={() => setNova(true)}>
            <Upload aria-hidden />
            {t("Nova importação")}
          </BotaoDaCasca>
        ) : null}
      </header>
      <div className="flex shrink-0 flex-wrap items-center gap-3 border-b border-casca-borda px-[30px] pt-1 pb-4">
        <Pilulas
          rotulo={t("Importações / Exportações")}
          valor={superficie}
          aoMudar={setSuperficie}
          opcoes={[
            ["importacoes", t("Importações")],
            ["exportacoes", t("Exportações")],
          ]}
        />
        {superficie === "importacoes" ? (
          <Pilulas
            rotulo={t("Tipo")}
            valor={tipo}
            aoMudar={(v) => {
              setTipo(v);
              setPagina(1);
            }}
            opcoes={[
              ["todas", t("Todas")],
              ["contato", t("Contatos")],
              ["negocio", t("Negócios")],
            ]}
          />
        ) : null}
      </div>

      {superficie === "exportacoes" ? (
        <TabelaDeExportacoes />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto px-[30px] pt-2">
          <table className="w-full border-collapse">
            <thead className="sticky top-0 bg-surface">
              <tr className="border-b border-casca-borda">
                <th className={COLUNA}>{t("Importação")}</th>
                <th className={COLUNA}>{t("Data")}</th>
                <th className={COLUNA}>{t("Status")}</th>
                <th className={COLUNA}>{t("Resultado")}</th>
                <th className={COLUNA}>
                  <span className="sr-only">{t("Ações")}</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {lista.isLoading ? (
                <tr>
                  <td colSpan={5} className="py-10 text-center text-[13px] text-[#5A5964]">
                    {t("Carregando…")}
                  </td>
                </tr>
              ) : lista.isError ? (
                <tr>
                  <td colSpan={5} className="p-4 text-[13px] text-casca-alerta">
                    {t("Não foi possível carregar as importações.")}
                  </td>
                </tr>
              ) : itens.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-10">
                    <div className="mx-auto flex max-w-[360px] flex-col items-center gap-2 text-center">
                      <FileText size={28} aria-hidden className="text-[#86858F]" />
                      <p className="text-[14px] font-semibold text-casca-texto">{t("Nenhuma importação ainda")}</p>
                      <p className="text-[13px] text-[#5A5964]">
                        {t("Faça o upload de um arquivo CSV para criar ou atualizar contatos e negócios em massa.")}
                      </p>
                      <BotaoDaCasca type="button" variante="marca" onClick={() => setNova(true)}>
                        {t("Nova importação")}
                      </BotaoDaCasca>
                    </div>
                  </td>
                </tr>
              ) : (
                itens.map((i) => (
                  <tr
                    key={i.id}
                    className={cn(
                      "border-b border-casca-borda",
                      i.status === "aguardando_revisao" && "border-l-[3px] border-l-[#E8A400] bg-[#E8A400]/8",
                    )}
                  >
                    <td className="px-4 py-3">
                      <p className="line-clamp-1 text-[14px] font-medium text-casca-texto">{t(ROTULO_DO_TIPO[i.tipo])}</p>
                      <p className="line-clamp-1 text-[12px] text-[#5A5964]">
                        {i.arquivo}
                        {i.tipo === "negocio" && i.origem_nome ? ` · ${t("Origem: {origin}").replace("{origin}", i.origem_nome)}` : ""}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-[13px] text-[#5A5964]">{dataEHora(i.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className={cn("inline-flex h-6 items-center rounded-full px-2.5 text-[12px] font-medium", COR_DO_STATUS[i.status])}>
                        {t(ROTULO_DO_STATUS[i.status])}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <Resultado i={i} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-2">
                        {i.status === "aguardando_revisao" ? (
                          <BotaoDaCasca type="button" variante="marca" tamanho="sm" onClick={() => router.push(`/app/imports/${i.id}?revisar=1`)}>
                            {t("Revisar")}
                          </BotaoDaCasca>
                        ) : null}
                        {RELATORIO.includes(i.status) ? (
                          <button
                            type="button"
                            onClick={() => router.push(`/app/imports/${i.id}`)}
                            className="inline-flex h-[26px] items-center rounded-[6px] border border-[#D9D8E0] px-3 text-[12px] font-medium text-casca-texto hover:bg-casca-raia"
                          >
                            {t("Relatório")}
                          </button>
                        ) : null}
                        {i.status === "na_fila" || i.status === "importando" ? (
                          <BotaoDaCasca
                            type="button"
                            variante="texto"
                            tamanho="sm"
                            disabled={cancelar.isPending && cancelar.variables === i.id}
                            onClick={() => cancelar.mutate(i.id)}
                          >
                            {t("Cancelar")}
                          </BotaoDaCasca>
                        ) : null}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {total > PAGINA_DA_LISTA ? (
            <div className="py-3">
              <PaginacaoDaCasca
                pagina={pagina}
                total={total}
                porPagina={PAGINA_DA_LISTA}
                opcoesPorPagina={[PAGINA_DA_LISTA]}
                aoMudarPagina={setPagina}
                aoMudarPorPagina={() => setPagina(1)}
              />
            </div>
          ) : null}
        </div>
      )}
      <JanelaDeImportacao
        aberta={nova}
        aoFechar={() => setNova(false)}
        tipoInicial="contato"
        aoImportar={() => {
          setPagina(1);
          setPerguntarRapido(true);
        }}
      />
    </div>
  );
}
```

As cores dos selos (cinza, azul, âmbar, verde, vermelho) são as `colorPalette` da Clint (`gray`, `blue`, `amber`, `green`, `red`) no tom "subtle"; se a cerca `tailwind-tokens` recusar algum hexadecimal, troque pelo token da casca que existir para a mesma cor (procure em `app/globals.css` por `casca-`).

Create `components/escale/importacao/TabelaDeExportacoes.tsx`:

```tsx
"use client";
import { useAcoesEmMassa } from "@/hooks/escale/useAcoesEmMassa";
import { useT } from "@/hooks/i18n/useT";
import { dataEHora } from "@/lib/escale/importacao/relatorio";
import type { StatusVisivel } from "@/lib/escale/massa/tipos";
import { Download, FileText } from "@/lib/ui/icons-da-casca";

const ROTULO: Record<StatusVisivel, string> = {
  preparando: "Gerando exportação",
  aguardando_aprovacao: "Aguardando aprovação",
  na_fila: "Gerando exportação",
  processando: "Gerando exportação",
  concluida: "Concluída",
  falhou: "Erro",
  recusada: "Recusada",
  expirada: "Expirada",
};

/** A superfície "Exportações" da página Importações (N15): as minhas exportações da 2B, com o download. */
export function TabelaDeExportacoes() {
  const t = useT();
  const acoes = useAcoesEmMassa(true, 5000);
  const exportacoes = (acoes.data?.minhas ?? []).filter((a) => a.acao === "exportar");
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";
  return (
    <div className="min-h-0 flex-1 overflow-auto px-[30px] pt-2">
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-casca-borda">
            <th className={COLUNA}>{t("Exportação")}</th>
            <th className={COLUNA}>{t("Data")}</th>
            <th className={COLUNA}>{t("Status")}</th>
            <th className={COLUNA}>
              <span className="sr-only">{t("Ações")}</span>
            </th>
          </tr>
        </thead>
        <tbody>
          {exportacoes.length === 0 ? (
            <tr>
              <td colSpan={4} className="py-10">
                <div className="mx-auto flex max-w-[360px] flex-col items-center gap-2 text-center">
                  <FileText size={28} aria-hidden className="text-[#86858F]" />
                  <p className="text-[14px] font-semibold text-casca-texto">{t("Nenhuma exportação ainda")}</p>
                  <p className="text-[13px] text-[#5A5964]">
                    {t("Quando você exportar contatos, negócios, campanhas ou a carteira em CSV, os arquivos aparecem aqui.")}
                  </p>
                </div>
              </td>
            </tr>
          ) : (
            exportacoes.map((e) => (
              <tr key={e.id} className="border-b border-casca-borda">
                <td className="px-4 py-3 text-[14px] font-medium text-casca-texto">{t("Contatos")}</td>
                <td className="px-4 py-3 text-[13px] text-[#5A5964]">{dataEHora(e.created_at)}</td>
                <td className="px-4 py-3 text-[13px] text-casca-texto">{t(ROTULO[e.status])}</td>
                <td className="px-4 py-3 text-right">
                  {e.status === "concluida" && e.tem_arquivo ? (
                    <a
                      href={`/api/v1/acoes-em-massa/${e.id}/arquivo`}
                      className="inline-flex items-center gap-1 text-[13px] font-semibold text-casca-marca hover:underline"
                    >
                      <Download size={12} aria-hidden />
                      {t("Baixar exportação")}
                    </a>
                  ) : null}
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
```

- [ ] **Step 4: O encaixe e o item do "Mais"**

`app/app/imports/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { ImportsListClient } from "./_client";
// ── FORK ESCALE · Fase 2F: com a casca, as importações da Clint ──
import { ListaDeImportacoes } from "@/components/escale/importacao/ListaDeImportacoes";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  // ── FORK ESCALE · Fase 2F ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") return <ListaDeImportacoes />;
  // ── fim FORK ESCALE ──
  return <ImportsListClient />;
}
```

`lib/navigation/catalogo.ts`, no item `href: "/app/imports"`: `description: "Importe contatos e negócios por planilha e acompanhe as exportações.", // FORK ESCALE · Fase 2F (N14)`. Se a cerca `navegacao-registry` fixa a descrição num teste, atualize o texto esperado nele.

O componente `AcompanharImportacoes` nasce na Task 19; até lá, crie-o já vazio para o import fechar:

```tsx
"use client";
/** O aviso de fim das importações (fork Escale, Fase 2F; corpo na Task 19). */
export function AcompanharImportacoes() {
  return null;
}
```

em `components/escale/importacao/AcompanharImportacoes.tsx`.

- [ ] **Step 5: O teste da lista**

Create `tests/unit/escale-lista-de-importacoes.test.tsx`:

```tsx
import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

const push = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ push }), useSearchParams: () => new URLSearchParams() }));
vi.mock("@/components/escale/importacao/JanelaDeImportacao", () => ({ JanelaDeImportacao: () => null }));
vi.mock("@/hooks/escale/useAcoesEmMassa", () => ({ useAcoesEmMassa: () => ({ data: { minhas: [], para_aprovar: [] } }) }));
const cancelar = vi.fn();
const itens = [
  { id: "a", tipo: "contato", arquivo: "a.csv", status: "aguardando_revisao", total: 10, importadas: 7, revisar: 3, puladas: 0, erros: 0, avisos: 0, created_at: "2026-10-19T13:05:00Z", origem_nome: null },
  { id: "b", tipo: "negocio", arquivo: "b.csv", status: "importando", total: 100, importadas: 40, revisar: 0, puladas: 10, erros: 0, avisos: 0, created_at: "2026-10-19T12:00:00Z", origem_nome: "Funil A" },
  { id: "c", tipo: "contato", arquivo: "c.csv", status: "concluida", total: 5, importadas: 4, revisar: 0, puladas: 1, erros: 0, avisos: 0, created_at: "2026-10-18T12:00:00Z", origem_nome: null },
];
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacoes: () => ({ data: { itens, total: 3 }, isLoading: false, isError: false }),
  useCancelarImportacao: () => ({ mutate: cancelar, isPending: false }),
}));

import { ListaDeImportacoes } from "@/components/escale/importacao/ListaDeImportacoes";

describe("página Importações (Fase 2F)", () => {
  it("uma linha por importação, com status, resultado e ações", () => {
    render(<ListaDeImportacoes />);
    expect(screen.getByRole("heading", { name: "Importações" })).toBeInTheDocument();
    expect(screen.getByText("3 linhas precisam de revisão")).toBeInTheDocument();
    expect(screen.getByText("50 / 100")).toBeInTheDocument();
    expect(screen.getByText("4 importados · 1 pulados · 0 erros")).toBeInTheDocument();
    expect(screen.getByText(/Origem: Funil A/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Revisar" }));
    expect(push).toHaveBeenCalledWith("/app/imports/a?revisar=1");
    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(cancelar).toHaveBeenCalledWith("b");
  });

  it("Exportações troca a tabela e esconde Nova importação", () => {
    render(<ListaDeImportacoes />);
    fireEvent.click(screen.getByRole("tab", { name: "Exportações" }));
    expect(screen.getByText("Nenhuma exportação ainda")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /Nova importação/ })).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 6: Rodar e commit**

```bash
git switch -c feat/fase-2f-importacao-telas escale-crm/main
corepack pnpm vitest run tests/unit/escale-importacao-relatorio.test.ts tests/unit/escale-lista-de-importacoes.test.tsx tests/unit/navegacao-*.test.ts tests/unit/escale-casca-v2-original-intacto*.test.ts
corepack pnpm exec eslint components/escale/importacao lib/escale/importacao/relatorio.ts app/app/imports lib/navigation/catalogo.ts
git add components/escale/importacao lib/escale/importacao/relatorio.ts app/app/imports/page.tsx lib/navigation/catalogo.ts tests/unit/escale-importacao-relatorio.test.ts tests/unit/escale-lista-de-importacoes.test.tsx
git commit -m "feat(escale): página Importações com as exportações da 2B (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

(O `git switch -c` vem antes de mexer nos arquivos: faça-o no começo do Step 1, depois de `git fetch escale-crm` e de conferir que o PR B está na `main`.)

### Task 17: O "Relatório da importação"

**Files:**
- Create: `components/escale/importacao/RelatorioDaImportacao.tsx`, `tests/unit/escale-relatorio-da-importacao.test.tsx`
- Modify: `app/app/imports/[id]/page.tsx`

**Interfaces:**
- Consumes: `useImportacao`, `useLinhasDaImportacao` (Task 10); `agruparPorChave`, `chavesDaLinha`, `csvDoRelatorio`, `detalheDaLinha`, `porcentagem`, `ROTULO_DA_CHAVE` (Task 16); `LINHAS_DO_RELATORIO_MAX` (Task 8, exportado de `banco.ts` — **não** importe `banco.ts` no cliente: repita a constante `500` em `relatorio.ts` como `LINHAS_DO_RELATORIO_MAX` e faça `banco.ts` importá-la de lá).
- Produces: `RelatorioDaImportacao({ id })`.

A tela (Clint `eo` do `DXIjyGaW`): o topo com ← (volta a `/app/imports`), "Relatório da importação" e o tipo embaixo; à direita "Revisar {n} pendências" (com revisão pendente, leva a `?revisar=1`) e "Exportar" (baixa `relatorio-importacao-{id}.csv`); os cinco cartões (Importados verde, Avisos âmbar com "+" quando cortou, Para revisar laranja, Pulados cinza, Erros vermelho); a barra de 8px em quatro trechos; com as linhas apagadas (N13), só o texto "Os detalhes desta importação foram apagados depois de 30 dias."; senão o aviso de corte (mais de 500), o vazio "Nada para revisar aqui…", "Linhas não importadas por motivo" (a lista de motivo e contagem) e a tabela Linha / Motivo / Detalhe das puladas e com erro; e, para as importadas com aviso, o aviso âmbar "Estas linhas foram importadas normalmente…", "Avisos agrupados por motivo" e a tabela em fundo cinza.

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-relatorio-da-importacao.test.tsx`:

```tsx
import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const importacao = {
  id: "imp-1", tipo: "contato", arquivo: "a.csv", status: "aguardando_revisao", total: 6,
  importadas: 3, revisar: 1, puladas: 1, erros: 1, avisos: 1, linhas_apagadas_em: null, created_at: "2026-10-19T12:00:00Z",
};
const linhas = [
  { id: "1", numero: 2, status: "pulada", motivo: "INVALID_EMAIL_FORMAT", normalizado: { nome: "Ana" }, detalhe: { avisos: {} }, resolucoes: {}, mensagem: null, com_aviso: false },
  { id: "2", numero: 3, status: "erro", motivo: null, normalizado: { nome: "Bia" }, detalhe: { avisos: {} }, resolucoes: {}, mensagem: "Contato já cadastrado com este e-mail, telefone ou CPF.", com_aviso: false },
  { id: "3", numero: 4, status: "importada", motivo: null, normalizado: { nome: "Caio" }, detalhe: { avisos: { telefone: "12" } }, resolucoes: {}, mensagem: null, com_aviso: true },
];
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacao: () => ({ data: importacao, isLoading: false }),
  useLinhasDaImportacao: () => ({ data: linhas, isLoading: false }),
}));

import { RelatorioDaImportacao } from "@/components/escale/importacao/RelatorioDaImportacao";

describe("Relatório da importação (Fase 2F)", () => {
  it("os cartões, os motivos, o erro e os avisos", () => {
    render(<RelatorioDaImportacao id="imp-1" />);
    expect(screen.getByRole("heading", { name: "Relatório da importação" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Revisar 1 pendências" })).toBeInTheDocument();
    expect(screen.getByText("Linhas não importadas por motivo")).toBeInTheDocument();
    expect(screen.getAllByText("E-mail inválido").length).toBeGreaterThan(0);
    expect(screen.getByText("Contato já cadastrado com este e-mail, telefone ou CPF.")).toBeInTheDocument();
    expect(screen.getByText("Telefone descartado: 12")).toBeInTheDocument();
    expect(screen.getByText("Linha 4")).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: A tela**

Create `components/escale/importacao/RelatorioDaImportacao.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useImportacao, useLinhasDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import {
  LINHAS_DO_RELATORIO_MAX,
  ROTULO_DA_CHAVE,
  agruparPorChave,
  chavesDaLinha,
  csvDoRelatorio,
  detalheDaLinha,
  porcentagem,
} from "@/lib/escale/importacao/relatorio";
import { ROTULO_DO_TIPO } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowLeft, CheckCircle2, CircleX, Download, Flag, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

function Cartao({ icone, rotulo, valor, cor, fundo }: { icone: ReactNode; rotulo: string; valor: string; cor: string; fundo: string }) {
  return (
    <div className="flex-1 rounded-[8px] border border-casca-borda p-4">
      <span aria-hidden className={cn("mb-2 grid size-8 place-items-center rounded-[6px]", cor, fundo)}>
        {icone}
      </span>
      <p className="text-[24px] font-semibold text-casca-texto">{valor}</p>
      <p className="text-[12px] text-[#5A5964]">{rotulo}</p>
    </div>
  );
}

function PorMotivo({ titulo, entradas }: { titulo: string; entradas: Array<[string, number]> }) {
  const t = useT();
  return (
    <div>
      <p className="mb-2 text-[14px] font-medium text-casca-texto">{titulo}</p>
      <dl className="flex flex-col gap-1">
        {entradas.map(([chave, n]) => (
          <div key={chave} className="flex justify-between border-b border-[#F1F0F5] py-1">
            <dt className="text-[14px] text-[#5A5964]">{t(ROTULO_DA_CHAVE[chave] ?? chave)}</dt>
            <dd className="text-[14px] font-medium text-casca-texto">{n.toLocaleString("pt-BR")}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function TabelaDeLinhas({ linhas, cinza }: { linhas: readonly LinhaLida[]; cinza?: boolean }) {
  const t = useT();
  const COLUNA = "px-4 py-2 text-left text-[11px] font-semibold tracking-[0.08em] text-[#86858F] uppercase";
  const aviso = (texto: string) => {
    const [antes, depois] = texto.split(": ");
    return `${t(`${antes}: {x}`).replace("{x}", depois ?? "")}`;
  };
  return (
    <div className={cn("overflow-hidden rounded-[8px] border", cinza ? "border-[#F1F0F5] bg-[#FAFAFC]" : "border-casca-borda bg-white")}>
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-casca-borda">
            <th className={COLUNA}>{t("Linha")}</th>
            <th className={COLUNA}>{t("Motivo")}</th>
            <th className={COLUNA}>{t("Detalhe")}</th>
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => {
            const d = detalheDaLinha(l);
            return (
              <tr key={l.id} className="border-b border-[#F1F0F5] last:border-b-0">
                <td className="px-4 py-2 text-[14px] text-[#5A5964]">{t("Linha {n}").replace("{n}", String(l.numero))}</td>
                <td className="px-4 py-2 text-[14px] text-casca-texto">
                  {chavesDaLinha(l)
                    .map((c) => t(ROTULO_DA_CHAVE[c] ?? c))
                    .join(" · ")}
                </td>
                <td className="px-4 py-2">
                  {d.erro ? (
                    <p className="line-clamp-1 text-[14px] text-[#D1264F]">{t(d.erro)}</p>
                  ) : (
                    <div className="flex min-w-0 flex-col gap-0.5">
                      <p className="line-clamp-1 text-[14px] text-casca-texto">{d.titulo}</p>
                      {d.meio ? <p className="line-clamp-1 text-[12px] text-[#5A5964]">{d.meio}</p> : null}
                      {d.avisos.map((a) => (
                        <p key={a} className="line-clamp-1 text-[12px] text-[#9A6700]">
                          {aviso(a)}
                        </p>
                      ))}
                    </div>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

export function RelatorioDaImportacao({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  const importacao = useImportacao(id);
  const lidas = useLinhasDaImportacao(id, "relatorio");
  const i = importacao.data;
  if (importacao.isLoading || !i) {
    return <p className="p-6 text-[13px] text-[#5A5964]">{importacao.isLoading ? t("Carregando…") : t("Importação não encontrada.")}</p>;
  }
  const todas = lidas.data ?? [];
  const cortou = todas.length > LINHAS_DO_RELATORIO_MAX;
  const linhas = cortou ? todas.slice(0, LINHAS_DO_RELATORIO_MAX) : todas;
  const falhas = linhas.filter((l) => l.status !== "importada");
  const avisos = linhas.filter((l) => l.status === "importada");
  const total = i.total || i.importadas + i.revisar + i.puladas + i.erros;

  function exportar() {
    const url = URL.createObjectURL(new Blob([csvDoRelatorio(linhas, t)], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `relatorio-importacao-${id}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col bg-surface">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <div className="flex items-center gap-2">
          <BotaoDaCasca type="button" variante="icone" aria-label={t("Voltar")} onClick={() => router.push("/app/imports")}>
            <ArrowLeft aria-hidden />
          </BotaoDaCasca>
          <div>
            <h1 className="text-[20px] font-medium text-casca-texto">{t("Relatório da importação")}</h1>
            <p className="text-[12px] text-[#5A5964]">{t(ROTULO_DO_TIPO[i.tipo])}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {i.status === "aguardando_revisao" && i.revisar > 0 ? (
            <BotaoDaCasca type="button" variante="marca" onClick={() => router.push(`/app/imports/${id}?revisar=1`)}>
              <Flag aria-hidden />
              {t("Revisar {n} pendências").replace("{n}", String(i.revisar))}
            </BotaoDaCasca>
          ) : null}
          {linhas.length > 0 ? (
            <button
              type="button"
              onClick={exportar}
              className="inline-flex h-[31px] items-center gap-2 rounded-[6px] border border-[#D9D8E0] px-3.5 text-[13px] font-medium text-casca-texto hover:bg-casca-raia"
            >
              <Download size={15} aria-hidden />
              {t("Exportar")}
            </button>
          ) : null}
        </div>
      </header>
      <div className="flex flex-col gap-5 p-6">
        <div className="flex gap-3">
          <Cartao icone={<CheckCircle2 size={17} />} rotulo={t("Importados")} valor={i.importadas.toLocaleString("pt-BR")} cor="text-[#1F9D55]" fundo="bg-[#EEFBF2]" />
          <Cartao icone={<TriangleAlert size={17} />} rotulo={t("Avisos")} valor={cortou ? `${avisos.length}+` : String(i.avisos)} cor="text-[#9A6700]" fundo="bg-[#FFF4D6]" />
          <Cartao icone={<Flag size={17} />} rotulo={t("Para revisar")} valor={i.revisar.toLocaleString("pt-BR")} cor="text-[#C2570C]" fundo="bg-[#FFEBD6]" />
          <Cartao icone={<CircleX size={17} />} rotulo={t("Pulados")} valor={i.puladas.toLocaleString("pt-BR")} cor="text-[#5A5964]" fundo="bg-[#F4F4F7]" />
          <Cartao icone={<CircleX size={17} />} rotulo={t("Erros")} valor={i.erros.toLocaleString("pt-BR")} cor="text-[#D1264F]" fundo="bg-[#FDECEF]" />
        </div>
        <div className="flex h-2 w-full overflow-hidden rounded-full bg-[#ECEBF1]" aria-hidden>
          <span className="bg-[#2FB36B]" style={{ width: `${porcentagem(i.importadas, total)}%` }} />
          <span className="bg-[#F08A24]" style={{ width: `${porcentagem(i.revisar, total)}%` }} />
          <span className="bg-[#B8B7C0]" style={{ width: `${porcentagem(i.puladas, total)}%` }} />
          <span className="bg-[#D1264F]" style={{ width: `${porcentagem(i.erros, total)}%` }} />
        </div>

        {i.linhas_apagadas_em ? (
          <p className="rounded-[8px] border border-casca-borda p-6 text-center text-[13px] text-[#5A5964]">
            {t("Os detalhes desta importação foram apagados depois de 30 dias.")}
          </p>
        ) : lidas.isLoading ? (
          <p className="p-8 text-center text-[13px] text-[#5A5964]">{t("Carregando…")}</p>
        ) : (
          <>
            {cortou ? (
              <p role="status" className="rounded-[8px] bg-[#FFF4D6] px-3 py-2 text-[12px] text-[#9A6700]">
                {t("Este relatório mostra as primeiras {n} linhas. A importação processou mais do que isso.").replace("{n}", String(LINHAS_DO_RELATORIO_MAX))}
              </p>
            ) : null}
            {falhas.length === 0 && avisos.length === 0 ? (
              <p className="rounded-[8px] border border-casca-borda p-8 text-center text-[13px] text-[#5A5964]">
                {t("Nada para revisar aqui. Todas as linhas foram importadas sem ressalvas.")}
              </p>
            ) : null}
            {falhas.length > 0 ? (
              <div className="flex flex-col gap-3">
                <PorMotivo titulo={t("Linhas não importadas por motivo")} entradas={agruparPorChave(falhas)} />
                <TabelaDeLinhas linhas={falhas} />
              </div>
            ) : null}
            {avisos.length > 0 ? (
              <div className="flex flex-col gap-3">
                <p role="status" className="rounded-[8px] bg-[#FFF4D6] px-3 py-2 text-[12px] text-[#9A6700]">
                  {t("Estas linhas foram importadas normalmente, mas um dado foi descartado durante o processo.")}
                </p>
                <PorMotivo titulo={t("Avisos agrupados por motivo")} entradas={agruparPorChave(avisos)} />
                <TabelaDeLinhas linhas={avisos} cinza />
              </div>
            ) : null}
          </>
        )}
      </div>
    </div>
  );
}
```

O texto do aviso usa as chaves "Telefone descartado: {x}", "E-mail descartado: {x}", "ID descartado: {x}", "Dono descartado: {x}" e "Campo descartado: {x}" no dicionário (Task 19).

Em `lib/escale/importacao/relatorio.ts`, acrescente `export const LINHAS_DO_RELATORIO_MAX = 500;` e, em `lib/escale/importacao/banco.ts`, troque a declaração local por `import { LINHAS_DO_RELATORIO_MAX } from "./relatorio";` mantendo a reexportação `export { LINHAS_DO_RELATORIO_MAX };`.

- [ ] **Step 3: O encaixe de `/app/imports/[id]`**

`app/app/imports/[id]/page.tsx`:

```tsx
import { cookies } from "next/headers";

import { ImportDetailClient } from "./_client";
// ── FORK ESCALE · Fase 2F: com a casca, o relatório e a revisão da importação ──
import { RelatorioDaImportacao } from "@/components/escale/importacao/RelatorioDaImportacao";
import { RevisarPendencias } from "@/components/escale/importacao/RevisarPendencias";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function ImportDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ revisar?: string }>;
}) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 2F ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    return (await searchParams).revisar === "1" ? <RevisarPendencias id={id} /> : <RelatorioDaImportacao id={id} />;
  }
  // ── fim FORK ESCALE ──
  return <ImportDetailClient id={id} />;
}
```

Como a `RevisarPendencias` nasce na Task 18, crie agora o arquivo com o esqueleto `export function RevisarPendencias({ id }: { id: string }) { return <RelatorioDaImportacao id={id} />; }` e substitua na Task 18.

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-relatorio-da-importacao.test.tsx tests/unit/escale-importacao-relatorio.test.ts
corepack pnpm exec eslint components/escale/importacao "app/app/imports/[id]/page.tsx" lib/escale/importacao
git add components/escale/importacao "app/app/imports/[id]/page.tsx" lib/escale/importacao tests/unit/escale-relatorio-da-importacao.test.tsx
git commit -m "feat(escale): Relatório da importação — cartões, motivos, avisos e o CSV (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 18: "Revisar pendências"

**Files:**
- Create: `components/escale/importacao/RevisarPendencias.tsx` (substitui o esqueleto), `components/escale/importacao/DetalheDaPendencia.tsx`, `tests/unit/escale-revisar-pendencias.test.tsx`

**Interfaces:**
- Consumes: `useImportacao`, `useLinhasDaImportacao`, `useResolverLinha`, `useResolverEmLote`, `useDestinosDaImportacao` (Task 10); `useCatalogoDeCampos` (2C); `REGRAS` (Task 1); `ROTULO_DO_MOTIVO`, `rotuloDaAcao` (Task 1); `Detalhe`, `Resolucao` (Task 4); `LinhaLida` (Task 6).
- Produces: `RevisarPendencias({ id })`; `DetalheDaPendencia({ linha, ocupado, rotuloDoCampo, aoResolver })` — `aoResolver(acao, dados?)`.

A tela (Clint `ao` e `oo` do `DXIjyGaW`):
- **Topo:** ← (volta a `/app/imports`), "Revisar pendências" e "{n} linhas para revisar"; à direita "{resolved} de {total} resolvidas" e a barra de 200px (o total é o maior número de pendências já visto nesta tela).
- **Troca por motivo:** "Todas" e um item por motivo presente, cada um com o contador.
- **Em lote:** com um motivo escolhido, a faixa "Aplicar a todas as {n} deste motivo:" e os botões do motivo (as opções sem as desligadas e sem "Escolher na lista"; "Descartar" em contorno). Aplicar tira as linhas daquele motivo da lista.
- **Lista (320px):** "PENDÊNCIAS ({n})"; cada item com o nome (ou e-mail, telefone, título) e o motivo num selo cinza; o escolhido com a borda esquerda da marca.
- **Detalhe:** o ícone de alerta laranja, o nome do motivo, "Linha {n}", a descrição, "Match por {field}"; o miolo do motivo (abaixo); "Contexto do contato"; "Outras diferenças nesta linha" (só em "Mudaria um campo já preenchido", com as caixinhas quando há mais de uma); "Campos que serão preenchidos"; e "O que fazer com esta linha?" com os botões (menos nos três motivos de comparação, que têm os botões embaixo das caixas).
- **Miolo por motivo:** origem/etapa não encontrada → a caixa "Origem no arquivo"/"Etapa no arquivo" e o seletor "Escolha uma origem"/"Escolha uma etapa" ("Escolher" só liga com algo escolhido); bate com dois contatos → "Linha do arquivo" (e-mail → A · telefone → B) e os cartões "A · e-mail" e "B · telefone" com o selo WhatsApp; campo preenchido diferente / Instagram diferente / telefone diferente → "No sistema" e "No arquivo" com a seta entre elas e os botões "Manter o que já existe" e "Substituir pelo arquivo" (com outras diferenças marcadas, o primeiro vira "… e atualizar marcados"; com uma só, aparece também "Manter o que já existe e atualizar {campo}"); WhatsApp em andamento → a caixa verde com os dois textos e o telefone "No sistema"/"No arquivo"; preencher vazios sem nada a preencher → "Esta linha não altera nenhum campo…"; telefone inválido → "Telefone do arquivo (inválido)" e "Dados desta linha"; ID do negócio → "ID do negócio no arquivo"; negócio repetido → "Negócio em aberto (atual)" → "Negócio no arquivo"; o resto → o nome, o e-mail e o telefone da linha.
- **Resolver:** chama a rota; se a linha voltou a pedir revisão (outro motivo), a lista é relida; senão sai da lista e o próximo é escolhido. Lista vazia: ✓ verde, "Tudo revisado!" e "Voltar para a lista".

- [ ] **Step 1: O teste (vai falhar)**

Create `tests/unit/escale-revisar-pendencias.test.tsx`:

```tsx
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock("@/hooks/escale/useCatalogoDeCampos", () => ({ useCatalogoDeCampos: () => ({ catalogo: { grupos: [], campos: [] } }) }));
const pendencias = [
  {
    id: "l-1", numero: 5, status: "revisar", motivo: "MATCH_PHONE_DIFFERS", normalizado: { nome: "Ana" },
    detalhe: { casouPor: "email", telefoneAtual: "+5564999446816", telefoneDoArquivo: "+5511988887777", contato: { id: "c", nome: "Ana", email: "ana@x.com", telefone: "+5564999446816", casouPor: "email", whatsapp: false }, avisos: {} },
    resolucoes: {}, mensagem: null, com_aviso: false,
  },
  {
    id: "l-2", numero: 6, status: "revisar", motivo: "MERGE_HINT_EMAIL_PHONE_SPLIT", normalizado: { nome: "Bia", email: "bia@x.com", telefone: "+5511977776666" },
    detalhe: { contatos: [{ id: "a", nome: "Bia A", email: "bia@x.com", telefone: null, casouPor: "email", whatsapp: false }, { id: "b", nome: "Bia B", email: null, telefone: "+5511977776666", casouPor: "telefone", whatsapp: true }], avisos: {} },
    resolucoes: {}, mensagem: null, com_aviso: false,
  },
];
const resolver = vi.fn(async () => ({ status: "importada", motivo: null, importacao: "aguardando_revisao" }));
const lote = vi.fn(async () => ({ linhas: 1 }));
vi.mock("@/hooks/escale/useImportacoes", () => ({
  useImportacao: () => ({ data: { id: "imp-1", tipo: "contato", status: "aguardando_revisao" } }),
  useLinhasDaImportacao: () => ({ data: pendencias, isLoading: false, refetch: vi.fn() }),
  useResolverLinha: () => ({ mutateAsync: resolver, isPending: false }),
  useResolverEmLote: () => ({ mutateAsync: lote, isPending: false }),
  useDestinosDaImportacao: () => ({ data: [] }),
}));

import { RevisarPendencias } from "@/components/escale/importacao/RevisarPendencias";

describe("Revisar pendências (Fase 2F)", () => {
  it("a lista, o detalhe da primeira e resolver por comparação", async () => {
    render(<RevisarPendencias id="imp-1" />);
    expect(screen.getByRole("heading", { name: "Revisar pendências" })).toBeInTheDocument();
    expect(screen.getByText("2 linhas para revisar")).toBeInTheDocument();
    expect(screen.getByText("No sistema")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Substituir pelo arquivo" }));
    await waitFor(() => expect(resolver).toHaveBeenCalledWith({ linhaId: "l-1", resolucao: { acao: "OVERWRITE" } }));
    expect(await screen.findByText("1 de 2 resolvidas")).toBeInTheDocument();
  });

  it("bate com dois contatos: os cartões A e B, e Juntar desligado 'em breve'", () => {
    render(<RevisarPendencias id="imp-1" />);
    fireEvent.click(screen.getByText("Bia"));
    expect(screen.getByText("A · e-mail")).toBeInTheDocument();
    expect(screen.getByText("B · telefone")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Juntar os dois contatos · em breve/ })).toBeDisabled();
  });

  it("em lote, com um motivo escolhido", async () => {
    render(<RevisarPendencias id="imp-1" />);
    fireEvent.click(screen.getByRole("tab", { name: /Telefone diferente do cadastrado/ }));
    expect(screen.getByText("Aplicar a todas as 1 deste motivo:")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "Manter atual" }));
    await waitFor(() => expect(lote).toHaveBeenCalledWith({ motivo: "MATCH_PHONE_DIFFERS", acao: "KEEP_DB" }));
  });
});
```

Run: `corepack pnpm vitest run tests/unit/escale-revisar-pendencias.test.tsx`
Expected: FAIL.

- [ ] **Step 2: O detalhe**

Create `components/escale/importacao/DetalheDaPendencia.tsx`:

```tsx
"use client";
import { useState, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useDestinosDaImportacao } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import type { Resolucao, ResumoDoContato } from "@/lib/escale/importacao/classificar";
import { formatarTelefone } from "@/lib/escale/contatos/regras";
import { REGRAS, type Acao, type Motivo } from "@/lib/escale/importacao/regras";
import { ROTULO_DA_ACAO, ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowRight, MessageCircle, TriangleAlert } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const COMPARA: readonly Motivo[] = ["MATCH_OVERWRITE_FILLED_FIELD", "MATCH_INSTAGRAM_DIFFERS", "MATCH_PHONE_DIFFERS"];
const ROTULO_PEQUENO = "mb-1 text-[10px] tracking-[0.06em] text-[#86858F] uppercase";
const CAIXA_CINZA = "rounded-[6px] bg-[#F8F8FA] p-3";

const valor = (v: unknown) => (v === null || v === undefined || v === "" ? "—" : Array.isArray(v) ? v.join(", ") : String(v));
const fone = (v: unknown) => (typeof v === "string" && v.startsWith("+") ? formatarTelefone(v) : valor(v));

function Caixa({ rotulo, valor: v, dica, destaque }: { rotulo: string; valor: string; dica?: string | null; destaque?: boolean }) {
  return (
    <div className={cn("min-h-[72px] flex-1 rounded-[6px] border p-3", destaque ? "border-casca-marca bg-casca-marca-suave" : "border-[#F1F0F5] bg-[#F8F8FA]")}>
      <p className={cn(ROTULO_PEQUENO, destaque && "text-casca-marca")}>{rotulo}</p>
      <p className={cn("text-[14px] text-casca-texto", destaque ? "font-semibold" : "font-medium")}>{v}</p>
      {dica ? <p className="mt-0.5 text-[12px] text-[#5A5964]">{dica}</p> : null}
    </div>
  );
}

function CartaoDoContato({ marca, contato, destaque }: { marca: string; contato: ResumoDoContato | undefined; destaque: "email" | "telefone" }) {
  return (
    <div className="flex-1 rounded-[8px] border border-casca-borda p-3">
      <div className="mb-2 flex items-center justify-between">
        <span className="rounded-full bg-casca-marca-suave px-2 py-0.5 text-[11px] font-medium text-casca-marca">{marca}</span>
        {contato?.whatsapp ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-[#EEFBF2] px-2 py-0.5 text-[11px] text-[#1F9D55]">
            <MessageCircle size={11} aria-hidden /> WhatsApp
          </span>
        ) : null}
      </div>
      <p className="font-semibold text-casca-texto">{contato?.nome ?? "—"}</p>
      <p className={cn("text-[14px]", destaque === "email" ? "font-medium text-[#1F9D55]" : "text-[#5A5964]")}>{contato?.email ?? "—"}</p>
      <p className={cn("text-[14px]", destaque === "telefone" ? "font-medium text-[#1F9D55]" : "text-[#5A5964]")}>{fone(contato?.telefone)}</p>
    </div>
  );
}

export function DetalheDaPendencia({
  linha,
  ocupado,
  rotuloDoCampo,
  aoResolver,
}: {
  linha: LinhaLida;
  ocupado: boolean;
  rotuloDoCampo: (campo: string) => string;
  aoResolver: (acao: Acao, dados?: Resolucao["dados"]) => void;
}) {
  const t = useT();
  const motivo = linha.motivo as Motivo;
  const regra = REGRAS[motivo];
  const d = linha.detalhe;
  const n = linha.normalizado as Record<string, unknown>;
  const [escolha, setEscolha] = useState("");
  const [marcados, setMarcados] = useState<string[]>([]);
  const escolhendoOrigem = motivo === "ORIGIN_NAME_NOT_FOUND";
  const escolhendo = escolhendoOrigem || motivo === "STAGE_NAME_NOT_FOUND";
  const destinos = useDestinosDaImportacao(escolhendo).data ?? [];
  const outras = d.outrasDiferencas ?? [];
  const uma = outras.length === 1;

  function miolo(): ReactNode {
    if (escolhendo) {
      const opcoes = escolhendoOrigem
        ? destinos.map((o) => ({ valor: o.id, rotulo: o.nome }))
        : (destinos.find((o) => o.id === d.origemId)?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }));
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{escolhendoOrigem ? t("Origem no arquivo") : t("Etapa no arquivo")}</p>
            <p className="text-[14px] font-medium text-casca-texto">{valor(escolhendoOrigem ? d.origemDoArquivo : d.etapaDoArquivo)}</p>
          </div>
          <SeletorDaCasca
            valor={escolha}
            opcoes={opcoes}
            aoMudar={setEscolha}
            vazio={escolhendoOrigem ? t("Escolha uma origem") : t("Escolha uma etapa")}
            vazioSoNoGatilho
            aria-label={escolhendoOrigem ? t("Escolha uma origem") : t("Escolha uma etapa")}
            className="h-8"
          />
        </div>
      );
    }
    if (motivo === "MERGE_HINT_EMAIL_PHONE_SPLIT") {
      const [a, b] = [d.contatos?.find((c) => c.casouPor === "email"), d.contatos?.find((c) => c.casouPor === "telefone")];
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{t("Linha do arquivo")}</p>
            <p className="text-[14px] text-casca-texto">
              {valor(n.email)} → A · {fone(n.telefone)} → B
            </p>
          </div>
          <div className="flex gap-3">
            <CartaoDoContato marca={t("A · e-mail")} contato={a} destaque="email" />
            <CartaoDoContato marca={t("B · telefone")} contato={b} destaque="telefone" />
          </div>
        </div>
      );
    }
    if (COMPARA.includes(motivo)) {
      const [rotulo, atual, doArquivo] =
        motivo === "MATCH_PHONE_DIFFERS"
          ? [t("Telefone"), fone(d.telefoneAtual), fone(d.telefoneDoArquivo)]
          : motivo === "MATCH_INSTAGRAM_DIFFERS"
            ? [t("Instagram"), valor(d.instagramAtual), valor(d.instagramDoArquivo)]
            : [rotuloDoCampo(d.campo ?? ""), valor(d.valorAtual), valor(d.valorDoArquivo)];
      const manter =
        marcados.length > 0 && !uma ? `${t(ROTULO_DA_ACAO.KEEP_DB.rotulo)} ${t("e atualizar marcados")}` : t(ROTULO_DA_ACAO.KEEP_DB.rotulo);
      return (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-medium tracking-[0.06em] text-[#86858F] uppercase">{rotulo}</p>
          <div className="flex items-stretch gap-3">
            <div className="flex flex-1 flex-col gap-2">
              <Caixa rotulo={t("No sistema")} valor={atual} />
              <button
                type="button"
                disabled={ocupado}
                onClick={() => aoResolver("KEEP_DB", marcados.length > 0 ? { sobrescrever: marcados } : undefined)}
                className="h-8 rounded-[6px] border border-[#D9D8E0] text-[13px] text-casca-texto hover:bg-casca-raia disabled:opacity-50"
              >
                {manter}
              </button>
            </div>
            <ArrowRight size={16} aria-hidden className="mt-9 shrink-0 text-[#86858F]" />
            <div className="flex flex-1 flex-col gap-2">
              <Caixa rotulo={t("No arquivo")} valor={doArquivo} destaque />
              <button
                type="button"
                disabled={ocupado}
                onClick={() => aoResolver("OVERWRITE")}
                className="h-8 rounded-[6px] bg-casca-marca text-[13px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
              >
                {t(ROTULO_DA_ACAO.OVERWRITE.rotulo)}
              </button>
            </div>
          </div>
          {uma ? (
            <button
              type="button"
              disabled={ocupado}
              onClick={() => aoResolver("KEEP_DB", { sobrescrever: [outras[0].campo] })}
              className="h-8 self-start rounded-[6px] bg-casca-marca px-3 text-[13px] font-medium text-accent-foreground disabled:opacity-50"
            >
              {`${t(ROTULO_DA_ACAO.KEEP_DB.rotulo)} ${t("e atualizar {field}").replace("{field}", rotuloDoCampo(outras[0].campo).toLowerCase())}`}
            </button>
          ) : null}
        </div>
      );
    }
    if (motivo === "PHONE_HAS_ACTIVE_WHATSAPP") {
      return (
        <div className="flex flex-col gap-3">
          <div className="flex items-start gap-2 rounded-[6px] bg-[#EEFBF2] p-3 text-[14px] text-[#1F9D55]">
            <MessageCircle size={16} aria-hidden className="mt-0.5 shrink-0" />
            <div>
              <p>{t("Esse contato tem uma conversa de WhatsApp em andamento no telefone atual.")}</p>
              <p>{t("Por isso uma importação não pode substituir o telefone atual deste contato.")}</p>
            </div>
          </div>
          <div className="flex gap-3">
            <Caixa rotulo={t("No sistema")} valor={fone(d.telefoneAtual)} />
            <Caixa rotulo={t("No arquivo")} valor={fone(d.telefoneDoArquivo)} />
          </div>
        </div>
      );
    }
    if (motivo === "MATCH_FILL_EMPTY_FIELDS" && (d.preenchimentos ?? []).length === 0) {
      return <p className={cn(CAIXA_CINZA, "text-[14px] text-[#5A5964]")}>{t("Esta linha não altera nenhum campo — os dados do arquivo já constam neste contato.")}</p>;
    }
    if (motivo === "INVALID_PHONE_FORMAT") {
      const dados = [
        ["email", n.email],
        ["nome", n.nome],
        ["empresa", n.empresa],
        ["instagram", n.instagram],
      ].filter(([, v]) => v);
      return (
        <div className="flex flex-col gap-3">
          <div className={CAIXA_CINZA}>
            <p className={ROTULO_PEQUENO}>{t("Telefone do arquivo (inválido)")}</p>
            <p className="text-[14px] font-medium text-casca-texto">{valor(d.telefoneInvalido)}</p>
          </div>
          {dados.length > 0 ? (
            <div className="rounded-[6px] border border-[#F1F0F5] p-3">
              <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Dados desta linha")}</p>
              <p className="mb-3 text-[12px] text-[#5A5964]">{t("Serão usados se você ignorar o telefone; o telefone inválido é descartado.")}</p>
              {dados.map(([campo, v]) => (
                <p key={String(campo)} className="text-[14px] text-casca-texto">
                  <span className="font-medium">{rotuloDoCampo(String(campo))}</span>: {valor(v)}
                </p>
              ))}
            </div>
          ) : null}
        </div>
      );
    }
    if (motivo === "DEAL_ID_NOT_FOUND") {
      return (
        <div className={CAIXA_CINZA}>
          <p className={ROTULO_PEQUENO}>{t("ID do negócio no arquivo")}</p>
          <p className="text-[14px] font-medium text-casca-texto">{valor(d.negocioIdDoArquivo)}</p>
        </div>
      );
    }
    if (motivo === "DEAL_DUPLICATE_OPEN") {
      const negocio = (n.negocio ?? {}) as { titulo?: string; origem?: string };
      return (
        <div className="flex items-stretch gap-3">
          <Caixa rotulo={t("Negócio em aberto (atual)")} valor={valor(d.negocioAtual)} />
          <ArrowRight size={16} aria-hidden className="shrink-0 self-center text-[#86858F]" />
          <Caixa rotulo={t("Negócio no arquivo")} valor={valor(negocio.titulo ?? n.nome)} dica={negocio.origem ?? null} destaque />
        </div>
      );
    }
    return <p className={cn(CAIXA_CINZA, "text-[14px] text-casca-texto")}>{valor(n.nome ?? n.email ?? n.telefone ?? d.valorInvalido)}</p>;
  }

  return (
    <div className="mx-auto flex w-full max-w-[560px] flex-col gap-5 py-2">
      <div>
        <p className="mb-1 flex items-center gap-2">
          <TriangleAlert size={16} aria-hidden className="text-[#C2570C]" />
          <span className="font-semibold text-casca-texto">{t(ROTULO_DO_MOTIVO[motivo].rotulo)}</span>
          <span className="text-[12px] text-[#86858F]">{t("Linha {n}").replace("{n}", String(linha.numero))}</span>
        </p>
        <p className="text-[14px] text-[#5A5964]">{t(ROTULO_DO_MOTIVO[motivo].descricao)}</p>
        {d.casouPor ? (
          <p className="mt-1 text-[12px] text-[#86858F]">{t("Match por {field}").replace("{field}", rotuloDoCampo(d.casouPor))}</p>
        ) : null}
      </div>
      {miolo()}
      {d.contato ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className={cn(ROTULO_PEQUENO, "mb-2")}>{t("Contexto do contato")}</p>
          {(
            [
              ["Nome", d.contato.nome],
              ["E-mail", d.contato.email],
              ["Telefone", d.contato.telefone ? formatarTelefone(d.contato.telefone) : null],
            ] as const
          )
            .filter(([, v]) => v)
            .map(([r, v]) => (
              <p key={r} className="flex items-baseline gap-2">
                <span className="min-w-16 text-[12px] text-[#5A5964]">{t(r)}</span>
                <span className="text-[14px] font-medium text-casca-texto">{v}</span>
              </p>
            ))}
        </div>
      ) : null}
      {motivo === "MATCH_OVERWRITE_FILLED_FIELD" && outras.length > 0 ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Outras diferenças nesta linha")}</p>
          <p className="mb-3 text-[12px] text-[#5A5964]">
            {uma
              ? t("Por padrão mantemos o valor atual. Use o botão abaixo para atualizar com o valor do arquivo.")
              : t("Por padrão mantemos o valor atual. Marque para atualizar com o valor do arquivo.")}
          </p>
          <div className="flex flex-col gap-2">
            {outras.map((o) => {
              const texto = `${rotuloDoCampo(o.campo)} — ${t("Valor atual")}: ${valor(o.valorAtual)} · ${t("Valor do arquivo")}: ${valor(o.valorDoArquivo)}`;
              return uma ? (
                <p key={o.campo} className="text-[14px] text-casca-texto">
                  {texto}
                </p>
              ) : (
                <CaixaDaCasca
                  key={o.campo}
                  marcada={marcados.includes(o.campo)}
                  aoMudar={(m) => setMarcados((atual) => (m ? [...atual, o.campo] : atual.filter((x) => x !== o.campo)))}
                  rotulo={texto}
                />
              );
            })}
          </div>
        </div>
      ) : null}
      {(d.preenchimentos ?? []).length > 0 ? (
        <div className="rounded-[6px] border border-[#F1F0F5] p-3">
          <p className="mb-1 text-[14px] font-medium text-casca-texto">{t("Campos que serão preenchidos")}</p>
          <p className="mb-3 text-[12px] text-[#5A5964]">{t("Estavam vazios neste contato e serão preenchidos com o valor do arquivo.")}</p>
          {(d.preenchimentos ?? []).map((p) => (
            <p key={p.campo} className="text-[14px] text-casca-texto">
              <span className="font-medium">{rotuloDoCampo(p.campo)}</span>: {valor(p.valor)}
            </p>
          ))}
        </div>
      ) : null}
      {!COMPARA.includes(motivo) ? (
        <div className="pt-1">
          <p className="mb-2 text-[12px] text-[#86858F]">{t("O que fazer com esta linha?")}</p>
          <div className="flex flex-wrap gap-2">
            {regra.opcoes.map((acao) => {
              const emBreve = (regra.desligadas ?? []).includes(acao);
              const escolhaFalta = acao === "PICK_MANUALLY" && !escolha;
              const descartar = acao === "SKIP_ROW";
              return (
                <button
                  key={acao}
                  type="button"
                  disabled={ocupado || emBreve || escolhaFalta}
                  onClick={() =>
                    aoResolver(acao, acao === "PICK_MANUALLY" ? (escolhendoOrigem ? { origemId: escolha } : { etapaId: escolha }) : undefined)
                  }
                  className={cn(
                    "h-8 rounded-[6px] px-3 text-[13px] font-medium disabled:opacity-50",
                    descartar ? "border border-[#D9D8E0] text-casca-texto hover:bg-casca-raia" : "bg-casca-marca text-accent-foreground hover:bg-casca-marca-forte",
                  )}
                >
                  {t(rotuloDaAcao(acao, motivo).rotulo)}
                  {emBreve ? ` · ${t("em breve")}` : ""}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}
    </div>
  );
}
```

O "e atualizar marcados" mora nos botões da comparação (os três motivos de `COMPARA`), por isso a área "O que fazer com esta linha?" não aparece neles.

- [ ] **Step 3: A tela**

Create `components/escale/importacao/RevisarPendencias.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { useCatalogoDeCampos } from "@/hooks/escale/useCatalogoDeCampos";
import { useImportacao, useLinhasDaImportacao, useResolverEmLote, useResolverLinha } from "@/hooks/escale/useImportacoes";
import { useT } from "@/hooks/i18n/useT";
import type { Resolucao } from "@/lib/escale/importacao/classificar";
import { REGRAS, type Acao, type Motivo } from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import type { LinhaLida } from "@/lib/escale/importacao/tipos";
import { ArrowLeft, CheckCircle2 } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { DetalheDaPendencia } from "./DetalheDaPendencia";

const ROTULO_FIXO: Record<string, string> = {
  nome: "Nome",
  email: "E-mail",
  telefone: "Telefone",
  instagram: "Instagram",
  nascimento: "Data de nascimento",
  empresa: "Empresa",
  id: "ID",
};

const nomeDaLinha = (l: LinhaLida) => {
  const n = l.normalizado as { nome?: string; email?: string; telefone?: string; negocio?: { titulo?: string } };
  return n.nome || n.email || n.telefone || n.negocio?.titulo || `#${l.numero}`;
};

export function RevisarPendencias({ id }: { id: string }) {
  const t = useT();
  const router = useRouter();
  useImportacao(id);
  const lidas = useLinhasDaImportacao(id, "revisar");
  const resolver = useResolverLinha(id);
  const emLote = useResolverEmLote(id);
  const catalogo = useCatalogoDeCampos("contato").catalogo;
  const [linhas, setLinhas] = useState<LinhaLida[]>([]);
  const [maior, setMaior] = useState(0);
  const [filtro, setFiltro] = useState<Motivo | null>(null);
  const [escolhida, setEscolhida] = useState<string | null>(null);

  useEffect(() => {
    if (!lidas.data) return;
    setLinhas(lidas.data);
    setMaior((m) => Math.max(m, lidas.data.length));
  }, [lidas.data]);

  const rotuloDoCampo = (campo: string) => {
    if (campo.startsWith("campo:")) {
      const chave = campo.slice(6);
      return catalogo?.campos.find((c) => c.chave === chave)?.definicao.label ?? chave;
    }
    return t(ROTULO_FIXO[campo] ?? campo);
  };

  const porMotivo = useMemo(() => {
    const m = new Map<Motivo, number>();
    for (const l of linhas) if (l.motivo) m.set(l.motivo, (m.get(l.motivo) ?? 0) + 1);
    return [...m.entries()];
  }, [linhas]);
  const visiveis = filtro ? linhas.filter((l) => l.motivo === filtro) : linhas;
  const atual = visiveis.find((l) => l.id === escolhida) ?? visiveis[0] ?? null;
  const resolvidas = Math.max(0, maior - linhas.length);

  async function resolverAtual(acao: Acao, dados?: Resolucao["dados"]) {
    if (!atual) return;
    const i = visiveis.findIndex((l) => l.id === atual.id);
    const proxima = visiveis[i + 1] ?? visiveis[i - 1] ?? null;
    try {
      const r = await resolver.mutateAsync({ linhaId: atual.id, resolucao: dados ? { acao, dados } : { acao } });
      setEscolhida(proxima?.id ?? null);
      if (r.status === "revisar") await lidas.refetch();
      else setLinhas((ls) => ls.filter((l) => l.id !== atual.id));
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  async function aplicarATodas(acao: Acao) {
    if (!filtro) return;
    try {
      await emLote.mutateAsync({ motivo: filtro, acao });
      setLinhas((ls) => ls.filter((l) => l.motivo !== filtro));
      setFiltro(null);
    } catch (e) {
      toast.error(t(e instanceof Error ? e.message : "Não foi possível iniciar a importação."));
    }
  }

  const voltar = () => router.push("/app/imports");
  const opcoesDoLote = filtro
    ? REGRAS[filtro].opcoes.filter((a) => a !== "PICK_MANUALLY" && !(REGRAS[filtro].desligadas ?? []).includes(a))
    : [];

  return (
    <div className="flex h-full flex-col bg-surface">
      <header className="flex h-[58px] shrink-0 items-center justify-between gap-4 px-[30px]">
        <div className="flex items-center gap-2">
          <BotaoDaCasca type="button" variante="icone" aria-label={t("Voltar")} onClick={voltar}>
            <ArrowLeft aria-hidden />
          </BotaoDaCasca>
          <div>
            <h1 className="text-[20px] font-medium text-casca-texto">{t("Revisar pendências")}</h1>
            <p className="text-[12px] text-[#5A5964]">{t("{n} linhas para revisar").replace("{n}", String(linhas.length))}</p>
          </div>
        </div>
        {maior > 0 ? (
          <div className="flex min-w-[200px] flex-col items-end gap-1">
            <p className="text-[12px] text-[#5A5964]">
              {t("{resolved} de {total} resolvidas").replace("{resolved}", String(resolvidas)).replace("{total}", String(maior))}
            </p>
            <div className="h-1.5 w-[200px] overflow-hidden rounded-full bg-[#ECEBF1]">
              <div className="h-full rounded-full bg-casca-marca" style={{ width: `${Math.round((resolvidas / maior) * 100)}%` }} />
            </div>
          </div>
        ) : null}
      </header>

      {lidas.isLoading ? (
        <p className="p-10 text-center text-[13px] text-[#5A5964]">{t("Carregando…")}</p>
      ) : linhas.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-3 p-10">
          <CheckCircle2 size={40} aria-hidden className="text-[#1F9D55]" />
          <p className="font-semibold text-casca-texto">{t("Tudo revisado!")}</p>
          <BotaoDaCasca type="button" variante="marca" onClick={voltar}>
            {t("Voltar para a lista")}
          </BotaoDaCasca>
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col gap-4 p-6">
          <div role="tablist" className="inline-flex flex-wrap gap-0.5 self-start rounded-[8px] bg-[#F4F4F7] p-0.5">
            {([[null, t("Todas"), linhas.length], ...porMotivo.map(([m, c]) => [m, t(ROTULO_DO_MOTIVO[m].rotulo), c])] as Array<
              [Motivo | null, string, number]
            >).map(([m, rotulo, c]) => (
              <button
                key={m ?? "todas"}
                type="button"
                role="tab"
                aria-selected={filtro === m}
                onClick={() => {
                  setFiltro(m);
                  setEscolhida(null);
                }}
                className={cn(
                  "inline-flex h-7 items-center gap-1.5 rounded-[6px] px-3 text-[12px] font-medium",
                  filtro === m ? "bg-white text-casca-texto shadow-[0_1px_2px_rgb(0_0_0/0.12)]" : "text-[#5A5964]",
                )}
              >
                {rotulo}
                <span className="rounded-full bg-casca-marca-suave px-1.5 text-[11px] text-casca-marca">{c}</span>
              </button>
            ))}
          </div>

          {filtro && opcoesDoLote.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-[8px] border border-casca-borda bg-[#F8F8FA] p-3">
              <p className="text-[14px] text-[#5A5964]">{t("Aplicar a todas as {n} deste motivo:").replace("{n}", String(visiveis.length))}</p>
              {opcoesDoLote.map((acao) => (
                <button
                  key={acao}
                  type="button"
                  disabled={emLote.isPending}
                  onClick={() => void aplicarATodas(acao)}
                  className={cn(
                    "h-6 rounded-[6px] px-2.5 text-[12px] font-medium disabled:opacity-50",
                    acao === "SKIP_ROW" ? "border border-[#D9D8E0] text-casca-texto" : "bg-casca-marca text-accent-foreground",
                  )}
                >
                  {t(rotuloDaAcao(acao, filtro).curto)}
                </button>
              ))}
            </div>
          ) : null}

          <div className="flex min-h-[420px] flex-1 gap-4">
            <div className="flex w-[320px] shrink-0 flex-col overflow-hidden rounded-[8px] border border-casca-borda bg-white">
              <p className="shrink-0 border-b border-[#F1F0F5] px-3 pt-3 pb-2 text-[12px] font-semibold tracking-[0.06em] text-[#86858F] uppercase">
                {t("Pendências")} <span className="font-normal">({visiveis.length})</span>
              </p>
              <div className="flex-1 overflow-y-auto">
                {visiveis.map((l) => (
                  <button
                    key={l.id}
                    type="button"
                    onClick={() => setEscolhida(l.id)}
                    className={cn(
                      "flex w-full flex-col gap-1.5 border-b border-l-[3px] border-b-[#F1F0F5] px-3 py-3 text-left",
                      atual?.id === l.id ? "border-l-casca-marca bg-[#F8F8FA]" : "border-l-transparent hover:bg-[#F8F8FA]",
                    )}
                  >
                    <span className="truncate text-[14px] font-semibold text-casca-texto">{nomeDaLinha(l)}</span>
                    {l.motivo ? (
                      <span className="max-w-full self-start truncate rounded-full bg-[#F4F4F7] px-2 py-0.5 text-[11px] text-[#5A5964]">
                        {t(ROTULO_DO_MOTIVO[l.motivo].rotulo)}
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto rounded-[8px] border border-casca-borda bg-white p-6">
              {atual ? (
                <DetalheDaPendencia
                  key={atual.id}
                  linha={atual}
                  ocupado={resolver.isPending}
                  rotuloDoCampo={rotuloDoCampo}
                  aoResolver={(acao, dados) => void resolverAtual(acao, dados)}
                />
              ) : (
                <p className="flex h-full items-center justify-center text-[#5A5964]">{t("Selecione uma linha.")}</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

O teste do Step 1 chama `resolver` com `{ acao: "OVERWRITE" }` sem `dados`: é o que `resolverAtual` manda quando o botão não tem dados.

- [ ] **Step 4: Rodar e commit**

```bash
corepack pnpm vitest run tests/unit/escale-revisar-pendencias.test.tsx tests/unit/escale-relatorio-da-importacao.test.tsx
corepack pnpm exec eslint components/escale/importacao
git add components/escale/importacao tests/unit/escale-revisar-pendencias.test.tsx
git commit -m "feat(escale): Revisar pendências — lista, detalhe por motivo, comparação e resolver em lote (Fase 2F)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
```

### Task 19: O aviso de fim, o espanhol das telas, o PR C e o PRD

**Files:**
- Modify: `components/escale/importacao/AcompanharImportacoes.tsx` (o corpo), `components/escale/importacao/JanelaDeImportacao.tsx` (marca a importação nova), `components/escale/contatos/MenuNovoContato.tsx` e `app/app/pipelines/[id]/_client.tsx` (montam o `AcompanharImportacoes`), `lib/i18n/dicionario.ts`, `C:\Documentos\projetos claude\Deskcom CRM\docs\modulos\2-contatos-e-empresas.md`, `C:\Documentos\projetos claude\Deskcom CRM\docs\roteiro.md`
- Create: `tests/unit/escale-acompanhar-importacoes.test.tsx`

**Interfaces:**
- Produces: `acompanharImportacao(id: string)` (guarda o id na `sessionStorage` `escale:importacoes`), `AcompanharImportacoes()` (a cada 5 s pergunta pelas acompanhadas; quando uma sai de "na fila / importando", mostra o toast e para de acompanhar).

- [ ] **Step 1: O aviso de fim (N16)**

Replace `components/escale/importacao/AcompanharImportacoes.tsx`:

```tsx
"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { toast } from "sonner";

import { useT } from "@/hooks/i18n/useT";
import { apiClient } from "@/lib/api/client";
import { STATUS_EM_ANDAMENTO } from "@/lib/escale/importacao/textos";
import type { ImportacaoLida } from "@/lib/escale/importacao/tipos";

const CHAVE = "escale:importacoes";
const INTERVALO_MS = 5000;

function ler(): string[] {
  try {
    const lido: unknown = JSON.parse(window.sessionStorage.getItem(CHAVE) ?? "[]");
    return Array.isArray(lido) ? lido.filter((x): x is string => typeof x === "string") : [];
  } catch {
    return [];
  }
}
function gravar(ids: string[]) {
  try {
    window.sessionStorage.setItem(CHAVE, JSON.stringify(ids));
  } catch {
    // o navegador pode recusar; o aviso vale só enquanto a página estiver aberta
  }
}

/** Marca a importação recém-criada para o aviso de fim (N16). */
export function acompanharImportacao(id: string) {
  gravar([...new Set([...ler(), id])]);
}

/**
 * O AVISO DE FIM DAS IMPORTAÇÕES (fork Escale, Fase 2F; molde de
 * `useAcompanharAcoes` da 2B): pergunta a cada 5 s pelas importações desta aba
 * e, quando uma termina, avisa "Importação concluída" ou "{n} linhas precisam de
 * revisão" (com "Revisar").
 */
export function AcompanharImportacoes() {
  const t = useT();
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(async () => {
      const acompanhadas = ler();
      if (acompanhadas.length === 0) return;
      const ainda: string[] = [];
      for (const imp of acompanhadas) {
        try {
          const i = (await apiClient.get<{ data: ImportacaoLida }>(`/api/v1/importacoes/${imp}`)).data;
          if (STATUS_EM_ANDAMENTO.includes(i.status)) {
            ainda.push(imp);
          } else if (i.status === "aguardando_revisao") {
            toast(t("{n} linhas precisam de revisão").replace("{n}", String(i.revisar)), {
              action: { label: t("Revisar"), onClick: () => router.push(`/app/imports/${imp}?revisar=1`) },
            });
          } else if (i.status === "concluida") {
            toast.success(t("Importação concluída"), {
              action: { label: t("Relatório"), onClick: () => router.push(`/app/imports/${imp}`) },
            });
          } else if (i.status === "falhou") {
            toast.error(t("A importação falhou. Tente novamente ou fale com o suporte."));
          }
        } catch {
          ainda.push(imp);
        }
      }
      gravar(ainda);
    }, INTERVALO_MS);
    return () => clearInterval(id);
  }, [router, t]);
  return null;
}
```

Em `JanelaDeImportacao.tsx`, no `confirmar`, logo depois do `mutateAsync`: `acompanharImportacao(criada.id);` (import de `./AcompanharImportacoes`). Monte `<AcompanharImportacoes />` dentro do retorno de `MenuNovoContato` e no `_client.tsx` do quadro, junto da `JanelaDeImportacao` (a página Importações já o monta).

Create `tests/unit/escale-acompanhar-importacoes.test.tsx`:

```tsx
import { render } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn() }) }));
const toastFn = Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() });
vi.mock("sonner", () => ({ toast: toastFn }));
const get = vi.fn();
vi.mock("@/lib/api/client", () => ({ apiClient: { get: (...a: unknown[]) => get(...a) } }));

import { AcompanharImportacoes, acompanharImportacao } from "@/components/escale/importacao/AcompanharImportacoes";

describe("aviso de fim das importações (Fase 2F)", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    window.sessionStorage.clear();
  });
  afterEach(() => vi.useRealTimers());

  it("avisa a revisão pendente e para de acompanhar", async () => {
    acompanharImportacao("imp-1");
    get.mockResolvedValue({ data: { id: "imp-1", status: "aguardando_revisao", revisar: 3 } });
    render(<AcompanharImportacoes />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(toastFn).toHaveBeenCalledWith("3 linhas precisam de revisão", expect.anything());
    expect(window.sessionStorage.getItem("escale:importacoes")).toBe("[]");
  });

  it("em andamento, continua acompanhando", async () => {
    acompanharImportacao("imp-2");
    get.mockResolvedValue({ data: { id: "imp-2", status: "importando" } });
    render(<AcompanharImportacoes />);
    await vi.advanceTimersByTimeAsync(5000);
    expect(window.sessionStorage.getItem("escale:importacoes")).toBe('["imp-2"]');
  });
});
```

- [ ] **Step 2: O espanhol do PR C**

Com o script da Task 9, cole, sob `  // ─── FORK ESCALE · Fase 2F (PR C): lista, relatório e revisão ───`, os pares das chaves `importStudio.list.*`, `importStudio.report.*`, `importStudio.review.*` e `importStudio.rowStatus.*` que ainda não estão no dicionário (os textos com `{n}`, `{count}`, `{ok}` etc. entram como estão: a tela troca o marcador depois do `t()`), mais os nossos:

```ts
  "Importação concluída": { es: "Importación completada" },
  "{n} linhas precisam de revisão": { es: "{n} filas necesitan revisión" },
  "Os detalhes desta importação foram apagados depois de 30 dias.": { es: "Los detalles de esta importación se borraron después de 30 días." },
  "Não foi possível carregar as importações.": { es: "No se pudieron cargar las importaciones." },
  "Telefone descartado: {x}": { es: "Teléfono descartado: {x}" },
  "E-mail descartado: {x}": { es: "Correo descartado: {x}" },
  "ID descartado: {x}": { es: "ID descartado: {x}" },
  "Dono descartado: {x}": { es: "Responsable descartado: {x}" },
  "Campo descartado: {x}": { es: "Campo descartado: {x}" },
  "E-mail descartado": { es: "Correo descartado" },
  "Dono descartado": { es: "Responsable descartado" },
  "Campo descartado": { es: "Campo descartado" },
  "Importações / Exportações": { es: "Importaciones / Exportaciones" },
  "Gerando exportação": { es: "Generando exportación" },
  "Aguardando aprovação": { es: "Esperando aprobación" },
  "Recusada": { es: "Rechazada" },
  "Expirada": { es: "Expirada" },
```

(Os da 2B — "Aguardando aprovação", "Recusada", "Expirada" — já podem estar no dicionário: confira com `grep` e tire os repetidos.)

- [ ] **Step 3: Verificar, abrir e mergear o PR C**

```bash
corepack pnpm vitest run tests/unit/escale-importacao-*.test.ts* tests/unit/escale-lista-de-importacoes.test.tsx tests/unit/escale-relatorio-da-importacao.test.tsx tests/unit/escale-revisar-pendencias.test.tsx tests/unit/escale-acompanhar-importacoes.test.tsx tests/unit/i18n-*.test.ts tests/unit/navegacao-*.test.ts tests/unit/escale-casca-v2-original-intacto*.test.ts
corepack pnpm exec eslint components/escale/importacao components/escale/contatos "app/app/pipelines/[id]/_client.tsx" app/app/imports lib/i18n/dicionario.ts
export NODE_OPTIONS=--max-old-space-size=6144 && corepack pnpm typecheck
git add -A components/escale/importacao components/escale/contatos "app/app/pipelines/[id]/_client.tsx" lib/i18n/dicionario.ts tests/unit/escale-acompanhar-importacoes.test.tsx
git commit -m "feat(escale): aviso de fim das importações e espanhol das telas (Fase 2F, PR C)

Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>"
git push -u escale-crm feat/fase-2f-importacao-telas
gh pr create -R rgisjr/escale-crm --base main --head feat/fase-2f-importacao-telas \
  --title "Fase 2F (PR C): página Importações, relatório e revisão de pendências" \
  --body "$(cat <<'EOF'
## O que entra
- A página "Importações" no "Mais" (com a casca): a troca Importações / Exportações, o filtro por tipo, o andamento, "Revisar", "Relatório" e "Cancelar". As exportações da 2B aparecem na outra superfície, com "Baixar exportação".
- "Relatório da importação": os cinco cartões, a barra, as linhas não importadas por motivo, os avisos e "Exportar" (CSV).
- "Revisar pendências": a lista, o detalhe de cada motivo (comparação sistema × arquivo, os dois contatos, WhatsApp em andamento, origem e etapa por escolher), resolver uma linha (importa na hora) e resolver em lote.
- O aviso de fim da importação enquanto a aba está aberta.

## Pendente
A conferência visual dessas três telas: a Clint não tem print delas ainda (seguimos o código e os textos dela).

## Testes
Os testes de cada tela e do aviso. A bateria cheia e a revisão ficam para o fim da Frente B.

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
gh pr merge -R rgisjr/escale-crm --merge --delete-branch=false
```

- [ ] **Step 4: O PRD e o roteiro**

- Em `docs/modulos/2-contatos-e-empresas.md`, a linha da 2F: `✅ executada: PR A, PR B e PR C mergeados na main; testes pesados e publicação ficam para a bateria única da frente; conferência visual da lista, do relatório e da revisão pendente de print`.
- Em `docs/roteiro.md`, na linha do módulo 2 da tabela da seção 5, acrescente "2F (importar contatos e negócios)" às fases.

Nada disso vai para o repositório (são documentos da pasta do projeto, fora dele).

## Self-review (feito ao escrever, 19/10)

- **Cobertura do pedido:** Q1 (Contatos e Negócios) — Tasks 2, 3, 4, 10, 12, 14; Q2 (tudo igual à Clint) — níveis e situações (1, 13), segundo plano (5, 7), revisão (8, 18), relatório (17), lista (16); Q3 (página no "Mais", com as exportações) — Task 16, N14, N15. Cada texto da Clint citado em "Textos da Clint usados nesta fase" tem uma task que o põe na tela, e o espanhol de todos sai das mesmas chaves (Tasks 9, 15, 19).
- **Sem lacunas de código:** toda função citada numa task está definida numa task anterior (`classificar` T4 → `processarLinhas` T7 → `resolverLinha` T8; `useImportacoes` T10 → telas T16–18; `LINHAS_DO_RELATORIO_MAX` muda de casa na T17, com a instrução). Os três pontos que dependem do que a 2C e a 2D deixaram (assinatura de `fn_escale_vincular_contato_a_empresa`, a lista de definers fechadas e o setup dos testes de tela da 1E) têm o "confira antes" com o arquivo exato.
- **Nomes conferidos entre tasks:** `DadosDaLinha`/`DadosDoNegocio` (T3) são os de T4, T6 e T7; `ContextoDaLinha`/`ContextoDoNegocio` (T4) são os que `lerContextoDoLote` (T6) devolve; `Resolucao`/`Resolucoes` (T4) são os do schema `resolucaoSchema` (T6) e do hook (T10); `StatusDaImportacao`/`StatusDaLinha` (T1) são os da migration (T5).
- **Numeração:** Tasks 1–19 contíguas (PR A 1–9, PR B 10–15, PR C 16–19); migration 9107 (9105 = 2D; 9106 reservada à 2E).
- **Riscos que ficam para a bateria e a revisão da frente:** o volume do consumidor (50.000 linhas ≈ 500 lotes de 100; cada lote faz cerca de 8 leituras e 100 escritas) — medir uma importação de 10.000 linhas no `test:db:update`; as automações de "negócio criado" continuam rodando por linha, como no importador do original (N11); a resolução de uma linha roda na rota (síncrona) e conta com o consumidor parado naquela importação (`aguardando_revisao`).
