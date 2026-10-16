# Clint → Escale OS — especificação visual e de interação (Fase 0 + Negócios 1A–1D)

Gerado em 15/10/2026 a partir de **todas** as 34 capturas/fichas de `clint-documentacao/modulos/01-negocios`, das fichas/capturas de casca de `02-conversas` (01-025, 02-002, 02-006) e `12-configuracoes-e-mais` (12-001), dos documentos-raiz (README, componentes-globais, mapa-de-telas, glossário, lacunas) e dos prints atuais do usuário `images/1.png` (dropdown Data aberto) e `images/2.png` (barra de filtros, hover em "Dono do negócio"). O `images/3.png` encontrado na mesma pasta é a **Escale atual** (não é referência), comparado na seção 9.

## 0. Convenções desta spec

- **Variante-alvo = casca com menu superior** (capturas 01-001…01-013, 01-032…01-034, 1.png, 2.png). A variante com menu lateral (01-014…01-031, 02-xxx, 12-001) só é usada para comportamento/componentes que a superior não mostra — sempre marcado **[lateral]**.
- Rótulos de evidência: **[VISTO]** = medido/lido na captura; **[INFERIDO]** = dedução minha, precisa confirmar; **[FALTA]** = não existe evidência, precisa print.
- Medidas em px da captura 01-010 (1907×1005, tela de 1920 a 100% de zoom ⇒ ≈ px CSS). As capturas ao vivo 01-032/033/034 (500 px de largura) estão em ~80% de escala; converti para 100%.
- Cores: amostradas por pixel (moda da região). Antialias/compressão dá ±3 nos valores.
- Fonte: **Poppins** [INFERIDO pela forma dos glifos: "a" de um andar, "G" geométrico, "ç"]. Tamanhos estimados pela altura de maiúscula (cap-height do Poppins ≈ 0,70 em).

### Paleta observada (variante superior)

| Token sugerido | Hex | Onde aparece |
|---|---|---|
| text-primary | `#2F2C5D` | títulos, nome do card, item de menu, nome de etapa, botão Data aberto (fundo) |
| text-secondary | `#3E3A6F` | rótulos dos filtros, "+ Adicionar negócio", presets do Data, abas de data |
| text-muted | `#828282` | sobretítulo "NEGÓCIOS DA ORIGEM" |
| text-preview | `#8A8FA3` (≈ `#9297AB`) | prévia da mensagem, data/hora no card |
| card-footer | `#8C89B0` | ícones e textos do rodapé do card (R$, 0/3, 5d) |
| icon-neutral | `#686D86` | refresh, engrenagem, ✓✓ não lida, ⋮ das colunas, lupa |
| icon-disabled | `#C8CAD6` (aprox.) | ícone de download/exportar desabilitado |
| primary (ação) | `#6C19DE` | botão "Negócio +", marcador da origem ativa, checkboxes/toggles [lateral] |
| accent-blue | `#597EFF` | botão "Novo +", ✓✓ lida, hover de preset ("Essa semana") |
| unread-blue | `#4C73FF` | selo de não lidas no card |
| danger | `#FF4B4C` | selos "99+", "2" (ajuda), "+9" (FAB) |
| bg-page | `#FFFFFF` | fundo da página e do painel esquerdo |
| bg-lane | `#EFF3FF` | fundo da coluna do Kanban; hover dos gatilhos de filtro |
| bg-msg | `#EFF6FF` + borda `#E7EEFF` | caixa da última mensagem no card |
| bg-input | `#F6F8FF` | caixa de busca da barra de filtros |
| bg-active-nav | `#F8F6FD` | item ativo do menu superior |
| bg-count | `#E8E4F5` | círculo de contagem da coluna; também cor das linhas divisórias da casca |
| bg-help | `#F2EDFF` / `#F7F6FE` | círculo do "?" do topo / quadrado do ícone de ajuda da página |
| border | `#E8E4F5` | borda inferior do topo, borda direita do painel, divisórias das seções |
| divider-card | `#E5E7EB` | linha que separa corpo e rodapé do card |
| status-badge | `#E0E0E0` | bolinha "1" do filtro Status |
| day-cell | `#F7F7FE` / texto `#7F37E2` | células do calendário |
| fab-gradient | `#D1A8F5` → `#8B5CFF` | botão flutuante de conversas |

---

## 1. Casca global — menu superior [VISTO em 01-001…01-013, 01-010]

### 1.1 Barra superior
- **Posição/tamanho:** faixa fixa no topo, largura total, ~55 px de altura (y 7→61), fundo `#FFFFFF`, **borda inferior 1 px `#E8E4F5`**. (A faixa de ~6 px cor `#FFF8F5` acima dela em todas as capturas é cromo do navegador/banner — ignorar.)
- **Ordem esquerda → direita:**
  1. **Logo** (x 22→90): ícone + wordmark. *Na Escale: logo e nome nossos.* Clique: não testado [FALTA] (provável ir para início).
  2. **Itens de módulo** (texto ~16 px, cor `#2F2C5D`, peso regular; padding horizontal ~10 px, ~20 px entre rótulos):
     `Negócios` · `Contatos` · `Atividades` · `Atendimento` + selo `99+` · `Automações` · `Campanhas` · `Indicadores` · `⠿ Mais`
     - Item ativo (Negócios): **fundo `#F8F6FD` ocupando toda a altura da barra** (x 113→205, retângulo sem raio), texto em **semibold**. Sem sublinhado nem marcador.
     - Selo `99+`: pílula `#FF4B4C`, texto branco bold ~11 px, ~32×15 px, logo após o rótulo.
     - `Mais`: ícone de 4 pontos (2×2) à esquerda do rótulo. Conteúdo do menu aberto na variante superior: [FALTA]. Na [lateral] (12-001) abre painel "Mais" com grupos — ver 1.4.
  3. **Lado direito** (alinhado à direita, centro vertical da barra):
     - **Ícone sparkle** (estrela de 4 pontas preenchida, `#2F2C5D`, ~16 px) em x≈1674. Função: [INFERIDO] assistente de IA (equivale a "Pedir para a Aura" da lateral, Ctrl+K). Estado aberto: [FALTA].
     - **Ajuda "?"**: "?" roxo (`#7C00FF`) sobre círculo `#F2EDFF` ~28 px, com **selo vermelho "2"** (`#FF4B4C`, ~16 px, texto branco) sobreposto no canto superior direito. Conteúdo aberto: [FALTA].
     - **Botão "Novo +"**: 62×28 px, fundo `#597EFF` (azul, diferente do roxo da página), texto branco ~13 px semibold "Novo +", raio ~4 px. Abre "menu de criação global" (ficha 01-010) — itens: [FALTA].
     - **Avatar** do usuário: quadrado 35×35 com raio ~6, cor de fundo da pessoa (ex.: `#8D6E63`), inicial branca ~20 px; **caret ▾** escuro logo à direita. Menu: [FALTA].
