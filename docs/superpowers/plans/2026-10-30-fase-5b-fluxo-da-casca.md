# Fase 5B — O fluxo com a cara do editor da Clint · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão do plano da 5A: decisões, arquivos, interfaces, regras, medidas, textos e testes escritos aqui; o código restante é escrito na execução seguindo os moldes citados.

> **Itens do PRD:** C1–C14 e C17 de `docs/modulos/5-automacoes.md` (C15 e C16 ficam fora, como o PRD manda); linha 5B da seção 8; risco "fluxo e editor saírem do compasso" da seção 12.
> **Frente Automações** (5A → 5B → 5C; executa tudo, testa tudo uma vez, publica tudo uma vez). **Começa depois do merge da 5A.** Worktree nova `wt-5b` a partir de `escale-crm/main`. **Sem migration.** Um PR (`feat/fase-5b-fluxo-da-casca`).

**Goal:** com a casca ligada, abrir uma automação "no fluxo" (`/app/webhooks/automacoes/{id}` ou `/nova`) mostra o editor da Clint (07-013, 07-014, 07-016, 07-022, 07-025, 07-026, 07-027): cabeçalho de 56 px com status, nome, "Salvo há X", abas Editor/Insights, interruptor, Salvar e ⋮; canvas lilás da esquerda para a direita com nós brancos; paleta "Adicionar passo" à direita (78/344 px); painel do nó à esquerda com Cancelar e Salvar; modal "Ações". **A regra gravada é a mesma de hoje** (mesmo corpo na API) e o motor não muda.

**Architecture:**
- **Árvore nova da casca** em `components/escale/automacoes/fluxo/`. A página do designer olha o cookie `escale_menu` (como `app/app/campaigns/page.tsx`): com a casca desenha `FluxoDaCasca`; sem a casca, o `DesignerDeAutomacao` de hoje, intacto.
- **O desenho continua sendo o do motor.** O estado do fluxo (`useFluxo`) usa as funções puras de `lib/automation/desenho-da-regra.ts` só para **ler** (`desenhoDaRegra`, `desenhoDaTela`, `percorrer`, `inserirDepois`, `excluirCaixa`, `excluirLigacao`, `ligar`, `proximoId`, `validarDesenho`). O corpo enviado sai do mesmo `validarDesenho` que o designer de hoje usa, e as mesmas mutações (`useCreateAutomationRule`, `useUpdateAutomationRule` com `versao_lida`) gravam.
- **Só o que é de tela é novo:** a arrumação da esquerda para a direita (`organizarNaHorizontal`, no fork; o `organizar` vertical do motor fica para o original), o catálogo dos gatilhos agrupados por fonte, os itens da paleta e do modal "Ações", e os componentes.
- **Painel com rascunho:** o painel do nó edita uma cópia; "Salvar" do painel aplica a cópia no nó (o desenho fica com alterações não salvas); "Salvar" do cabeçalho grava a regra. É o arranjo da Clint (painel salva no rascunho, cabeçalho grava).
- **Formulários das ações reaproveitados:** as ações sem painel próprio usam o `ActionConfigForm` do original dentro de `data-escale-editor-de-automacao`, a marca que a 5A criou e que o `app/escale-tema.css` já veste com os campos da casca. O WhatsApp, o gatilho e as condições ganham painel próprio no visual da Clint.

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, React Query, `@xyflow/react` 12, Radix (Dialog, DropdownMenu, Popover, Tooltip), `lucide-react` 1.x pela `lib/ui/icons-da-casca.ts` (e o `WhatsappLogo` de `lib/ui/icons`), Vitest + Testing Library.

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega é do Claude, mas **nada desta frente vai para produção antes da 5C** (CLAUDE.md: executa tudo, testa tudo, publica tudo).
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` e `corepack pnpm eslint <arquivos>`. Rodada cheia fica para a bateria da frente. Sem `test:db` (não há migration).
- **Motor intacto:** zero mudanças em `lib/automation/**` (inclui `desenho-da-regra.ts`), `lib/event-log/**`, `app/api/v1/cron/**`, `lib/relogio/**`, `lib/schemas/webhooks.ts` e `app/api/v1/automation-rules/**`. A Task 9 confere com `git diff --stat escale-crm/main -- lib/automation lib/event-log app/api/v1/cron lib/relogio lib/schemas/webhooks.ts app/api/v1/automation-rules` (tem de sair vazio).
- **Mesmo corpo:** abrir uma regra no fluxo da casca e salvar sem mexer manda exatamente `trigger_event`, `trigger_config`, `conditions` e `actions` da regra gravada; montar a mesma regra pelo fluxo da casca e pelo designer de hoje gera o mesmo corpo (Task 2).
- **Arquivos do Rafael** só nos encaixes da seção 5, com poucas linhas e o comentário `// FORK ESCALE · Fase 5B: …`. Em arquivo compartilhado (`lib/i18n/dicionario.ts`, `app/escale-tema.css`, `app/globals.css`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Igual à Clint:** cada componente cita a ficha que o define (07-0NN). Nada de `<select>`, checkbox nativo ou controle do navegador (o `type="number"` dos dias usa o `CampoDeTexto` da casca com `inputMode="numeric"`). A conferência lado a lado com 07-013, 07-014, 07-016, 07-022, 07-025, 07-026 e 07-027 acontece **na bateria da frente** (regra 4 do CLAUDE.md). Fichas e capturas em `Escale IA OS/clint-documentacao/modulos/07-automacoes/`. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`): citar só o número da ficha.
- **Nada da Clint aparece sem funcionar** (PRD, seção 12): sem Publicar, histórico, Atraso, Randomizador, SMS, voz, Instagram, Agente de IA, "Novo grupo de condições", saída "Não corresponde", botões de resposta, "Selecionar blocos", colar, lápis de renomear passo. Nenhuma versão desabilitada deles.
- **Marca:** onde a Clint usa o roxo (Salvar, título e ícone de Condições, seção de IA, "+ Novo gatilho", cartão escolhido, foco de campo) entra `casca-marca`. O lilás do canvas e das arestas é neutro (PRD C5) e vira token próprio.
- **Formatos BR:** "Salvo há 5 minutos" pelo `tempoDesde` de `lib/escale/campanhas/apresentacao.ts`; dica com `dataHoraBr` de `lib/escale/negocio/arquivos.ts` no fuso da organização.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`. Onde a Clint tem texto, copia o da Clint (`material-do-codigo.md`, seções 3.3 a 3.9).
- **Original intacto:** sem a casca, `/app/webhooks/automacoes/[id]` é o designer de hoje, pixel por pixel; os testes e o e2e dele seguem verdes.
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`.** `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Árvore nova da casca; o designer de hoje fica intacto** sem a casca. O cookie decide na página, como em Campanhas | Regra "original intacto". Os dois gravam pelo mesmo `validarDesenho`, então não podem divergir no corpo |
| D2 | **Fluxo da esquerda para a direita** (07-013, 07-026): `organizarNaHorizontal` no fork. A fila fica numa linha (`y = 0`, `x` andando 352 + 120 px); o que está fora da fila vai para uma linha embaixo. A posição continua **não gravada**: ao abrir, o fluxo se arruma sozinho (igual a hoje) | O `organizar` do motor é vertical e é usado pelo original; mudá-lo mudaria o original |
| D3 | **Um "Salvar"** (cor da marca) no lugar de Salvar + Publicar: desabilitado sem alterações (07-013), "Salvando…" enquanto grava; grava a regra (PATCH com `versao_lida`, ou POST na nova). **Interruptor** ao lado, só com a automação já criada. Sem histórico de versões (C3, C16) | O motor não tem rascunho nem versões |
| D4 | **Cabeçalho (C1, 07-013):** voltar; bolinha (verde com halo = ativa; cinza = pausada ou nova); nome; lápis; selo. O selo é **"Ativa"** (verde) ou **"Pausada"** (cinza); com alterações não salvas vira **"Alterações não salvas"** (amarelo), como o selo "Alterações não publicadas" da Clint; na nova, **"Nova"** (cinza). Embaixo, "Salvo há X" (`updated_at`, atualiza a cada minuto, dica com data e hora BR); na nova, nada. **O lápis renomeia no rascunho** (abre "Renomear automação" da 5A; o nome novo marca alterações e vai no próximo Salvar) | Gravar o nome na hora mudaria o `updated_at` e o próximo Salvar daria 409 consigo mesmo; e na automação nova não há onde gravar |
| D5 | **Abas Editor e Insights (C2):** o controle já nasce com as duas. Na 5B "Insights" fica desabilitada (a prop `insightsDisponivel` vem `false`); a 5C liga. Como na Clint (E2), a automação nova também a deixa desabilitada | A 5C entra na mesma frente e nada publica antes dela; assim a 5C não mexe no cabeçalho |
| D6 | **Menu ⋮ do cabeçalho (C4, 07-016):** "Editar no editor" (`SquarePen`), "Organizar" (`LayoutGrid`), "Duplicar automação" (`Copy`), "Excluir" (`Trash2`, vermelho), com divisória entre todos (a captura vence o código). Na automação nova: só "Organizar". "Duplicar" fica desabilitado com alterações não salvas (dica "Salve antes de duplicar.") | A cópia é da versão gravada; duplicar com o desenho sujo copiaria outra coisa sem avisar |
| D7 | **Um gatilho por automação (C6):** o painel "Iniciar automação quando..." mostra **um** cartão; o botão tracejado diz **"+ Novo gatilho"** sem gatilho e **"Trocar gatilho"** com gatilho. **Sem ⋮ no cartão** (07-018 fica de fora): excluir o único gatilho deixaria a automação sem início. Trocar por outro evento com condições preenchidas pede confirmação, porque as condições são apagadas (a regra de hoje: cada gatilho tem os seus campos) | O motor tem um gatilho; a troca limpa as condições hoje também |
| D8 | **Escolha do gatilho (C7, 07-019/07-022/07-024):** painel largo (800 px), fontes à esquerda (200 px) e opções à direita. As 5 fontes e os 22 gatilhos, com título e descrição, estão na seção 1.2. Instagram, Atendimento, CTWA ficam de fora | PRD C7 |
| D9 | **Paleta (C8, 07-014/07-015):** 7 itens em 4 seções (seção 1.3). "Gatilho" seleciona o nó do gatilho e abre o painel (há um só). "Ações" abre o modal. "Condições" com a caixa já no desenho seleciona a caixa e avisa (como hoje). Clique põe o passo logo depois do nó selecionado; arrastar solta onde cair e a ligação é feita à mão (como hoje). A trava de laço (`acoesQueFechamLaco`) desabilita o item com a mensagem de hoje | PRD C8 e o comportamento de hoje |
| D10 | **Modal "Ações" (C9):** abas **CRM**, **Contatos** e **Integrações** (Conversas some), com título, descrição e cartões (seção 1.3). Escolher um cartão e "Realizar ação" cria **uma caixa por ação**: o motor tem uma ação por passo. O nó mostra "Ações" em letra miúda e o nome da ação embaixo | PRD C9; o desenho tem de continuar 1 caixa = 1 ação para o corpo não mudar |
| D11 | **Nó e painel de Condições (C10, 07-025):** um grupo só; "Corresponde a **todas** as condições" é texto fixo (sem trocar para "qualquer"); cada condição num bloco cinza; botão "+" quadrado no canto do grupo; sem "+ Novo grupo de condições" e sem saída "Não corresponde a nenhuma condição". No nó, uma linha cinza no rodapé: "Se não corresponder, a automação para aqui." (texto nosso). O "usar campo avançado" do original continua (sem ele, condição de campo personalizado não se edita) | O motor só tem E e não ramifica |
| D12 | **Nó e painel de WhatsApp (C11, 07-027):** "Selecione o dispositivo WhatsApp" + "Configure sua mensagem" com a caixa do texto e o seletor de variáveis. **Sem** os acordeões "Fora da janela"/"Dentro da janela", sem modelo e sem "+ Adicionar botão": a ação manda texto livre e o motor respeita a janela e o limite do número. O aviso de hoje sobre a janela fica embaixo da caixa | A ação `send_whatsapp_message` só tem `channel_session_id` e `template` |
| D13 | **Painel do nó (C12):** à esquerda, por cima do canvas, **400 px** (as capturas 07-013 e 07-025 medem 400; o código diz 480: a captura vence), cabeçalho de 49 px tingido pela cor do tipo, corpo com rolagem, rodapé fixo "Cancelar" e "Salvar". Trocar de nó, clicar no canvas ou fechar com o rascunho mexido abre "Configuração do gatilho não salva" (gatilho) ou "Configuração do passo não salva" (os outros), com "Descartar e continuar" (E17) | Clint |
| D14 | **Barra do nó (C14, E11):** ao passar o mouse (ou com o nó selecionado), 45 px acima e à direita: "Duplicar passo" (`Copy`) e "Remover passo" (`Trash2`). No gatilho não aparece; em Condições só "Remover" (a caixa é uma só). Remover pede "Tem certeza que deseja remover esse bloco?"; Delete/Backspace com o nó selecionado faz o mesmo. Duplicar põe a cópia logo depois, já ligada. Nó com problema depois de um Salvar recusado: borda `casca-alerta` e o primeiro problema na dica | Clint |
| D15 | **Arestas (C5, E9):** curva com seta na chegada, 2 px na cor lilás; ao passar o mouse, 4,5 px e o cursor de lixeira da Clint; **clicar remove a ligação** sem confirmação (nada grava antes do Salvar, e a caixa solta é apontada no Salvar, como hoje) | Clint |
| D16 | **Controles do canvas (C13):** "+", "−", enquadrar e travar (os `Controls` do React Flow com `showInteractive`), canto inferior esquerdo; zoom de 0,25 a 1,15 (E9). Sem "Selecionar blocos" e sem colar | PRD C13 |
| D17 | **Sair com alterações (C17, E7):** "Voltar" e "Editar no editor" com o desenho sujo abrem "Alterações não salvas" / "Você está saindo do editor da automação" / "Alterações não salvas serão perdidas se você continuar sem salvar." com "Cancelar" e "Sair sem salvar". Fechar ou recarregar a aba: o aviso do navegador (`beforeunload`). Os links do menu do topo **não** são interceptados (o App Router não oferece isso); fica registrado | Clint, até onde o Next deixa |
| D18 | **Cores por tipo** (material, seção 6, e as capturas): gatilho azul-marinho, WhatsApp verde, E-mail azul, Ações laranja; **Condições e IA (o roxo da Clint) → `casca-marca`**. Tokens novos na seção 4.12. O nó selecionado ganha a borda da cor do tipo (as capturas mostram verde no WhatsApp e lilás em Condições; o "azul" do código só vale para o gatilho) | Regra da marca do CLAUDE.md |
| D19 | **Toasts do Salvar:** sucesso "Automação salva com sucesso!" (E25); na nova, também "Ela nasce pausada: ligue quando estiver pronta.". Recusa: sem gatilho ou sem evento → "É necessário configurar o gatilho para salvar a automação."; sem ação → "Para salvar a automação, conecte pelo menos uma ação ao gatilho."; outro problema → o de hoje, "A automação não foi salva. Corrija os pontos marcados nas caixas." | Textos da Clint onde o caso é o mesmo |
| D20 | **Os e2e do designer seguem provando o original:** `tests/e2e/designer-de-automacoes.spec.ts` (e qualquer outro e2e que abra `/app/webhooks/automacoes/…`) ganha o cookie `escale_menu=lateral` no contexto | A casca é o padrão desde 24/10; sem o cookie o e2e cairia na tela nova |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/escale/automacoes/fluxo/gatilhos.ts` | Fontes, os 22 gatilhos com título/descrição/ícone, `fonteDoEvento`, `opcaoDoEvento`, `precisaDeFormulario` |
| `lib/escale/automacoes/fluxo/paleta.ts` | Itens e seções da paleta, `filtrarPaleta`, abas do modal "Ações", `tipoDoNo` |
| `lib/escale/automacoes/fluxo/layout.ts` | `LARGURA_DO_NO`, `organizarNaHorizontal` |
| `lib/escale/automacoes/fluxo/estado.ts` | Puras do estado: `retratoDoFluxo`, `regraGravadaDe`, `toastDaRecusa`, `copiaDaCaixa` |
| `components/escale/automacoes/fluxo/useFluxo.ts` | O estado do fluxo e as ações (seção 3) |
| `components/escale/automacoes/fluxo/FluxoDaCasca.tsx` | Lê a regra, carregando (E28), não encontrada, `ReactFlowProvider` |
| `components/escale/automacoes/fluxo/TelaDoFluxo.tsx` | Monta cabeçalho, painel, canvas, paleta, janelas |
| `components/escale/automacoes/fluxo/CabecalhoDoFluxo.tsx` | 56 px: voltar, status, nome, selo, "Salvo há", abas, interruptor, Salvar, ⋮ (07-013) |
| `components/escale/automacoes/fluxo/AbasDoFluxo.tsx` | Controle segmentado Editor/Insights (07-013) |
| `components/escale/automacoes/fluxo/MenuDoFluxo.tsx` | O ⋮ do cabeçalho (07-016, D6) |
| `components/escale/automacoes/fluxo/CanvasDoFluxo.tsx` | `ReactFlow`, controles, arrastar e soltar, Delete |
| `components/escale/automacoes/fluxo/NoDoFluxo.tsx` | O cartão do nó (3 tipos de caixa), alças, borda de seleção/problema |
| `components/escale/automacoes/fluxo/CorposDoNo.tsx` | Corpo do gatilho, das condições, do WhatsApp e das outras ações |
| `components/escale/automacoes/fluxo/BarraDoNo.tsx` | Duplicar e remover no hover (E11) |
| `components/escale/automacoes/fluxo/visual-do-fluxo.ts` | Ícone, rótulo miúdo e classes de cor por tipo de nó; ícones dos gatilhos e das ações |
| `components/escale/automacoes/fluxo/PaletaDoFluxo.tsx` | 78/344 px, busca, seções (07-014, 07-015) |
| `components/escale/automacoes/fluxo/JanelaDeAcoes.tsx` | Modal "Ações" com abas (D10) |
| `components/escale/automacoes/fluxo/painel/PainelDoNo.tsx` | Casca do painel: cabeçalho tingido, corpo, rodapé, largura 400/800 |
| `components/escale/automacoes/fluxo/painel/PainelDoGatilho.tsx` | Cartão do gatilho + botão tracejado + formulário (07-013) |
| `components/escale/automacoes/fluxo/painel/EscolhaDoGatilho.tsx` | Fontes e opções, 800 px (07-019, 07-022, 07-024) |
| `components/escale/automacoes/fluxo/painel/FormularioDoGatilho.tsx` | Fonte do formulário, data do funil, tempo (campos da casca) |
| `components/escale/automacoes/fluxo/painel/PainelDasCondicoes.tsx` | Grupo único com blocos (07-025) |
| `components/escale/automacoes/fluxo/painel/PainelDaMensagem.tsx` | WhatsApp (07-027, D12) |
| `components/escale/automacoes/fluxo/painel/PainelDaAcao.tsx` | As outras ações (`ActionConfigForm`) e "A IA decide" só de leitura |
| Encaixes (seção 5) | `app/app/webhooks/automacoes/[id]/page.tsx`, `…/_components/CaixaDaAutomacao.tsx`, `app/escale-tema.css`, `app/globals.css`, `lib/i18n/dicionario.ts`, `lib/ui/icons-da-casca.ts`, `tests/e2e/designer-de-automacoes.spec.ts` |
| `tests/unit/escale-fluxo-regras.test.ts`, `-estado.test.tsx`, `-mesmo-corpo.test.ts`, `-nos.test.tsx`, `-paleta.test.tsx`, `-paineis.test.tsx`, `-cabecalho.test.tsx`, `-pagina.test.tsx` | Unidade |

---

## 1. Regras puras

### 1.1 Layout (`lib/escale/automacoes/fluxo/layout.ts`)

```ts
import { percorrer, type Desenho } from "@/lib/automation/desenho-da-regra";

/** 07-013: o nó da Clint mede ~352 px de largura a zoom 1. */
export const LARGURA_DO_NO = 352;
export const ESPACO_ENTRE_NOS = 120;
export const ALTURA_ESTIMADA_DO_NO = 180;
const ESPACO_ATE_AS_SOLTAS = 160;

