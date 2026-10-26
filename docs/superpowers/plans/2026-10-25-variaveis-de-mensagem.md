# Frente V: Variáveis de mensagem (lista única da Clint) e Modelos de mensagem · Plano enxuto

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Plano enxuto de propósito, no padrão da 1L: traz decisões, arquivos, regras, medidas e testes. O código é escrito na execução, seguindo os arquivos citados como molde. São quatro fases, um PR por fase, com merge direto na `main`. Depois vêm uma bateria de testes, um revisor Opus 5.5 e uma publicação.

**Objetivo:** uma **lista única de variáveis**, com os grupos, a ordem, os nomes e os tokens da Clint (`[CONTACT.FIRST_NAME]`), e **um resolvedor só**, usados por todas as telas e envios que inserem ou trocam variáveis. Junto vem a tela **Conversas › Configurações › Modelos de mensagem**, em que cada modelo da API oficial guarda de onde vem cada `{{n}}`. A conversa, a campanha e o follow-up passam a usar esse mapeamento salvo.

**Origem:** na automação de "primeira mensagem" (Webhooks › Automações › Enviar mensagem no WhatsApp) só havia o botão "Nome". Faltava "Primeiro nome", e os campos do funil apareciam soltos, sem grupo.

**Tech Stack:** Next.js 16, React 19, TypeScript, TanStack Query 5, Zod, Supabase (Postgres e RLS), Vitest e Testing Library.

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois disso, a entrega até a produção é do Claude (CLAUDE.md, 18/10).
- **Executa tudo, testa tudo, publica tudo:** as fases V1 a V4 rodam uma atrás da outra, com um PR por fase e merge direto. Durante a execução valem só o teste que a task cria, o typecheck e o eslint dos arquivos alterados. A bateria (`test:unit` cheio, `test:db`, `test:db:update`), o revisor e a publicação acontecem **uma vez**, no fim da frente.
- **Igual à Clint:** os prints em `docs/clint/prints-variaveis/` (tirados em 25/10 da Clint atual) valem mais que qualquer ficha. Antes de escrever cada tela, abrir o print citado. A cor da marca Escale IA (`casca-marca`) entra onde a Clint usa o roxo, com o mesmo peso. O resto (cinzas, medidas, cantos, chips) segue a Clint.
- **Menu da v1:** a tela de modelos fica dentro de Conversas › Configurações, como na Clint (`/chat/settings/message-template`). Nada de menu lateral.
- **Formato BR** em tudo que a variável produz: data dd/mm/aaaa, hora em 24 h ("dd/mm/aaaa às HH:mm", fuso da organização) e valor no padrão R$ 1.234,56.
- **Compatibilidade de leitura é obrigatória.** Nenhum texto salvo é reescrito no banco. Automações, campanhas, atividades, respostas rápidas e follow-ups já salvos saem **idênticos** ao que saíam antes. Isso é provado por testes de regressão escritos **antes** de mexer.
- **Migration:** faixa **9500–9599**. A 9400–9499 era de Produtos, mas a revisão já usou da 9401 à 9405. Esta frente usa a **9501**. Rodar `pnpm checar:colisao-de-migration` antes do PR da V3.
- Textos novos vão para `lib/i18n/dicionario.ts` (pt e es, como nas fases anteriores). Sem hex solto: cor nova vira token da casca em `app/globals.css`.
- Worktree nova a partir de `escale-crm/main`. A branch do `repo/` (`feat/fase-1i-aba-atividades`) está atrasada e não deve ser usada. Usar `corepack pnpm`.

---

## Referência visual (abrir antes de cada tela)