- A barra é **idêntica** em todas as telas da variante superior (Kanban, detalhe do negócio, modais por cima).

### 1.2 Botão flutuante de conversas (FAB) [VISTO 01-010, 01-001…01-008]
- **Posição:** canto inferior direito, ~24 px da borda direita e ~45 px da borda inferior (fica acima da barra de rolagem horizontal do Kanban). Sempre por cima do conteúdo (z-index alto), presente em todas as telas.
- **Forma:** círculo 63 px, **gradiente vertical** `#D1A8F5` (topo) → `#8B5CFF` (base). Ícone branco de balão de fala com **três pontos roxos** dentro, ~30 px.
- **Selo "+9"**: círculo vermelho `#FF4B4C` ~22 px, texto branco bold ~12 px, com anel branco, no canto superior direito do FAB (sobrepõe ~1/3 para fora). Texto exato: `+9` (contagem de conversas não lidas, limitada; [INFERIDO] regra "+9" quando >9).
- **Comportamento** [lateral, 01-025]: clique abre painel **"Conversas"** ancorado acima do botão, à direita (~500×710 px, cantos arredondados, sombra), e o FAB vira **X** (círculo roxo sólido com X branco). Painel: título "Conversas" + ícone de balão, cabeçalho com fundo lavanda claro; campo "Pesquisar" com lupa; dropdown "Todos ⌄" (ícone de filtro ≡); botão de ordenação ⇅ à direita; lista de conversas (avatar 56 px com ícone de canal no canto, nome bold, hora à direita, prévia com ✓✓/remetente, avatar do atendente ou ícone "sem atendente" + selo azul de não lidas); barra de rolagem vertical. A tela de fundo continua visível e intacta; clicar no X fecha.
- Na variante lateral o FAB é **roxo sólido** com ícone de balão contornado, **sem** gradiente e sem selo. A superior (alvo) tem gradiente + selo.

### 1.3 Variante lateral — só para referência
Menu vertical à esquerda (Buscar… Ctrl+P, Negócios, Conversas 99+, Contatos, Empresas, Atividades, Agenda | Automações, Agentes [Novo], Campanhas, Indicadores | Apps [Novo], Painel do afiliado, Mais; rodapé com "Pedir para a Aura Ctrl K", avatar, créditos "500", ajuda com selo, sino). Ativo = fundo lilás + barra roxa à esquerda. **Não é o alvo**; listo só porque explica o que o sparkle/ajuda do topo fazem.

### 1.4 Menu "Mais" [lateral, 12-001 — variante superior FALTA]
Painel de ~350 px aberto ao lado do menu, título "Mais" centralizado. Seções com cabeçalho **uppercase, espaçado, ~11,5 px, roxo `#7C3AED`**; itens ~15 px com ícone contornado roxo:
- **APLICATIVOS:** Integrações · Ferramentas de Checkout · Central de modelos
- **ATENDIMENTO:** Inbox · Canais (com ícones WhatsApp verde e Instagram) · Modelos de mensagem · Permissões de usuários · Configurações Gerais
- **PARCEIRO:** Painel do afiliado · Link de indicação · Central de Clientes
- **CONFIGURAÇÕES:** Configurações · Usuários
- **TRANSCRIÇÃO DE CHAMADAS:** Transcrições · Permissões de usuários
- **INTELIGÊNCIA ARTIFICIAL** (cabeçalho rosa/magenta com ponto colorido): IA + chip "Legado"
Na variante superior, `⠿ Mais` provavelmente abre um dropdown com esse conteúdo — formato exato [FALTA].

---

## 2. Painel esquerdo de Negócios (variante superior)

### 2.1 Estrutura [VISTO 01-010, 01-011, 01-032…034]
- **Largura 312 px** (0→311), fundo branco, **borda direita 1 px `#E8E4F5`**, altura total abaixo do topo.
- **Botão recolher "<"**: círculo 26 px, fundo branco, borda 1 px `#E9E6F6` com sombra suave, chevron-esquerda `#484671`; **centrado sobre a borda direita do painel** (metade dentro, metade fora), ~22–45 px abaixo do topo (y 83→108). Clique recolhe o painel [INFERIDO]; **estado recolhido** (e o botão ">" para reabrir): [FALTA].
- Há um **espaço vazio de ~100 px** entre o topo do painel e o cabeçalho ORIGENS (ORIGENS começa em y≈170). Repetido em 01-001…01-011 — reproduzir.
- Três seções empilhadas, cada uma com cabeçalho de ~60 px e **linha divisória 1 px `#E8E4F5`** de largura total abaixo do cabeçalho/da seção:
  1. **ORIGENS** — ícone de layout (2 retângulos + círculo, contorno `#2F2C5D`, ~18 px) + rótulo **"ORIGENS"** (uppercase, bold, ~13 px, `#2F2C5D`). À direita: **lupa** (`#686D86`, ~18 px) e **chevron ^** (recolhe a seção). Recolhida: só chevron ⌄ (01-011).
  2. **VISUALIZAÇÕES** — ícone de quadrado tracejado com barras; rótulo bold uppercase; chevron ⌄ à direita.
  3. **RECENTES** — ícone de relógio; rótulo bold uppercase; chevron ⌄.