/**
 * A fila da esquerda para a direita, na ordem em que roda (07-026). O que está
 * fora da fila vai para uma linha embaixo, para ninguém confundir com a ordem.
 * `alturas` vem do DOM quando o canvas já mediu; sem ela, a estimativa.
 */
export function organizarNaHorizontal(desenho: Desenho, alturas?: ReadonlyMap<string, number>): Desenho {
  const { fila } = percorrer(desenho);
  const altura = (id: string) => alturas?.get(id) ?? ALTURA_ESTIMADA_DO_NO;
  const passo = LARGURA_DO_NO + ESPACO_ENTRE_NOS;
  const posicoes = new Map<string, { x: number; y: number }>(fila.map((c, i) => [c.id, { x: i * passo, y: 0 }]));
  const ySoltas = Math.max(0, ...fila.map((c) => altura(c.id))) + ESPACO_ATE_AS_SOLTAS;
  let x = 0;
  for (const c of desenho.caixas) {
    if (posicoes.has(c.id)) continue;
    posicoes.set(c.id, { x, y: ySoltas });
    x += passo;
  }
  return { caixas: desenho.caixas.map((c) => ({ ...c, position: posicoes.get(c.id) ?? c.position })), ligacoes: desenho.ligacoes };
}
```

### 1.2 Gatilhos (`lib/escale/automacoes/fluxo/gatilhos.ts`)

```ts
import type { TriggerEvent } from "@/app/app/webhooks/_components/labels";

export type FonteDoGatilho = "negocios" | "contatos" | "mensagens" | "agenda" | "datas";
/** Chaves de ícone (o mapa para componente fica em `visual-do-fluxo.ts`; aqui não entra React). */
export type IconeDoGatilho =
  | "maleta" | "trofeu" | "fechado" | "reaberto" | "dono" | "relogio" | "tag" | "telefone"
  | "mensagem" | "falha" | "silencio" | "agenda" | "confirmado" | "remarcado" | "cancelado"
  | "compareceu" | "faltou" | "data" | "aniversario";

export interface OpcaoDeGatilho { evento: TriggerEvent; titulo: string; descricao: string; icone: IconeDoGatilho }
export interface FonteDosGatilhos { fonte: FonteDoGatilho; rotulo: string; opcoes: readonly OpcaoDeGatilho[] }

