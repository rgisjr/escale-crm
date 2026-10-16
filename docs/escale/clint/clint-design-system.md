# Clint — Design System extraído (para clonar 1:1 no Escale OS)

Data: 2026-10-15 · Pesquisa somente leitura. Nada no projeto foi alterado.

## 0. Como ler este documento

**Fontes**
- **[PX]**: cor de pixel lida no PNG por um decodificador próprio (Node + zlib). Os scripts estão em `scratchpad/ds/png.js` e `tool.js`. Formato: `[PX arquivo (x,y)]`. As coordenadas estão em pixels do dispositivo.
- **[BUNDLE]**: valor literal dos bundles JS. `raw-v2` é a captura mais nova (14/10, chunk principal `index-CY2O8ZFZ.js`, kanban em `index-CTaP4T6N.js`). `raw` é a captura mais antiga (chunks `chat-media-CsWQHKyJ.js`, `index-Eivtu0ck.js`, `index-CxkVYiQq.js`).
- **[VIS]**: estimativa visual feita sobre um recorte ampliado.

**Escala dos screenshots: DPR = 1,25 (Windows a 125%).**
- O bundle fixa a coluna do kanban em `Kt={WIDTH:"260px"}` [BUNDLE index-CTaP4T6N]. Nos screenshots ela mede 325 px: em `01-010` (x 338–662) e em `2.png` (x 55–379). 325/260 = 1,25.
- O mesmo vale para a célula do calendário: o código diz 32 px e o `1.png` mede 40 px.
- Conversão: **px CSS = px do screenshot ÷ 1,25**. Todas as medidas abaixo já estão em px CSS, salvo quando escrito "dev".
- Os JPEGs `01-032/033/034` têm só 500 px de largura e estão comprimidos. Servem apenas como referência visual.

**Duas gerações de UI convivem (importante)**
1. **UI "legada" (o alvo, com menu no topo).** Aparece em `01-010`, `01-011`, `01-013`, `01-032/033` e nos prints do usuário `1.png` e `2.png`.
   - Filtros soltos: Data / Campos / Tags / Dono / Status / Mais filtros.
   - Mistura react-bootstrap (grid `Row`/`Col`, classes `c-dark`, `text-blue-gray`, `pt-4`), react-select, react-widgets, react-datepicker e Chakra UI v3.
   - O código dela está no bundle `raw` (`index-Eivtu0ck.js`).
2. **UI nova (menu lateral).** Aparece em `01-018`.
   - Um único popover "Filtros" com acordeão (Negócio/Conversas/Tags/Campos/Outros), busca "Pesquisar nessa origem...", "Em aberto" e "Ordenar".
   - 100% Chakra v3. Está no bundle `raw-v2`.
   - **O `3.png` é o Escale atual, não o Clint.** Ele já se parece com essa UI nova.

Os **tokens** (paleta, fontes, raios, sombras) são os mesmos nas duas gerações: o styleguide do bundle `raw` e o tema do `raw-v2` têm os mesmos hex. O que muda são algumas cores "hardcoded" da UI legada (`#EFF3FF`, `#E8E4F5`, `#3E3A6F`, `#7C00FF`), listadas na seção 3.

---

## 1. Framework e bibliotecas (com evidência)

| Item | Detectado | Evidência |
|---|---|---|
| Framework | **React** (SPA, Vite) | `const __vite__mapDeps=...` no topo dos chunks; `Mt.createElement`, `f.forwardRef`, hooks `useMemo/useState` [BUNDLE] |
| Biblioteca de componentes | **Chakra UI v3** (Ark/zag por baixo), tema customizado | `cssVarsPrefix:"chakra"`, `cssVarsRoot:":where(:root, :host)"`, `theme:{breakpoints,keyframes,tokens:Got,semanticTokens:Irt,recipes:prt,slotRecipes:Tot,textStyles:xot,layerStyles:Hnt,animationStyles:Ant}` [BUNDLE index-CY2O8ZFZ ~byte 1.283.000]. Variáveis CSS do tipo `var(--chakra-colors-fg-muted)` |
| Grid/legado | **react-bootstrap** + CSS próprio (base Bootstrap/Dashkit) | `className:"deal-content-header pt-4 px-lg-0"`, `noGutters:!0`, `className:"c-dark"`, `"text-blue-gray"`, `form-control-white` [BUNDLE raw/index-Eivtu0ck]. O CSS (`react-ui-DcuPHkRx.css`, `chat-media-BKH6ZZgG.css`) não foi capturado |
| Selects legados | **react-select** | `control:a=>({...a,minHeight:"45px",background:"#eff3ff",borderColor:"#f8faff"})`, `menuIsOpen` [BUNDLE raw/chat-media] |
| Busca legada | **react-widgets** Combobox | `className:" rw-combobox-lite"`, `renderListItem`, `textField:"label"` [BUNDLE raw/index-Eivtu0ck] |
| Datepicker do filtro "Data" (legado, `1.png`) | **react-datepicker**, com container próprio de presets e abas | `r(Fr,{selectsRange:!0,...,monthsShown:Re?1:2,calendarContainer:S=>r(_r,{onChangeFilterDate:X,dateFilterType:me,showPresets:!Re,...S})})`; classes `react-datepicker__day--selected` em `raw/react-ui-GnwoMDPx.js` |
| Datepicker novo | Componente próprio (dayjs + Chakra Popover) | `D5t` / `Yoe` / `E6t` em `index-CY2O8ZFZ` (célula `O5="32px"`, presets à esquerda com `minW:"150px"`) |
| Datas | **dayjs** (`at().startOf("week")`), date-fns no trigger novo (`format(o,"dd MMM, yyyy")`) | [BUNDLE] |
| i18n | **react-intl** (`formatMessage`, ids `label.tThisWeek`) | [BUNDLE] |
| Ícones | **react-icons** (`GenIcon`: `B({attr:{viewBox:"0 0 24 24",fill:"none",stroke:"currentColor",strokeWidth:"2",strokeLinecap:"round",strokeLinejoin:"round"},child:[...]})`) | Famílias encontradas, por assinatura de SVG: **Lucide/Feather** (stroke 2, 24 px; 518 ícones no raw-v2, 242 no raw), **Material Design** (`viewBox 0 0 24 24` com `M0 0h24v24H0z`; 179/202), Ionicons (512), Bootstrap Icons (16), Phosphor (256), Ant (1024), Heroicons (20 / outline 24), FontAwesome. O ícone das origens usa explicitamente nomes **Feather** (`FiCoffee`, `FiMonitor`, `FiBook`, `FiUser`...) |
| Drag & drop do kanban | Atlassian **pragmatic-drag-and-drop** (raw-v2; `dropTargetForElements`, `autoScrollForElements`, `getIsSticky`) e helpers próprios no raw | [BUNDLE] |
| Gráficos | recharts (fonte `"Poppins, sans-serif"` nos ticks) | [BUNDLE ComposedCanvas/KpiChartV2] |
| Editor rico | CKEditor 5 | [00-achados-iniciais.md] |
| Tailwind | **Não usa** (0 ocorrências) | grep `tailwind` = 0 |

---

## 2. Tipografia

**Família**
```
Poppins, "Poppins Fallback", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol"
```
- [BUNDLE `gae=` + `Go.fonts({heading:{value:gae},body:{value:gae}, mono:'"Fira Code", "Fira Mono", ...'})`].
- `html { font-family: {fonts.body}; color: fg; line-height:1.5; -webkit-font-smoothing:auto }` e `body { font-weight:400 }`.
- Em `*` há `font-feature-settings:"cv11"` [BUNDLE `jnt` globalCss].
- `h1–h6 { font-weight:500; line-height:1.2; margin:0 }`.

**ATENÇÃO: os tokens de peso no Chakra do Clint estão "rebaixados" em 100** [BUNDLE `Fot=Go.fontWeights`]:

| Token | Valor real |
|---|---|
| `normal` | 400 |
| `medium` | **400** |
| `semibold` | **500** |
| `bold` | **600** |
| `extrabold` | 700 |
| `black` | 800 |

Na prática a UI usa só 400, 500 e 600. Nada aparece mais pesado que 600.

**Escala de tamanhos** [BUNDLE `Not=Go.fontSizes`]:

| Token | rem | px |
|---|---|---|
| `3xs` | .5625rem | 9 |
| `2xs` | .625rem | 10 |
| `xs-11` / `2xs+` | .6875rem | 11 |
| `xs` | .75rem | 12 |
| `sm` | .75rem | **12** (igual a xs!) |
| `md` | .875rem | 14 |
| `lg` | 1rem | 16 |
| `xl` | 1.125rem | 18 |
| `2xl` | 1.25rem | 20 |
| `3xl` | 1.5rem | 24 |
| `4xl` | 1.875rem | 30 |

**textStyles** [BUNDLE `xot`]:
- `xs` 12/16
- `sm` 12/20
- `md` 14/24
- `lg` 16/28
- `overline` xs, weight 500, letter-spacing .08em, uppercase
- `overline-sm` 10/14, 500, .06em, uppercase
- `label` 12/20 (400)
- `caption` 10/12

**Medidas por elemento.** O tamanho foi calculado pela altura de maiúscula medida no screenshot ÷ 1,25 ÷ 0,70 (cap-height do Poppins). A fórmula foi validada no título: código diz 26 px e a medida deu 26,3.

| Elemento | Tamanho / peso / line-height / cor | Como obtive |
|---|---|---|
| Título da página "Leads INSS Whatsapp" | **26px**, **600**, lh 36px, `#2F2C5D` | [BUNDLE raw/Eivtu0ck `variant:"h2",fontWeight:"600",style:{lineHeight:"36px",fontSize:26}`, classe `c-dark`] + [PX 01-010 maiúscula "L" 23 dev = 18,4 CSS → 26,3 px]. Cor [PX 01-010 região 338–690,118–155 → #2F2C5D] |
| Eyebrow "NEGÓCIOS DA ORIGEM" | **10px**, **600**, uppercase, lh 15px, mb 4px, `#828282` | [BUNDLE `variant:"h3",fontWeight:"600",className:"d-flex text-uppercase",style:{lineHeight:"15px",fontSize:10,marginBottom:4,color:"#828282"}`] + [PX cor #828282 (338–470, 92–106)] |
| Item do menu do topo ("Negócios", "Contatos"...) | ~**14px**, 400, `#2F2C5D` (ativo e inativo com a mesma cor) | [PX "N" cap 12 dev → 13,7 px]; [PX darkest #2F2C5D nos dois] |
| Cabeçalhos de seção da sidebar ("ORIGENS", "VISUALIZAÇÕES", "RECENTES") | ~**11px**, **600**, uppercase, `#2F2C5D` | [PX "O" 10 dev → ~11px; traço visivelmente bold] |
| Itens de origem ("Recuperação INSS") | ~**12–13px**, 400 (o item atual, "INSS Vendas", fica **600**), `#2F2C5D` | [PX "R" 10 dev → 11,4 a 12,5 px; visual] |
| Botões de filtro ("Data", "Campos"...) | **0,7rem = 11,2px**, **500**, `#3E3A6F` (aberto: branco) | [BUNDLE `DateRangeButtonTrigger`: `fontSize:"0.7rem",fontWeight:"500"`] + [PX "D" 10 dev → 11,4px; cor #3E3A6F] |
| "0 oportunidade de **Negócio**" | ~**13–14px** (h5 Bootstrap), 400 + `<span class="bold">` 600, `#2F2C5D` | [BUNDLE `h5 ... className:"mb-0 d-flex align-items-center"`, `span.bold.mx-1`] + [PX "0" 12 dev] |
| Título da coluna "1. Entrada Lead" | ~**14px**, 500, `#2F2C5D` | [PX "1" 12 dev → 13,7px]. A UI nova usa `fontSize:"xs"` (12) e `fontWeight:"500"` |
| Total da coluna "R$0" | ~**12px**, 400, `#2F2C5D` | [PX] |
| Contador da coluna "148" | **10px** (2xs), **600** ("bold"), legado em **preto #000** | [PX "148" 9 dev → 10,3px; cor #000000]. A UI nova usa `fontSize:"2xs"`, `bg:"purple.muted"`, `color:"purple.fg"` |
| Título do card "Reinaldo Fernandes" | ~**13px** (h5 × 95%), **500**, lh 15px, `#2F2C5D` | [BUNDLE `variant:"h5",percent:95,fontWeight:"500",className:"c-dark mb-1 mt-2",style:{lineHeight:"15px"}`] + [PX "R" 11 dev → 12,6px] |
| Texto da prévia de mensagem ("Obrigado por entrar ...") | ~**11px**, 400, `#686D86` (gray.500). O nome do remetente ("Luciana:") vai em 500 | [PX darkest #686D86; "O" 9 dev] |
| Data/hora da mensagem ("23/09") | ~**11px**, `#686D86` → `#8C90A4` (mais claro) | [PX] |
| Rodapé do card "R$0", "0/3", "5d" | **~11px**. R$ = h5 × 80%, **500**; atividades/idade = h6 × 95%, 400; cor **#8C89B0** (`fg.kanbanIcon`, classe `text-blue-gray`) | [BUNDLE `variant:"h5",percent:80,fontWeight:"500",className:"mb-0 text-nowrap text-blue-gray"`] + [PX darkest #8C89B0] |
| Tag/chip ("obra_notificada") | ~**10px**, 400–500 | [PX altura do chip 14,4px] |
| "+ Adicionar negócio" | ~**13px**, 400 ("font-weight-regular"), `#3E3A6F` | [BUNDLE `className:"add-new-deal text-left py-1 font-weight-regular hover-bg-light"`, `px:2, pt:"4px"`] + [PX] |
| Botão "Negócio +" | ~**12–13px**, 500–600, branco | [PX "N" 10 dev] |
| Botão "Novo +" (topo) | ~**11px**, 500, branco | [PX "N" 9 dev] |
| Calendário: título do mês "outubro 2026" | ~**14px** (sm/md), **500**, `#2F2C5D`, minúsculo | [PX 1.png #2F2C5D]; novo: `fontWeight:"500",fontSize:"sm"` |
| Calendário: dias da semana "DOM SEG..." | **0,7rem**, **600**, uppercase, quase preto (#111) no legado; novo = `fg.subtle` | [PX 1.png darkest #111111]; [BUNDLE novo `fontSize:"0.7rem",fontWeight:"600",textTransform:"uppercase",color:"fg.subtle"`] |
| Calendário: números dos dias | **0,8rem**, **500** (mês corrente) ou 400, cor **#6C19DE** no legado | [PX 1.png darkest #6C19DE]; [BUNDLE novo `fontSize:"0.8rem",fontWeight:O?"500":"400"`] |
| Presets da data ("Hoje", "Ontem"...) | **0,7rem**, **500** (ativo 600), `#3E3A6F`; hover/ativo legado **#597EFF** | [PX 1.png #3E3A6F; "Essa semana" #597EFF]; [BUNDLE novo `fontSize:"0.7rem",fontWeight:R?"600":"500",color:R?"purple.fg":"fg.muted"`] |
| Abas do detalhe ("Atividades", "Contato"...) | ~**15–16px**, ativa **600**, `#2F2C5D` | [PX 01-011; visual] |
| Tooltip | **11px**, 500 | [BUNDLE `wot` tooltip `fontSize:"11px",fontWeight:"medium"`] |
| Item de menu (dropdown) | **11px**, 400, minH 34px | [BUNDLE `Qrt` menu `item:{fontWeight:"400",fontSize:"11px",minH:"34px",py:"1",px:"3",gap:"2"}`] |
| Rótulo de seção de filtro (UI nova, "DONO DO NEGÓCIO") | **11px**, **600**, uppercase, ls .6px, `fg.muted` | [BUNDLE `Ta=({children})=>...fontSize:"11px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.6px",color:"fg.muted"`] |

---

## 3. Tokens de cor

### 3.1 Paleta base [BUNDLE `Oot=Go.colors`]

**purple** (marca)

| Tom | Hex |
|---|---|
| 25 | `#F1EFFF` |
| 50 | `#FAF8FF` |
| 100 | `#F4F1FF` |
| 200 | `#E8E1FF` |
| 300 | `#D1BBFF` |
| 400 | `#B794FF` |
| 500 | `#9C6DFF` |
| **600** | **`#6C19DE`** |
| 700 | `#5B16BC` |
| 800 | `#4A13A1` |
| 900 | `#380F7A` |
| 950 | `#260A52` |

**blue**

| Tom | Hex | Nota |
|---|---|---|
| 25 | `#F0F3FF` | |
| 50 | `#EFF6FF` | |
| 100 | `#E3EBFF` | |
| 150 | `#F4F7FF` | |
| 200 | `#C7D2FE` | |
| 300 | `#A5B4FC` | |
| 400 | `#818CF8` | |
| 450 | `#D2D6FF` | |
| 500 | `#597EFF` | |
| 600 | `#4F46E5` | |
| 700 | `#4338CA` | |
| 800 | `#3730A3` | |
| 900 | `#312E81` | |
| **950** | **`#2F2C5D`** | **cor do texto principal ("navy")** |

**gray**

| Tom | Hex |
|---|---|
| 50 | `#F9FAFB` |
| 100 | `#F3F4F6` |
| 150 | `#828282` |
| 200 | `#E5E7EB` |
| 300 | `#D1D5DB` |
| 400 | `#9CA3AF` |
| 500 | **`#686D86`** |
| 600 | `#4B5563` |
| 700 | `#374151` |
| 800 | `#1F2937` |
| 900 | `#111827` |

**clint.lilac**

| Tom | Hex |
|---|---|
| 50 | `#FAFBFF` |
| 100 | `#F4F7FF` |
| 200 | `#EAEEFF` |
| 300 | `#D5DCFF` |
| 400 | `#AAB6FF` |
| 500 | `#7B90FF` |
| 600 | `#5A71E6` |
| 700 | `#475BBB` |
| 800 | `#3B4B94` |
| 900 | `#343F75` |
| 950 | `#1F2648` |

**clint.purpleLight**

| Tom | Hex |
|---|---|
| 50 | `#F5F3FF` |
| 100 | `#ECE8FF` |
| 200 | `#D9D2FF` |
| 300 | `#B0AAFF` |
| 400 | `#9289FF` |
| 500 | `#7566FF` |
| 600 | `#5D48E6` |
| 700 | `#4A38BB` |

**Outras escalas e cores avulsas**
- **clint.red**: 500 `#E63757`, 50 `#FEF2F4`, 700 `#A81932`.
- **clint.green**: 400 `#35EFB3`.
- **clint.greener**: 500 `#36BA79`, 600 `#25915E`.
- **clint.danger**: 500 `#F94575`.
- **clint.warning**: 400 `#FDD43E`, 100 `#FEF9C5`.
- **clint.orange**: 500 `#FD7E14`.
- **clint.info**: 50 `#EFF3FF`, 400 `#889FF9`.
- **clint.darkGray**: 400 `#BDBDBD`.
- **clint.mediumGray**: 500 `#828282`.
- **clint.blueMatte**: 25 `#E7F4FF`, 50 `#EFF4FF`, 400 `#6996FF`.
- **clint.whatsapp** `#25D366`, **clint.instagram** `#E4405F`.
- **navy.500** `#47457F`.
- **figma.input.bg** `#F6F9FF`, **figma.input.placeholder** `#6E84A3`.
- **black** `#09090B`.
- Escalas red/orange/yellow/green/teal/cyan/pink/amber/emerald/rose/slate/zinc no padrão Tailwind (green 500 `#22C55E`, red 500 `#EF4444`, amber 500 `#F59E0B`).

### 3.2 Tokens semânticos (modo claro) [BUNDLE `mrt`, `_rt`, `frt`, `hrt`]

**Fundos**

| Token | Valor |
|---|---|
| `bg` | `white` |
| `bg.subtle` | gray.50 `#F9FAFB` |
| `bg.muted` | gray.100 `#F3F4F6` |
| `bg.emphasized` | `#EDECEF` |
| `bg.panel` | `white` |
| `bg.input` | lilac.50 `#FAFBFF` |
| `bg.tint` | `#F4F7FE` |
| `bg.kanbanColumn` | lilac.200 `#EAEEFF` |
| `bg.kanbanCard` | `white` |
| `bg.kanbanEmpty` | `#F6F8FF` |
| `bg.error` | red.50 |
| `bg.success` | green.50 |

**Textos**

| Token | Valor |
|---|---|
| `fg` | **blue.950 `#2F2C5D`** |
| `fg.muted` | gray.600 `#4B5563` |
| `fg.subtle` | gray.400 `#9CA3AF` |
| `fg.kanbanColumn` | `#2F2C5D` |
| `fg.kanbanIcon` | **`#8C89B0`** |
| `fg.error` | red.500 |
| `fg.success` | green.600 |
| `fg.warning` | orange.600 |
| `fg.info` | blue.600 |

**Bordas**

| Token | Valor |
|---|---|
| `border` | lilac.200 `#EAEEFF` |
| `border.muted` | gray.100 |
| `border.subtle` | gray.50 |
| `border.emphasized` | gray.300 `#D1D5DB` |
| `border.tint` | `#E3EBFF` |
| `border.error` | red.500 |

**Paleta `purple` (`colorPalette` padrão do app, definido em `html { colorPalette:"purple" }`)**

| Token | Valor |
|---|---|
| `purple.solid` | **600 `#6C19DE`** |
| `purple.fg` | **600 `#6C19DE`** |
| `purple.subtle` | 100 `#F4F1FF` |
| `purple.muted` | 200 `#E8E1FF` |
| `purple.emphasized` | 300 `#D1BBFF` |
| `purple.surface` | 500 `#9C6DFF` |
| `purple.focusRing` | 600 |
| `purple.contrast` | white |

**Paleta `blue`**: `solid` 500 `#597EFF`, `fg` 700, `subtle` 100 `#E3EBFF`, `muted` 200 `#C7D2FE`. O `focusRing` dela é purpleLight.300.

**Tokens próprios do Clint**

| Token | Valor |
|---|---|
| `clint.navHover` | `rgba(0,0,0,.03)` |
| `clint.navHoverFg` | purple.600 |
| `clint.navActive` | `rgba(0,0,0,.04)` |
| `clint.purpleSurface` | purple.100 |
| `clint.primary` | blue.950 `#2F2C5D` |

**Formulários**

| Token | Valor |
|---|---|
| `form.control.bg` | lilac.500/5% (≈ `#F8F9FF`) |
| `form.control.border` | lilac.100 `#F4F7FF` |
| `form.control.placeholder` | gray.400 `#9CA3AF` |
| `form.control.focus` | **purple.600** |
| `form.checkbox.border` | lilac.300 `#D5DCFF` |
| `form.checkbox.checked` | **purple.600** |
| `form.checkbox.bg` | `#DFE2FD` |
| `form.switch.checked` | **purple.600** |
| `form.switch.bg` | gray.300 |
| `brand.purple` | **purple.600** |

**Etapas**: `stage.start` bg `#41FEAE` / fg `#199041`; `stage.closing` bg `#FFABAB` / fg `#FF3434`.

### 3.3 Cores medidas no alvo (UI legada com menu no topo)

| Papel | Hex | Evidência |
|---|---|---|
| Fundo da página | `#FFFFFF` | [PX 01-010 histograma: 988k px] |
| Fundo da sidebar | `#FFFFFF` | [PX 01-010 (150,300)] |
| Bordas e divisórias (nav, sidebar, seções) | **`#E8E4F5`** | [PX 01-010 (300,62) borda do nav; (312,400) borda da sidebar; (150,220/662/722) divisórias]; também no bundle: `borderBottom:"1px solid #e8e4f5"` |
| **Coluna do kanban** | **`#EFF3FF`** | [PX 01-010 (360,330), 559k px; idem 2.png (100,330)]. Coincide com clint.info.50. A UI nova usa `bg.tint` `#F4F7FE` com borda lilac.200 |
| Card | `#FFFFFF` | [PX] |
| Caixa de mensagem dentro do card | bg **`#EFF6FF`** (blue.50), borda 1px **`#E3EBFF`** (blue.100) | [PX 01-010 (500,472–511) bg; (358,490) e (500,471) borda] |
| Divisória do rodapé do card | **`#E5E7EB`** (gray.200) | [PX 01-010 linha y=523, x 348–642]; [BUNDLE `borderTopWidth:"1px",borderColor:"colorPalette.200"` com `colorPalette:"gray"`] |
| Texto principal | **`#2F2C5D`** | [PX: título, menu, coluna, card] |
| Texto escuro alternativo (filtros, presets, "+ Adicionar negócio") | **`#3E3A6F`** | [PX 01-010 (505–541,207–222); 1.png]. Também é o fundo dos tooltips escuros [BUNDLE `backgroundColor:p==="dark"?"#3e3a6f":"#fff",boxShadow:"#afafaf29 0 3px 6px"`] |
| Texto secundário (prévia de mensagem, ícones da toolbar, kebab, lupa) | **`#686D86`** (gray.500) | [PX várias regiões] |
| Texto/ícones discretos do rodapé do card | **`#8C89B0`** | [PX 01-010 (467–630,540–553)] = `fg.kanbanIcon` |
| Eyebrow / cinza neutro | `#828282` | [PX] |
| Chevrons dos filtros | `#7489A8` | [PX 01-010 (549–565,207–222)] |
| Ícone desabilitado (exportar com 0 negócios) | `#BDBDBD` | [PX 01-010 (1792,272)]; [BUNDLE `className:be===0?"text-dark-gray":"text-muted"`] |
| Chevron "^" da seção ORIGENS | `#9CA3AF` | [PX] |
| Fundo do item ativo no menu do topo | **`#F8F6FD`** | [PX 01-010 x 113–205, y 8–61] |
| Fundo do input de busca | **`#F6F8FF`** | [PX 01-010 (400,215); 2.png (100,150)] |
| Hover do botão de filtro | **`#EFF3FF`** | [PX 2.png "Dono do negócio" com hover, x 530–700] |
| Botão de filtro aberto ("Data" no 1.png) | bg **`#2F2C5D`**, texto branco | [PX 1.png x 203–292, y 56–99] |
| Badge de contagem do filtro ("Status 1") | bg **`#E0E0E0`**, número `#2F2C5D` | [PX 2.png (785–806,154–175)] |
| Círculo de contagem da coluna ("148") | bg **`#E8E4F5`**, número **`#000000`** | [PX 01-010 (595–629,347–381)] |
| Scrollbar (coluna e horizontal) | thumb **`#BFBFBF`**, ~8px | [PX 01-010 x 653–662]; no bundle novo o thumb é `border.emphasized`, largura .6em, raio 5px |
| Badge vermelho "99+" / "2" / "+9" | **`#FF4B4C`**, texto branco | [PX 01-010 (517–551,35); FAB (1865,898)] |
| Botão "Novo +" | **`#597EFF`** (blue.500), texto branco | [PX 01-010 x 1769–1834, y 21–48] |
| Botão "Negócio +" | **`#6C19DE`** (purple.600), texto branco | [PX 01-010 x 1786–1904, y 101–139] |
| Círculo do ícone de ajuda "?" no topo | fill **`#F2EDFF`**, glifo **`#7C00FF`** | [PX 01-010 (1718–1750,22–50)]; [BUNDLE `help-circle ... fill:"#f2edff",color:"#7C00FF"`] |
| Ícone "sparkle" (Aura) no topo | `#4B5563` | [PX] |
| Avatar do usuário "R" no topo | `#8D6E63` (Material brown 400), quadrado arredondado | [PX] |
| Avatares de iniciais no card | Material 700: **`#7B1FA2`** ("I"), **`#0097A7`** ("C") | [PX 01-010]; paleta Material no bundle (`fc={...700:"#0097a7"}`, `{...700:"#7b1fa2"}`) |
| Avatar padrão (sem foto) | círculo **`#DFE5E7`** com silhueta branca | [PX 01-010 (935–975,415–455)] |
| Ícone do WhatsApp no card | verde `#61FD7D` / `#25D366` + mini-selo azul | [PX]; token `clint.whatsapp #25D366` |
| FAB de conversas | gradiente vertical **`#D1A8F5` → `#8B5CFF`** (meio `#A174FC`) | [PX 01-010 (1850,898)→(1850,958)] |

**Sucesso / perigo / aviso**
- success: `clint.greener` `#36BA79` (verde de UI) e `clint.green` `#35EFB3`. O "Salvar" do modal 01-013 aparece como `#7ABAB4` porque está desabilitado ou sob overlay [PX].
- danger: `clint.red` `#E63757`, `clint.danger` `#F94575`. "Excluir" nos menus aparece vermelho [VIS 01-032]. Datas vencidas no detalhe: `#FE5A5A`/`#FF5A5A` [PX 01-011].
- warning: `clint.warning` `#FDD43E`, alerta de tempo de etapa: bg `amber.50`, cor `amber.600`, borda `amber.300`, raio 6px [BUNDLE `il={warning:{bg:"amber.50",color:"amber.600",border:"amber.300"},critical:{bg:"red.50",color:"red.600",border:"red.300"}}`].

### 3.4 Paleta de tags (chips) [BUNDLE `w9e`]

Formato cor → fundo claro / texto:

| Cor-base | Fundo | Texto | Observação |
|---|---|---|---|
| `#E91E63` | `#FFADC9` | `#E91E63` | |
| `#F44336` | `#FFAAA3` | `#F44336` | ← "obra_notificada" [PX 01-010 (698–803,598–615)] |
| `#FF5722` | `#FFC7B5` | | |
| `#FF9800` | `#FFD89E` | | |
| `#FAA200` | `#FFF2D1` | `#FAA200` | ← "sem_alvara" [PX] |
| `#8BC34A` | `#DBFFB3` | | |
| `#4CAF50` | `#C7FFC9` | | |
| `#009688` | `#A9FCF5` | | |
| `#9C27B0` | `#F3A8FF` | | |
| `#673AB7` | `#C9ABFF` | | |
| `#3F51B5` | `#B3BEFF` | `#3F51B5` | ← "em_andamento" [PX] |
| `#2196F3` | `#91CEFF` | | padrão quando a cor é desconhecida |
| `#03A9F4` | `#BFEBFF` | | |
| `#00BCD4` | `#BAF7FF` | | ← "ainda_vai_comecar" [PX 01-018] |
| `#607D8B` | `#D1F0FF` | | |
| `#795548` | `#FFE4DB` | | |

Chip: `borderRadius:"full"`, `pl:2`, `pr:2` (1.5 quando há botão de fechar), `maxW:"72"` [BUNDLE `kbt`]. Medido no legado: **altura ≈14–15px**, texto ~10px, cantos bem arredondados [PX].

### 3.5 Cores dos ícones de origem [BUNDLE IconPicker `A=[...]`]

`#3D3A6C #9C3EFF #B4ADFF #D96CFF #263AF1 #83B4FF #48DEA8 #5BFFC4 #B5846F #FF4062 #FFA7A7 #FFA959 #FFDFC1 #FFE073 #B9F26B #9D9D9D #CECECF #E6E6E6 #3B7E85 #60C6D0 #DCE4FF #E9F4FF`

- Confirmadas no screenshot [PX 01-010 x≈23]: `#FFE073` (RI), `#263AF1` (II), `#FFA7A7` (café), `#60C6D0` (monitor), `#5A5A5A` (SS), `#48DEA8`, `#D96CFF`, `#FF4062`, `#263AF1`.
- Iniciais: 2 letras, das duas primeiras palavras, em maiúsculas (`S=n=>...`).
- Ícone alternativo: Feather (`FiCoffee`, `FiMonitor`, `FiBook`, `FiUser`...) em branco.

### 3.6 Onde o roxo da marca aparece (trocar pela cor da Escale)

**A. `#6C19DE` (purple.600, a cor da marca)**
1. Botão primário "Negócio +" (bg) e hover `purple.700 #5B16BC` [PX + BUNDLE compoundVariant `colorPalette:"purple",variant:"solid",_hover:{bg:"purple.700"}`].
2. **`colorPalette` padrão de todo componente Chakra** (`html{colorPalette:"purple"}`): checkbox marcado, radio, switch, progress, badge solid, slider etc.
3. Focus ring e borda de foco de inputs (`form.control.focus`, `--focus-color`), sombra `outline-purple 0 0 0 3px purple.600/15`, `figma.input.focus 0 0 0 3px rgba(108,25,222,.2)`.
4. Checkbox e switch marcados (`form.checkbox.checked`, `form.switch.checked`).
5. Datepicker:
   - Legado: **números dos dias em `#6C19DE`** sobre `#F7F7FE` [PX 1.png].
   - Novo: dia de início/fim com bg `purple.solid` e texto branco; dias do intervalo com `purple.subtle`/`purple.fg`; hover `purple.subtle`/`purple.fg`; preset ativo `purple.subtle`/`purple.fg` [BUNDLE `L5t`, `P5t`].
6. Itens de menu/dropdown em destaque: bg `purple.subtle #F4F1FF`, texto `purple.fg` [BUNDLE `--menu-highlight-bg`].
7. Tooltip padrão: bg `purple.100`, texto `purple.600` [BUNDLE `wot`].
8. Detalhe do negócio (01-011):
   - Círculo da etapa atual no stepper (`#6C19DE`) e o rótulo da etapa atual.
   - Link "Próximas atividades".
   - Ícones de ação do contato (telefone, chat, e-mail, calendário, nota) [PX 01-011].
9. Menu lateral (UI nova): item ativo com texto `#6C19DE`, bg `#F4F1FF` e indicador de 3px à esquerda `#6C19DE` [PX 01-018 linha y=168]. Item ativo da lista de origens na sidebar (01-032): bg lilás e barra roxa à esquerda [VIS].
10. Contador da coluna na UI nova: bg `purple.muted #E8E1FF`, número `purple.fg` [PX 01-018 + BUNDLE].
11. Hover do card do kanban: borda `purple.200`, sombra `figma.purple 0 2px 8px rgba(91,22,188,.15)`. Card ativo: borda `purple.solid` [BUNDLE recipe card `kanban`].
12. Coluna como alvo de drop: bg `purple.muted`, contorno 2px `purple.solid` [BUNDLE `mm` state `is-column-over`].
13. Seleção de texto: `colorPalette.muted/80` [BUNDLE `*::selection`].
14. Hover de navegação: `clint.navHoverFg` = purple.600.
15. Cursor dos gráficos: `rgba(124,58,237,.06)`; cor de KPI `#7C3AED` [BUNDLE].

**B. `#7C00FF` (roxo "legado" mais vivo, CSS antigo)**
- Sublinhado da aba ativa (abas do detalhe e do modal de configuração): **3–4 dev = 3px** [PX 01-011 y 280–283, x 353–459; 01-013 y 172–174].
- Glifo "?" dos ícones de ajuda (`help-circle`, fill `#F2EDFF`).
- Contador "365" (Dias) e "?" ao lado de rótulos [PX 01-011, 01-013].

**C. Tons claros derivados do roxo (tingir com a cor da Escale)**

| Hex | Uso |
|---|---|
| `#F8F6FD` | bg do item ativo no menu do topo |
| `#F4F1FF` | purple.subtle: hovers, tooltips, item ativo do menu lateral |
| `#E8E1FF` | purple.muted |
| `#E8E4F5` | bordas/divisórias e círculo de contagem no legado (lavanda acinzentado) |
| `#F2EDFF` | fundo do círculo de ajuda |
| `#F7F6FE` | faixa do stepper no detalhe |
| `#DFC1FF` | círculos e linha das etapas futuras no stepper |
| `#A871EF` | linha de progresso concluída |
| `#F7F7FE` | fundo das células do calendário |
| `#D1A8F5 → #8B5CFF` | gradiente do FAB de conversas |
| `#B0AAFF`, `#7566FF` | purpleLight, roxo do modo escuro |

**D. O que NÃO é roxo (manter)**
- O navy **`#2F2C5D` / `#3E3A6F`** é cor de texto e de superfície escura (filtro aberto, aba de tipo de data ativa, tooltip escuro). É parte da identidade, mas funciona como "preto". Decidir se fica.
- O azul **`#597EFF`** do "Novo +" e do hover de preset é secundário.

---

## 4. Raios, sombras, bordas e espaçamento

### 4.1 Raios

**Tokens** [BUNDLE `zot` / `Ert`]

| Token | Valor |
|---|---|
| `xs` | 2px |
| `sm` | 4px |
| `base` | 5px |
| `md` | 6px |
| `lg` | 8px |
| `xl` | 12px |
| `2xl` | 16px |
| `3xl` | 24px |
| `full` | 9999px |
| `l1` (semântico) | xs 2px |
| `l2` (semântico) | sm 4px |
| `l3` (semântico) | **md 6px** (o token base `l3` = .75rem é sobrescrito pelo semântico; a medida bate com 6px) |
| `figma.input` | 4px |
| `figma.card` | 8px |
| `figma.modal` | 12px |
| `figma.button` | 12px |

**Medidos [PX, raio estimado pela curvatura da borda]**

| Elemento | Raio |
|---|---|
| Coluna do kanban | **≈15–16px** (curva de ~19 dev; offset da 1ª linha 14 dev). UI nova: `borderRadius:"xl"` = 12px |
| Card do kanban | **≈10px** (offset da 1ª linha 8 dev ⇒ r≈12 dev). UI nova: `l3` |
| Caixa de mensagem do card | ≈6px [VIS] |
| Botão de filtro aberto ("Data") | **6px** (curva de ~6 dev) = `l3` [BUNDLE `borderRadius:"l3"`] |
| Botões "Negócio +" / "Novo +" | ≈5–6px |
| Input de busca | ≈4–6px |
| Ícone de origem (quadrado 20px) | ≈4px |
| Avatar do topo | ≈5px |
| Abas de tipo de data | ≈5px (grupo segmentado: 1ª com cantos esquerdos, última com direitos) [VIS] |
| Células do calendário | `md` 6px [BUNDLE] / ≈4–6px [VIS] |
| Popover/dropdown | `l3` 6px (popover recipe), datepicker novo `lg` 8px, menu `l2` 4px [BUNDLE] |
| Badges | `figma.input` 4px; chips de tag `full` |

### 4.2 Sombras

**Tokens** [BUNDLE `wrt`, `Art`, `jot`]
- `xs`: `0 1px 2px gray.900/10, 0 0 1px gray.900/20`
- `sm`: `0 2px 4px gray.900/10, 0 0 1px gray.900/30`
- `md`: `0 4px 8px …/10, 0 0 1px …/30`
- `lg`: `0 8px 16px gray.900/10, 0 0 1px gray.900/30` ← menu e popover
- `xl`: `0 16px 24px …/10, 0 0 1px …/30` ← toast
- `card`: `0 2px 4px gray.900/10, 0 0 1px gray.900/30`
- `dropdown`: `0 8px 16px …/10, 0 0 1px …/30`
- `popover`: `0 16px 48px gray.900/14, 0 2px 4px gray.900/6`
- `selected`: `0 4px 12px purple.600/15`
- `figma.card`: `0 1px 3px rgba(0,0,0,.08)`
- `figma.cardHover`: `0 4px 12px rgba(0,0,0,.12)`
- `figma.cardKanbanHover`: `0 3px 6px rgba(0,0,0,.16), 0 3px 6px rgba(0,0,0,.23)`
- `figma.purple`: `0 2px 8px rgba(91,22,188,.15)`
- `figma.purpleFocus`: `0 0 0 3px rgba(91,22,188,.1)`
- `outline-purple`: `0 0 0 3px purple.600/15`

**Medidas**
- Card do kanban (legado): praticamente sem sombra, branco liso sobre `#EFF3FF` [PX: nenhum degradê nas bordas]. UI nova: `boxShadow:"0px 1px 2px rgba(0,0,0,0.03)"`, borda 1px transparente; selecionado: borda `blue.muted` e sombra `0 0 12px -2px blue.solid` [BUNDLE `yr`].
- Painel do datepicker (1.png): sombra suave, degradê `#FEFEFE→#F8F8F8` em ~4 dev acima da borda superior e `#F8F8F8→#EBEFFA` à direita ⇒ equivale a `lg`/`dropdown` [PX 1.png (600,109–112), (1131–1138,400)].
- Tooltip escuro legado: `#afafaf29 0 3px 6px`.
- Coluna mesclada (UI nova): `4px -4px 0 hsl(225,100%,92%)` (efeito de "pilha").

### 4.3 Bordas

**Tokens** [BUNDLE `kot`]: `xs` .5px, `sm`/`1px`/`input` 1px, `md`/`2px`/`focus` 2px.

**Medido**
- 1px **`#E8E4F5`** sob o nav, na direita da sidebar e entre seções da sidebar.
- 1px `#E3EBFF` na caixa de mensagem.
- 1px `#E5E7EB` no topo do rodapé do card.
- 1px `#EBEBEB` entre presets da data e sob as abas de tipo [PX 1.png (300,172/225/277)].
- 1px `#E8E4F5` separando presets e calendário [PX 1.png x=435].
- Divisória do detalhe: `#E6E6E6` [PX 01-011 y=226].

### 4.4 Espaçamento

**Escala Chakra** (rem×16) [BUNDLE `Hot`]: 0.5=2, 1=4, 1.5=6, 2=8, 2.5=10, 3=12, 3.5=14, 4=16, 5=20, 6=24, 8=32…

**Tokens extras**
- `layoutGap` xs 8 / sm 12 / md 16 / lg 24
- `stack.gap` 4/8/12/16/24
- `control.padding.x` 12/16/20
- `control.padding.y` 6/8/12
- `drawerPadding` 24
- `appPageHeader.contentGap` 24
- `field.labelGap` 4

**Medidas-chave** (px CSS = dev ÷ 1,25; fonte: 01-010, salvo indicação)

| Medida | Valor | Pixels |
|---|---|---|
| Altura do menu do topo | **44px** incluindo a borda inferior de 1px | y 8–62 = 55 dev |
| Item ativo do menu do topo | fundo em toda a altura, ~74px de largura para "Negócios" ⇒ padding horizontal ≈10px, sem gap entre itens, sem sublinhado | x 113–205 |
| Largura da sidebar | **250px** (+ borda 1px `#E8E4F5`) | borda em x=312 |
| Botão de recolher a sidebar | círculo ~22px na borda direita (centro ≈ y 94 dev), borda/ícone `#484671`, chevron "<" | [VIS/PX] |
| Cabeçalho de seção da sidebar (ORIGENS / VISUALIZAÇÕES / RECENTES) | ~**48px** de altura, ícone 16–18px a 16px da esquerda, texto a ~44px da esquerda, ações à direita (lupa + chevron) a ~16px da borda | divisórias em y 220/662/722 dev |
| Item de origem | altura **34px** (passo 42,5 dev), ícone quadrado **20×20** a 16–17px da esquerda, texto a 43px | |
| Padding do conteúdo | **20px** da sidebar até o conteúdo/1ª coluna | x 313→338 = 25 dev |
| Eyebrow | topo ≈24px abaixo do nav (`pt-4`) | |
| Título | logo abaixo do eyebrow (mb 4px), lh 36 | |
| Linha de filtros | topo ≈106px abaixo do nav; botões h **36px**; espaçamento entre botões ≈16px (`ml-3` Bootstrap) | |
| Input de busca | **109×32px** | 136×40 dev |
| Linha "0 oportunidade de Negócio" + ícones à direita (refresh, export, engrenagem, ajuda) | ícones 16–17px, cor `#686D86`, espaçados ~34px | |
| Topo das colunas | ≈207px abaixo do nav | y 322 dev |
| **Coluna** | **260px**, gap entre colunas **12px**, padding interno 8px dos lados | x 663–677 = 15 dev |
| Cabeçalho da coluna | título a 12px da esquerda e ~16px do topo; linha 2 "R$0" | Círculo de contagem **28×28** [PX 35 dev]; kebab 3×14 [PX] a ~8px da direita. Novo: `pl:3, pr:1, pt:2, pb:1`; contador `minW:5, h:5` (20px) |
| **Card** | **236px** de largura (8px de margem da coluna + 8px de espaço para a scrollbar), altura ~129px no exemplo | x 348–642 = 295 dev |
| Espaço entre cards | ≈16px | y 568–587 = 20 dev |
| Cabeçalho do card | `p:2` (8px), `pb:1`, `minH:51px` | [BUNDLE `ol` `b(we,{p:"2",pb:"1",minH:"51px"})`] |
| Foto/avatar do canto superior direito | **28×28** | [PX] |
| Caixa de mensagem | **220×~34px**, margem 8px do card, padding ~6–8px | x 358–632, y 471–512 |
| Na caixa: ícone WhatsApp | ~14px | |
| Na caixa: duplo check | 14×8 | |
| Na caixa: mini-avatar | **18px** | |
| Rodapé do card | `px:2.5` (10px), `py:1.5` (6px), `minH:36px`, borda superior 1px gray.200 | [BUNDLE `sl`]; medido 35px |
| No rodapé: avatar do dono | **20px** ("xxs") | |
| No rodapé: ícones | **12px**, `mr-2` (8px entre ícones) | |
| "+ Adicionar negócio" | `px:2` (8px), `pt:4px`, botão "link" `py-1` em largura total, hover `hover-bg-light` | [BUNDLE `nr`] |
| Botão "Negócio +" | **≈95×31px** | x 1786–1904, y 101–139 |
| Botão "Novo +" | **≈53×22px** | |
| Avatar do topo | **28×28** | |
| Círculo de ajuda | ~24px | |
| FAB de conversas | **50px** de diâmetro, ~16px da direita/fundo; badge "+9" ~16px | |
| Botão de filtro (legado e novo) | **h 36px**, `px:2.5` (10px), `gap:10px`, chevron 11px, raio `l3` 6px | [BUNDLE `DateRangeButtonTrigger`: `h:"9",gap:"10px",px:"2.5"`]. Medido: "Data" aberto = 72×35 [PX 1.png 90×44 dev] |
| Badge de contagem no filtro ("Status 1") | **18×18** | 22 dev |
| Célula de dia do calendário | **32×30px** (40×38 dev), espaço entre células ≈5–6px (7 dev). Novo: `h/w:32px`, gap 2px | [PX 1.png x 457–496, 504–543…; y 221–258, 267–304…] |
| Painel do datepicker (1.png) | coluna de presets **184px** (x 205–434 dev), linhas de **42px** (52,5 dev), padding esquerdo do texto ~12px; abas de tipo **42×23px** (52×29 dev) com gap ~8px; área do calendário com 2 meses lado a lado e ~18px entre eles (22 dev) | [PX] |

---

## 5. Ícones

- **Biblioteca:** react-icons. Predominam Feather e Lucide (traço 2, cantos arredondados, 24-grid). Há também Material Design (relógio "Fi"?). Recomendação: **lucide-react** (contém os equivalentes de Feather).
- **Calendário (abas de tipo de data):** os quatro SVGs Lucide estão no bundle, em sequência:
  - `calendar-plus` (rect + `M16 19h6`, `M19 16v6`): **criado em** (aba ativa no 1.png)
  - `calendar-check` (`m9 16 2 2 4-4`): **ganho em**
  - `calendar-x` (`m14 14-4 4`, `m10 14 4 4`): **perdido em**
  - `calendar-clock` (círculo + `M17.5 17.5 16 16.3V14`): **agendado em**
  - Ordem confirmada: `tg=["created_at","won_at","lost_at","scheduled_at"]`, tooltips em `eg`. [BUNDLE + VIS crop_presets.png]

| Lugar | Ícone (equivalente Lucide) | Tamanho / cor |
|---|---|---|
| Busca (input e sidebar) | `search` | 16px, `#686D86` |
| Chevron dos filtros / acordeão | `chevron-down` (`m6 9 6 6 6-6`), `chevron-up` | 11–14px, `#7489A8` / `#9CA3AF` |
| Navegação do calendário | `chevron-left/right` | 12px, `fg.subtle` (legado `#CCCCCC`) |
| Atualizar | `refresh-cw` (dois arcos; no legado é o componente `jr` com prop `collapsed`) | 17px, `text-muted #686D86` |
| Exportar | `download` (`M21 15v4…`, `polyline 7 10 12 15 17 10`) | 16px, `#686D86` (desabilitado `#BDBDBD`) |
| Configurações da origem | `settings` (engrenagem) | 16px |
| Ajuda (toolbar) | `help-circle` dentro de quadrado arredondado | 16px |
| Ajuda do topo | "?" roxo `#7C00FF` sobre círculo `#F2EDFF` | |
| Telefone (card) | `phone` (Feather) | 12px, `#8C89B0` |
| Chat (card) | `message-circle` | 12px |
| E-mail (card) | `mail` | 12px |
| Atividades | `check-circle` | 12px |
| Idade na etapa | `clock` | 12px |
| WhatsApp | logo verde com mini-selo de canal azul | ~14px |
| Duplo check (lida/entregue) | `check-check` | 14px, `#686D86` |
| Mensagem de voz | `mic` | |
| Documento | `file-text` | |
| Transferência ("O status foi alterado") | `arrow-left-right` / `repeat` | |
| Kebab | `more-vertical` | 18px (`Cc,{size:18}`), `#686D86` |
| Mais / adicionar | `plus` | |
| Sidebar: ORIGENS | ícone de 2 quadrados + 2 círculos (tipo `layout-grid`) | |
| Sidebar: VISUALIZAÇÕES | moldura tracejada com coluna | |
| Sidebar: RECENTES | `clock` | |
| Menu "Mais" no topo | 4 pontos (grid 2×2) | |
| Aura | estrela de 4 pontas ("sparkle") | |
| Menus de contexto (01-032/033) | Configurações → `settings`; Selecionar origens → `list-checks`; Customizar → `pencil`; Ocultar da barra lateral → `eye-off`; Arquivar → `archive`; Excluir → `trash-2` (vermelho) | [VIS] |

---

## 6. Inventário de componentes (specs)

### 6.1 Menu do topo
- Altura 44px, fundo branco, borda inferior 1px `#E8E4F5`.
- Logo à esquerda (~22px da borda).
- Itens com texto 14px/400 `#2F2C5D` e padding horizontal ~10px.
- **Item ativo:** bg `#F8F6FD` em toda a altura, mesmo peso e cor (sem sublinhado nem barra).
- Hover (tokens): `clint.navHover rgba(0,0,0,.03)` e texto `clint.navHoverFg` (purple.600).
- Badge vermelho no item: pílula `#FF4B4C`, texto branco ~9px bold, ≈28×16 ("99+").
- Item "Mais" com ícone de 4 pontos à esquerda.
- À direita: sparkle (`#4B5563`) · ajuda (círculo `#F2EDFF`, "?" `#7C00FF`, badge `#FF4B4C` com número) · **"Novo +"** (bg `#597EFF`, ~53×22, raio ~5, texto branco ~11px/500) · avatar 28px quadrado arredondado + caret ▾ `#2F2C5D`.

### 6.2 Botão "Negócio +" (primário)
- bg `#6C19DE`, texto branco 12–13px/600, ícone "+" à direita, ≈95×31, raio ≈6px.
- Hover `purple.700 #5B16BC`; `_expanded` `purple.solid/90`.
- Recipe: tamanhos `sm` h 32 / px 14 / gap 8; `md` h 36 / px 16 [BUNDLE `qnt`].
- Base: `fontWeight:"semibold"` (= 500), `lineHeight:1.2`, `borderRadius:"l3"`.

### 6.3 Gatilho de filtro (Data / Campos / Tags / Dono / Status / Mais filtros)
- **Normal:** fundo transparente, texto `#3E3A6F` 11,2px/500, chevron 11px `#7489A8` à direita, gap 10px, h 36, px 10, raio 6.
- **Hover:** bg `#EFF3FF` (legado) / `clint.navHover` (novo), texto `clint.primary`.
- **Aberto:** bg `#2F2C5D` (fg), texto e chevron brancos; o chevron gira (`collapsed`) [BUNDLE + PX 1.png].
- **Com contagem:** badge redondo 18px `#E0E0E0` com número 10px `#2F2C5D` entre o rótulo e o chevron ("Status 1") [PX 2.png].
- **Com valor (novo):** "Tipo: valor" e um "x" de limpar (14px) antes do chevron.

### 6.4 Input de busca (legado)
- 109×32, bg `#F6F8FF`, sem borda visível, ícone de lupa 16px `#686D86` à direita, raio ~4–6px.
- Combobox react-widgets.
- Itens do resultado: linha 1 em maiúsculas (empresa + "em <etapa>" `text-blue-gray`) 80% h5/500 `text-muted`; linha 2 com o nome em 90% h5 `c-dark`.

### 6.5 Popover / dropdown
- **Menu Chakra:** `bg.panel` branco, 1px `border` (`#EAEEFF`), raio `l2` 4px, sombra `lg`, padding 4px.
  - Itens 11px/400, minH 34, px 12, gap 8, raio `l1`.
  - Item em destaque: bg `purple.subtle` e texto `purple.fg`.
  - Separador: 1px `bg.muted`.
  - Animação: slide-fade-in rápida [BUNDLE `Qrt`].
- **Menus de contexto 01-032/033 [VIS]:** largura ~215px; itens ~36px com ícone 14px + texto ~12px `#2F2C5D`; divisória antes de "Arquivar"; "Excluir" em vermelho com ícone vermelho; raio ~8, sombra suave.
- **Popover:** borda 1px `border`, raio `l3`, sombra `lg`, padding por tamanho (xs 12 / sm 16 / md 20 / lg 24), largura padrão `sizes.xs` 320px [BUNDLE `rot`].
- **Painel de filtros novo:** raio xl 12px, borda 1px, sombra `lg`, padding 12px.

### 6.6 Seletor de período (filtro "Data", `1.png`)
- Popover ancorado abaixo do botão (o botão fica "aberto", em navy). Painel branco ~734px de largura, raio ~8, sombra `lg`.
- **Coluna esquerda (184px)**, com borda direita 1px `#E8E4F5`:
  - No topo, 4 **abas de tipo de data** (42×23, gap ~8, padding do bloco ~12): ativa com bg `#3E3A6F` e ícone branco; inativas com bg `#EFF3FF` e ícone `#3E3A6F`. Abaixo, borda 1px `#EBEBEB`.
  - Lista de **presets** (Hoje, Ontem, Essa semana, Semana passada, Esse mês, Mês passado, Esse ano), linhas de 42px, texto 0,7rem/500 `#3E3A6F`, padding esquerdo 12px, divisórias 1px `#EBEBEB`. Hover/ativo com texto `#597EFF` (legado). Novo: bg `purple.subtle` e texto `purple.fg`, peso 600.
- **Área direita:** **2 meses** lado a lado (~18px entre eles).
  - Cabeçalho: chevrons cinza nas pontas (`#CCCCCC`) e título "outubro 2026" ~14px/500 `#2F2C5D` minúsculo, centralizado.
  - Dias da semana DOM…SÁB 0,7rem/600 uppercase.
  - **Células 32×30** com gap ~5px, bg **`#F7F7FE`**, raio ~4–6px, número 0,8rem/500 **`#6C19DE`**. Dias de outros meses aparecem iguais no print.
  - Seleção, código novo: início/fim com bg `purple.solid` e texto branco; intervalo com bg `purple.subtle` e texto `purple.fg`; hover idem; desabilitado com opacidade .3.
- Opções do componente novo: `variant:"double"|"single"`, `enableTime` (inputs HH:mm), `presets`, `sidebarHeader` (as abas), rodapé Cancelar/Aplicar (ghost sm + solid sm).

### 6.7 Select / input / checkbox
- **Select legado (react-select):** `minHeight:45px`, bg `#EFF3FF`, borda `#F8FAFF` (praticamente invisível). Nos formulários do modal 01-013 os campos têm bg `#EFF3FF`, altura ~43–45px, raio ~4px, texto 13–14px `#2F2C5D` e chevron `#B0B6C8` [PX 01-013 (700,375/500)].
- **Input Chakra novo** (`variant:"subtle"` padrão):
  - bg `form.control.bg` (lilac.500 a 5%), borda 1px `form.control.border` `#F4F7FF`, raio `l2` 4px, h 32 (`sm`), peso 400.
  - Placeholder `#9CA3AF`.
  - Foco: borda `purple.600` e bg branco; transição "all .3s ease".
- **Checkbox:** borda `#D5DCFF` (lilac.300), bg `#DFE2FD`; marcado com bg `purple.solid`, borda `purple.solid` e check branco; raio `l1` 2px; tamanhos sm 16 / md 20. No detalhe, as caixas "Concluído" aparecem como quadrados ~20px bg `#DFE2FD` arredondados [PX 01-011].
- **Switch:** trilho `gray.300`, marcado `purple.600`, polegar branco.

### 6.8 Linha de acordeão
- **Sidebar legada:** cabeçalho 48px, ícone 18px + rótulo 11px/600 uppercase `#2F2C5D` + chevron 14px à direita (`#9CA3AF`); divisória 1px `#E8E4F5`.
- **Acordeão Chakra:** `itemTrigger` gap 12, `fontWeight:"medium"`; indicador gira 180° (`fg.subtle`); variante `outline` com `borderBottomWidth:1px`; padding md 16×8.
- **Popover de filtros novo (01-018):** linhas ~56px com ícone 14px, texto 14px, chevron à direita e divisória 1px `#E4E4E9`.

### 6.9 Chip/tag
- Pílula ~14–15px de altura, raio full, fundo e cor da paleta da seção 3.4, texto ~10px, `pl:2 pr:2`, `maxW 72`.
- No card ficam acima do título, em linha com gap ~6px; muitas tags viram "+N" (`Os,{tags,mode:"tooltip"}`).

### 6.10 Cabeçalho da coluna
- **Linha 1:** título 14px/500 `#2F2C5D`, truncado. Tooltip com a descrição da etapa.
- **Linha 2:** total "R$0" 12px.
- **À direita**, verticalmente centralizado nas 2 linhas: círculo de contagem 28px (legado: bg `#E8E4F5`, número 10px/600 preto; novo: 20px com bg `purple.muted` e número `purple.fg` bold, "+100K" quando passa do limite) + kebab 18px `#686D86` com menu "Selecionar todos..." / "Selecionar X negócios".
- Padding ≈12px à esquerda, 16px no topo; espaço até o 1º card ≈26px.
- Estados (novo): `is-card-over` com contorno 2px `border.muted`; `is-dragging` com opacidade .4; `is-column-over` com bg `purple.muted` e contorno `purple.solid`.

### 6.11 Card do kanban (regiões, de cima para baixo)
1. **Container:** 236px, branco, raio ~10, sem borda nem sombra visíveis no legado. Novo: borda 1px transparente e sombra `0 1px 2px rgba(0,0,0,.03)`; hover da recipe `kanban` com borda `purple.200` e sombra `figma.purple`.
2. **Cabeçalho** (p 8, pb 4, minH 51):
   - Opcional: linha de chips e/ou empresa em maiúsculas (h6 500 `c-dark`).
   - Título do negócio 13px/500 `#2F2C5D`, lh 15, `mt-2 mb-1`, 1 linha truncada.
   - À direita: foto do contato **28×28** (quadrado arredondado ~4px para foto; círculo `#DFE5E7` para o avatar padrão).
3. **Caixa da última mensagem:** margem 8px, bg `#EFF6FF`, borda 1px `#E3EBFF`, raio ~6px, altura ~34px, conteúdo em linha:
   - ícone do canal (WhatsApp ~14px)
   - status (duplo check 14px `#686D86`, ou ícone de seta "transferido")
   - opcional: ícone de tipo (doc/mic)
   - texto truncado 11px `#686D86` (nome do remetente em 500)
   - mini-avatar 18px do atendente
   - data "23/09" ou hora "10:31" 11px `#8C90A4`
4. **Rodapé** (borda superior 1px `#E5E7EB`, px 10, py 6, minH 36):
   - Esquerda: avatar do dono 20px (iniciais em fundo Material 700, ou foto); ícones phone / chat / mail de 12px `#8C89B0` com 8px entre eles; valor "R$0" 11px/500 `#8C89B0`.
   - Direita: `check-circle` 12px + "0/3" 11px/400 · `clock` 12px + "5d" 11px.
   - Alerta de tempo na etapa: pílula amber (warning) ou red (critical) com raio 6 e texto 600.
5. **Selecionado** (bulk, novo): borda `blue.muted` e sombra `0 0 12px -2px blue.solid`.

### 6.12 "+ Adicionar negócio"
- Botão link de largura total sob os cards, "+" e texto 13px/400 `#3E3A6F`, centralizado, `py-1`; hover com fundo claro (`hover-bg-light`).
- Coluna vazia: o botão aparece logo abaixo do cabeçalho (~24px).

### 6.13 Botão flutuante de conversas
- Círculo de 50px, gradiente vertical `#D1A8F5`→`#8B5CFF`, ícone branco de balão com "…" (~24px).
- Badge "+9" `#FF4B4C` com texto branco ~10px/600 no canto superior direito.
- Fixo a ~16px da direita e da base.

### 6.14 Sidebar (cabeçalhos de seção e lista de origens)
- Largura 250px, branca, borda direita 1px `#E8E4F5`; botão circular de recolher (~22px, borda e ícone `#484671`) sobre a borda, no topo (~y 30px).
- **Seção ORIGENS:** cabeçalho 48px (ícone 2×2 + "ORIGENS" 11px/600 + lupa 16px `#686D86` + chevron-up `#9CA3AF`), divisória 1px `#E8E4F5`.
- **Itens de origem:** linha 34px, padding esquerdo ~16px, **quadrado colorido 20×20 com raio ~4px** contendo iniciais brancas (~8px bold) ou ícone Feather branco; texto 12–13px/400 `#2F2C5D` a ~10px do ícone. O item atual fica em **600**.
- **Grupo expandido (01-032):** linha do grupo com chevron à esquerda, ícone, nome em 600, e à direita "+" e kebab. Filhos indentados ~44px; o filho ativo tem bg lilás claro (≈`#F0F2FF`) e barra roxa de 3px à esquerda; hover de linha cinza muito claro.
- **VISUALIZAÇÕES / RECENTES:** cabeçalhos colapsáveis de 48px com chevron-down `#9CA3AF` e divisórias.

### 6.15 Tooltips
- **Padrão Chakra:** bg `purple.100`, texto `purple.600` 11px/500, `px:8px`, `py:4px`, raio `l2`, sombra `sm`, `maxW:340px`.
- **Legado "dark":** bg `#3E3A6F`, texto branco, sombra `#afafaf29 0 3px 6px`, com seta.

### 6.16 Detalhe do negócio (01-011) — extras
- **Abas:** texto ~15px, ativa em 600 `#2F2C5D` com **sublinhado 3px `#7C00FF`** com a largura da aba.
- **Stepper de etapas:** faixa bg `#F7F6FE`; etapa atual em círculo 32px `#6C19DE` com número branco e rótulo roxo 600; etapas futuras em círculos `#DFC1FF` com número branco e rótulo `#2F2C5D` 14px; linha de progresso `#A871EF`→`#DFC1FF`.
- **Links roxos** `#6C19DE` ("Próximas atividades", "Dias" e "365" em `#7C00FF`).
- **Ações do contato:** ícones 16px `#6C19DE`.

### 6.17 Modal de configuração (01-013)
- Modal grande, raio ~12, overlay escuro.
- Título 24px/400 `#2F2C5D`; abas com sublinhado `#7C00FF`.
- Menu lateral interno: bg `#F7F4FF`, raio ~12, itens 15px com ícones 16px cinza-lilás; o ativo em 600.
- Campos com bg `#EFF3FF`, h ~43–54.
- Rodapé: "Cancelar" (botão branco com borda) + "Salvar" (verde/mint).

---

## 7. Tokens sugeridos para o Tailwind 4 (`@theme`)

```css
@theme {
  --font-sans: Poppins, "Poppins Fallback", Inter, -apple-system, BlinkMacSystemFont, "Segoe UI", Helvetica, Arial, sans-serif;
  /* marca: trocar pelo hex da Escale, mantendo os papéis */
  --color-brand: #6C19DE;            /* purple.600 */
  --color-brand-hover: #5B16BC;      /* purple.700 */
  --color-brand-subtle: #F4F1FF;     /* purple.100 */
  --color-brand-muted: #E8E1FF;      /* purple.200 */
  --color-brand-vivid: #7C00FF;      /* sublinhado de aba e ícones de ajuda (legado) */
  --color-brand-nav-active: #F8F6FD;
  --color-brand-help-bg: #F2EDFF;
  --color-cal-day-bg: #F7F7FE;
  /* neutros da identidade */
  --color-fg: #2F2C5D;  --color-fg-2: #3E3A6F;  --color-fg-muted: #686D86;
  --color-fg-kanban: #8C89B0;  --color-fg-eyebrow: #828282;  --color-chevron: #7489A8;
  --color-border: #E8E4F5;  --color-border-gray: #E5E7EB;  --color-border-soft: #EBEBEB;
  --color-lane: #EFF3FF;  --color-msgbox: #EFF6FF;  --color-msgbox-border: #E3EBFF;
  --color-search-bg: #F6F8FF;  --color-filter-hover: #EFF3FF;  --color-count: #E8E4F5;  --color-badge-gray: #E0E0E0;
  --color-accent-blue: #597EFF;  --color-alert: #FF4B4C;
  --radius-l1: 2px; --radius-l2: 4px; --radius-l3: 6px; --radius-card: 10px; --radius-lane: 16px;
  --shadow-lg: 0 8px 16px rgb(17 24 39 / .10), 0 0 1px rgb(17 24 39 / .30);
}
```

---

## 8. Pendências e incertezas

- Os tamanhos de fonte da UI legada vêm de altura de maiúscula a 1,25×, com precisão de ±0,5–1px. A folha CSS legada (`react-ui-DcuPHkRx.css`) não está no dump. Se for possível baixá-la, dá para cravar `h5` e `h6` e as classes `c-dark` e `text-blue-gray`.
- Raios de coluna e card são estimativas pela curvatura (±2px).
- Os JPEGs dos menus (01-032/033/034) não permitem amostra de cor confiável; ali os valores são [VIS].
- O roxo `#7C00FF` convive com `#6C19DE` porque são gerações diferentes de CSS. Decidir se os dois viram a cor da Escale (recomendado) ou se o "vivo" vira um tom derivado.