- Padding esquerdo do ícone: 20–22 px; ícone→texto: ~12 px.
- Estados capturados: (a) ORIGENS aberta, demais recolhidas (01-010); (b) as três recolhidas (01-001…01-011); (c) grupo expandido com origens (01-032/033); (d) apenas um grupo visível (01-034 — possivelmente outros ocultos via "Ocultar da minha barra lateral" [INFERIDO]).
- **Busca de ORIGENS (lupa)**: o que abre (campo inline? filtra a lista?) — [FALTA].

### 2.2 Linhas de grupo [VISTO]
- **Altura/pitch ~42 px**. Conteúdo: [chevron] + **ícone quadrado 22×22, raio ~5 px, fundo colorido** + nome do grupo (~14,5 px, `#2F2C5D`).
- **Ícone do grupo**: ou **iniciais brancas bold ~9 px** (ex.: "RI", "II", "SA"/"SS", "IN") ou **glifo branco** (xícara, monitor, livro, pessoa). Cores observadas: `#FFE073` amarelo, `#263AF1` azul, `#FFA7A7` salmão, `#60C6D0` turquesa, `#5A5A5A` cinza-escuro, `#48DEA8` verde, `#D96CFF` violeta, `#FF4062` vermelho. Ícone/cor provavelmente definidos em "Customizar" (menu do grupo) [INFERIDO].
- **Grupo que contém a origem aberta**: nome em **bold** (01-010: "INSS Vendas").
- **Em repouso (01-010)** a linha não mostra chevron, + nem ⋮. **Selecionada/hover (01-032/034)**: fundo cinza `#F3F3F3` na linha inteira; aparecem **chevron** (⌄ aberto / › fechado, ~12 px, à esquerda do ícone, a ~8 px da borda), **"+"** (cinza, ~14 px) e **"⋮"** (roxo/cinza) no extremo direito.
- **"+"** → tooltip escuro **"Nova origem"** (fundo `#3E3973`, texto branco ~12 px, raio ~4, seta para baixo, acima do botão). Clique cria origem já dentro do grupo; formulário [FALTA].
- **Clique no nome/chevron**: expande/recolhe as origens do grupo.

### 2.3 Linhas de origem (filhas) [VISTO 01-032/033]
- Só texto (sem ícone), recuo ~52 px (alinhado ao texto do grupo), ~14 px, `#2F2C5D` regular, pitch ~41 px.
- **Origem ativa** (a do Kanban aberto): fundo `#EFF3FF` na linha inteira + **barra vertical roxa 3 px** (`#6C19DE`/`#7C3AED`) colada à borda esquerda do painel.
- **Hover**: fundo `#F3F3F3` + aparece **⋮** roxo à direita (01-033).
- Clique no nome → carrega o Kanban daquela origem.

### 2.4 Menu ⋮ do grupo [VISTO 01-032]
Popover branco, raio ~8, sombra suave, ~220 px de largura, abre **à direita do ⋮** (sobre o conteúdo), itens ~36 px, texto ~14 px `#2F2C5D` com ícone contornado de 14 px à esquerda:
1. ⚙ `Configurações`
2. ☰ `Selecionar origens` (ícone de lista com checks)
3. ✎ `Customizar`
4. 👁̸ `Ocultar da minha barra lateral`
— divisória 1 px —
5. 🗃 `Arquivar`
6. 🗑 `Excluir` (**texto e ícone vermelhos** ~`#EF4444`)
Comportamentos: Configurações → configurações do grupo [FALTA tela]; Selecionar origens → [FALTA]; Customizar → nome/ícone/cor [FALTA]; Ocultar → some só da barra do usuário; Arquivar/Excluir → confirmação [FALTA tela de confirmação].

### 2.5 Menu ⋮ da origem [VISTO 01-033]
Mesmo estilo, ~150 px: ⚙ `Configurações` · ☰ `Selecionar origem` · — divisória — · 🗃 `Arquivar` · 🗑 `Excluir` (vermelho).
"Configurações" abre o **modal da origem** (01-012/01-013: título = nome da origem, abas Geral / Etapas e atividades / Integrações). Evidência: em 01-012 o Kanban de fundo é "Leads INSS Whatsapp" e o modal é de "Clayton" ⇒ aberto pelo ⋮ da barra, não pelo título.

### 2.6 VISUALIZAÇÕES e RECENTES abertos (variante superior) — [FALTA]
Nenhuma captura da superior mostra essas seções expandidas. Pela [lateral] 01-014: visualização = linha com ícone quadrado escuro de iniciais ("VA", fundo `#4A4A4A`), nome ("View Analista") e contador "14 origens"; RECENTES mostra "RECENTES · N". Como isso aparece dentro do painel esquerdo (e se há "+ Criar visualização" ali) precisa de print.

### 2.7 Seletor grupo/origem/visualização [lateral, 01-014] — referência de comportamento
Na lateral, o contexto é trocado por um **botão-breadcrumb** no topo do conteúdo ("[ícone] INSS Vendas → SDR_bot ⌄"), que abre um **popover ~1000×670 px**:
- Busca de largura total, fundo `#F3F3F3`, placeholder **"Buscar origens, grupos, visualizações..."**, lupa à direita, **X** de fechar fora do campo.
- Duas colunas separadas por linha vertical:
  - **GRUPOS E ORIGENS** (cabeçalho uppercase bold ~12 px) + botão-chip **"+ Adicionar"** à direita. Linhas ~40 px: chevron ›, ícone 22 px colorido, nome ~15 px, contador à direita **"N origens"** (~13 px cinza — sem singular: "1 origens"). Hover: fundo `#F3F3F3` + ⋮.
  - **VISUALIZAÇÕES** + **"+ Criar visualização"**. Rodapé da coluna: relógio + **"RECENTES · 1"** + chevron ^.