export const FONTES_DOS_GATILHOS: readonly FonteDosGatilhos[];
/** Fonte do evento; evento desconhecido (ou vazio) → "negocios", a primeira. */
export function fonteDoEvento(evento: string): FonteDoGatilho;
export function opcaoDoEvento(evento: string): OpcaoDeGatilho | null;
/** Os que têm configuração no gatilho (abre o formulário depois de escolher). */
export function precisaDeFormulario(evento: string): boolean; // lead.created, lead.date_field_due, lead.silent_for, lead.stage_stale
```

O catálogo, **na ordem** (títulos com aspas são da Clint, material 3.5; os outros, nossos no mesmo molde):

| Fonte (rótulo) | evento | título | descrição | ícone |
|---|---|---|---|---|
| Negócios | `lead.created` | Negócio criado pelo formulário | Um negócio entrou por um formulário (webhook) | maleta |
| | `lead.stage_changed` | "Negócio entrou na etapa" | Um negócio mudou de etapa no funil | maleta |
| | `lead.won` | Negócio ganho | Um negócio foi marcado como ganho | trofeu |
| | `lead.lost` | Negócio perdido | Um negócio foi marcado como perdido | fechado |
| | `lead.reopened` | Negócio reaberto | Um negócio encerrado foi reaberto | reaberto |
| | `lead.assigned` | "Dono do negócio" | Um negócio teve o dono alterado | dono |
| | `lead.stage_stale` | "Tempo na etapa" | Um negócio completou um determinado tempo numa etapa | relogio |
| | `lead.tag_added` | Tag adicionada ao negócio | Uma tag foi adicionada a um negócio | tag |
| Contatos | `contact.tag_added` | "Tag adicionada ao contato" | "Uma tag foi adicionada a um contato" | tag |
| | `contact.phone_added` | Telefone adicionado ao contato | Um contato sem telefone ganhou um número | telefone |
| Mensagens | `message.received` | "Contato envia uma mensagem" | "O contato envia uma mensagem para o WhatsApp" | mensagem |
| | `message.failed` | Mensagem não entregue | Uma mensagem enviada não foi entregue | falha |
| | `lead.silent_for` | Tempo sem mensagem | Uma conversa ficou um determinado tempo sem mensagem | silencio |
| Agenda | `appointment.created` | Horário marcado | Um horário foi marcado na agenda | agenda |
| | `appointment.confirmed` | Horário confirmado | Um horário pendente foi confirmado | confirmado |
| | `appointment.rescheduled` | Horário remarcado | Um horário foi remarcado | remarcado |
| | `appointment.cancelled` | Horário cancelado | Um horário foi cancelado | cancelado |
| | `appointment.completed` | Compareceu ao compromisso | A equipe marcou que o contato compareceu | compareceu |
| | `appointment.no_show` | Faltou ao compromisso | A equipe marcou que o contato faltou | faltou |
| Datas | `lead.date_field_due` | "Gatilho baseado em data" | Dispara N dias antes ou depois de uma data gravada num campo do funil | data |
| | `contact.birthday` | Aniversário do contato | Dispara no dia do aniversário do contato | aniversario |

### 1.3 Paleta e "Ações" (`lib/escale/automacoes/fluxo/paleta.ts`)

```ts
import type { ActionType } from "@/app/app/webhooks/_components/labels";

export type SecaoDaPaleta = "comecar" | "canais" | "logica" | "ia";
export type PassoDaPaleta =
  | "gatilho" | "send_whatsapp_message" | "send_email" | "acoes" | "condicoes" | "send_ai_message" | "start_message_flow";
export interface ItemDaPaleta { passo: PassoDaPaleta; secao: SecaoDaPaleta; titulo: string; descricao: string }

export const ROTULO_DA_SECAO: Record<SecaoDaPaleta, string> = {
  comecar: "Começar", canais: "Canais", logica: "Lógica", ia: "Inteligência Artificial",
};
export const ITENS_DA_PALETA: readonly ItemDaPaleta[] = [
  { passo: "gatilho", secao: "comecar", titulo: "Gatilho", descricao: "Quando a automação inicia" },
  { passo: "send_whatsapp_message", secao: "canais", titulo: "WhatsApp", descricao: "Enviar mensagem no WhatsApp" },
  { passo: "send_email", secao: "canais", titulo: "E-mail", descricao: "Enviar e-mail" },
  { passo: "acoes", secao: "logica", titulo: "Ações", descricao: "Mover etapa, tags e tarefas" },
  { passo: "condicoes", secao: "logica", titulo: "Condições", descricao: "Filtrar quem segue no fluxo" },
  { passo: "send_ai_message", secao: "ia", titulo: "Mensagem pela IA", descricao: "A IA escreve e envia a mensagem" },
  { passo: "start_message_flow", secao: "ia", titulo: "Iniciar follow-up", descricao: "Começa um fluxo de follow-up" },
];
/** Busca sem acento e sem caixa sobre título e descrição JÁ traduzidos; vazia devolve tudo. */
export function filtrarPaleta(busca: string, t: (s: string) => string): ItemDaPaleta[];

export type AbaDasAcoes = "crm" | "contatos" | "integracoes";
export interface CartaoDeAcao { tipo: ActionType; titulo: string; descricao: string }
export const ABAS_DAS_ACOES: readonly { aba: AbaDasAcoes; titulo: string; descricao: string; cartoes: readonly CartaoDeAcao[] }[] = [
  { aba: "crm", titulo: "CRM", descricao: "Gerencie as informações relacionadas ao CRM", cartoes: [
    { tipo: "create_or_move_lead", titulo: "Criar ou mover negócio", descricao: "Cria o negócio ou move para uma etapa do funil" },
    { tipo: "assign_owner", titulo: "Atribuir dono do negócio", descricao: "Defina quem atende o negócio" },
    { tipo: "create_task", titulo: "Tarefa interna", descricao: "Cria uma tarefa para a equipe, sem mensagem ao cliente" },
    { tipo: "apply_task_plan", titulo: "Plano de tarefas", descricao: "Aplica uma sequência de tarefas salva" },
  ] },
  { aba: "contatos", titulo: "Contatos", descricao: "Gerencie as informações relacionadas ao contato", cartoes: [
    { tipo: "add_tag", titulo: "Adicionar tag", descricao: "Inclua tags aos seus contatos para facilitar a organização" },
  ] },
  { aba: "integracoes", titulo: "Integrações", descricao: "Gerencie as informações relacionadas a integrações", cartoes: [
    { tipo: "call_webhook", titulo: "Enviar Webhook", descricao: "Envie um Webhook quando uma determinada ação acontecer" },
  ] },
];

export type TipoDoNo = "gatilho" | "condicoes" | "whatsapp" | "email" | "acoes" | "ia";
/** send_whatsapp_message → whatsapp; send_email → email; send_ai_message, start_message_flow, ai_decide → ia; o resto (e o desconhecido) → acoes. */
export function tipoDoNo(dados: { kind: "gatilho" } | { kind: "condicoes" } | { kind: "acao"; acao: { type: string } }): TipoDoNo;
```

`ABAS_DAS_ACOES` + os itens de ação da paleta cobrem os 10 `ActionType` exatamente uma vez (teste).

### 1.4 Estado puro (`lib/escale/automacoes/fluxo/estado.ts`)

```ts
import type { AutomationRuleRow } from "@/hooks/webhooks/useAutomationRules";
import type { CaixaDoDesenho, Desenho, ProblemaDoDesenho, RegraGravada } from "@/lib/automation/desenho-da-regra";

/** A "versão salva" para o aviso de alterações: nome, dados e ligações, nunca posição (o mesmo do designer de hoje). */
export function retratoDoFluxo(nome: string, desenho: Desenho): string;
export function regraGravadaDe(regra: AutomationRuleRow | null): RegraGravada | null;
/** D19: a chave do toast da recusa. */
export function toastDaRecusa(problemas: readonly ProblemaDoDesenho[]): string;
/** Cópia profunda da caixa de ação com outro id, sem `problemas` (D14). */
export function copiaDaCaixa(caixa: CaixaDoDesenho, novoId: string): CaixaDoDesenho;
```

`toastDaRecusa`: se algum problema tem a mensagem `PROBLEMAS.semGatilho` ou `PROBLEMAS.semEvento` → `"É necessário configurar o gatilho para salvar a automação."`; senão, se algum é `PROBLEMAS.semAcao` → `"Para salvar a automação, conecte pelo menos uma ação ao gatilho."`; senão `"A automação não foi salva. Corrija os pontos marcados nas caixas."`.

---

## 2. Visual por tipo (`components/escale/automacoes/fluxo/visual-do-fluxo.ts`)

```ts
export interface VisualDoNo {
  icone: ComponentType<{ size?: number; className?: string; "aria-hidden"?: boolean }>;
  /** Letra miúda em cima do título ("WhatsApp", "Ações"); null no gatilho e nas condições, que têm título grande. */
  rotulo: string | null;
  texto: string;   // classe da cor do título e do ícone
  borda: string;   // classe da borda do nó selecionado
  fundo: string;   // fundo suave: quadrado do ícone na paleta e cabeçalho do painel
}
export const VISUAL_DO_NO: Record<TipoDoNo, VisualDoNo>;
export const ICONE_DO_GATILHO: Record<IconeDoGatilho, ComponentType<…>>;
export const ICONE_DA_ACAO: Record<ActionType, ComponentType<…>>;
```

| Tipo | ícone | rótulo | texto | borda | fundo |
|---|---|---|---|---|---|
| gatilho | `Flag` | — (título "Iniciar quando...") | `text-casca-fluxo-gatilho` | `border-casca-fluxo-gatilho` | `bg-casca-fluxo-gatilho-suave` |
| condicoes | `ArrowLeftRight` | — (título "Condições") | `text-casca-marca` | `border-casca-marca` | `bg-casca-marca-suave` |
| whatsapp | `WhatsappLogo` (de `lib/ui/icons`) | WhatsApp | `text-casca-fluxo-whatsapp` | `border-casca-fluxo-whatsapp` | `bg-casca-fluxo-whatsapp-suave` |
| email | `Mail` | E-mail | `text-casca-fluxo-canal` | `border-casca-fluxo-canal` | `bg-casca-fluxo-canal-suave` |
| acoes | `Zap` | Ações | `text-casca-fluxo-acoes` | `border-casca-fluxo-acoes` | `bg-casca-fluxo-acoes-suave` |
| ia | `Sparkles` | Inteligência Artificial | `text-casca-marca` | `border-casca-marca` | `bg-casca-marca-suave` |

Ícones dos gatilhos (lucide): maleta `Briefcase`, trofeu `Trophy`, fechado `CircleX`, reaberto `RotateCcw`, dono `UserRound`, relogio `Clock`, tag `Tag`, telefone `Phone`, mensagem `MessageCircle`, falha `MessageCircleWarning`, silencio `MessageCircleOff`, agenda `CalendarPlus`, confirmado `CalendarCheck`, remarcado `CalendarClock`, cancelado `CalendarX`, compareceu `UserCheck`, faltou `UserX`, data `CalendarDays`, aniversario `Cake`. Das ações: `create_or_move_lead` `SquareDashedKanban`, `assign_owner` `UserPlus`, `create_task` `Bell`, `apply_task_plan` `ListChecks`, `add_tag` `Tag`, `call_webhook` `Webhook`, `send_whatsapp_message` `WhatsappLogo`, `send_email` `Mail`, `send_ai_message` `Sparkles`, `start_message_flow` `Workflow`. Fontes do gatilho: Negócios `Briefcase`, Contatos `UserRound`, Mensagens `MessageCircle`, Agenda `CalendarDays`, Datas `CalendarClock`. Os que faltarem entram em `lib/ui/icons-da-casca.ts` (conferir com `grep` antes; a 5A já pode ter posto `Tag`, `Flag`, `Workflow`, `Copy`, `SquarePen`).

---

## 3. Estado do fluxo (`useFluxo`)

Porta da lógica de `CanvasDaAutomacao.tsx` (o original não muda), com o painel de rascunho e o layout horizontal.

```ts
export interface OpcoesDoFluxo {
  nomeInicial?: string;
  /** 5A: grava pasta e forma depois de criar. Não lança. */
  aoCriar?: (id: string) => Promise<void>;
  /** Chamado depois de reorganizar, para o canvas enquadrar. */
  aoReorganizar?: () => void;
}
export type ResultadoDoSalvar = "salvo" | "criado" | "recusado" | "falhou";