Os prints da Clint de 25/10 estão em `C:\Documentos\projetos claude\Deskcom CRM\docs\clint\prints-variaveis\`:

| Print | O que mostra |
|---|---|
| `docs/escale/clint/prints-variaveis/v01-lista-de-modelos.jpg` | Conversas › Configurações › Modelos de mensagem: busca, filtros, pastas, tabela e paginação |
| `docs/escale/clint/prints-variaveis/v02-modelo-mapeado.jpg` | Janela "Modelo de mensagem" com a variável já mapeada em "Primeiro nome" |
| `docs/escale/clint/prints-variaveis/v03-popover-negocio-aberto.jpg` | Popover "Variáveis" aberto pelo "Trocar campo", com o 1º grupo (Negócio) aberto e os campos personalizados no fim |
| `docs/escale/clint/prints-variaveis/v04-popover-grupos-fechados.jpg` | Fim do Negócio e os outros grupos fechados (Contato, Empresa, Usuário, Recuperação de vendas) |
| `docs/escale/clint/prints-variaveis/v05-popover-contato-aberto.jpg` | Grupo Contato aberto: Nome, Primeiro nome, Sobrenome, Cargo, Email, Telefone, ID do contato |
| `docs/escale/clint/prints-variaveis/v06-popover-busca.jpg` | Busca "nome": todos os grupos com resultado aparecem abertos |
| `docs/escale/clint/prints-variaveis/v07-popover-busca-vazia.jpg` | Busca sem resultado: "Nenhuma variável encontrada" |
| `docs/escale/clint/prints-variaveis/v08-valor-alternativo-aberto.jpg` | "Definir um valor alternativo" aberto: "Remover" e o campo "Digite o valor alternativo" |
| `docs/escale/clint/prints-variaveis/v09-escrever-um-valor.jpg` | Opção "Escrever um valor": "Texto enviado no lugar da variável", prévia com "variável 1 sem valor" e o rodapé "Pode salvar agora…" |
| `docs/clint/prints-conversas/2026-10-17-c63-modelos-de-mensagem-previa.jpg` | Na conversa, a prévia sai **já resolvida** ("Boa tarde Aparecido") e há o link "Editar modelo" |

**Código da Clint:**
- Grupos e campos: `clint-model\raw-v2\js\variable-options-EMzVfpCO.js.txt`.
- Mapa token → dado: `index-CY2O8ZFZ.js.txt` (buscar `"DEAL.DATE":"deal.created_at"`).
- Janela do modelo: `index-C4ljUdHm.js.txt` (`MessageTemplateModal`, `TemplateVariables`).
- Lista: `index-YQu0gzVE.js.txt` (`MessageTemplateListItem`).
- Popover: `EditorParams-l2huLFIf.js.txt`.
- Textos: `catalog-v2\i18n-pt.txt` (`component.TemplateVariables.*`, `component.MessageTemplateModal.*`, `component.MessageTemplate.*`, `component.variables.*`).

### Detalhes visuais a reproduzir

**Popover "Variáveis"** (v03 a v07):
- Painel branco, com cerca de 380 px de largura, sombra e raio da casca. Título "Variáveis" em 14 px semibold, com divisória embaixo.
- Busca "Buscar variável": fundo cinza-claro (`casca-raia`), lupa **à direita**, foco com anel da marca.
- Grupos em acordeão: título em CAIXA ALTA, 12 px, cinza, peso médio, chevron à direita (para cima quando o grupo está aberto). **Só o 1º grupo começa aberto**. Com busca digitada, **todos os grupos com resultado abrem** e os vazios somem.
- Campos como **chips** que quebram linha: fundo `casca-marca-suave`, texto `casca-marca`, 12 px, raio 4, padding 2×8 e espaço de 6 px entre eles. Texto longo é cortado com "…" no limite da largura.
- A lista rola dentro do painel (até cerca de 330 px de altura).
- Busca sem resultado: "Nenhuma variável encontrada", centralizado, em cinza.

**Janela "Modelo de mensagem"** (v02, v08, v09):
- Título "Modelo de mensagem", seguido do nome do modelo num selo mono cinza (`1msg_geral`). Subtítulo "Diga de onde vem cada valor destacado na mensagem." e "×" à direita.
- "PRÉVIA DO ENVIO" em sobrelinha cinza. Caixa azul-clara com o corpo. Cada variável aparece como chip mono pequeno: o rótulo do campo ("Primeiro nome") quando é campo, o valor fixo quando é fixo, e "variável N sem valor" quando falta.
- "Variáveis" (16 px semibold). Para cada slot, uma caixa cinza-clara com:
  - na 1ª linha, o selo do número ("1") e o trecho entre aspas `"…Olá {{1}}, estou entrando em…"`;
  - dois cartões lado a lado, "Buscar na Escale" / "Vem do cadastro e muda em cada envio." e "Escrever um valor" / "O mesmo texto para todos os contatos.". O cartão escolhido tem borda e fundo da marca suave;
  - se a origem é campo: uma caixa com o ícone do grupo (pessoa para Contato) e o rótulo do campo, e o link "Trocar campo" na cor da marca à direita. Sem campo escolhido, o botão é "Escolher o campo" (na Clint, "Escolher o campo da Clint");
  - divisória fina e a frase "Se o campo estiver vazio no envio, a mensagem sai com lacuna no lugar da variável." com o link "Definir um valor alternativo" à direita. Nosso texto difere aqui (decisão D8): "Se o campo estiver vazio no envio, a mensagem não sai para esse contato.";
  - com o valor alternativo aberto (v08): "Remover" à direita e o campo "Digite o valor alternativo";
  - se a origem é fixa (v09): rótulo "Texto enviado no lugar da variável" e o campo "Digite o texto". As regras do WhatsApp aparecem como dica: "O WhatsApp recusa quebras de linha, tabulações, quatro ou mais espaços seguidos e textos acima de 1024 caracteres.".
- Variável de botão: faixa com o selo "Botão" e o texto "Variável de botão: aceita apenas campo da Escale, não aceita texto fixo." O cartão "Escrever um valor" fica desligado.
- Rodapé: à esquerda, "Pode salvar agora. O envio libera quando tudo estiver definido." (só quando falta algo) ou "Corrija o valor destacado para salvar." (erro, com o slot marcado "Corrigir"). À direita, "Cancelar" (contorno) e "Salvar" (marca).
- Toasts: "As variáveis foram salvas com sucesso!" e "Erro salvar variáveis!". O texto do erro é o da Clint, mas corrigido para "Erro ao salvar as variáveis.".

**Lista "Modelos de mensagem"** (v01):
- Migalha "Configurações › Modelos de mensagem" e "×" à direita, como a `CabecaDaConfiguracao`.
- Barra: busca "Buscar por modelo..." e os filtros Dispositivo, Status, Categoria e Idioma (gatilhos da casca com chevron). À direita, o botão ressincronizar (ícone em quadrado contornado) e "+ Modelo" (marca).
- Tabela com as colunas **CONTA/MODELO** (nome em 13 px e, embaixo, a conta em cinza 11 px mais o selo `{ } N variáveis`), **CATEGORIA** (selo "Marketing" com fundo da marca suave), **IDIOMA** ("BR"), **STATUS** (selo verde "Aprovado", e as outras cores por status) e ⋮.
- Paginação "10 por página" à esquerda e "Anterior 1 2 3 … Próximo" à direita (`PaginacaoDaCasca`).
- Clicar na linha abre a janela "Modelo de mensagem".

---

## Decisões (tomadas pelo Claude por delegação do usuário em 25/10)

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Os campos sem dado no Escale ficam escondidos** do seletor. Hoje são: Empresa › URL, Segmento, Categoria e Nº de funcionários; Usuário › Telefone, WhatsApp, Link e Identificador. Eles existem no catálogo com `disponivel: false`; ligar um deles é trocar o booleano quando o dado nascer. | Oferecer variável que sai sempre vazia é prometer dado que não existe. |
| D2 | **Recuperação de vendas e as plataformas de checkout ficam fora da lista.** O resolvedor **reconhece** esses tokens (`[DEAL.BILLET_LINK]`, `[DEAL.CHECKOUT_LINK]` e os 13 de checkout) e os trata como **campo vazio**. Assim, um texto copiado da Clint nunca sai com `[DEAL.X]` cru. | O Escale não tem integração de checkout. |
| D3 | **Quem é o "Usuário":** nas automações, na campanha e no follow-up, é o **responsável pelo negócio** (`crm_leads.owner_user_id`). Na conversa, na resposta rápida e na atividade, é **quem está enviando**. "Usuário › Nome da empresa" é o nome da conta (`organizations.name`), como na Clint (`USER.ORGANIZATION.NAME → user.owner.name`). | É o que a Clint resolve. Na automação não há quem envia. |
| D4 | **"Saudação" fica só na campanha**, num grupo próprio no fim da lista ("Outros"), e o seletor só o mostra quando recebe `extras={["saudacao"]}`. | Não existe na Clint, mas as campanhas usam e ele é resolvido na hora do envio. |
| D5 | **Tela de Modelos de mensagem nesta frente:** a lista (busca, filtros Status, Categoria e Idioma, paginação, contador de variáveis, ressincronizar e "+ Modelo" levando para a criação que já existe em `/app/settings/canal-oficial`) e a janela de mapeamento. Ficam **"Em breve"**: pastas, filtro Desempenho, colunas Envios (30d) e Entrega, preço máximo, "Apagar no WhatsApp" e o filtro Dispositivo, que entra se a conta tiver mais de uma WABA. | Escopo da frente. Envios e Entrega pedem métricas que ainda não medimos. |
| D6 | **Follow-up aceita modelo com variável** quando o mapeamento salvo está **completo e atual** (mesmo `contract_hash`). | É o pedido: "as automações já usam o mapeamento salvo". |
| D7 | **A automação do Webhook continua com texto livre.** Ela só ganha o seletor único. Mandar modelo da Meta pela automação do Webhook fica fora desta frente. | Escopo. O texto livre é o caso relatado. |
| D8 | **Variável vazia no envio:** cada lugar mantém a regra de hoje, e o modelo da Meta usa o valor alternativo primeiro. **Texto livre:** a automação e a atividade trocam por vazio, como hoje. A resposta rápida mantém o literal e bloqueia o envio, como o Inbox faz hoje. A campanha tira a pessoa da lista (`variavel_ausente`). **Modelo da Meta:** campo vazio usa o alternativo. Sem alternativo, a conversa bloqueia e mostra "variável N sem valor", a campanha tira a pessoa da lista e o follow-up pula o passo com o motivo `variavel_sem_valor`. **Nada sai com lacuna**: a Meta recusa parâmetro vazio. | Compatibilidade e entrega: "lacuna" da Clint seria erro da Meta para nós. |
| D9 | **Formato gravado daqui para frente:** toda tela insere o token da Clint (`[CONTACT.FIRST_NAME]`). Os formatos antigos (`{{nome}}`, `{{primeiro_nome}}`, `{{telefone}}`, `{{email}}`, `{{contact.x}}`, `{{lead.x}}`, `{{lead.custom_fields.x}}`, `{{contato.x}}`, `{{servico}}`, `{{saudacao}}`) **continuam sendo lidos para sempre**, cada um no **dialeto** de onde foi escrito (D10). | O texto salvo não é reescrito. |
| D10 | **Dialetos:** os formatos antigos de chave dupla não querem dizer a mesma coisa em todo lugar. `{{lead.title}}` é coluna na automação; `{{lead.gancho}}` é campo personalizado na campanha. Por isso o resolvedor recebe `dialeto: "automacao" \| "campanha" \| "inbox" \| "clint"` e, para tokens antigos, delega à regra **atual** daquele dialeto. Os tokens `[X.Y]` são iguais em todo lugar. | Garante saída idêntica ao que já está salvo. |
| D11 | **Onde o mapeamento mora:** numa **coluna `variaveis` em `meta_templates`**, sem tabela nova, junto com `variaveis_contrato` (o `contract_hash` do momento em que foi salvo). É o mesmo desenho de `saved_values` (0382): o valor pertence à definição (organização + WABA + nome + idioma), o `syncTemplates` faz `upsert` só das colunas da plataforma, e a gravação vale para todas as linhas de mesmo nome e idioma da organização. Links de mídia continuam em `saved_values`. | Reuso de um padrão já provado. |
| D12 | **Mapeamento velho:** se o `contract_hash` mudar (o modelo foi editado na Meta), o mapeamento é tratado como **não definido**. A janela abre com o aviso "O modelo mudou na Meta. Confira as variáveis." e os slots vêm pré-preenchidos com o que ainda casa. | Não mandar valor no slot errado. |
| D13 | **Conversa com slot sem mapeamento:** continua o campo de digitar à mão de hoje (sem regressão). Slot mapeado sai resolvido e só leitura, como na Clint (c63). Para administrador, o link "Editar modelo" abre a janela de mapeamento. | Compatibilidade com quem ainda não mapeou. |
| D14 | **A Empresa do contato** é a empresa principal da pessoa: `contacts.person_id → company_people (is_primary, depois a mais recente) → companies`. "Cargo" é `company_people.job_title`. Nome da empresa = `trade_name ?? legal_name`. Hoje o playbook manda **o nome da conta** em `[ORGANIZATION.NAME]`, o que está **errado**. Passa a ser a empresa do contato (o nome da conta é `[USER.ORGANIZATION.NAME]`). | Igual à Clint. A correção vale também para atividades já salvas: é bug. |
| D15 | Rótulos da Clint ao vivo: em Negócio, "Link do último agendamento" e "Data do último agendamento" (o código antigo dizia "reunião"; valem os prints). Os dados saem do compromisso mais recente do contato em `calendar_appointments` (`meeting_url`, `starts_at`), sem os cancelados. | Prints e i18n atuais. |

## Catálogo (fonte única)

A ordem é a dos prints. Cada campo traz o token, o rótulo e a origem do dado.

| Grupo | Token | Rótulo | Origem do dado |
|---|---|---|---|
| **Negócio** | `[DEAL.DATE]` | Data | `crm_leads.created_at` em dd/mm/aaaa |
| | `[DEAL.STATUS]` | Status | `status`: open → "Aberto", won → "Ganho", lost → "Perdido" |
| | `[DEAL.STAGE]` | Etapa | `crm_stages.name` |
| | `[DEAL.VALUE]` | Valor | `valorDoNegocio` (R$ 1.234,56) |
| | `[DEAL.LATEST_MEETING_LINK]` | Link do último agendamento | `calendar_appointments.meeting_url` (D15) |
| | `[DEAL.LATEST_MEETING_DATETIME]` | Data do último agendamento | `starts_at` em "dd/mm/aaaa às HH:mm" |
| | `[DEAL.ID]` | ID do negócio | `crm_leads.id` |
| | `[DEAL.<CHAVE>]` | rótulo do campo | catálogo `negocio` (`useCatalogoDeCampos`) + `crm_leads.custom_fields`, convertido com `valorParaLeitura` |
| **Contato** | `[CONTACT.NAME]` | Nome | `nomeDoContato(name, display_name)` |
| | `[CONTACT.FIRST_NAME]` | Primeiro nome | 1ª palavra |
| | `[CONTACT.LAST_NAME]` | Sobrenome | o resto |
| | `[CONTACT.ROLE]` | Cargo | `company_people.job_title` (D14) |
| | `[CONTACT.EMAIL]` | Email | `contacts.email` |
| | `[CONTACT.PHONE]` | Telefone | `contacts.phone_number` |
| | `[CONTACT.ID]` | ID do contato | `contacts.id` |
| | `[CONTACT.<CHAVE>]` | rótulo | catálogo `contato` + `contacts.custom_fields` |
| **Empresa** | `[ORGANIZATION.NAME]` | Nome da empresa | `companies.trade_name ?? legal_name` |
| | `[ORGANIZATION.URL]` | URL | — (escondido, D1) |
| | `[ORGANIZATION.CITY]` | Cidade | `companies.city` |
| | `[ORGANIZATION.STATE]` | Estado | `companies.state` |
| | `[ORGANIZATION.SEGMENT]` / `CATEGORY` / `EMPLOYEES` | Segmento / Categoria / Número de funcionários | — (escondidos) |
| | `[ORGANIZATION.<CHAVE>]` | rótulo | catálogo `empresa` + `companies.custom_fields` |
| **Usuário** | `[USER.FIRST_NAME]` | Primeiro nome | `profiles.full_name`, 1ª palavra |
| | `[USER.LAST_NAME]` | Segundo nome | o resto |
| | `[USER.EMAIL]` | Email | e-mail do usuário (Task 1 confirma a coluna) |
| | `[USER.ORGANIZATION.NAME]` | Nome da empresa | `organizations.name` |
| | `[USER.PHONE]` / `WHATSAPP` / `LINK` / `IDENTIFIER` | Telefone / WhatsApp / Link / Identificador | — (escondidos) |
| **Outros** (só campanha, D4) | `{{saudacao}}` | Saudação | relógio na hora do envio |

**Aliases antigos → token** (o resolvedor normaliza; vale para todos os dialetos): `nome → [CONTACT.NAME]`, `primeiro_nome → [CONTACT.FIRST_NAME]`, `telefone → [CONTACT.PHONE]`, `email → [CONTACT.EMAIL]`. O resto dos formatos antigos segue a regra atual do seu dialeto (D10).

---

## Arquivos

**Criar**
- `lib/variaveis/catalogo.ts`: `GRUPOS_DE_VARIAVEIS` (tabela acima), os tipos `Variavel {token, rotulo, grupo, disponivel, icone}` e `GrupoDeVariaveis`, `gruposComCampos({negocio, contato, empresa}, {extras})`, `filtrarGrupos(grupos, busca)` (sem acento, por rótulo do campo ou do grupo) e `tokenDoCampo(objeto, chave)` (reaproveita `chaveDaVariavel`). Sem React e sem banco.
- `lib/variaveis/resolver.ts`: o **núcleo puro** `resolverTexto(texto, fontes, {dialeto, vazio, formatar?})`, que devolve `{ texto, faltando: string[], desconhecidas: string[] }`. Ele troca `[X.Y]` pelo valor das fontes, aplica os aliases e delega o formato antigo ao dialeto (D10). Também traz `FontesDasVariaveis` (contato, negócio, etapa, empresa, cargo, usuário, conta, último agendamento, campos por objeto, fuso e agora) e `valorDaVariavel(token, fontes)`, que formata em BR.
- `lib/variaveis/fontes.ts`: **servidor**. `carregarFontes(admin, orgId, {contactId, leadId, usuarioId}, tokens)` busca **só** o que os tokens usados pedem (sem empresa no texto, sem consulta à empresa), sempre com `organization_id` no filtro.
- `lib/variaveis/mapeamento.ts`: `variavelDoModeloSchema`, que sai de `lib/escale/campanhas/assistente.ts`. O `campo` passa a aceitar os tokens da Clint **e** os valores antigos (`nome`, `primeiro_nome`, `saudacao`, `lead.x`, `contato.x`). Também traz `mapeamentoSchema`, `validarMapeamento(contrato, mapa)` (regras de valor fixo, botão só com campo, chaves = `slotKey` do contrato) e `valoresDoMapeamento(contrato, mapa, fontes)`, que devolve `{ valores, faltando }`.
- `app/api/v1/channels/templates/variaveis/route.ts`: `PATCH { name, language, variaveis }` (molde: o `PATCH` de `saved_values` em `app/api/v1/channels/templates/route.ts`: `admin` + `requireSupportWrite`, confere tudo antes de gravar e grava em todas as linhas). Grava `variaveis` e `variaveis_contrato`.
- `app/api/v1/channels/templates/valores/route.ts`: `POST { name, language, conversation_id }`. Resolve o mapeamento para o contato da conversa (D3, D13) e devolve `{ valores, faltando, slotsSemMapa }`. Exige membro da organização; a conversa precisa ser da organização da sessão.
- `app/api/v1/variaveis/resolver/route.ts`: `POST { texto, conversation_id }`, para a resposta rápida (o cliente não tem negócio nem empresa). Devolve `{ texto, faltando }`.
- `components/escale/variaveis/SeletorDeVariaveis.tsx`: **o popover único**. Recebe `gatilho` (children), `aoEscolher(token)`, `extras?` e `objetos?`. Busca e carrega os campos pelo `useVariaveisDisponiveis`.
- `hooks/escale/useVariaveisDisponiveis.ts`: junta o catálogo fixo e os três `useCatalogoDeCampos`.
- `components/escale/variaveis/ChipDaVariavel.tsx`: o chip mono da prévia ("Primeiro nome" e "variável 1 sem valor").
- `components/escale/conversas/configuracoes/modelos/TelaModelosDeMensagem.tsx`, `LinhaDoModelo.tsx`, `JanelaDoModelo.tsx` (mapeamento) e `CartaoDaOrigem.tsx` ("Buscar na Escale" / "Escrever um valor").
- `app/app/inbox/configuracoes/modelos/page.tsx`: rota da tela (molde: as outras páginas de `app/app/inbox/configuracoes/`).
- `hooks/escale/useMapeamentoDoModelo.ts`: mutation do `PATCH`; invalida `useModelosDeMensagem`.
- `supabase/migrations/2026MMDD120000_9501_variaveis_do_modelo.sql`: data no padrão das outras, depois da última migration da `main`.
- Testes: `tests/unit/variaveis-catalogo.test.ts`, `variaveis-resolver.test.ts`, `variaveis-compatibilidade.test.ts` (o de regressão), `variaveis-mapeamento.test.ts`, `variaveis-rotas.test.ts`, `seletor-de-variaveis.test.tsx`, `tela-modelos-de-mensagem.test.tsx`, `janela-do-modelo.test.tsx` e `tests/db/9501-variaveis-do-modelo.test.ts`.

**Modificar**
- `lib/automation/template.ts`: `renderTemplate` vira um invólucro de `resolverTexto(..., {dialeto: "automacao", vazio: "vazio"})`, com as **mesmas** assinatura e saída. `marcacaoDoCrm` também reconhece `[X.Y]`.
- `lib/automation/actions/send-whatsapp.ts` e `send-email.ts`: quando o texto tem `[X.Y]`, carregam as fontes (`carregarFontes` com `contact.id`, `lead.id` e `lead.owner_user_id`) e as passam ao `renderTemplate`. Sem token novo, nenhuma consulta a mais.
- `lib/inbox/template-vars.ts`: `interpolateTemplate` e `faltouNomeDeContato` passam a usar o núcleo (`dialeto: "inbox"`, `vazio: "literal"`), com a saída idêntica.
- `lib/campanhas/renderizador.ts`: `renderizar` passa a usar o núcleo (`dialeto: "campanha"`, `vazio: "falta"`). Os tokens `[X.Y]` entram por `ValoresDoDestinatario.fontes?`. `lib/campanhas/preparacao.ts`, `elegibilidade.ts` e `consulta-de-audiencia.ts` passam a carregar as fontes quando o texto ou o mapeamento usa token novo.
- `lib/escale/campanhas/modelo.ts` e `assistente.ts`: o schema vem de `lib/variaveis/mapeamento.ts`. `CAMPOS_BASICOS` sai e entra o catálogo. `valoresDoModelo` usa o núcleo.
- `lib/escale/playbook/variaveis.ts`: `VARIAVEIS_DA_MENSAGEM`, `gruposDeVariaveis` e `filtrarVariaveis` passam a ler o catálogo. `resolverVariaveis` vira um invólucro do núcleo (`dialeto: "clint"`, `vazio: "vazio"`). `DadosDasVariaveis` vira `FontesDasVariaveis`.
- `lib/escale/negocio/atividades.ts` e `components/escale/negocio/abas/AbaAtividades.tsx`: montam as fontes, com empresa do contato e cargo (D14) e último agendamento.
- `components/escale/configuracoes/playbook/VariaveisDaMensagem.tsx`: vira um invólucro do `SeletorDeVariaveis`, mantendo o gatilho "+ Adicionar variáveis".
- `app/app/webhooks/_components/ActionConfigForm.tsx`: sai `TEMPLATE_VARS` e a fileira de botões (WhatsApp e e-mail) e entra o `SeletorDeVariaveis` com o gatilho "+ Adicionar variáveis". O placeholder vira "Oi [CONTACT.FIRST_NAME], tudo bem?" e a dica do e-mail cita os tokens novos.
- `components/escale/conversas/configuracoes/respostas/JanelaRespostaRapida.tsx`: sai `VARIAVEIS` e entra o seletor. `PainelRespostasRapidas.tsx`: ao escolher, chama `/api/v1/variaveis/resolver`. Se a chamada falhar, cai no `interpolateTemplate` (dialeto inbox).
- `components/escale/conversas/configuracoes/canais/TelaDoCanal.tsx`: a aba "Modelos de mensagem" vira link para a tela nova. `HubDeConfiguracoes.tsx` ganha a linha "Modelos de mensagem".
- `components/escale/conversas/centro/compositor/JanelaModelosDeMensagem.tsx`: ao escolher um modelo, chama `/templates/valores`. Slot mapeado sai resolvido e só leitura, slot sem mapa mantém o campo de hoje, "Editar modelo" aparece para administrador e o ⚙ abre a tela de modelos (D13).
- `app/api/v1/channels/templates/route.ts`: o `GET` devolve `variaveis` (o mapeamento, só se estiver atual) e `variaveisDesatualizadas: boolean` (D12). `TemplateView` ganha esses campos.
- `hooks/escale/useModelosDeMensagem.ts`: tipos novos.
- `components/escale/campanhas/assistente/VariaveisDoModelo.tsx`: ao escolher o modelo, vem pré-preenchido com o mapeamento salvo (só nos slots ainda vazios na campanha). O seletor de campo vira o `SeletorDeVariaveis` com `extras={["saudacao"]}`.
- `lib/followup/modelos-aprovados.ts`: aceita modelo com variável se `mapeamentoCompleto(contrato, variaveis, variaveis_contrato)`. `lib/agent-engine/agent/followup-turn.ts` (`resolveModeloAprovado` e o envio): resolve os valores pelo mapeamento com as fontes do negócio do passo; com falta, pula o passo com `variavel_sem_valor` (D8).
- `lib/operacao/modelos-de-mensagem.ts`: as marcações `[X.Y]` contam como "do CRM" (recusa valor de fora, como já faz com `{{nome}}`).
- `supabase/baseline.sql` e `supabase/migrations/MANIFEST.md`: o apêndice da 9501 (memória `baseline-ordem-dos-blocos-do-fork`: antes da varredura anon).
- `lib/i18n/dicionario.ts` (pt e es), `docs/roteiro.md` (Frente V, faixa 9500–9599) e `LOG.md`.

**Não tocar:** `app/app/templates/` e `components/inbox/Composer.tsx` (textos prontos do original; o `interpolateTemplate` deles segue igual pelo invólucro), `lib/propostas/` (outro domínio), `app/api/v1/cron/agenda-reminder` (variáveis próprias de lembrete) e `crm_mensagens_agendadas` (o texto é gravado já pronto: não há variável a resolver no envio).

---

## Migration 9501 (`variaveis_do_modelo`)

```sql
-- 9501: o mapeamento das variáveis do modelo (fork Escale, Frente V).
alter table public.meta_templates
  add column if not exists variaveis jsonb not null default '{}'::jsonb,
  add column if not exists variaveis_contrato text;