- Na variante superior este popover **não existe** (o painel esquerdo faz o papel). Usar só como fonte de textos/regras (contadores de origens, busca única).

### 2.8 Configuração de visualização [lateral, 01-026]
Mesmo popover em modo seleção:
- Botão do topo vira **"[quadrado azul] Selecionar origem ^"** + chip **"✎ Rascunho"** + ⋮; contador "0 Negócio" à direita.
- Cada grupo ganha **checkbox** antes do ícone: marcado (roxo `#6C19DE`, check branco), vazio, ou parcial; grupo expandido lista origens com checkbox próprio, recuadas.
- Rodapé do popover (barra de ~70 px com divisória): à esquerda ícone de marcador + **"14 origens selecionadas · Rascunho"** (roxo semibold); à direita **"Cancelar"** (texto) e **"💾 Salvar como visualização"** (botão roxo `#6C19DE`, texto branco, raio ~6).
- Regras: marcar grupo marca todas as origens; contagem atualiza ao vivo; salvar não altera as origens; etapas de origens diferentes só se fundem com nome **idêntico**.
- Onde isso abre na variante superior (provável "+" em VISUALIZAÇÕES ou "Selecionar origens" do menu do grupo): [FALTA].

---

## 3. Página do Kanban (01-010, variante superior)

### 3.1 Cabeçalho da página [VISTO]
Área de conteúdo começa a 26 px da borda do painel (x 338).
- **Sobretítulo** `NEGÓCIOS DA ORIGEM`: ~12 px, semibold, uppercase, `#828282`, y≈96.
- **Título** = nome da origem (ex.: `Leads INSS Whatsapp`): **~32 px semibold `#2F2C5D`**, y 122→150. Sem engrenagem/⋮ ao lado (diferente da lateral).
- **Botão `Negócio +`**: canto superior direito do conteúdo, alinhado à altura do sobretítulo/título (y 101→139), **119×39 px, fundo `#6C19DE`, texto branco ~15 px semibold "Negócio" + ícone "+"** à direita, raio ~6. Clique [lateral, transcrição]: oferece **criar negócio** ou **importar por CSV** — menu [FALTA].
- Breadcrumb não aparece no Kanban (só no detalhe do negócio: "INSS Vendas > Leads INSS Whatsapp > Nome").

### 3.2 Barra de filtros [VISTO 01-010, 2.png, 1.png]
Linha única, y 195→234 (altura 40–44 px), começando em x 338:
| Ordem | Elemento | Visual |
|---|---|---|
| 1 | **Busca** | caixa 136×40, fundo `#F6F8FF`, **sem borda**, raio ~6, **sem placeholder**, lupa `#8C90A4` ~16 px à direita. Busca nesta origem (nome/telefone etc.) [INFERIDO]. |
| 2 | `Data ⌄` | gatilho de texto |
| 3 | `Campos ⌄` | gatilho de texto |
| 4 | `Tags ⌄` | gatilho de texto |
| 5 | `Dono do negócio ⌄` | gatilho de texto |
| 6 | `Status` **(1)** `⌄` | gatilho de texto + bolinha 22 px `#E0E0E0` com "1" escuro ~11 px semibold |
| 7 | `Mais filtros ⌄` | gatilho de texto |
- **Gatilho em repouso**: sem fundo/borda; texto ~15 px **medium `#3E3A6F`**; chevron ⌄ fino ~12 px à direita (8 px de gap); ~40 px entre um rótulo e o próximo.
- **Hover** (2.png, "Dono do negócio"): fundo `#EFF3FF`, raio ~6, ~44 px de altura, padding ~12 px.
- **Aberto** (1.png, "Data"): fundo **`#2F2C5D`** (azul-marinho), texto e chevron **brancos**, raio ~6, ~90×44 px. O chevron permanece ⌄ (não gira).
- O número no Status indica **quantos valores estão selecionados** (padrão: 1 = "Em aberto" [INFERIDO pela lateral]). Os outros gatilhos certamente ganham a mesma bolinha quando têm filtro ativo [INFERIDO] — [FALTA] print de outro filtro ativo.

### 3.3 Linha de contagem e ações [VISTO]
- Esquerda (y≈280, x 342): **`0 oportunidade de Negócio`** (~16 px, `#2F2C5D`; "Negócio" em peso medium). ⚠ Nas duas capturas mostra "0" com 148/137 cards visíveis e não pluraliza — **parece bug da Clint**. Sugestão: mesmo layout, mas número real e plural ("148 oportunidades de Negócio") — decidir com o usuário.
- Direita (alinhados à borda direita, ~42 px entre centros, ícones ~18 px):
  1. **Atualizar** — setas circulares `#686D86`. Recarrega os cards.
  2. **Download/Exportar** — bandeja com seta para baixo, **cinza-claro (desabilitado)** na captura. Exporta cards [INFERIDO da lateral: "exportar cards" no ⋮]. Quando fica habilitado: [FALTA].
  3. **Engrenagem** — `#686D86`. [INFERIDO] configurações da origem e/ou personalização dos cards; o que abre: [FALTA].
  4. **Ajuda** — "?" dentro de um balão quadrado, sobre quadrado 28×28 `#F7F6FE` raio ~6. [INFERIDO] "Central de ajuda".
- **Não há botão "Ordenar" nem "Personalizar cards" visível** nesta variante (ver 4.7).