export interface EstadoDoFluxo {
  nos: NoDaAutomacao[];
  ligacoes: Edge[];
  onNodesChange: OnNodesChange<NoDaAutomacao>;
  onEdgesChange: OnEdgesChange<Edge>;
  desenho: Desenho;
  percurso: Percurso;
  evento: string;
  nome: string;
  setNome: (nome: string) => void;
  ativo: boolean;
  sujo: boolean;
  salvando: boolean;
  selecionado: string | null;
  selecionar: (id: string | null) => void;
  problemasGerais: ProblemaDoDesenho[];
  adicionar: (passo: ActionType | "condicoes", posicao?: { x: number; y: number }) => void;
  ligar: (c: Connection) => void;
  removerNo: (id: string) => void;
  removerLigacao: (id: string) => void;
  duplicarNo: (id: string) => void;
  aplicarNoNo: (id: string, dados: DadosDaCaixa) => void;
  trocarGatilho: (evento: string, tela: TelaDoGatilho) => void;
  reorganizar: () => void;
  salvar: () => Promise<ResultadoDoSalvar>;
  alternarAtivo: (ligar: boolean) => void;
}
export function useFluxo(regra: AutomationRuleRow | null, opcoes: OpcoesDoFluxo): EstadoDoFluxo;
```

Regras (as mesmas do designer de hoje, salvo onde dito):
- **Inicial** uma vez só: `organizarNaHorizontal(desenhoDaRegra(regraGravadaDe(regra)))`; `nome = regra?.name ?? nomeInicial ?? ""`; `salvo = retratoDoFluxo(regra?.name ?? "", inicial)` (a nova com nome inicial já nasce suja, como na 5A); `versao = regra?.updated_at ?? null`.
- `adicionar`: Condições já no desenho → seleciona a caixa e `toast.info("As condições ficam numa caixa só. Acrescente a nova condição nela.")`; laço → `toast.error(MENSAGEM_DO_LACO_DE_LEAD)`; mais de `MAXIMO_DE_ACOES` pela paleta → `toast.error(PROBLEMAS.acoesDemais)`; ação nova com `defaultActionConfig(tipo)`; com posição, a caixa fica onde caiu sem ligação; sem posição, `inserirDepois(desenho, selecionado, nova)` e reorganiza. Seleciona a caixa nova (o painel abre).
- `ligar`: `ligar(...)` do motor; recusa → `toast.error`; aviso → `toast.info`.
- `removerNo`: nunca o gatilho; `excluirCaixa` + reorganiza; limpa a seleção. `removerLigacao`: `excluirLigacao`.
- `duplicarNo`: só caixa de ação; teto de 10 ações (`PROBLEMAS.acoesDemais`); `copiaDaCaixa(caixa, proximoId(ids, "acao"))` e `inserirDepois(desenho, id, copia)`; reorganiza; seleciona a cópia.
- `aplicarNoNo`: troca `data` do nó (tira os problemas antigos dele).
- `trocarGatilho(evento, tela)`: se o evento mudou, apaga as linhas da caixa de condições e aplica `{ kind: "gatilho", evento, tela }` no nó do gatilho; se não mudou, só a tela.
- `reorganizar`: `organizarNaHorizontal(desenho, alturas medidas)` e chama `aoReorganizar`.
- `salvar`: `validarDesenho({ nome, desenho, regraGravada })`; marca os problemas nos nós e os gerais; recusado → `toast.error(t(toastDaRecusa(problemas)))`, limpa a seleção, devolve `"recusado"`. Com regra: `atualizar.mutateAsync({ id, ...corpo, ...(versao ? { versao_lida: versao } : {}) })`, guarda `versao` e `salvo`, toast D19, `"salvo"`. Nova: `criar.mutateAsync(corpo)`, `salvo`, toast D19 (dois textos), `await aoCriar?.(id)`, `qc.setQueryData(["automation-rules"], …)` como hoje, `router.replace(rotaDoFluxo(id))`, `"criado"`. Erro da API → `"falhou"` (o `showApiError` das mutações já avisou).
- `alternarAtivo`: otimista, guarda a `versao` nova no sucesso (sem isto o próximo Salvar daria 409 consigo mesmo), desfaz no erro, toasts de hoje ("Automação ligada." / "Automação pausada.").

---

## 4. Telas

Medidas tiradas de 07-013 (janela 1536×735) e do `material-do-codigo.md`, seção 6. Cores e fontes pelos tokens `casca-*`. Raiz da tela com `data-escale-fluxo` (o CSS da seção 4.12 se pendura nele).

### 4.1 `FluxoDaCasca` (página)

Props: `{ id: string; fuso: string; nomeInicial?: string; pastaInicial?: string | null }`. Lê com `useAutomationRule(nova ? null : id)` (a regra vem do banco a cada abertura, como hoje). Carregando (E28): o cabeçalho de 56 px com esqueletos 200×20 (nome), 80×20 (selo), 100×16 (data) e 160×32 (abas), e o canvas `bg-casca-fluxo` vazio. Não encontrada ou erro: os textos de hoje ("Esta automação não existe mais, ou não é desta organização." / "Não consegui carregar as automações agora. Recarregue a página; se continuar, avise quem cuida da instalação.") centralizados, e o `BotaoDaCasca variante="marca"` "Voltar para as automações" → `ROTA_DA_LISTA_DE_AUTOMACOES`. Senão `ReactFlowProvider` + `<TelaDoFluxo key={regra?.id ?? "nova"} … />`. `aoCriar` = `(rid) => organizarAoCriar(rid, { pasta_id: pastaInicial ?? null, forma: "fluxo" })` só quando `nomeInicial !== undefined` (a mesma regra da 5A).

### 4.2 `TelaDoFluxo`

`flex h-full min-h-0 flex-col`. Em cima `CabecalhoDoFluxo`; embaixo `relative flex min-h-0 flex-1`: `CanvasDoFluxo` (ocupa tudo), `PainelDoNo` por cima à esquerda (quando há nó selecionado) e `PaletaDoFluxo` à direita (no fluxo da página, não por cima). Janelas: `JanelaRenomearAutomacao` (5A; D4), `JanelaDeAcoes`, confirmações (`JanelaDeConfirmacao`: sair sem salvar, remover bloco, excluir automação, trocar gatilho, configuração não salva). `beforeunload` ligado enquanto `sujo`.

### 4.3 Cabeçalho (`CabecalhoDoFluxo`, 07-013, D3–D6)

`header` 56 px, `border-b border-casca-divisoria bg-surface`, `pl-5 pr-2.5`, grade de três terços (`grid grid-cols-[1fr_auto_1fr] items-center`).
- **Esquerda** (`flex items-center gap-2 min-w-0`): `BotaoDaCasca variante="icone"` 28×28 com `ChevronLeft` 18 (`aria-label` "Voltar para as automações"); bolinha 8 px redonda (`bg-success` com `ring-4 ring-success/20` se ativa; `bg-casca-suave` senão); coluna com a linha do nome (nome 14 px 600 `casca-texto` `truncate max-w-[360px]`, lápis `Pencil` 14 `casca-suave` num botão 24×24 `aria-label` "Renomear automação", selo 11 px `rounded px-1.5 py-0.5`: Ativa `bg-success-bg text-success-fg`, Pausada e Nova `bg-casca-raia text-casca-texto-2`, Alterações não salvas `bg-warning-bg text-warning-fg`) e, embaixo, "Salvo há X" 10 px `casca-suave` com `title` = `dataHoraBr(updated_at, fuso)` (relógio de 60 s com `setInterval`, limpo no desmonte).
- **Centro:** `AbasDoFluxo` — `div role="tablist"` `inline-flex rounded-lg bg-casca-raia p-0.5`; cada aba `button role="tab"` 28 px `px-3 text-[12px] rounded-md`; ativa `bg-surface text-casca-texto font-medium shadow-sm`; inativa `text-casca-suave`; desabilitada `opacity-60 cursor-not-allowed`. Props: `{ aba: "editor" | "insights"; aoMudar; insightsDisponivel: boolean }`.
- **Direita** (`flex items-center justify-end gap-2`): `InterruptorDaCasca` (só com regra; `aria-label` "Pausar automação"/"Ligar automação"; desabilitado enquanto grava), `BotaoDaCasca variante="marca" tamanho="sm"` "Salvar" / "Salvando…" (desabilitado sem alterações ou salvando), `MenuDoFluxo` (gatilho `EllipsisVertical` 18, `aria-label` "Mais opções").

### 4.4 Menu ⋮ (`MenuDoFluxo`, 07-016, D6)

`DropdownMenu` com o conteúdo do molde `components/escale/campanhas/MenuDaCampanha.tsx`, ~220 px, itens 13 px com ícone 14, `DropdownMenuSeparator` entre todos. "Editar no editor" → se sujo, "Alterações não salvas" (D17) e depois `router.push(rotaDoEditor(id))`. "Organizar" → `reorganizar()`. "Duplicar automação" → `duplicar(id)` da 5A com os toasts da 5A (Q9 de lá); desabilitado se sujo. "Excluir" (vermelho `casca-alerta`) → `JanelaDeConfirmacao` "Excluir automação" / "Você deseja excluir esta automação?" / "Confirmar" → `excluir(id)` da 5A → `router.push(ROTA_DA_LISTA_DE_AUTOMACOES)` sem perguntar de alterações.

### 4.5 Canvas (`CanvasDoFluxo`, 07-013, 07-026, D15, D16)

`div` `relative h-full flex-1 bg-casca-fluxo` com `onDragOver`/`onDrop` (tipo `application/x-automacao-caixa`, como hoje; "acoes" abre o modal guardando a posição; "gatilho" seleciona o gatilho). `ReactFlow` com `nodeTypes = { gatilho: NoDoFluxo, condicoes: NoDoFluxo, acao: NoDoFluxo }` (fora do componente), `edgeTypes` padrão, `defaultEdgeOptions={{ type: "default", markerEnd: { type: MarkerType.ArrowClosed, width: 16, height: 16 } }}`, `connectionLineType={ConnectionLineType.Bezier}`, `minZoom={0.25}`, `maxZoom={1.15}`, `fitView`, `fitViewOptions={{ padding: 0.2, maxZoom: 1 }}`, `deleteKeyCode={null}`, `proOptions={{ hideAttribution: false }}`. `onEdgeClick` → `removerLigacao`. `onNodeClick` → seleciona (passa pelo guarda do rascunho, D13). `onPaneClick` → fecha o painel (mesmo guarda). `Controls position="bottom-left" showInteractive` (o CSS da 4.12 dá o visual da Clint: botões 32×32 brancos empilhados com borda). Sem `Background` de pontos (a Clint tem fundo liso). Delete/Backspace fora de campo com nó de passo selecionado → confirmação de remover.

### 4.6 Nó (`NoDoFluxo` + `CorposDoNo` + `BarraDoNo`, 07-013, 07-025, 07-027)

Cartão `group relative w-[352px] rounded-xl border bg-surface shadow-[0_1px_3px_rgb(17_24_39/0.08)]`, borda `border-casca-divisoria`; selecionado → borda 2 px da cor do tipo (D18); com problema → `border-casca-alerta` + `title` com o primeiro problema. `data-testid="no-{id}"`.
- **Alças:** entrada `Handle type="target" position={Position.Left}` (não no gatilho); saída `Handle type="source" position={Position.Right}` na altura do rodapé (`style={{ top: "auto", bottom: 22 }}`).
- **Cabeçalho** `px-5 pt-5 pb-3 flex items-center gap-3`: gatilho → `Flag` 18 + "Iniciar quando..." 18 px 600 na cor do tipo; condições → `ArrowLeftRight` 18 + "Condições" 18 px 600 `casca-marca`; os outros → ícone 18 na cor do tipo e a coluna com o rótulo miúdo (11 px `casca-suave`) e o título 14 px 600 `casca-texto` (WhatsApp e E-mail: "Enviar mensagem" e "Enviar e-mail"; Ações e IA: o título do cartão/da paleta; `ai_decide`: "A IA decide").
- **Corpo do gatilho:** linha com o ícone do gatilho 13 `casca-suave`, o título da opção em maiúsculas 11 px 600 `tracking-wide casca-texto-2` e um traço `flex-1 border-t border-casca-divisoria`; embaixo, o detalhe num chip `rounded-md bg-casca-raia px-2 py-0.5 text-[12px] casca-texto-2` (`DetalheDoGatilho`: fonte do formulário ou "Qualquer fonte"; "{campo} · N = {dias}"; "N = {dias}"; sem detalhe, sem chip). Sem evento: "Escolha o gatilho que dará início à automação" 12 px `casca-suave`.
- **Corpo das condições:** "Corresponde a **todas** as condições" 13 px; cada linha completa num bloco `rounded-lg bg-casca-raia px-3 py-2`: rótulo do campo (`CURATED_FIELDS`) + operador sublinhado e em negrito (`OP_LABELS`, "tem a tag" nas listas) e o valor embaixo (nome da etapa quando o campo é de etapa); sem linha completa: "Nenhuma condição completa: roda em todo evento". Rodapé extra: "Se não corresponder, a automação para aqui." 12 px `casca-suave` (D11).
- **Corpo do WhatsApp:** chip do número (`channelLabel` da sessão; sem número: "Dispositivo não configurado", texto da Clint) e o balão da mensagem `rounded-lg border border-casca-divisoria px-3 py-2 text-[12px] line-clamp-4 whitespace-pre-wrap` (sem texto: "Escreva a mensagem").
- **Corpo das outras ações:** `DescricaoDaAcao` do original (exportada no encaixe 2), 12 px `casca-texto-2` `line-clamp-3`. `ai_decide`: "Hoje este passo só se edita pela API" e as opções, como hoje.
- **Rodapé** `px-5 pb-4 pt-1 text-right text-[13px] casca-texto-2`: "Próximo passo".
- **Barra** (`BarraDoNo`, D14): `absolute -top-[45px] right-0 hidden gap-1 rounded-lg bg-surface p-1 shadow-[0_2px_4px_rgb(0_0_0/0.15)] group-hover:flex` (e `flex` com o nó selecionado); botões 30×30 `rounded-md hover:bg-casca-raia` com `Copy` 14 (`aria-label` "Duplicar passo") e `Trash2` 14 (`aria-label` "Remover passo", hover `casca-alerta`). `nodrag nopan` nos botões.

### 4.7 Paleta (`PaletaDoFluxo`, 07-013, 07-014, 07-015, D9)

`aside` `shrink-0 border-l border-casca-divisoria bg-surface transition-[width] duration-300`, `w-[78px]` fechada / `w-[344px]` aberta, `data-testid="paleta-do-fluxo"`.
- **Fechada:** botão `ChevronLeft` 16 no topo (`aria-label` "Abrir paleta de passos"); coluna de botões 40×40 `rounded-lg border border-casca-divisoria` com o ícone do passo 20 na cor do tipo, `title` = título traduzido, arrastáveis.
- **Aberta:** cabeçalho `px-5 pt-4 pb-3 flex gap-3`: `ChevronRight` (`aria-label` "Fechar paleta de passos"), "Adicionar passo" 13 px 500 e "Arraste para o canvas ou clique" 12 px `casca-suave`. Busca `mx-5` 32 px, fundo `casca-raia`, sem borda, `rounded-[4px]`, 12 px, placeholder "Buscar passo…", `Search` 14 à direita (filtra na hora com `filtrarPaleta`). Lista rolável: rótulo da seção 10 px 500 maiúsculas `casca-suave` `px-6 pt-3 pb-1`; item `flex items-center gap-3 px-6 py-2 hover:bg-casca-raia cursor-grab`, quadrado 34 px `rounded-md` com o fundo suave do tipo e o ícone 18 na cor dele, título 13 px 500 `casca-texto` e descrição 12 px `casca-suave`. Seção sem item depois da busca some; nenhum item: "Sem resultados para “{busca}”".
- Item travado pelo laço: `aria-disabled`, opaco, sem arrastar, `title` com a mensagem do laço.

### 4.8 Modal "Ações" (`JanelaDeAcoes`, D10)

`JanelaDaCasca` 720 px. Cabeçalho "Ações" + "×". Abaixo, `AbasDaCasca` com CRM, Contatos e Integrações. Conteúdo da aba: título 14 px 600, descrição 12 px `casca-suave`, grade `grid grid-cols-2 gap-3` de cartões `button aria-pressed rounded-lg border border-casca-divisoria p-4 text-left` (quadrado 34 px `bg-casca-fluxo-acoes-suave` com o ícone da ação 18 `text-casca-fluxo-acoes`, título 13 px 500, descrição 12 px `casca-suave`); escolhido com borda `casca-marca` e fundo `casca-marca-suave`; travado pelo laço desabilitado com a mensagem. Rodapé: "Cancelar" e "Realizar ação" (marca, desabilitado sem escolha) → `adicionar(tipo, posicaoGuardada)`. **Provisório** (não há print do modal: PRD seção 11).

### 4.9 Painel do nó (`PainelDoNo`, D13)

`section` `absolute inset-y-0 left-0 z-10 flex flex-col border-r border-casca-divisoria bg-surface shadow-[4px_0_12px_rgb(17_24_39/0.06)]`, `w-[400px]` (ou `w-[800px]` na escolha do gatilho, `max-w-[calc(100%-78px)]`). Cabeçalho 49 px `px-6 flex items-center gap-2 border-b border-casca-divisoria` com o fundo suave do tipo (gatilho e WhatsApp, como 07-013 e 07-027; Condições branco, como 07-025; Ações e IA com o fundo suave delas), opcional "<" de voltar, ícone 18 e título 14 px 500. Corpo `flex-1 overflow-y-auto px-6 py-5`. Rodapé `h-16 border-t px-6 flex items-center justify-end gap-2` com `BotaoDaJanela` "Cancelar" e `BotaoDaCasca variante="marca"` "Salvar" (só nas vistas que editam). O painel guarda o **rascunho** dos dados do nó; "Salvar" chama `aplicarNoNo` (ou `trocarGatilho`) e fecha; "Cancelar" descarta e fecha. `sujoDoPainel` = rascunho ≠ dados do nó (`JSON.stringify`).

### 4.10 Painel do gatilho (`PainelDoGatilho`, `EscolhaDoGatilho`, `FormularioDoGatilho`; 07-013, 07-019, 07-022, 07-024; D7, D8)

Três vistas no mesmo painel:
1. **Lista** (400 px, sem rodapé): cabeçalho com fundo `casca-fluxo-gatilho-suave`, `Flag` e "Iniciar automação quando..."; texto 13 px `casca-texto-2`: com gatilho "Este gatilho inicia a automação." (nosso), sem gatilho "Escolha o gatilho que dará início à automação" (Clint). Cartão `rounded-lg border border-casca-divisoria p-4` (quadrado 34 px `bg-casca-raia` com o ícone do gatilho 16, título da opção 13 px 500 e o chip do detalhe), clicável quando `precisaDeFormulario` (abre a vista 3). Botão tracejado `h-12 w-full rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte` com `Plus` 14: "Novo gatilho" ou "Trocar gatilho" → vista 2.
2. **Escolha** (800 px, sem rodapé): cabeçalho com "<" (volta à lista), `Zap` e "Iniciar automação quando...". Coluna de fontes 200 px: botões `flex h-11 items-center gap-3`, quadrado 35×35 `rounded-[9px] border border-casca-divisoria` com o ícone 18 `casca-suave`, rótulo 17 px `casca-texto-2` (ativa: `casca-texto` 500). Coluna das opções: "Gatilhos" 14 px 600, "Escolha o evento que vai iniciar sua automação" 12 px `casca-suave`, cartões `w-full max-w-[500px] rounded-lg border border-casca-divisoria px-3 py-2.5 hover:bg-casca-raia flex gap-4` (ícone 16 `casca-suave`, título 13 px, descrição 12 px `casca-suave`); a opção do evento do rascunho com borda `casca-marca` e `aria-pressed`. Abre na fonte do evento atual. Escolher: muda o evento do rascunho (tela padrão de `telaDoGatilho(null)`) e vai para a vista 3 se `precisaDeFormulario`, senão para a 1 **com o rodapé** (há o que salvar).
3. **Formulário** (400 px, com rodapé): cabeçalho com "<" e o título da opção. Os mesmos campos e textos do `PainelDoGatilho` do original, com os controles da casca: "Fonte do formulário" (`SeletorDaCasca`, "Qualquer fonte", "Fonte removida"), "Funil do campo" / "Campo de data" / "Faltam N dias" (`CampoDeTexto` com `inputMode="numeric"`, limites `DIAS_MIN`/`DIAS_MAX`), "Depois de N dias", "Silêncio de" e a `CaixaDaCasca` "Não gerar lembrete quando o cliente tiver compromisso marcado"; o aviso do laço (`acoesQueFechamLaco(evento, [{ type: "assign_owner" }])`).

"Salvar" do painel do gatilho: se o evento mudou **e** a caixa de condições tem linhas, `JanelaDeConfirmacao` "Trocar o gatilho?" / "As condições foram feitas para o gatilho atual e serão apagadas." / "Trocar gatilho"; depois `trocarGatilho(evento, tela)`.

### 4.11 Condições, WhatsApp e outras ações (`painel/*`, 07-025, 07-027, D11, D12)

- **Condições:** cabeçalho branco com `ArrowLeftRight` e "Condições". Grupo `rounded-lg border border-casca-divisoria p-5 flex flex-col gap-3`: "Corresponde a **todas as condições**" 13 px; sem evento, "Escolha o gatilho primeiro: cada gatilho tem os seus campos."; cada linha num bloco `rounded-lg bg-casca-raia p-3 flex flex-col gap-2` com "Campo" (`SeletorDaCasca` com `CURATED_FIELDS[evento]`, ou `CampoDeTexto` no modo avançado), lixeira `Trash2` 14 (`aria-label` "Remover condição"), "Operador" (`SeletorDaCasca` com `OP_LABELS`, "tem a tag" nas listas) e "Valor" (`CampoDeTexto`, ou `SeletorDaCasca` das etapas do funil padrão), e o link 11 px "usar campo avançado" / "usar campo da lista" (a regra de hoje). No canto inferior direito, botão 36×36 `rounded-md border border-casca-divisoria` com `Plus` (`aria-label` "Adicionar condição"; desabilitado sem evento ou com 10). Embaixo do grupo: "Linhas sem campo ou sem valor são descartadas ao salvar. No máximo 10." 11 px `casca-suave`.
- **WhatsApp:** cabeçalho `bg-casca-fluxo-whatsapp-suave` com `WhatsappLogo` 18 verde e "Enviar mensagem". "Selecione o dispositivo WhatsApp" 13 px 600 + `AjudaDaCasca` ("O número que envia a mensagem.") e `SeletorDaCasca aparencia="janela"` com as sessões (`useChannelSessions`; desconectadas desabilitadas com " — desconectado" e a dica de hoje). Divisória. "Configure sua mensagem" 13 px 600 + `AjudaDaCasca` ("A mensagem respeita a janela de envio e o limite diário do número, em Conexões."). Caixa `rounded-lg border border-casca-divisoria p-4 flex flex-col gap-2`: `SeletorDeVariaveis` (o mesmo do `ActionConfigForm`; inserir na posição do cursor, como hoje) e o texto (`textarea` 5 linhas, fundo `casca-raia`, sem borda, `rounded-[4px]`, 13 px, placeholder "Oi [CONTACT.FIRST_NAME], tudo bem?"). Embaixo, o aviso de hoje sobre a janela.
- **Outras ações:** cabeçalho com o fundo suave do tipo, ícone e título; aviso do laço quando fecha laço; `<div data-escale-editor-de-automacao><ActionConfigForm action onChange /></div>`; ação desconhecida → o texto de hoje. `ai_decide` → o painel só de leitura de hoje, sem rodapé de Salvar.
- Os problemas do último Salvar recusado aparecem no topo do corpo: "Para salvar, corrija:" e a lista (texto de hoje), com `role="alert"`.

### 4.12 Tokens e CSS do fluxo

**Tokens novos** (todos neutros ou de tipo; a marca segue `casca-marca`). Cada um entra nos **mesmos quatro lugares** de `--color-casca-dia` (`grep -n "color-casca-dia" app/globals.css app/escale-tema.css`: o padrão do original no `@theme`, o espelho da subárvore, o claro e o escuro do tema Escale), logo abaixo dele, com o comentário `/* FORK ESCALE · Fase 5B: fluxo de automação (07-013) */`. Padrão do original = o token parecido do original (`--color-bg`, `--color-border-strong`, `--color-info`, `--color-success`, `--color-warning`) para a tela sem casca nunca ficar sem cor.

| Token | Claro | Escuro | Padrão do original |
|---|---|---|---|
| `--color-casca-fluxo` | `#f7f7fe` | `#14161f` | `var(--color-bg)` |
| `--color-casca-fluxo-aresta` | `#a5abf3` | `#5b61b0` | `var(--color-border-strong)` |
| `--color-casca-fluxo-gatilho` | `#3538cd` | `#8b8ef5` | `var(--color-info)` |
| `--color-casca-fluxo-gatilho-suave` | `#eef0fc` | `color-mix(in oklab, #3538cd 16%, #181b26)` | `var(--color-info-bg)` |
| `--color-casca-fluxo-whatsapp` | `#16a34a` | `#4ade80` | `var(--color-success)` |
| `--color-casca-fluxo-whatsapp-suave` | `#eaf8ee` | `color-mix(in oklab, #16a34a 16%, #181b26)` | `var(--color-success-bg)` |
| `--color-casca-fluxo-canal` | `#2563eb` | `#60a5fa` | `var(--color-info)` |
| `--color-casca-fluxo-canal-suave` | `#dbeafe` | `color-mix(in oklab, #2563eb 16%, #181b26)` | `var(--color-info-bg)` |
| `--color-casca-fluxo-acoes` | `#ea580c` | `#fb923c` | `var(--color-warning)` |
| `--color-casca-fluxo-acoes-suave` | `#ffedd5` | `color-mix(in oklab, #ea580c 16%, #181b26)` | `var(--color-warning-bg)` |