alter table public.meta_templates drop constraint if exists meta_templates_variaveis_objeto;
alter table public.meta_templates
  add constraint meta_templates_variaveis_objeto check (jsonb_typeof(variaveis) = 'object');
comment on column public.meta_templates.variaveis is
  'Fork Escale (9501): de onde vem cada {{n}}, por slotKey: {"1": {"fonte":"campo","campo":"[CONTACT.FIRST_NAME]","alternativo":null}} ou {"fonte":"fixo","valor":"..."}. Gravada só pelo servidor (PATCH /api/v1/channels/templates/variaveis), em todas as linhas do mesmo nome e idioma da organização.';
comment on column public.meta_templates.variaveis_contrato is
  'contract_hash do modelo quando o mapeamento foi salvo; diferente do atual = mapeamento desatualizado.';
```

- **RLS:** `meta_templates` já tem RLS ligada, com leitura pela organização. A escrita é **só do servidor** (service role, rota com `admin` + `requireSupportWrite`, filtro `organization_id` da sessão), e esta migration **não** cria policy nem grant novos. O teste de banco prova que (a) `authenticated` de outra organização não lê o `variaveis`, (b) `authenticated` não consegue `update` direto e (c) o `upsert` do sync (as colunas da plataforma) não apaga `variaveis`.
- Aditiva, idempotente, sem backfill e sem função (não entra na cura da varredura anon). O apêndice vai no baseline antes da varredura anon.

---

## Fases e tasks

### Fase V1: catálogo e resolvedor único (sem tela)

**Telas:** nenhuma. **Imagem:** v03 a v05, que definem a ordem e os rótulos. **Pronto:** todos os envios passam pelo núcleo e saem idênticos ao que saíam antes.

#### Task 1: Worktree, plano no repositório e as provas
- Worktree nova a partir de `escale-crm/main` (branch `feat/frente-v-variaveis`). Copiar este plano e `docs/clint/prints-variaveis/` para o repositório.
- **Provas (só leitura):**
  - (a) Colunas de `profiles` (o nome e o e-mail do usuário). Se não houver e-mail, `[USER.EMAIL]` sai de `auth.users` via admin ou fica escondido: decidir pelo que já existe em `lib/` e anotar.
  - (b) O valor de `crm_leads.status` (open/won/lost?).
  - (c) O status de compromisso cancelado em `calendar_appointments`.
  - (d) Como o módulo 2 liga contato e empresa (confere com D14).
  - (e) Se `lib/agent-engine/agent/inbound-turn.ts` usa variável de mensagem ou só texto de prompt (o grep achou `{{`).
  - (f) Contagem em produção (MCP de leitura) de quanto texto salvo usa cada formato: `webhook_rules.actions` com `{{`, `campaigns.escale_mensagem`, `crm_atividades_da_etapa`, respostas rápidas e passos de follow-up. Anotar no PR, porque isso define o tamanho do teste de regressão.
- Commit: `chore(escale): plano da frente V (variáveis de mensagem)`.

#### Task 2: Regressão primeiro (RED pela razão certa)
- `tests/unit/variaveis-compatibilidade.test.ts`: uma tabela de casos, **gravada com as funções atuais antes da troca**, para `renderTemplate` (automação: `{{nome}}`, `{{primeiro_nome}}`, `{{lead.title}}`, `{{contact.email}}`, `{{servico}}` que vem do custom field, vazio vira "", o protótipo não vaza, o formatador de HTML escapa só o valor), `interpolateTemplate` (desconhecida mantém o literal, sem nome mantém o literal, cai no `display_name`), `renderizar` (falta, `saudacao` sem instante fica literal, `lead.x`/`contato.x`, `__proto__`) e `resolverVariaveis` do playbook. Os casos reais contados na Task 1 (f) entram anonimizados.
- Hoje o teste passa. Ele vira a cerca da troca: depois da Task 4 tem de continuar verde sem mudar nenhuma expectativa, **exceto** `[ORGANIZATION.NAME]` do playbook (D14), cuja expectativa muda de propósito e com comentário.

#### Task 3: `lib/variaveis/catalogo.ts`
- TDD:
  - ordem dos grupos Negócio, Contato, Empresa, Usuário;
  - ordem e rótulo de cada campo iguais à tabela;
  - escondidos fora (D1);
  - personalizados no fim do grupo do objeto, com token `[DEAL.CHAVE]`;
  - `extras: ["saudacao"]` cria "Outros" no fim;
  - busca sem acento por rótulo ou grupo; grupo sem resultado some;
  - token de checkout não aparece.

#### Task 4: `lib/variaveis/resolver.ts` e os invólucros
- TDD do núcleo:
  - cada token da tabela com fontes de exemplo (BR: `[DEAL.DATE]` → "05/10/2026", `[DEAL.VALUE]` → "R$ 1.234,56", `[DEAL.LATEST_MEETING_DATETIME]` → "05/10/2026 às 14:30" no fuso `America/Sao_Paulo`);
  - `[CONTACT.FIRST_NAME]` com nome vazio, em cada modo de `vazio`;
  - tokens de checkout viram campo vazio (D2);
  - token desconhecido (`[FOO.BAR]`) fica literal e entra em `desconhecidas`;
  - aliases antigos;
  - cada dialeto delega o formato antigo;
  - nada de `eval` nem travessia de protótipo.
- Trocar os quatro invólucros (template.ts, template-vars.ts, renderizador.ts, playbook/variaveis.ts). Rodar a Task 2: verde.

#### Task 5: `lib/variaveis/fontes.ts` e o envio da automação
- TDD com o cliente Supabase falso (molde dos testes em `lib/automation/actions/*.test.ts`):
  - sem token novo, nenhuma consulta;
  - com `[ORGANIZATION.NAME]`, só a consulta da empresa;
  - toda consulta filtra `organization_id`;
  - empresa principal = `is_primary`, senão a mais recente;
  - último agendamento ignora os cancelados.
- `send-whatsapp.ts` e `send-email.ts` carregam as fontes quando o texto tem `[X.Y]`. O teste prova que `[CONTACT.FIRST_NAME]` e `[USER.FIRST_NAME]` (responsável) saem certos e que `{{nome}}` sai igual a antes.
- PR da V1 (typecheck e eslint dos arquivos alterados, testes da fase). Merge.

### Fase V2: o seletor único nas telas de texto livre

**Telas:**
- Webhooks › Automações › Enviar mensagem no WhatsApp e Enviar e-mail (`ActionConfigForm`);
- Configurações › Playbook (mensagem da atividade);
- Conversas › Configurações › Respostas rápidas (e a inserção no compositor).

**Imagens:** v03, v04, v05, v06 e v07. **Pronto:** o popover igual a v03 a v07 nas três telas, com a cor da marca no lugar do roxo, e a diferença listada por escrito na conferência.

#### Task 6: `SeletorDeVariaveis` e `ChipDaVariavel`
- Seguir "Detalhes visuais › Popover" e o molde `VariaveisDaMensagem.tsx` + `PainelSuspenso`. Usar o acordeão da casca se existir; senão, botão com `aria-expanded`.
- TDD de componente:
  - abre com o título e a busca focada;
  - só o 1º grupo aberto;
  - clicar no título abre e fecha o grupo;
  - buscar "nome" abre Contato, Empresa e Usuário e esconde os grupos vazios;
  - busca sem resultado mostra a frase;
  - clicar no chip chama `aoEscolher("[CONTACT.FIRST_NAME]")` e fecha;
  - personalizado aparece no fim do grupo;
  - teclado: Tab chega aos chips e Enter escolhe;
  - `aria-label` em cada grupo.
- Teste com os provedores reais no wrapper (memória `provedor-escondido-pelo-teste`: Tooltip e QueryClient).

#### Task 7: Webhook, playbook e respostas rápidas
- `ActionConfigForm` (WhatsApp e e-mail): o gatilho "+ Adicionar variáveis" acima do campo insere o token no cursor (`inserirNoCursor` que já existe). O teste prova que "Primeiro nome" insere `[CONTACT.FIRST_NAME]` e que uma regra antiga com `{{nome}}` abre sem mudar.
- Playbook: `VariaveisDaMensagem` usa o seletor. O teste da 1I continua verde, mas a ordem nova muda a expectativa de grupos: atualizar com comentário.
- Respostas rápidas: o seletor na janela. `PainelRespostasRapidas` resolve pelo servidor (a rota `variaveis/resolver`, com o teste: org errada dá 404, sem sessão dá 401, falta volta em `faltando`). O fallback local mantém o `{{nome}}` de hoje.
- Dicionário (pt e es). PR da V2. Merge.

### Fase V3: Modelos de mensagem (migration, rota e tela)

**Telas:** Conversas › Configurações › Modelos de mensagem e a janela "Modelo de mensagem". **Imagens:** v01, v02, v08 e v09. **Pronto:** a lista igual a v01 (sem o que está "Em breve" em D5) e a janela igual a v02, v08 e v09, com a cor da marca no lugar do roxo.

#### Task 8: Migration 9501, baseline e MANIFEST
- `tests/db/9501-variaveis-do-modelo.test.ts` primeiro (as 3 provas de RLS e sync acima). Depois a migration, o apêndice no baseline e a linha no MANIFEST. Rodar **só este** teste de banco localmente se o ambiente subir rápido; senão ele fica para a bateria.

#### Task 9: `lib/variaveis/mapeamento.ts` e as rotas
- TDD de `validarMapeamento`:
  - chave fora do contrato é recusada;
  - fixo com `\n`, `\t`, 4 espaços seguidos ou mais de 1024 caracteres é recusado, com a frase da Clint;
  - slot de botão com fixo é recusado;
  - campo fora do catálogo (e que não seja personalizado válido) é recusado;
  - alternativo vazio vira `null`;
  - mapeamento parcial é aceito ("Pode salvar agora").
- `valoresDoMapeamento`: campo resolvido, vazio com alternativo, vazio sem alternativo entra em `faltando`, fixo literal.
- Rota `PATCH variaveis` (molde do `PATCH` de `saved_values`): viewer e agent dão 403, sessão de suporte é bloqueada, nome e idioma de outra organização dão 404, grava em todas as linhas, grava `variaveis_contrato` e audita.
- `GET /templates` devolve `variaveis` e `variaveisDesatualizadas` (teste do hash diferente).
- Rota `POST valores`: org da conversa, contato e negócio aberto mais recente do contato, usuário = sessão, `slotsSemMapa`.

#### Task 10: A tela e a janela
- `TelaModelosDeMensagem` (lista D5) e `JanelaDoModelo`, seguindo "Detalhes visuais". Ligar no `HubDeConfiguracoes` e no `TelaDoCanal`.
- TDD:
  - a lista mostra nome, conta, "1 variável" / "2 variáveis", categoria, idioma e status;
  - a busca filtra;
  - os filtros Status, Categoria e Idioma funcionam;
  - clicar abre a janela;
  - "Trocar campo" abre o seletor e a prévia mostra o chip com o rótulo;
  - "Escrever um valor" troca o bloco;
  - fixo inválido marca "Corrigir" e desliga "Salvar";
  - "Definir um valor alternativo" abre e "Remover" fecha;
  - slot de botão desliga o fixo;
  - mapeamento parcial salva com o rodapé "Pode salvar agora…";
  - mapeamento desatualizado mostra o aviso (D12);
  - "Cancelar" não grava;
  - quem não é administrador vê só leitura ("Origem de cada valor, somente leitura.").
- Dicionário. PR da V3. Merge.

### Fase V4: o mapeamento salvo na conversa, na campanha e no follow-up

**Telas:** Conversas › compositor › Modelos de mensagem e Campanhas › Nova campanha › Variáveis do modelo. **Imagens:** c63 (prévia resolvida e "Editar modelo") e `09-campanhas/imagens/09-026-passo-1-variaveis-do-modelo.jpg` (o layout da campanha continua o da 8B; só a origem e o pré-preenchimento mudam). **Pronto:** a prévia da conversa igual a c63 com o texto do contato real, e a campanha vindo preenchida com o mapeamento.

#### Task 11: Conversa
- `JanelaModelosDeMensagem`: ao escolher, chama `valores`.
- TDD:
  - modelo mapeado mostra a prévia resolvida, sem campo de digitar, e "Enviar" liga;
  - falta sem alternativo mostra o chip "variável N sem valor" e "Enviar" desliga com a dica;
  - slot sem mapa mostra o campo de hoje;
  - "Editar modelo" só aparece para administrador e abre `JanelaDoModelo`; ao salvar, a prévia recarrega;
  - o envio manda `template_values` com os valores resolvidos (o mesmo `useSendMessage`).

#### Task 12: Campanha
- `VariaveisDoModelo`: pré-preenche com o mapeamento salvo, e o seletor vira o único (com Saudação).
- `preparacao.ts`: resolve `[X.Y]` com as fontes de cada destinatário (carregadas em lote: uma consulta por tipo de fonte para a lista toda, nunca N+1).
- **Regressão:** uma campanha salva com `campo: "primeiro_nome"` e outra com `lead.gancho` preparam e enviam igual a antes (teste com o snapshot real anonimizado); a saudação continua sendo resolvida no envio.
- Teste de desempenho do lote: 1.000 destinatários = número fixo de consultas.

#### Task 13: Follow-up
- `modelosQueOFluxoEnvia` passa a listar o modelo com variável quando o mapeamento está completo e atual. `followup-turn` resolve com as fontes do negócio do passo (usuário = responsável).
- TDD:
  - modelo sem mapa continua fora;
  - mapa velho fica fora;
  - campo vazio com alternativo envia;
  - vazio sem alternativo pula com `variavel_sem_valor`;
  - passo antigo com modelo sem variável não muda.
- Dicionário. PR da V4. Merge.

---

## Verificação da frente (uma vez, depois da V4)

1. Em segundo plano: `corepack pnpm test:unit` cheio (comparar o rodapé com `grep FAIL`), `test:db` e `test:db:update` (a 9501 roda nos dois). Falha nova é corrigida antes de publicar.
2. **Um revisor Opus 5.5, com esforço alto** (`code-reviewer`), sobre o diff da frente inteira. Ele recebe este plano e foca em: compatibilidade dos invólucros, filtro de `organization_id` em `fontes.ts` e nas 3 rotas, `requireSupportWrite`, N+1 na campanha e no follow-up, a 9501 e o baseline. Fable só se ele apontar algo de RLS sutil.
3. **Conferência visual, uma vez**, no Chrome: o popover (v03 a v07) no webhook, no playbook e nas respostas rápidas; a lista (v01); a janela (v02, v08, v09); a conversa (c63). Lado a lado com os prints, listando cada diferença que sobrar. Diferença sem justificativa = tela não pronta.
4. **Publicar uma vez:** tag `vX.Y.Z-escale.N`, release, `promover-stable`, `backup.sh`, `update.sh --to <tag>`. Conferir os 3 containers healthy, `/login` 200, os logs sem erro, as colunas `variaveis` e `variaveis_contrato` no banco (leitura) e o `GET /api/v1/channels/templates` respondendo (sem PGRST201: memória `postgrest-embed-ambiguo`).

## Riscos

| Risco | Prob. | Impacto | Mitigação |
|---|---|---|---|
| Automação ativa com `{{nome}}` ou `{{lead.x}}` passa a sair diferente depois da troca do resolvedor | Média | Alto (mensagem errada para lead real) | Os dialetos (D10) e a Task 2 gravada **antes** da troca com os casos reais de produção. Nenhuma expectativa muda, exceto D14. |
| Campanha em andamento (preparada, enviando aos poucos) | Média | Alto | Os valores congelados no snapshot (`variables.modelo`) continuam sendo lidos pelo mesmo caminho e a saudação segue no envio. O teste de regressão usa um snapshot real. O schema aceita os valores antigos de `campo`. |
| Atividade do playbook já criada com `[ORGANIZATION.NAME]` passa a mostrar a empresa do contato em vez do nome da conta | Alta | Baixo | É correção (D14). Registrar no LOG e na mensagem final. |
| Mensagens agendadas | Baixa | — | O texto é gravado pronto, sem variável no envio. Não tocar. |
| Modelo editado na Meta depois de mapeado manda valor no slot errado | Média | Médio | `variaveis_contrato` (D12): mapa velho = não definido. A conversa cai no campo manual e o follow-up pula. |
| `ressincronizar` apagar o mapeamento | Baixa | Médio | O `upsert` lista só as colunas da plataforma, e o teste de banco prova. |
| Valor fixo recusado pela Meta (quebra de linha etc.) só no envio | Média | Médio | `validarMapeamento` aplica as regras da Clint ao salvar. |
| Consulta a mais em cada envio de automação (lentidão) | Média | Médio | `carregarFontes` só busca o que os tokens pedem e não consulta nada para texto antigo. Na campanha, carga em lote. |
| Dados de outra organização vazando por `fontes.ts` ou pelas rotas | Baixa | Crítico | Toda consulta filtra `organization_id` da sessão ou do contexto, há teste por rota e o revisor olha esse ponto. |
| Seletor sem provedor derrubar a tela em produção | Baixa | Alto | Testes com os provedores reais (memória `provedor-escondido-pelo-teste`) e conferência visual antes de publicar. |

## Fora desta frente (registrado)

- Enviar modelo da Meta pela automação do Webhook (D7).
- Pastas, Desempenho, Envios (30d), Entrega, preço máximo e "Apagar no WhatsApp" na lista (D5).
- Os campos sem dado (D1) e a Recuperação de vendas e os checkouts (D2), que entram quando o dado existir.
- Trocar os textos prontos do original (`app/app/templates`, `Composer`) para o seletor novo.
- Edição do modelo (corpo) dentro do Escale: "+ Modelo" continua levando à tela que já existe.