### 3.4 Colunas (etapas) [VISTO]
- Início em y 322; **largura 325 px**; **gap 15 px**; fundo **`#EFF3FF`**, raio ~14–16 px, **sem borda**; altura vai até o fim da viewport (y≈968).
- **Cabeçalho (~85 px)**, padding 14 px:
  - Nome da etapa (`1. Entrada Lead`) ~16 px medium `#2F2C5D` no topo-esquerdo.
  - Abaixo: **`R$0`** ~12,5 px `#2F2C5D` (soma dos valores; sem espaço após "R$").
  - À direita, centrado verticalmente: **contagem** em pílula/círculo `#E8E4F5`, ~26–31 px de altura (min-width = altura), texto ~12 px semibold `#250056` (ex.: "148"); depois **⋮** vertical `#686D86`. ⋮ abre "ações da etapa" — itens: [FALTA].
- **Corpo**: cards empilhados, padding lateral 10 px, **20 px entre cards**; **rolagem vertical própria** da coluna com barra cinza `#BFBFBF` 10 px de largura dentro da coluna (estilo nativo; aparece só quando transborda — colunas sem overflow têm card 10 px mais largo).
- **`+ Adicionar negócio`**: texto centralizado ~16 px `#3E3A6F` com "+" fino; **coluna vazia**: logo abaixo do cabeçalho (y≈+95); com cards: 20 px abaixo do último card. Cria negócio já na etapa.
- **Rolagem horizontal** do quadro: barra inferior estilo nativo (polegar `#8B8B8B` ~10 px, setas ◀ ▶, trilho `#FCFCFC`), abaixo das colunas.
- Arrastar card entre colunas muda a etapa e grava histórico (regra da ficha). Visual durante o arraste: [FALTA].

### 3.5 Anatomia do card [VISTO 01-010, 2.png, 01-019]
Card branco, **295 px** de largura (305 sem barra de rolagem), raio ~10, **sem borda e sem sombra visível**, altura ~161 px (sem tags). De cima para baixo:

1. **Linha de tags (opcional)** — chips em pílula ~16 px de altura, texto ~11,5 px (como digitado, ex. `obra_notificada`, `em_andamento`, `sem_alvara`), cor pastel com texto saturado: vermelho bg `#FFAAA3`/texto `#F54E41`; azul bg `#B3BEFF`/texto azul escuro; amarelo bg `#FFF2D1`/texto laranja. Pela prévia 01-019 a linha também pode começar com o **nome da empresa em caixa alta** ("CLINT") antes dos chips.
2. **Nome do contato/negócio** — ~15,5 px medium `#2F2C5D`, a 10 px da esquerda; 1 linha com reticências.
3. **Foto no canto superior direito** — 36×36; com foto: **quadrado de raio ~6**; sem foto: **círculo** cinza `#DFE5E7` com silhueta branca.
4. **Caixa da última mensagem** — 10 px de margem lateral, ~42 px de altura, fundo `#EFF6FF`, borda 1 px `#E7EEFF`, raio ~8. Da esquerda para a direita:
   - **ícone do canal** (WhatsApp verde ~18 px com **mini selo azul de check** no canto inferior direito);
   - **status**: ✓✓ cinza `#686D86` (entregue/enviada) ou ✓✓ **azul `#597EFF`** (lida); para eventos de sistema, ícone **⇄** cinza com texto "O status foi alterado" / "O atendente foi alterado";
   - **ícone de mídia** opcional (documento 📄, microfone 🎤 "Mensagem de voz");
   - **prévia** ~13 px `#8A8FA3`, 1 linha com "…"; quando enviada por atendente, prefixo em negrito mais escuro ("**Luciana:** Sua obra es…");
   - à direita: **avatar do atendente** 20 px (foto ou círculo de letra; ícone de pessoa riscada = sem atendente), **selo de não lidas** opcional (quadrado arredondado `#4C73FF` ~16×18, número branco), e **data** `23/09` ou **hora** `18:25` (hoje) ~13 px cinza.
   - Liga/desliga pelo toggle "Prévia da última mensagem" (01-019).
5. **Divisória** 1 px `#E5E7EB` de largura total do card.
6. **Rodapé (~44 px)**:
   - **Avatar do dono** 24 px círculo (foto ou letra branca sobre cor sólida — observadas `#7B1FA2` "I", `#0097A7` "C", paleta tipo Material).
   - **Atalhos de canal**: telefone, balão de chat, envelope — contorno ~16 px `#8C89B0`, ~10 px entre eles (configuráveis em "Ícones de canal no rodapé", 01-019). Clique executa a ação [ficha 01-020].
   - **Valor** `R$0` ~13 px semibold `#8C89B0` (formatação abreviada observada na prévia: `R$64,8k`).
   - Direita: **ícone check-circle + `0/3`** (atividades concluídas/total) e **ícone relógio + `5d`** (tempo na etapa: `31h`, `30h`, `3d`, `19d`…), ~12,5 px `#8C89B0`, ~10 px entre os dois.
- **Clique no card** abre o detalhe do negócio (01-001…01-011). Hover do card: [FALTA] (na lateral aparece checkbox de seleção no canto superior direito — 01-020).
- **Destaque de tempo parado na etapa** (configurado em 01-029, "Como aparece no card"): visual no card [FALTA].

### 3.6 Estados da página
- **Coluna vazia** [VISTO]: só cabeçalho (R$0, contagem "0") + "+ Adicionar negócio".
- **Bug a não copiar** [VISTO 01-034]: valor da coluna "undefined0"; em 01-032 valores "0" sem R$.
- **Sem origem selecionada** [lateral, 01-026]: área do quadro vazia em lavanda, "0 Negócio".
- **Carregando, erro, sem permissão, busca/filtro sem resultado, quadro sem etapas**: [FALTA] em ambas as variantes (lacunas-e-prioridades.md também lista).

---

## 4. Filtros