Os claros são **provisórios** (tirados das capturas e do Chakra v3 que a Clint usa); conferir lado a lado na bateria.

**Bloco CSS** em `app/escale-tema.css`, logo **depois** do bloco `FORK ESCALE · Fase 5A (editor de automação em formulário)`:

```css
/* ─── FORK ESCALE · Fase 5B (fluxo de automação, 07-013/07-014/07-026) ───
   O React Flow desenhado como o editor da Clint, só dentro de [data-escale-fluxo]. */
[data-escale-fluxo] .react-flow__edge-path {
  stroke: var(--color-casca-fluxo-aresta);
  stroke-width: 2px;
}
[data-escale-fluxo] .react-flow__edge:hover .react-flow__edge-path {
  stroke-width: 4.5px;
}
[data-escale-fluxo] .react-flow__edge {
  /* A lixeira vermelha num quadrado branco de 24 px (material, seção 6). */
  cursor: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='24' height='24'%3E%3Crect width='24' height='24' rx='4' fill='white'/%3E%3Cpath d='M7 8h10M10 8V6.5h4V8M8.5 8l.7 9.5h5.6l.7-9.5' fill='none' stroke='%23e63757' stroke-width='1.5' stroke-linecap='round' stroke-linejoin='round'/%3E%3C/svg%3E") 12 12, pointer;
}
[data-escale-fluxo] .react-flow__edge.selected .react-flow__edge-path {
  stroke: var(--color-casca-marca);
}
[data-escale-fluxo] .react-flow__handle {
  width: 10px;
  height: 10px;
  background: var(--color-casca-fluxo-gatilho);
  border: 2px solid var(--color-surface);
}
[data-escale-fluxo] .react-flow__controls {
  box-shadow: none;
  gap: 4px;
}
[data-escale-fluxo] .react-flow__controls-button {
  width: 32px;
  height: 32px;
  border: 1px solid var(--color-casca-divisoria);
  border-radius: 6px;
  background: var(--color-surface);
  color: var(--color-casca-texto);
}
[data-escale-fluxo] .react-flow__controls-button svg {
  max-width: 14px;
  max-height: 14px;
}
```