### 4.1 Data — [VISTO em 1.png, detalhado]
- **Gatilho aberto**: fundo `#2F2C5D`, texto branco (3.2).
- **Painel**: abre **12–15 px abaixo, alinhado à esquerda do gatilho**; branco, raio ~8, sombra muito suave, **sem borda visível**; ~927×425 px (pode continuar para baixo — a moldura vermelha do print corta em y 537; [FALTA] confirmar se a lista tem mais itens, ex. "Ano passado"/"Personalizado").
- **Coluna esquerda (230 px)**, divisória vertical 1 px `#E8E4F5` à direita:
  - **4 abas de tipo de data** (topo, padding 14 px): botões **42×28 px**, ~10 px de gap, ícones de calendário contornados ~18 px. Ativa: fundo `#3E3A6F`, ícone branco; inativas: fundo `#EFF3FF`, ícone `#3E3A6F`. **Só os extremos do grupo têm cantos arredondados** (1ª: cantos esquerdos; 4ª: cantos direitos; meio: retos) — visual de controle segmentado com espaços.
    1. **calendário com "+"** → [INFERIDO] **Data de criação** (ativa por padrão)
    2. **calendário com ✓** → [INFERIDO] **Data de ganho** (ou de conclusão)
    3. **calendário com ✗** → [INFERIDO] **Data de perda**
    4. **calendário com relógio** → [INFERIDO] **Data de atualização / última movimentação** (alternativa: previsão de fechamento)
    Tooltips/labels reais: [FALTA].
  - **Presets** (lista, linhas de **~53 px**, divisórias 1 px `#EBEBEB`, texto ~14 px `#3E3A6F`, padding esquerdo ~14 px), na ordem exata:
    `Hoje` · `Ontem` · `Essa semana` · `Semana passada` · `Esse mês` · `Mês passado` · `Esse ano`
    - "Essa semana" aparece em **azul `#597EFF`** — [INFERIDO] estado hover (cursor sobre o item) ou preset ativo; confirmar. Fundo do item não muda.
- **Coluna direita — calendário de 2 meses lado a lado**:
  - Títulos centralizados **em minúsculas**: `outubro 2026`, `novembro 2026` — ~18 px medium `#2F2C5D`.
  - Setas: **‹** à esquerda do 1º mês e **›** à direita do 2º, chevrons finos cinza `#CCCCCC` ~16 px (navegam um mês).
  - Cabeçalho de dias: `DOM SEG TER QUA QUI SEX SÁB` — uppercase ~11 px `#7C7C7C`; semana começa no **domingo**.
  - **Células 40×40, raio ~6, fundo `#F7F7FE`, número ~14 px roxo `#7F37E2`**, gap ~7 px; dias do mês anterior/seguinte (27–30/set, 1–5/dez) **com o mesmo estilo** (não esmaecidos); **hoje não tem destaque** e nenhuma seleção visível na captura.
  - Seleção de intervalo (dia inicial/final, faixa intermediária, hover de dia), botão aplicar/limpar e como o gatilho mostra o período escolhido: [FALTA].

### 4.2 Campos, Tags, Dono do negócio, Status, Mais filtros — conteúdo
Nenhum print da variante superior com esses dropdowns abertos. O que se sabe:

| Gatilho (superior) | O que é CONHECIDO | Fonte | O que FALTA |
|---|---|---|---|
| **Campos** | Existe a categoria "Campos" ("filtrar por campos dos objetos") | 01-018 [lateral], acordeão recolhido | Tudo: lista de campos (contato/negócio/empresa/personalizados?), operadores, tipo de input por tipo de campo |
| **Tags** | Existe a categoria "Tags" (seleção de etiquetas) | 01-018 [lateral], recolhido | Lista com busca? multi-seleção? lógica E/OU? "sem tag"? |
| **Dono do negócio** | É um seletor de usuário; em Conversas existe "Dono do negócio — Selecione..." | 02-002 [lateral, outro módulo] | Opções (lista de usuários com avatar? "Sem dono"? "Eu"?), multi-seleção |
| **Status (1)** | Status do negócio = Aberto / Ganho / Perdido; padrão mostra abertos ("Em aberto", com ícone ⊖); badge "1" = 1 selecionado | 01-020 [lateral], glossário, 02-002 | Layout do dropdown (checkbox? radio?), textos exatos ("Em aberto"/"Ganho"/"Perdido"?), se filtra também motivo de perda |
| **Mais filtros** | Provavelmente agrupa o restante do painel lateral: **Conversas** e **Outros** [INFERIDO]. "Outros" é conhecido: `ATIVIDADES CONCLUÍDAS ?` (Min / Max), `TEMPO NA ETAPA ?` (Min / Max + seletor `dias na etapa ⌄`) | 01-018 [lateral], expandido | Confirmar conteúdo real; categoria Conversas (vazia na evidência; em Conversas há Data, Com/sem negócio, Status, Dono, Grupos, Origens, Etapas — 02-002) |

**Visual do painel lateral de filtros (01-018), útil para o "Mais filtros":** popover branco ~450 px, raio ~10, sombra; acordeões de ~70 px com ícone contornado + rótulo ~15 px + chevron; categoria com filtro ativo mostra **badge "1"** (quadrado lavanda `#E8E4F5`, número roxo) e **X roxo** para limpar; rótulos internos uppercase espaçados ~12,5 px com **"?" em círculo roxo** preenchido (ajuda); inputs 38 px com borda 1 px `#E5E7EB`, placeholders "Min"/"Max" cinza; o campo Max de tempo tem setas de número; select "dias na etapa" de largura total (outras unidades: [FALTA]).

### 4.3 Ordenação
- **Variante superior: não há botão "Ordenar" visível** em 01-010, 1.png ou 2.png. Pode estar dentro da engrenagem ou não existir nessa versão — [FALTA] print.
- [lateral, 01-020]: botão `⇅ Ordenar` na barra (à direita, após "21 Negócios"); por transcrição ordena por **campos de contato, negócio, empresa, personalizados, atividades ou atendimento**. Dropdown aberto: [FALTA] em ambas.