(A marca da seta (`markerEnd`) recebe `color: var(--color-casca-fluxo-aresta)` no `defaultEdgeOptions`.)

---

## 5. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 5B: …` (ou `{/* … */}` em JSX).

1. **`app/app/webhooks/automacoes/[id]/page.tsx`** — depois da checagem de papel e do `notFound()` (e do que a 5A já parseou: `nomeInicial`, `pastaInicial`): `if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") return <div className="flex h-full flex-col"><FluxoDaCasca id={id} fuso={activeOrg.timezone ?? "America/Sao_Paulo"} nomeInicial={nomeInicial} pastaInicial={pastaInicial} /></div>;`. Sem a casca, o `return` de hoje.
2. **`app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao.tsx`** — `function DescricaoDaAcao` passa a `export function DescricaoDaAcao`, com `// FORK ESCALE · Fase 5B: o nó da casca mostra a mesma descrição.` Nada mais muda no arquivo.
3. **`app/globals.css`** e **`app/escale-tema.css`** — os tokens e o bloco da seção 4.12.
4. **`lib/i18n/dicionario.ts`** — os textos da seção 6 (conferir antes se a chave já existe: `grep -n '"Salvar"' lib/i18n/dicionario.ts`; não duplicar).
5. **`lib/ui/icons-da-casca.ts`** — os ícones da seção 2 que faltarem.
6. **`tests/e2e/designer-de-automacoes.spec.ts`** (e os outros e2e que abrem `/app/webhooks/automacoes/`, achados com `grep -rln "webhooks/automacoes" tests/e2e`) — `await context.addCookies([{ name: "escale_menu", value: "lateral", url: APP_URL }])` antes da primeira navegação, com o comentário de que o spec prova o designer original (D20). Se a 5A já fez isso, só conferir.

---

## 6. Textos (pt → es)

Da Clint (`material-do-codigo.md` 3.3 a 3.9): Editor → Editor; Insights → Insights; Salvar → Guardar; Salvando… → Guardando…; Salvo {tempo} → Guardado {tempo}; Iniciar quando... → Iniciar cuando...; Iniciar automação quando... → Iniciar automatización cuando...; Escolha o gatilho que dará início à automação → Elija el disparador que iniciará la automatización; Gatilhos → Disparadores; Escolha o evento que vai iniciar sua automação → Elija el evento que iniciará su automatización; Novo gatilho → Nuevo disparador; Negócios → Negocios; Contatos → Contactos; Próximo passo → Próximo paso; Adicionar passo → Agregar paso; Arraste para o canvas ou clique → Arrastre al lienzo o haga clic; Buscar passo… → Buscar paso…; Começar → Comenzar; Canais → Canales; Lógica → Lógica; Inteligência Artificial → Inteligencia Artificial; Gatilho → Disparador; Quando a automação inicia → Cuando la automatización inicia; Ações → Acciones; Condições → Condiciones; Corresponde a → Coincide con; todas as condições → todas las condiciones; Realizar ação → Realizar acción; CRM → CRM; Gerencie as informações relacionadas ao CRM → Gestione la información relacionada con el CRM; Gerencie as informações relacionadas ao contato → Gestione la información relacionada con el contacto; Integrações → Integraciones; Gerencie as informações relacionadas a integrações → Gestione la información relacionada con integraciones; Adicionar tag → Agregar etiqueta; Inclua tags aos seus contatos para facilitar a organização → Incluya etiquetas a sus contactos para facilitar la organización; Enviar Webhook → Enviar Webhook; Envie um Webhook quando uma determinada ação acontecer → Envíe un Webhook cuando ocurra una determinada acción; Enviar mensagem → Enviar mensaje; Selecione o dispositivo WhatsApp → Seleccione el dispositivo de WhatsApp; Configure sua mensagem → Configure su mensaje; Dispositivo não configurado → Dispositivo no configurado; Duplicar automação → Duplicar automatización; Excluir → Eliminar; Alterações não salvas → Cambios no guardados; Você está saindo do editor da automação → Está saliendo del editor de la automatización; Alterações não salvas serão perdidas se você continuar sem salvar. → Los cambios no guardados se perderán si continúa sin guardar.; Tem certeza que deseja remover esse bloco? → ¿Seguro que desea quitar este bloque?; Configuração do gatilho não salva → Configuración del disparador no guardada; Você está saindo da configuração do gatilho → Está saliendo de la configuración del disparador; O que você preencheu neste gatilho será perdido se abrir outro item agora. Para manter, cancele e use o botão Salvar. → Lo que completó en este disparador se perderá si abre otro elemento ahora. Para mantenerlo, cancele y use el botón Guardar.; Descartar e continuar → Descartar y continuar; Automação salva com sucesso! → ¡Automatización guardada con éxito!; É necessário configurar o gatilho para salvar a automação. → Es necesario configurar el disparador para guardar la automatización.; Para salvar a automação, conecte pelo menos uma ação ao gatilho. → Para guardar la automatización, conecte al menos una acción al disparador.; Tag adicionada ao contato → Etiqueta agregada al contacto; Uma tag foi adicionada a um contato → Se agregó una etiqueta a un contacto; Contato envia uma mensagem → El contacto envía un mensaje; O contato envia uma mensagem para o WhatsApp → El contacto envía un mensaje al WhatsApp; Negócio entrou na etapa → Negocio entró en la etapa; Dono do negócio → Responsable del negocio; Tempo na etapa → Tiempo en la etapa; Gatilho baseado em data → Disparador basado en fecha.

Nossos (adaptações): Ativa → Activa; Pausada → Pausada; Nova → Nueva; Renomear automação → Renombrar automatización; Editar no editor → Editar en el editor; Organizar → Organizar; Salve antes de duplicar. → Guarde antes de duplicar.; Mais opções → Más opciones; Voltar para as automações → Volver a las automatizaciones; Pausar automação → Pausar automatización; Ligar automação → Activar automatización; Sair sem salvar → Salir sin guardar; Este gatilho inicia a automação. → Este disparador inicia la automatización.; Trocar gatilho → Cambiar disparador; Trocar o gatilho? → ¿Cambiar el disparador?; As condições foram feitas para o gatilho atual e serão apagadas. → Las condiciones se hicieron para el disparador actual y se borrarán.; Configuração do passo não salva → Configuración del paso no guardada; Você está saindo da configuração do passo → Está saliendo de la configuración del paso; O que você preencheu neste passo será perdido se abrir outro item agora. Para manter, cancele e use o botão Salvar. → Lo que completó en este paso se perderá si abre otro elemento ahora. Para mantenerlo, cancele y use el botón Guardar.; Ela nasce pausada: ligue quando estiver pronta. → Nace pausada: actívela cuando esté lista.; Duplicar passo → Duplicar paso; Remover passo → Quitar paso; Abrir paleta de passos → Abrir paleta de pasos; Fechar paleta de passos → Cerrar paleta de pasos; Sem resultados para “{busca}” → Sin resultados para “{busca}”; WhatsApp → WhatsApp; Enviar mensagem no WhatsApp → Enviar mensaje en WhatsApp; E-mail → Correo electrónico; Mover etapa, tags e tarefas → Mover etapa, etiquetas y tareas; Filtrar quem segue no fluxo → Filtrar quién sigue en el flujo; Mensagem pela IA → Mensaje por la IA; A IA escreve e envia a mensagem → La IA escribe y envía el mensaje; Iniciar follow-up → Iniciar seguimiento; Começa um fluxo de follow-up → Inicia un flujo de seguimiento; Criar ou mover negócio → Crear o mover negocio; Cria o negócio ou move para uma etapa do funil → Crea el negocio o lo mueve a una etapa del embudo; Atribuir dono do negócio → Asignar responsable del negocio; Defina quem atende o negócio → Defina quién atiende el negocio; Tarefa interna → Tarea interna; Cria uma tarefa para a equipe, sem mensagem ao cliente → Crea una tarea para el equipo, sin mensaje al cliente; Plano de tarefas → Plan de tareas; Aplica uma sequência de tarefas salva → Aplica una secuencia de tareas guardada; Se não corresponder, a automação para aqui. → Si no coincide, la automatización se detiene aquí.; O número que envia a mensagem. → El número que envía el mensaje.; A mensagem respeita a janela de envio e o limite diário do número, em Conexões. → El mensaje respeta la ventana de envío y el límite diario del número, en Conexiones.; Mensagens → Mensajes; Agenda → Agenda; Datas → Fechas; e os títulos e descrições da seção 1.2 que não são da Clint (tradução direta, no mesmo tom).