### 4.4 Filtros salvos
- **Nenhuma evidência no Kanban de Negócios**, em nenhuma variante. Na lateral há um botão ⌃⌄ ao lado de "Filtros" (função desconhecida) e o "Status Em aberto" é chamado de "filtro salvo/padrão" na ficha.
- Padrão de filtros salvos da Clint existe em **Conversas** (02-006): dropdown "Todos" com `Todos ✓`, `Não lidas [99+]`, seção `STATUS` (Meus em aberto, Em aberto, Em espera, Fechadas) e seção `SALVOS` com `+ Criar filtro` (roxo). Se a Escale quiser filtros salvos em Negócios, este é o modelo visual mais próximo — **mas não é cópia da tela de Negócios**.

### 4.5 Resumo de filtros ativos
Regra da ficha 01-018: "o resumo de filtros ativos precisa permanecer visível quando o painel fechar". Na superior isso é feito pelos badges nos gatilhos (visto só no Status). Chip/limpar tudo: [FALTA].

---

## 5. Personalizar cards (01-019) [lateral — gatilho na superior FALTA]
- **Gatilho**: na lateral, ícone de sliders na barra do Kanban; na superior **não há ícone de sliders** — provavelmente na engrenagem [INFERIDO].
- **Modal** central ~1025×865, overlay escuro ~50%, raio ~12. Cabeçalho: **"Personalizar cards"** (~17 px medium) + X; divisória.
- **Coluna esquerda (~445 px)**:
  - Busca **"Buscar por..."** (fundo `#F3F3F3`, lupa à esquerda, raio ~6).
  - Seções em acordeão com chevron, rótulo **uppercase espaçado ~12,5 px** e **contador** (círculo lavanda, número roxo) à direita = nº de itens ligados:
    - **CONTATO (1)** aberta: `Prévia da última mensagem` (com ícone de balão roxo; **ligado**) · `Documento` · `Cargo` · `Email` · `Notas do contato` · `Telefone` · `Link da conversa Manychat` · `Whatsapp` · `Kaio IA Ativo` · `contact_id_bitrix` · `Instagram` · `Username` (inclui campos personalizados da conta).
    - **EMPRESA (1)**, **NEGÓCIO (5)**, **ÍCONES DE CANAL NO RODAPÉ (3)** — recolhidas; conteúdo [FALTA].
  - Linhas ~39 px: rótulo ~15 px + **toggle** 36×20 (ligado: trilho `#6C19DE`, bolinha branca à direita; desligado: trilho cinza claro com bolinha branca e contorno). Hover: fundo `#F0F0F0` raio ~6.
- **Coluna direita**: rótulo **"PRÉ-VISUALIZAÇÃO"** (roxo, uppercase espaçado ~11,5 px); card de exemplo centralizado (~400 px) com: linha "CLINT" + chips `bd-aluno` (lilás) e `clint` (menta); nome "Maria Silva"; foto; mensagem "✓✓ Oii Maria! Aqui é a Ana da Clint, posso …" + ícone sem atendente + selo "2" + "14:05"; rodapé avatar · telefone · chat · e-mail · `R$64,8k` · `5/12` · `5h`. Legenda: **"Este é um exemplo. Suas alterações aparecem no kanban depois de salvar."**
- **Rodapé**: `Cancelar` (botão branco com borda) e **`✓ Salvar preferência`** (roxo; aparece em roxo claro `#B794F6` = desabilitado até haver mudança [INFERIDO]).
- Regras: campo sem valor não ocupa espaço no card; prévia reflete ordem e densidade reais.

---

## 6. Detalhe do negócio e configuração da origem (contexto, fora do 1A–1D)
Só para garantir consistência da casca nas próximas fases: no detalhe (01-001…01-011) o painel esquerdo continua com as 3 seções **recolhidas**, o conteúdo tem breadcrumb "Grupo > Origem > Nome", cabeçalho com foto/“SEM EMPRESA”/nome/atalhos, abas Atividades/Contato/Empresa/Negócio/Conversas/Arquivos/Histórico com sublinhado roxo `#6C19DE`, e trilha de etapas numeradas. O modal da origem (01-012/013/009) tem abas Geral / Etapas e atividades / Integrações, menu interno (Configurações Gerais, Motivo de Perda, Distribuição de dono, Permissão de usuários, Atribuição de ganho, Visualização de campos, Campos obrigatórios, Alerta de tempo na etapa, Notificações) e botões Cancelar / Salvar (verde-menta na superior, roxo na lateral).

---

## 7. LACUNAS — prints que faltam (pedir ao usuário de uma vez)

Todos na **variante com menu superior**, mesma resolução de 1.png/2.png:

**Casca (Fase 0)**
1. Menu **`⠿ Mais`** aberto.
2. Botão **`Novo +`** aberto (menu de criação global).
3. **Avatar** do usuário aberto (menu da conta).
4. **Ajuda "?"** (com selo 2) aberta.
5. **Ícone sparkle** clicado (IA/Aura).
6. **Painel de conversas do FAB** aberto na variante superior (para confirmar se é igual ao 01-025).
7. Hover de um item do menu superior (cor de hover).

**Painel esquerdo (1A–1C)**
8. Painel **recolhido** (após clicar "<") e o botão para reabrir.
9. **Lupa de ORIGENS** clicada (campo de busca + resultado).
10. **VISUALIZAÇÕES expandida** (com pelo menos 1 visualização) e o caminho para **criar** uma visualização na superior.
11. **RECENTES expandida**.
12. Telas que abrem a partir do menu do grupo: **Configurações**, **Selecionar origens**, **Customizar** (ícone/cor/iniciais), e as **confirmações de Arquivar e Excluir** (grupo e origem).
13. **Formulário "Nova origem"** (clique no "+" do grupo) — já listado em lacunas-e-prioridades.md.
14. Como aparece um **grupo/origem arquivado** (se aparece) e onde reativar.