---

## 7. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree e conferência da 5A
- [ ] `git -C repo fetch escale-crm`; conferir que a 5A está na main: `git -C repo log escale-crm/main --oneline | grep -i "lista de automações"` (tem de aparecer). Se não estiver, **parar** e avisar.
- [ ] `git -C repo worktree add ../wt-5b -b feat/fase-5b-fluxo-da-casca escale-crm/main`; `corepack pnpm install --frozen-lockfile` em `wt-5b`; copiar este plano para `wt-5b/docs/superpowers/plans/`.
- [ ] Conferir os nomes que a 5B consome da 5A e ajustar o plano se divergirem: `ROTA_DA_LISTA_DE_AUTOMACOES`, `rotaDoFluxo`, `rotaDoEditor`, `rotaDeAbrir` (`lib/escale/automacoes/rotas.ts`); `semAcento` (`lib/escale/automacoes/regras.ts`); `useAcoesDasAutomacoes().duplicar/excluir` e `useOrganizarAoCriar` (`hooks/escale/useAutomacoesDaCasca.ts`); as props reais da `JanelaRenomearAutomacao`. **Se ela chama `renomear` por dentro**, mudá-la para receber `aoSalvar: (nome: string) => void` e a lista da 5A passar `(nome) => renomear({ id, nome })` (o teste da 5A de renomear tem de seguir verde); assim o fluxo reaproveita a janela renomeando no rascunho (D4).
- [ ] Conferir: `SeletorDeVariaveis` (props), `channelLabel`/`useChannelSessions`, `CURATED_FIELDS`/`OP_LABELS` (exportados de `RuleEditor.tsx`), `telaDoGatilho`, `DIAS_MIN`/`DIAS_MAX`, `tempoDesde`, `dataHoraBr`.

### Task 1: Regras puras (layout, gatilhos, paleta, estado)
**Files:** create `lib/escale/automacoes/fluxo/{layout,gatilhos,paleta,estado}.ts`; test `tests/unit/escale-fluxo-regras.test.ts`.
**Produces:** tudo da seção 1 (nomes e tipos exatos).
- [ ] Testes do layout: desenho com gatilho → condições → 2 ações ligadas → `x` 0, 472, 944, 1416 e `y` 0; uma ação solta → `y = 340` sem medidas e `y = 460` com `alturas` `{ gatilho: 300 }`; as ligações saem iguais; a entrada (`Object.freeze` nas caixas) não muda.
- [ ] Testes dos gatilhos: cada um dos 22 `TRIGGER_EVENTS` aparece **uma vez** em `FONTES_DOS_GATILHOS`; a ordem das fontes é negocios, contatos, mensagens, agenda, datas; `fonteDoEvento("appointment.cancelled")` → `"agenda"`, `("x")` e `("")` → `"negocios"`; `opcaoDoEvento("contact.tag_added")?.titulo` → `"Tag adicionada ao contato"`; `precisaDeFormulario` verdadeiro só nos 4 eventos da seção 1.2.
- [ ] Testes da paleta: 7 itens na ordem da seção 1.3; `filtrarPaleta("acoes", id)` acha só "Ações" (sem acento); `("FOLLOW", id)` acha só "Iniciar follow-up" (sem caixa); `("zzz", id)` → `[]`; vazio → os 7. A busca olha título e descrição, nunca o rótulo da seção. `ABAS_DAS_ACOES` + os 4 tipos de ação da paleta (`send_whatsapp_message`, `send_email`, `send_ai_message`, `start_message_flow`) cobrem os 10 `ActionType` sem repetir. `tipoDoNo` dá `whatsapp`, `email`, `ia` (inclusive `ai_decide`), `acoes` (inclusive tipo desconhecido), `gatilho`, `condicoes`.
- [ ] Testes do estado: `retratoDoFluxo` não muda quando só a posição muda e muda quando o nome, um dado ou uma ligação muda; `toastDaRecusa` devolve as três chaves da seção 1.4; `copiaDaCaixa` muda o id, tira `problemas` e não compartilha objeto com a original (mexer na cópia não mexe na original).
- [ ] Implementar; rodar; commit: `feat(escale): regras do fluxo de automação da casca`.

### Task 2: Estado do fluxo e prova do mesmo corpo
**Files:** create `components/escale/automacoes/fluxo/useFluxo.ts`; tests `tests/unit/escale-fluxo-estado.test.tsx` e `tests/unit/escale-fluxo-mesmo-corpo.test.ts`.
**Consumes:** seção 1; `useCreateAutomationRule`, `useUpdateAutomationRule` (mockados); `defaultActionConfig`.
**Produces:** `useFluxo`, `EstadoDoFluxo`, `OpcoesDoFluxo`, `ResultadoDoSalvar` (seção 3).
- [ ] `escale-fluxo-mesmo-corpo.test.ts` (o risco da seção 12 do PRD): para 5 regras de exemplo (tag de contato com condição curada; `lead.created` com fonte; `lead.date_field_due` com campo e N = -60; `lead.silent_for` com direção e proteção pela agenda; regra com `ai_decide` e uma condição avançada `lead.custom_fields.x`), `validarDesenho({ nome, desenho: organizarNaHorizontal(desenhoDaRegra(r)), regraGravada: r }).corpo` é **igual** ao de `organizar(desenhoDaRegra(r))` (o do designer de hoje) **e** igual a `{ name, trigger_event, trigger_config, conditions, actions }` da regra.
- [ ] `escale-fluxo-estado.test.tsx` (`renderHook` com `QueryClientProvider`, `ReactFlowProvider`, `next/navigation` e as mutações mockadas, `toast` espiado): abrir uma regra e `salvar()` sem mexer → `atualizar.mutateAsync` com o corpo da regra e `versao_lida = updated_at`, resultado `"salvo"`, `sujo` falso antes e depois; `setNome("x")` deixa `sujo`; `adicionar("add_tag")` sem seleção põe a caixa no fim da fila e a seleciona; com a caixa 2 selecionada, entra depois dela; `adicionar("condicoes")` duas vezes → uma caixa e o `toast.info`; com gatilho `lead.assigned`, `adicionar("assign_owner")` → `toast.error` com a mensagem do laço e nada muda; `duplicarNo` copia a ação logo depois e com 10 ações recusa; `removerNo("gatilho")` não faz nada; `removerNo` de uma ação do meio fecha a fila; `trocarGatilho` para outro evento apaga as linhas das condições e para o mesmo evento só troca a tela; `salvar()` sem ação → `"recusado"`, nenhum `mutateAsync`, `toast.error` com "Para salvar a automação, conecte pelo menos uma ação ao gatilho." e o problema marcado no nó; nova com `nomeInicial` → `criar.mutateAsync`, `aoCriar("r9")` chamado **antes** de `router.replace("/app/webhooks/automacoes/r9")`, os dois toasts do D19; `alternarAtivo(true)` → `mutate` com `{ is_active: true }`, `ativo` muda antes da resposta, e o `salvar()` seguinte manda a `versao_lida` nova.
- [ ] Implementar; rodar; commit: `feat(escale): estado do fluxo de automação da casca (mesmo corpo do designer)`.

### Task 3: Nós, arestas, tokens e CSS do canvas
**Files:** create `NoDoFluxo.tsx`, `CorposDoNo.tsx`, `BarraDoNo.tsx`, `visual-do-fluxo.ts`; modify `app/globals.css`, `app/escale-tema.css`, `lib/ui/icons-da-casca.ts`, `app/app/webhooks/automacoes/[id]/_components/CaixaDaAutomacao.tsx` (encaixe 2); test `tests/unit/escale-fluxo-nos.test.tsx` (render do nó dentro de `ReactFlowProvider`; hooks de dados mockados).
- [ ] Testes: gatilho `contact.tag_added` → "Iniciar quando...", "TAG ADICIONADA AO CONTATO" (o texto em maiúsculas por CSS: conferir `toHaveClass("uppercase")` e o texto "Tag adicionada ao contato"), "Próximo passo", sem alça de entrada e sem barra; `lead.created` com fonte "Site" → chip "Site"; sem evento → "Escolha o gatilho que dará início à automação"; condições com 2 linhas completas e 1 vazia → 2 blocos, "Corresponde a", "todas" e "Se não corresponder, a automação para aqui."; WhatsApp sem número → "Dispositivo não configurado" e "Escreva a mensagem"; com texto → o balão com o texto; `add_tag` → rótulo "Ações", título "Adicionar tag" e as tags; `send_ai_message` → rótulo "Inteligência Artificial"; selecionado → classe da borda do tipo; com `problemas` → classe `border-casca-alerta` e `title` com o problema; a barra de uma ação tem "Duplicar passo" e "Remover passo" e chama os dois retornos; a das condições só "Remover passo".
- [ ] Teste de tokens: `app/globals.css` e `app/escale-tema.css` têm cada um dos 10 tokens da seção 4.12 (ler o arquivo e procurar o nome; claro e escuro no tema Escale).
- [ ] Implementar (seções 2, 4.6 e 4.12); rodar também `corepack pnpm vitest run tests/unit/escale-tema.test.ts`; commit: `feat(escale): nós e canvas do fluxo de automação no visual da Clint`.

### Task 4: Paleta e modal "Ações"
**Files:** create `PaletaDoFluxo.tsx`, `JanelaDeAcoes.tsx`; test `tests/unit/escale-fluxo-paleta.test.tsx`.
- [ ] Testes: fechada mostra 7 botões com `title` e o "Abrir paleta de passos"; abrir mostra "Adicionar passo", "Arraste para o canvas ou clique", a busca e as seções COMEÇAR, CANAIS, LÓGICA, INTELIGÊNCIA ARTIFICIAL na ordem; clicar "WhatsApp" chama `aoEscolher("send_whatsapp_message")`; o `dragStart` grava o passo no `dataTransfer` com o tipo `application/x-automacao-caixa`; buscar "tag" deixa só "Ações" (pela descrição "Mover etapa, tags e tarefas") e some a seção sem item; "zzz" → "Sem resultados para “zzz”"; com gatilho `lead.assigned`, nada na paleta trava (a trava é por ação, no modal) e no modal o cartão "Atribuir dono do negócio" fica desabilitado com a mensagem do laço; o modal abre na aba CRM com 4 cartões, troca para Contatos ("Adicionar tag") e Integrações ("Enviar Webhook"); "Realizar ação" desabilitado até escolher; escolher "Tarefa interna" e confirmar chama `aoRealizar("create_task")` e fecha.
- [ ] Implementar (seções 4.7 e 4.8); rodar; commit: `feat(escale): paleta de passos e modal Ações do fluxo`.