**Kanban (1A–1D)**
15. **Engrenagem** da linha de ações clicada.
16. **Download/Exportar** habilitado e clicado.
17. **Ajuda** (ícone "?" em balão) clicada.
18. **⋮ do cabeçalho de etapa** aberto.
19. **`Negócio +`** clicado (criar / importar CSV).
20. **Hover de card** e **card sendo arrastado** (placeholder na coluna de destino).
21. **Card com alerta de tempo na etapa** (atenção e crítico, configurado em 01-029).
22. Estados: **carregando**, **erro**, **busca sem resultado**, **filtro sem resultado**.
23. Contador da linha "N oportunidade de Negócio" com valor ≠ 0 (para saber se o "0" é bug).

**Filtros e ordenação (1D)**
24. **Data**: tooltip/nome de cada uma das 4 abas; **intervalo selecionado** no calendário (início, fim, faixa); se a lista de presets continua abaixo de "Esse ano"; **como o gatilho fica com período aplicado** (texto? badge?); botão limpar.
25. **Campos** aberto (e um campo sendo configurado).
26. **Tags** aberto.
27. **Dono do negócio** aberto.
28. **Status** aberto.
29. **Mais filtros** aberto (todas as seções).
30. Barra com **vários filtros ativos** (badges em Data/Campos/Tags/Dono) e o "limpar".
31. **Ordenar**: onde fica na superior e o dropdown aberto.
32. **Filtros salvos** em Negócios: existem? onde?
33. **Personalizar cards** na superior: de onde abre; seções EMPRESA, NEGÓCIO e ÍCONES DE CANAL NO RODAPÉ expandidas.

---

## 8. Diferenças entre as variantes (o que importa para nós)

| Aspecto | Superior (ALVO) | Lateral (secundária) |
|---|---|---|
| Navegação global | Barra horizontal: Negócios, Contatos, Atividades, Atendimento 99+, Automações, Campanhas, Indicadores, ⠿ Mais; ativo = fundo `#F8F6FD` | Menu vertical recolhível com busca Ctrl+P, 13 itens em 3 grupos (inclui Conversas, Empresas, Agenda, Agentes, Apps, Painel do afiliado); ativo = fundo lilás + barra roxa |
| Ações globais | sparkle, "?" com selo, **"Novo +" azul**, avatar quadrado ▾ | "Pedir para a Aura Ctrl K", avatar, créditos, ?, sino (rodapé) |
| Troca de origem | **Painel esquerdo fixo** (ORIGENS/VISUALIZAÇÕES/RECENTES) com menus ⋮ e "+" | **Popover** a partir do breadcrumb "Grupo → Origem ⌄" |
| Cabeçalho da página | "NEGÓCIOS DA ORIGEM" + título grande 32 px + "Negócio +" | breadcrumb-botão + engrenagem + "Negócio +" + ⋮ |
| Barra de filtros | Busca + **6 gatilhos separados** (Data, Campos, Tags, Dono do negócio, Status 1, Mais filtros) | Busca "Pesquisar nessa origem..." + "⊖ Em aberto ⌄" + "Filtros 1 ⌄" (painel acordeão único) + ⌃⌄ |
| Contagem | linha própria: "0 oportunidade de Negócio" | "21 Negócios" na barra |
| Ações do quadro | atualizar, exportar, engrenagem, ajuda | Ordenar, atualizar, personalizar cards (sliders) |
| Ordenar | **não visível** | botão "⇅ Ordenar" |
| Colunas | fundo **lavanda `#EFF3FF`**, sem borda, contagem em círculo `#E8E4F5` 26–31 px, título 16 px | fundo **cinza** com borda, contagem em bolinha pequena lilás com número roxo, título 15 px; checkbox de seleção em massa |
| Card | rodapé: telefone, chat, e-mail | rodapé: telefone, chat com "+", e-mail; checkbox no hover |
| FAB | **gradiente + selo "+9"** | roxo sólido, sem selo |
| Botões primários de modal | "Salvar" verde-menta | "Salvar" roxo |

---

## 9. Escale atual (images/3.png) × alvo — desvios que saltam aos olhos
(Marca/cor própria é permitida; o resto deveria seguir a Clint superior.)
- Menu superior: itens e ordem diferentes (Conversas, Agenda, Agentes IA; sem Campanhas), seletor de workspace "Escale IA ⌄", busca ⌘K, sino, "PT", tema; ativo é pílula colorida (na Clint é retângulo de altura total) — decisão de produto a confirmar.
- Painel esquerdo como **cartão flutuante** com "+" nas seções; sem RECENTES; sem o espaço superior; collapse "<" fora do lugar.
- Cabeçalho sem "NEGÓCIOS DA ORIGEM", título menor; toggle "Quadro / Calendário" (não existe na Clint); botão "+ Novo …" em vez de "Negócio +".
- Barra de filtros no estilo **lateral** (Em aberto / Filtros / Filtros salvos / Ordenar), não nos 6 gatilhos da superior; painel de filtros com conteúdo inventado (DATA DE CRIAÇÃO com inputs mm/dd/yyyy, VALOR mín/máx, "Apenas atrasados") — nada disso tem evidência na Clint.
- Colunas brancas com borda e bolinha cinza; cards com layout próprio (telefone como título, "Retomar contato? · 21h", "Sem responsável", "em 1. Entrada Lead") — sem caixa de mensagem lavanda, sem rodapé de ícones/valor/atividades/tempo.
- Sem FAB de conversas visível.

---

## 10. Arquivos de apoio gerados (scratchpad)
- Recortes ampliados: `C:\Users\regis\AppData\Local\Temp\claude\c--Documentos-projetos-claude-Deskcom-CRM\dd8360b8-8d46-4f33-a22d-10a342220332\scratchpad\ds\crops\` (topo, painel, card, FAB, ícones, abas de data).
- Scripts de medição (PowerShell/System.Drawing): `...\scratchpad\ds\crop.ps1`, `mode.ps1`, `scan.ps1`, `px.ps1`.