### Task 5: Painel do nó e painel do gatilho
**Files:** create `painel/PainelDoNo.tsx`, `painel/PainelDoGatilho.tsx`, `painel/EscolhaDoGatilho.tsx`, `painel/FormularioDoGatilho.tsx`; test `tests/unit/escale-fluxo-paineis.test.tsx` (parte do gatilho).
- [ ] Testes do `PainelDoNo`: largura 400 e 800 pela prop; "Cancelar" chama `aoCancelar`; "Salvar" chama `aoSalvar` e fica desabilitado sem mudança no rascunho; o cabeçalho usa o fundo suave do tipo.
- [ ] Testes do gatilho: com `contact.tag_added` → "Iniciar automação quando...", "Este gatilho inicia a automação.", o cartão "Tag adicionada ao contato" e "Trocar gatilho"; sem evento → "Escolha o gatilho que dará início à automação" e "Novo gatilho"; "Trocar gatilho" abre a escolha em 800 px na fonte Contatos, com "Gatilhos" e "Escolha o evento que vai iniciar sua automação"; clicar "Agenda" mostra os 6 da agenda; escolher "Horário cancelado" volta à lista com o rodapé e "Salvar" chama `aoTrocar("appointment.cancelled", tela padrão)`; escolher "Tempo na etapa" abre o formulário com "Depois de N dias" e a caixa "Não gerar lembrete…"; escolher "Negócio criado pelo formulário" abre "Fonte do formulário" com "Qualquer fonte" e as fontes; com condições preenchidas, salvar outro evento pede "Trocar o gatilho?" e só chama `aoTrocar` depois de confirmar; "Faltam N dias" aceita "-60" e manda a string, como o original; o cartão de `lead.date_field_due` abre o formulário com o funil e o campo.
- [ ] Implementar (seções 4.9 e 4.10); rodar; commit: `feat(escale): painel do nó e painel do gatilho do fluxo`.

### Task 6: Painéis de condições, WhatsApp e das outras ações
**Files:** create `painel/PainelDasCondicoes.tsx`, `painel/PainelDaMensagem.tsx`, `painel/PainelDaAcao.tsx`; test `tests/unit/escale-fluxo-paineis.test.tsx` (segunda parte).
- [ ] Testes das condições: "Corresponde a" e "todas as condições"; uma linha por bloco; escolher o campo "Etapa" troca o valor por seletor de etapas; "usar campo avançado" troca para texto livre e volta; a lixeira tira a linha; "+" adiciona até 10 e então desabilita; sem evento, "+" desabilitado e o aviso; "Salvar" manda as linhas novas (`aoSalvar({ kind: "condicoes", linhas })`).
- [ ] Testes do WhatsApp: "Enviar mensagem", "Selecione o dispositivo WhatsApp", "Configure sua mensagem"; número desconectado desabilitado; escolher o número e escrever o texto, "Salvar" manda `{ kind: "acao", acao: { type: "send_whatsapp_message", config: { channel_session_id, template } } }`; inserir variável no meio do texto põe o token no cursor; **não** há "Fora da janela", "Dentro da janela" nem "Adicionar botão" (D12).
- [ ] Testes das outras ações: `add_tag` mostra o `ActionConfigForm` (mockado) dentro de `[data-escale-editor-de-automacao]` e o `onChange` dele vai para o rascunho; ação que fecha laço mostra o aviso; `ai_decide` mostra o painel só de leitura, sem "Salvar"; problemas recebidos aparecem em "Para salvar, corrija:".
- [ ] Implementar (seção 4.11); rodar; commit: `feat(escale): painéis de condições, WhatsApp e ações do fluxo`.

### Task 7: Cabeçalho, menu, tela e carregamento
**Files:** create `CabecalhoDoFluxo.tsx`, `AbasDoFluxo.tsx`, `MenuDoFluxo.tsx`, `CanvasDoFluxo.tsx`, `TelaDoFluxo.tsx`, `FluxoDaCasca.tsx`; test `tests/unit/escale-fluxo-cabecalho.test.tsx`.
- [ ] Testes do cabeçalho: regra ativa → bolinha verde, nome, selo "Ativa", "Salvo há 5 minutos" (relógio falso: `updated_at` 5 min atrás) com `title` em `dd/mm/aaaa HH:mm:ss`; pausada → "Pausada"; sujo → "Alterações não salvas" e "Salvar" habilitado; limpo → "Salvar" desabilitado; nova → "Nova", sem "Salvo há", sem interruptor; abas com "Editor" selecionada e "Insights" desabilitada; o lápis abre "Renomear automação" com o nome e salvar chama `setNome` (não chama API); o interruptor chama `alternarAtivo`.
- [ ] Testes do menu: ordem "Editar no editor", "Organizar", "Duplicar automação", "Excluir" com 3 divisórias; nova → só "Organizar"; sujo → "Duplicar automação" desabilitado com "Salve antes de duplicar."; "Excluir" confirma "Excluir automação" / "Você deseja excluir esta automação?" e, confirmado, chama `excluir` e `router.push("/app/automacoes")`; "Editar no editor" limpo → `router.push("/app/automacoes?editor=r1")`; sujo → "Alterações não salvas" primeiro, e "Sair sem salvar" segue.
- [ ] Testes da tela (componentes de canvas e painéis mockados nos pontos de contato): "Voltar" limpo vai para `/app/automacoes`; sujo pede confirmação; clicar um nó abre o painel do tipo; com o rascunho do painel mexido, clicar outro nó abre "Configuração do passo não salva" e "Descartar e continuar" troca; soltar "acoes" no canvas abre o modal e "Realizar ação" cria a caixa na posição do soltar; `beforeunload` só com `sujo`; o `FluxoDaCasca` carregando mostra os esqueletos, 404 mostra "Esta automação não existe mais, ou não é desta organização." e "Voltar para as automações".
- [ ] Implementar (seções 4.1–4.5); rodar; commit: `feat(escale): cabeçalho e tela do fluxo de automação da casca`.

### Task 8: Página, textos e e2e (encaixes)
**Files:** modify os arquivos da seção 5 (itens 1, 4 e 6); test `tests/unit/escale-fluxo-pagina.test.tsx` (molde `tests/unit/escale-campanhas-pagina.test.tsx`).
- [ ] Testes da página: casca + gerente → `FluxoDaCasca` com `id`, fuso, `nomeInicial` e `pastaInicial`; sem casca → `DesignerDeAutomacao` (o de hoje); agente → `/app/inbox` nas duas; id que não é uuid nem "nova" → `notFound` nas duas.
- [ ] Rodar também os testes do original e da 5A que tocam o designer e a lista (`grep -rln "CanvasDaAutomacao\|DesignerDeAutomacao\|RuleEditor\|RulesTab\|escale-automacoes" tests/unit`) e `tests/unit/automacao-abre-da-versao-do-banco.test.tsx`: todos verdes.
- [ ] Textos da seção 6 no dicionário (pt e es); `corepack pnpm vitest run tests/unit/i18n*` se existir teste de completude do dicionário.
- [ ] Implementar; rodar; commit: `feat(escale): com a casca, a automação abre no fluxo da Clint`.

### Task 9: Fechamento da fase
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/automacoes/fluxo components/escale/automacoes/fluxo app/app/webhooks/automacoes lib/ui/icons-da-casca.ts tests/unit/escale-fluxo-*`; `corepack pnpm vitest run tests/unit/escale-fluxo-* tests/unit/escale-automacoes-*`.
- [ ] Cercas da casca: `corepack pnpm vitest run -c vitest.cercas.ts` (`controle-decorativo`, `tailwind-tokens`, `evidencia-citada`…). Corrigir o que apontar sem mexer na cerca; o que já falhava na main fica anotado.
- [ ] Motor intacto: o `git diff --stat` das Global Constraints sai vazio. Original: `git diff --stat escale-crm/main -- app/app/webhooks` mostra só `page.tsx` e `CaixaDaAutomacao.tsx` (1 linha).
- [ ] Olhar a tela no navegador local (`corepack pnpm dev`, casca ligada): abrir uma automação existente, abrir a paleta, abrir um painel de cada tipo, salvar sem mexer (o botão fica desabilitado) e com uma mudança; criar uma nova pela lista "No fluxo". Anotar o que não bate com 07-013/014/016/022/025/027 para a conferência da bateria (**sem** conferência formal agora; ela é da bateria).
- [ ] Auto-revisão do diff pela checklist de `code-review.md` (o revisor Opus 5.5 é um por frente, na bateria).
- [ ] PR para `escale-crm/main`: itens do PRD (C1–C14, C17), decisões D1–D20, o que é provisório (modal "Ações", cores do fluxo, formulário dos gatilhos, "Trocar gatilho", "Este gatilho inicia a automação.", rodapé das condições, cursor da aresta, "Configuração do passo não salva"), as diferenças aceitas (sem Publicar/histórico, um gatilho sem ⋮, um grupo de condições sem saída "não corresponde", WhatsApp sem janela/modelo/botões, sem Atraso/Randomizador/SMS/voz/Instagram/Agente, sem selecionar blocos e colar, painel de 400 px, links do menu do topo sem aviso de alterações), como testar e a nota "não publica: frente Automações em andamento". Merge direto. Atualizar `LOG.md` (feito / onde estamos / próximo: 5C).
- [ ] Commit do LOG: `docs: LOG da fase 5B`.

---

## 8. Critério de pronto (linha 5B da seção 8 do PRD)

- Com a casca, abrir uma automação no fluxo mostra o cabeçalho, o canvas da esquerda para a direita, a paleta e os painéis da Clint; dá para criar, editar, ligar, remover, duplicar passos, trocar o gatilho, salvar, ligar/pausar, duplicar e excluir a automação.
- **O corpo salvo é idêntico ao de antes** (Task 2) e o diff do motor sai vazio.
- Sem a casca, o designer é o de hoje e os testes e e2e dele seguem verdes.
- Testes de unidade das Tasks 1–8 verdes; cercas sem falha nova.
- **Igual às imagens 07-013, 07-014, 07-016, 07-025, 07-026 e 07-027 nos itens adotados** (e 07-022 na escolha do gatilho): conferência lado a lado na bateria da frente, com a lista escrita das diferenças. Diferenças já previstas e justificadas: as da Task 9 (PR), cor da marca Escale IA no lugar do roxo.

## 9. Riscos desta fase

| Risco | Mitigação |
|---|---|
| O fluxo novo gravar um corpo diferente do de hoje | Usa o mesmo `validarDesenho` e as mesmas mutações; a Task 2 prova a igualdade em 5 regras, inclusive `ai_decide` e condição avançada |
| O painel de rascunho perder edição (trocar de nó sem querer) | Guarda com "Configuração … não salva" (D13) e teste na Task 7 |
| `useFluxo` repetir a lógica do `CanvasDaAutomacao` e os dois saírem do compasso | A lógica de regra (o que pode ligar, o que é problema, o corpo) é toda do `desenho-da-regra.ts`; o hook só guarda estado. O teste do mesmo corpo roda sobre as duas arrumações |
| O 409 de versão disparar sozinho depois de ligar/pausar ou renomear | Ligar/pausar guarda a versão nova (como hoje); renomear é no rascunho (D4). Teste na Task 2 |
| React Flow em jsdom não medir os nós | Os nós são testados soltos dentro do `ReactFlowProvider`; a tela testa os pontos de contato com o canvas mockado; o arrastar real fica para a olhada no navegador da Task 9 |
| Os e2e do designer caírem na tela nova | Cookie `lateral` neles (D20) |
| A 5A ainda não mergeada ou com nomes diferentes | Task 0 confere e para |
| Cores e medidas sem print (modal Ações, formulário de gatilho) divergirem | Marcadas provisórias no PR; pedir os prints da seção 11 do PRD na conferência |

## 10. Perguntas ao usuário (não bloqueiam a execução)

1. **D12 (WhatsApp):** na Clint o passo de WhatsApp tem duas versões da mensagem ("Fora da janela", com modelo aprovado, e "Dentro da janela", com texto e botões). A nossa automação manda só texto e espera a janela do número. Então o painel fica com o número e o texto, sem as duas abas e sem botões. Pode?
2. **D7 (um gatilho):** a Clint aceita vários gatilhos na mesma automação; o nosso sistema aceita um. O painel mostra um cartão e o botão vira "Trocar gatilho". Pode?
3. **D4 (renomear):** o lápis do nome muda o nome só na tela, e ele é gravado quando você aperta "Salvar" (na Clint grava na hora). Pode?
4. Prints que ajudariam (só olhar, sem salvar nada na Clint): o modal "Ações" com as abas; a paleta com uma busca digitada; a barra que aparece ao passar o mouse num nó; um nó com problema (borda vermelha); o aviso "Alterações não salvas" ao sair; o formulário de um gatilho aberto (ex.: "Tempo na etapa").
