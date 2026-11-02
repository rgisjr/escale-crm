# Fase 10D — Instagram avançado: gatilhos de direct e de story, filtro da Clint, público, próxima publicação, repetição e ações no comentário · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão dos planos da 10B e da 10C: decisões, arquivos, interfaces, regras, SQL, textos e testes escritos aqui; o código de tela restante é escrito na execução seguindo os moldes citados.

> **PRD:** `docs/modulos/10-comentarios.md` (aprovado em 01/11/2026): linhas 10D dos quadros A, B e C da seção 4, linha 10D da seção 8, decisões 1, 4 e 7 da seção 9, riscos "Resposta dupla", "Bloqueio por spam" e "API do Zernio ainda não confirmada" da seção 12.
> **Frente 10-II** (só a 10D). **Começa depois da Frente 10-I (10B + 10C + 10A) publicada.** Depende da 10B (gatilho, passo Instagram, tabela `escale_disparos_de_comentario`, `lib/escale/comentarios/*`), da 10C (colunas da publicação no disparo) e da 10A (caixa de comentários, para o "Curtir" à mão). Worktree nova `wt-10d` a partir de `escale-crm/main`. **Uma migration (9804; a 9803 fica para a 10A, se ela precisar).** Um PR (`feat/fase-10d-instagram-avancado`). Executa, testa e publica sozinha (é a frente inteira).

**Goal:** com a casca ligada, o Instagram de Automações fica completo: os três gatilhos que estavam "Em breve" funcionam ("Contato envia uma mensagem", "Alguém marca a conta em um story", "Alguém responde a um story"), o passo Instagram também manda direct comum (com anexo) nesses gatilhos, o filtro de palavra ganha os operadores da Clint ("É", "Contém", "Contém palavra inteira", "Começa com", "Termina com", "Não contém"), e o gatilho de comentário ganha "Próxima publicação", público (só seguidores, com "Siga para liberar"), repetição com intervalo por pessoa, ocultar o comentário depois do direct e curtir o comentário (Facebook). A automação que casa com um direct deixa o agente de IA quieto naquela conversa, sem resposta dupla.

**Architecture:**
- **O motor continua o nosso** (decisão 1 do PRD). Os três gatilhos de direct são **eventos novos do fork** (`instagram.message_received`, `instagram.story_mention`, `instagram.story_reply`, entidade `contact`), emitidos por `lib/escale/comentarios/direct.ts` a partir do `message.received` do Zernio, que já entra (a assinatura já tem o evento). O ponto de entrada é a ingestão do canal social, **antes** do despacho do agente de IA: ali o fork confere se alguma regra ativa quer a mensagem, cala a IA da conversa por 10 minutos quando quer (D6) e emite o evento.
- **O leitor do Zernio passa a guardar os extras do Instagram** (`metadata.isStoryMention`, `metadata.storyReply`, `metadata.postbackPayload`, `sender.instagramProfile.isFollower`), que hoje são jogados fora. Um encaixe pequeno no `parser.ts`; a leitura é do fork (`extrasDoDirect`).
- **Repetição deixa de ser índice único.** A "uma vez por pessoa" da 10B era um índice único parcial; com intervalo (D10) ele não serve. A 9804 troca o índice por uma função `fn_escale_reivindicar_disparo` (só `service_role`, trava por pessoa e regra com `pg_advisory_xact_lock`) que decide normal ou `repetido` na mesma transação. O índice único por comentário fica.
- **"Siga para liberar"** usa o botão de resposta (postback) da resposta privada: quem não segue recebe a mensagem de liberar com o botão "Já estou seguindo"; o toque chega como `message.received` com `postbackPayload` e `isFollower`, e o fork manda o direct guardado pela conversa (a janela de 24 h abriu com o toque).
- **Ações no comentário** (ocultar, curtir) saem no fim da execução, junto da resposta pública da 10B (`concluirDisparo`).

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query, `@xyflow/react` 12, Radix, `lucide-react` 1.x e Phosphor pela `lib/ui/icons-da-casca.ts`, Supabase (RLS, RPC), Vitest + Testing Library, `test:db` (Postgres efêmero, `gov-helpers`). API do Zernio pelo SDK `zernio` 0.0.1300 (crates.io), conferido em 01/11 (seção 2.4).

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega até produção é do Claude (CLAUDE.md): PR, merge, tag, release, `backup.sh`, `update.sh --to <tag>` na VPS nova `76.13.228.29`, conferência.
- **Ordem da frente (CLAUDE.md):** executar todas as tasks sem teste pesado; depois UMA bateria (unidade completa + `test:db` + `test:db:update`, em segundo plano), UM revisor **Opus 5.5** (atenção à função de reivindicação com trava e ao encaixe antes do despacho do agente), UMA conferência visual, UMA publicação.
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` (com `NODE_OPTIONS=--max-old-space-size=10240`) e `corepack pnpm eslint <arquivos>`. **Exceção:** a Task 2 roda `corepack pnpm test:db tests/invariants/escale-comentarios-9804.test.ts` uma vez (pelo **Git Bash**, Docker aberto, com `CONFERENCIA_KIT_RELEASE=<última tag>`; memória `frente-automacoes-estado`).
- **Migration 9804:** `supabase/migrations/20261203150000_9804_instagram_avancado.sql` (carimbo depois do da 9802, `20261203130000`, e do da 9803 se a 10A tiver criado; pegar o seguinte ao último da `main`). Cabeçalho `-- manifest:` obrigatório, sem linha no `MANIFEST.md`; `corepack pnpm checar:colisao-de-migration` antes do PR. O bloco vai colado no `supabase/baseline.sql` **logo depois do último bloco da faixa 9800** (`grep -n "migration 980" supabase/baseline.sql`) e antes da varredura de anon (memória `baseline-ordem-dos-blocos-do-fork`).
- **Arquivos do Rafael** só nos encaixes da seção 6, com poucas linhas e o comentário `// FORK ESCALE · Fase 10D: …`. Em arquivo compartilhado (`lib/i18n/dicionario.ts`, `supabase/baseline.sql`, `lib/schemas/webhooks.ts`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Sem a casca nada muda:** os três eventos novos entram em `GATILHOS_SO_DA_CASCA` (10B); o designer original não os oferece. Sem regra ativa de direct, a ingestão do Instagram faz exatamente o que faz hoje (uma leitura barata a mais, D5) e a IA responde como antes.
- **Compatível com as regras da 10B:** `trigger_config` gravado na 10B (filtro com `palavras: string[]`, sem `publico`, sem `repeticao`) continua válido e se comporta igual (D3, D10). Teste prova.
- **Igual à Clint:** textos dos gatilhos e operadores copiados do código da Clint (seção 7). Não há print do painel desses gatilhos nem do filtro com operadores: o molde sai do painel da 10B e do controle de condição de mensagem da Clint (`label.tIs`, `label.tContains`… em `index-CY2O8ZFZ`), **provisório**; aprovar este plano vale como confirmação do molde. Público, "Siga para liberar", repetição, ocultar e curtir **não existem na Clint** (vêm do Zernio/ManyChat, PRD 4.B): seguem as peças da casca. Nada de `<select>`, checkbox nativo ou controle do navegador. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`).
- **Marca:** `casca-marca` onde a Clint usa o roxo; o rosa do Instagram é o token de nó da 10B.
- **Formatos BR:** datas `dd/mm/aaaa HH:mm` pelo `dataHoraBr` no fuso da organização; números com `toLocaleString("pt-BR")`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`, no bloco do fork da 10B.
- **Segredos:** a chave do Zernio só sai de `zernioCredsForAccountId`; nunca em log, nunca em resposta de rota.
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (usar `logger`). `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Três eventos novos, entidade `contact`:** `instagram.message_received` ("Contato envia uma mensagem"), `instagram.story_mention` ("Alguém marca a conta em um story"), `instagram.story_reply` ("Alguém responde a um story"). O `message.received` do original continua sendo o "Contato envia uma mensagem" do WhatsApp e não muda | A Clint tem um cartão por gatilho; separar mantém o motor, o Insights e o filtro de gatilho da lista sem regra especial |
| D2 | **Conta:** "Contato envia uma mensagem" aceita Instagram e Facebook (como o comentário, D4 da 10B). Os dois de story **só Instagram** (o seletor esconde as páginas do Facebook) | Story é do Instagram |
| D3 | **Filtro com os operadores da Clint.** O filtro "Com palavras" vira uma lista de condições `{ operador, valor }` com `operador` em `igual` ("É"), `contem` ("Contém"), `palavra_inteira` ("Contém palavra inteira"), `comeca_com` ("Começa com"), `termina_com` ("Termina com"), `nao_contem` ("Não contém"). As condições positivas combinam por "Combinar palavras com" (Qualquer/Todas); **"Não contém" sempre bloqueia** (vale como E, qualquer que seja a combinação). Sem caixa, sem acento, espaços juntados (o `normalizar` do motor). O formato da 10B (`palavras: string[]`) é lido como `contem` em cada palavra | São os operadores do gatilho de mensagem da Clint; "palavras que bloqueiam" do PRD é o "Não contém" dela |
| D4 | **"Erro de digitação" não entra.** A Clint não tem esse modo | Regra do produto (igual à Clint); vira pergunta 1 |
| D5 | **O fork só emite evento quando existe regra ativa daquele gatilho na conta** (uma consulta por mensagem do Instagram, por `organization_id` + `trigger_event in (...)` + `is_active`; cache de 30 s por organização em memória, como o motor dos indicadores). Sem regra, nada vai para o `event_log` | O `event_log` e o Supabase Free já estão no limite (memória `supabase-do-crm-maquina-sem-memoria`) |
| D6 | **Sem resposta dupla: a automação vence a IA na mensagem que casou.** Se alguma regra ativa casa com o direct (conta + filtro), o fork grava `conversations.bot_silenced_until = agora + 10 min` (nunca encurta um silêncio maior; motivo `automacao_do_instagram`) **antes** do despacho do agente. Mensagem que não casa: a IA responde como hoje. O painel avisa quando o filtro é "Qualquer mensagem" | Risco "Resposta dupla" da seção 12; 10 min cobre o fluxo com atraso curto sem desligar a IA por muito tempo |
| D7 | **Mention não tem filtro** (texto da Clint "Este gatilho dispara para toda menção recebida pela conta. Não há texto para filtrar."). Story reply e mensagem têm "Qualquer mensagem" / "Com palavras" (D3) | Clint |
| D8 | **Passo Instagram nos gatilhos de direct = direct comum** pela conversa (`POST /v1/inbox/conversations/{id}/messages`), com texto, até 3 botões de link e **anexo opcional** (imagem, vídeo, áudio ou arquivo da biblioteca de mídia do PR #148, enviado numa segunda mensagem logo depois do texto). Janela da Meta: até 24 h depois da mensagem que disparou; passou → não chama a API, falha `janela_fechada`. No gatilho de comentário o anexo fica desligado com a explicação da D9 | A mensagem da pessoa abriu a janela de 24 h; a resposta privada só aceita texto e botões |
| D9 | **Anexo no comentário não existe** (a resposta privada do Zernio só tem `message`, `buttons` e `quickReplies`). Texto da tela: "No comentário, a primeira mensagem aceita só texto e botões (regra do Instagram)." | Contrato do SDK (seção 2.4) |
| D10 | **Repetição por pessoa no gatilho de comentário:** "Uma vez por pessoa" (padrão, o comportamento da 10B) ou "De novo depois de" N horas (1 a 720). Os gatilhos de direct disparam a cada mensagem que casa (como o "Contato envia uma mensagem" do WhatsApp) | PRD 4.B "intervalo mínimo por pessoa"; o anti-spam do direct já vem da janela e da D6 |
| D11 | **"Próxima publicação"** no escopo do comentário: ao salvar, a tela grava `proxima: { armada_em: agora, conhecidas: [ids das publicações listadas] , resolvida: null }`. Comentário numa publicação que não está em `conhecidas`, numa regra ainda não resolvida → o fork lê as publicações da conta; a publicação mais antiga com `createdTime >= armada_em` é "a próxima"; se for a do comentário, a regra é resolvida (`resolvida: { id, legenda, miniatura, publicada_em }`, gravada no `trigger_config` com update condicional) e o comentário segue como em "Posts específicos". Depois disso só aquela publicação dispara | O Zernio não avisa publicação nova em tempo real (`post.external.created` é por varredura, de hora em hora); a leitura sob demanda resolve sem esperar |
| D12 | **Público do comentário (só Instagram):** "Todos" (padrão), "Só seguidores" ou "Só quem não segue". O dado é `comment.author.instagramProfile.isFollower`. Quando o Instagram não informa: "Enviar mesmo assim" (padrão), "Não enviar" ou **"Pedir para seguir"** ("Siga para liberar", D13). Fora do público: o fluxo **não roda** e o disparo fica `fora_do_publico` (aparece no Insights). No Facebook o bloco não aparece | É o `audience` do Zernio refeito no nosso motor (decisão 1) |
| D13 | **"Siga para liberar":** com "Só seguidores", quem não segue (ou não informado + "Pedir para seguir") recebe, no lugar do direct, a resposta privada com a mensagem de liberar (padrão "Para receber o link, siga a conta e toque em Já estou seguindo.") e o botão postback "Já estou seguindo" (`payload = escale:liberar:<id do disparo>`). O disparo guarda o direct pronto (`direct_pendente`) e fica `aguardando_seguir`; o resto do fluxo segue normal. No toque: segue (`isFollower` true) → o fork manda o direct guardado pela conversa, disparo `enviado`, e publica a resposta pública/oculta/curte que estavam esperando; não segue → manda de novo a mensagem de liberar com o botão (até 3 toques; depois para, motivo `nao_seguiu`). O toque nunca dispara os gatilhos de direct e cala a IA (D6) | Postback é o único botão que avisa o toque (seção 2.4) |
| D14 | **Ações no comentário por caminho:** "Ocultar o comentário depois do direct" (Instagram e Facebook) e "Curtir o comentário" (só Facebook; o Instagram está em liberação restrita no Zernio, 403 `PLATFORM_BETA_RESTRICTED`). Saem no fim da execução, **só se o direct saiu** (ou sem passo Instagram); falha não derruba nada e fica no disparo | PRD 4.B e 4.A ("Curtir: só Facebook") |
| D15 | **Curtir à mão na caixa de comentários (10A):** botão "Curtir"/"Descurtir" no comentário, **só em conta do Facebook** | PRD quadro A, linha 10D |
| D16 | **Etiqueta de clique não entra:** o Zernio não avisa clique em botão de link (seção 2.4) | PRD: "Adotar se a API avisar; senão, ignorar" |
| D17 | **Insights:** os gatilhos de direct usam o Insights da 5C sem mudança (execuções do motor). O nó do comentário ganha mais três números da tabela de disparos: "Fora do público", "Aguardando seguir", "Ocultados" | Mesmo padrão da D15 da 10B |
| D18 | **Limites:** 20 condições por filtro (o `MAXIMO_DE_PALAVRAS` da 10B), valor até 60 caracteres; mensagem de liberar até 640; título do botão de liberar até 20; intervalo 1 a 720 h; anexo pelo limite da biblioteca de mídia | Provisórios, conferir na bateria |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/escale/comentarios/constantes.ts` (10B, muda) | Eventos novos, operadores, textos padrão, limites, `SILENCIO_DA_AUTOMACAO_MS`, `PREFIXO_DO_LIBERAR` |
| `lib/escale/comentarios/schema.ts` (10B, muda) | Filtro com condições, público, repetição, próxima, ações do caminho, config dos gatilhos de direct, anexo do passo |
| `lib/escale/comentarios/filtro.ts` (novo) | Puras: `lerFiltro`, `casaComCondicao`, `casaComFiltro` (sai do `caminhos.ts`) |
| `lib/escale/comentarios/caminhos.ts` (10B, muda) | `caminhoDoComentario` com "próxima"; `problemasDoGatilho` com os itens novos; `dentroDaJanela` |
| `lib/escale/comentarios/publico.ts` (novo) | Puras: `decisaoDoPublico`, `payloadDoLiberar`, `disparoDoLiberar` |
| `lib/escale/comentarios/proxima.ts` (novo) | `resolverProximaPublicacao` (lê o Zernio, grava a regra) |
| `lib/escale/comentarios/direct.ts` (novo) | `extrasDoDirect` (pura), `aoReceberDirect` (servidor: regras, silêncio da IA, liberar, `emit_event`), `directCasa` (pura, para o motor) |
| `lib/escale/comentarios/liberar.ts` (novo) | `liberarDirect` (o toque no "Já estou seguindo") |
| `lib/escale/comentarios/zernio.ts` (10B, muda) | `enviarDirect`, `ocultarComentario`, `curtirComentario`, `descurtirComentario`, botões postback na `respostaPrivada`, motivos novos |
| `lib/escale/comentarios/disparos.ts` (10B, muda) | `reivindicarDisparos` pela RPC; `concluirDisparo` com público, ocultar e curtir |
| `lib/escale/comentarios/acao-do-instagram.ts` (10B, muda) | Modo direct (D8), "Siga para liberar" (D13) |
| `lib/escale/comentarios/eco.ts` (10B, muda) | Aceita `metadata.origem` `comentario` ou `direct` |
| `app/api/v1/escale/comentarios/[comentarioId]/curtir/route.ts` (novo) | POST/DELETE do "Curtir" à mão (D15) |
| `components/escale/automacoes/fluxo/comentario/FiltroDePalavras.tsx` (novo) | Lista de condições com operador (D3), usada pelo caminho e pelos gatilhos de direct |
| `components/escale/automacoes/fluxo/comentario/FormularioDoDirect.tsx` (novo) | Painel dos três gatilhos de direct |
| `components/escale/automacoes/fluxo/comentario/PublicoDoComentario.tsx` (novo) | Público, "quando não informado" e mensagem de liberar |
| `components/escale/automacoes/fluxo/comentario/RepeticaoDoComentario.tsx` (novo) | "Uma vez por pessoa" / "De novo depois de" |
| `components/escale/automacoes/fluxo/comentario/CorpoDoDirect.tsx` (novo) | Corpo do nó dos gatilhos de direct |
| Fork da 10B que muda | `FormularioDoComentario.tsx` (cartão "Próxima publicação", blocos novos), `CaminhoDoComentario.tsx` (filtro novo, ocultar, curtir), `CorpoDoComentario.tsx`, `PainelDoInstagram.tsx` (anexo), `CorpoDoInstagram.tsx`, `lib/escale/comentarios/tela.ts`, `lib/escale/automacoes/fluxo/{gatilhos,paleta}.ts`, `components/escale/automacoes/fluxo/{CorposDoNo.tsx,useFluxo.ts}`, `…/painel/{PainelDoGatilho,EscolhaDoGatilho}.tsx`, `…/insights/VisaoGeralDoNo.tsx`, `hooks/escale/useComentarios.ts` |
| Fork da 10A que muda | O item de comentário da caixa (nome conferido na Task 0) ganha "Curtir" |
| Encaixes (seção 6) | `lib/schemas/webhooks.ts`, `app/app/webhooks/_components/{labels.ts,RuleEditor.tsx}`, `lib/automation/engine.ts`, `lib/channels/social/parser.ts`, `lib/channels/zernio/ingest.ts`, `supabase/baseline.sql`, `lib/i18n/dicionario.ts` |
| Testes | `tests/unit/escale-comentarios-{filtro,publico,proxima,direct,liberar,zernio-10d,disparos-10d,acao-10d,motor-10d,formulario-direct,filtro-de-palavras,publico-tela,curtir}.test.ts(x)`, `tests/invariants/escale-comentarios-9804.test.ts` |
| Docs | `docs/modulos/10-comentarios.md` (estado da 10D, D4 e D16), `docs/modulos/5-automacoes.md` (os três gatilhos da fonte Instagram saem de "Em breve") |

---

## 1. Regras puras

### 1.1 Constantes (acrescentar em `lib/escale/comentarios/constantes.ts`)

```ts
/** FORK ESCALE · Fase 10D: os gatilhos de direct do Instagram (D1). */
export const GATILHO_DE_MENSAGEM_DO_INSTAGRAM = "instagram.message_received" as const;
export const GATILHO_DE_MENCAO_EM_STORY = "instagram.story_mention" as const;
export const GATILHO_DE_RESPOSTA_A_STORY = "instagram.story_reply" as const;
export const GATILHOS_DE_DIRECT = [
  GATILHO_DE_MENSAGEM_DO_INSTAGRAM,
  GATILHO_DE_MENCAO_EM_STORY,
  GATILHO_DE_RESPOSTA_A_STORY,
] as const;
export type GatilhoDeDirect = (typeof GATILHOS_DE_DIRECT)[number];
/** Os gatilhos em que o passo Instagram funciona (D8 + D9 da 10B). */
export const GATILHOS_DO_PASSO_DO_INSTAGRAM = [GATILHO_DE_COMENTARIO, ...GATILHOS_DE_DIRECT] as const;

/** Operadores do gatilho de mensagem da Clint (D3), na ordem do seletor. */
export const OPERADORES_DO_FILTRO = ["igual", "contem", "palavra_inteira", "comeca_com", "termina_com", "nao_contem"] as const;
export type OperadorDoFiltro = (typeof OPERADORES_DO_FILTRO)[number];
/** Clint: label.tIs, tContains, tContainsWholeWord, tStartsWith, tEndsWith, tDoesntContain. */
export const ROTULO_DO_OPERADOR: Readonly<Record<OperadorDoFiltro, string>> = {
  igual: "É",
  contem: "Contém",
  palavra_inteira: "Contém palavra inteira",
  comeca_com: "Começa com",
  termina_com: "Termina com",
  nao_contem: "Não contém",
};

/** D6: quanto a IA fica quieta na conversa depois de um direct que casou com uma automação. */
export const SILENCIO_DA_AUTOMACAO_MS = 10 * 60 * 1000;
export const MOTIVO_DO_SILENCIO = "automacao_do_instagram";
/** D8: janela da Meta para mensagem comum depois da última mensagem da pessoa. */
export const JANELA_DA_MENSAGEM_MS = 24 * 60 * 60 * 1000;
/** D13 */
export const PREFIXO_DO_LIBERAR = "escale:liberar:";
export const TEXTO_PADRAO_DO_LIBERAR = "Para receber o link, siga a conta e toque em Já estou seguindo.";
export const TITULO_PADRAO_DO_LIBERAR = "Já estou seguindo";
export const TEXTO_PADRAO_DE_QUEM_NAO_SEGUE = "Ainda não encontramos o seu follow. Siga a conta e toque de novo.";
export const MAXIMO_DE_TOQUES_NO_LIBERAR = 3;
/** D10 */
export const MAXIMO_DE_HORAS_DA_REPETICAO = 720;
/** D5 */
export const CACHE_DAS_REGRAS_DE_DIRECT_MS = 30_000;
```

### 1.2 Schema (mudanças em `lib/escale/comentarios/schema.ts`)

```ts
const condicaoSchema = z.object({
  operador: z.enum(OPERADORES_DO_FILTRO),
  valor: z.string().trim().min(1).max(MAXIMO_DA_PALAVRA),
});
/** D3: o filtro novo. O formato da 10B (`palavras`) continua aceito e é lido por `lerFiltro`. */
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA)).max(MAXIMO_DE_PALAVRAS).optional(),
    condicoes: z.array(condicaoSchema).max(MAXIMO_DE_PALAVRAS).optional(),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);

const caminhoSchema = z.object({
  id: z.string().min(1).max(40),
  publicacoes: z.array(publicacaoSchema).max(MAXIMO_DE_PUBLICACOES),
  filtro: filtroSchema,
  resposta: respostaSchema.nullable(),
  /** D14 */
  ocultar_depois: z.boolean().default(false),
  curtir: z.boolean().default(false),
});

const publicoSchema = z.object({
  quem: z.enum(["todos", "seguidores", "nao_seguidores"]),
  quando_nao_informado: z.enum(["enviar", "nao_enviar", "pedir_para_seguir"]),
  liberar: z.object({
    texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_COM_BOTAO),
    titulo: z.string().trim().min(1).max(MAXIMO_DO_TITULO_DO_BOTAO),
    texto_de_quem_nao_segue: z.string().trim().min(1).max(MAXIMO_DO_TEXTO_COM_BOTAO),
  }),
});
const repeticaoSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("uma_vez") }),
  z.object({ modo: z.literal("intervalo"), horas: z.number().int().min(1).max(MAXIMO_DE_HORAS_DA_REPETICAO) }),
]);
const proximaSchema = z.object({
  armada_em: z.string(),                                   // ISO
  conhecidas: z.array(z.string().min(1).max(64)).max(50),  // ids das publicações listadas ao armar
  resolvida: publicacaoSchema.extend({ publicada_em: z.string().nullable() }).nullable(),
});

export const configDoComentarioSchema = z.object({
  channel_session_id: z.string(),
  escopo: z.enum(["todos", "especificos", "proxima"]),
  caminhos: z.array(caminhoSchema).max(MAXIMO_DE_CAMINHOS + 1),
  publico: publicoSchema.nullable().default(null),         // null = "Todos" (10B)
  repeticao: repeticaoSchema.default({ modo: "uma_vez" }),
  proxima: proximaSchema.nullable().default(null),
});

export type PublicoDoComentario = z.infer<typeof publicoSchema>;
export type RepeticaoDoComentario = z.infer<typeof repeticaoSchema>;
export type AnexoDoInstagram = z.infer<typeof anexoSchema>; // anexoSchema declarado acima deste ponto na execução

/** D1, D2, D7: a configuração dos gatilhos de direct. */
export const configDoDirectSchema = z.object({
  channel_session_id: z.string(),
  filtro: filtroSchema,          // mention: sempre { modo: "qualquer" } (a tela não mostra o filtro)
});
export type ConfigDoDirect = z.infer<typeof configDoDirectSchema>;

const anexoSchema = z.object({
  tipo: z.enum(["image", "video", "audio", "file"]),
  url: z.string().url().max(2000).refine((u) => u.startsWith("https://"), "O anexo precisa de um endereço https://."),
  nome: z.string().max(200).nullable(),
});
export const configDoPassoDoInstagramSchema = z
  .object({
    texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO),
    botoes: z.array(botaoDoInstagramSchema).max(MAXIMO_DE_BOTOES),
    anexo: anexoSchema.nullable().default(null),           // D8
  })
  .refine((c) => c.botoes.length === 0 || c.texto.length <= MAXIMO_DO_TEXTO_COM_BOTAO, {
    message: "Com botão, a mensagem aceita até 640 caracteres.", path: ["texto"],
  });

/** superRefine: os gatilhos de direct com a configuração deles. */
export function exigirConfigDoDirect(regra: { trigger_event?: string; trigger_config?: Record<string, unknown> }, ctx: z.RefinementCtx): void;
```

- `exigirConfigDoDirect`: só para `GATILHOS_DE_DIRECT`; `configDoDirectSchema.safeParse` falhou → "Revise a configuração do gatilho."; `channel_session_id` vazio → "Selecione um dispositivo Instagram."; filtro `palavras` sem condição positiva (só `nao_contem`, ou nada) → "Preencha a palavra do filtro ou use \"Qualquer mensagem\".".
- `exigirGatilhoDoPassoDoInstagram` (10B) passa a aceitar todos de `GATILHOS_DO_PASSO_DO_INSTAGRAM`; mensagem nova: "O passo Instagram funciona com os gatilhos do Instagram.".
- Novo `superRefine` `exigirAnexoSoNoDirect`: regra com gatilho de comentário e passo Instagram com `anexo` → `path: ["actions"]`, "No comentário, a primeira mensagem aceita só texto e botões (regra do Instagram).".

### 1.3 Filtro (`lib/escale/comentarios/filtro.ts`)

```ts
export interface CondicaoDoFiltro { operador: OperadorDoFiltro; valor: string }
export type FiltroLido = { modo: "qualquer" } | { modo: "palavras"; condicoes: CondicaoDoFiltro[]; combinar: "qualquer" | "todas" };

/** D3: o formato da 10B (`palavras`) vira `contem` em cada palavra; `condicoes` vem depois delas. Vazias somem. */
export function lerFiltro(filtro: FiltroDoCaminho): FiltroLido;
export function casaComCondicao(texto: string, c: CondicaoDoFiltro): boolean;
/** Positivas por `combinar`; `nao_contem` sempre bloqueia. Sem positiva → false (o schema recusa salvar assim). */
export function casaComFiltro(texto: string, filtro: FiltroDoCaminho): boolean;
```

`casaComCondicao` sobre `t = normalizar(texto)` e `v = normalizar(valor)` (exportar `normalizar` de `lib/automation/palavra-chave.ts` é encaixe? **Não**: copiar a função de 1 linha para `filtro.ts` com o comentário "mesma normalização de `lib/automation/palavra-chave.ts`", e um teste garante as duas iguais em 6 entradas):
- `igual`: `t === v`; `contem`: `t.includes(v)`; `comeca_com`: `t.startsWith(v)`; `termina_com`: `t.endsWith(v)`; `nao_contem`: `!t.includes(v)`;
- `palavra_inteira`: `new RegExp("(^|[^\\p{L}\\p{N}])" + escaparRegex(v) + "($|[^\\p{L}\\p{N}])", "u").test(t)` (a palavra "eu" casa em "eu quero" e não em "seu").

`casaComFiltro`: `qualquer` → true; senão `positivas = condicoes.filter(op !== "nao_contem")`, `bloqueios = op === "nao_contem"`; `positivas.length === 0` → false; `bloqueios.some(b => !casaComCondicao(texto, b))` → false; `combinar === "todas" ? positivas.every : positivas.some`.

O `casaComFiltro` da 10B em `caminhos.ts` passa a reexportar o daqui (`export { casaComFiltro } from "./filtro"`), para não mudar quem importa.

### 1.4 Caminhos (mudanças em `lib/escale/comentarios/caminhos.ts`)

- `caminhoDoComentario(triggerConfig, payload)`: escopo `proxima` → sem `proxima.resolvida` devolve `null` (quem resolve é o `receber`, D11, antes do motor); com `resolvida` → o primeiro caminho, se `resolvida.id === comentario.publicacao_id`, com o filtro casando. Os outros escopos como na 10B, agora com `casaComFiltro` da 1.3.
- `problemasDoGatilho` ganha, depois do item 11 da 10B:
  12. escopo `proxima` com número de caminhos ≠ 1 ou com publicação → "Revise a configuração do gatilho.";
  13. escopo `proxima` sem `proxima` → "Revise a configuração do gatilho.";
  14. filtro `palavras` só com "Não contém" → "Adicione ao menos uma condição que não seja \"Não contém\".";
  15. `curtir` num caminho com conta do Instagram → não é problema da regra pura (ela não sabe a rede); a tela esconde o interruptor, e o `concluirDisparo` ignora `curtir` fora do Facebook.
- `export function dentroDaJanela(recebidaEm: string, agora: Date): boolean` (24 h, data ilegível → false).

### 1.5 Público (`lib/escale/comentarios/publico.ts`)

```ts
export type DecisaoDoPublico = "enviar" | "fora_do_publico" | "pedir_para_seguir";
/** D12/D13. `seguidor` = isFollower do webhook (null = não informado). Facebook (plataforma) → sempre "enviar". */
export function decisaoDoPublico(publico: PublicoDoComentario | null, plataforma: PlataformaDeComentario, seguidor: boolean | null): DecisaoDoPublico;
export function payloadDoLiberar(disparoId: string): string;          // `${PREFIXO_DO_LIBERAR}${disparoId}`
export function disparoDoLiberar(payload: string | null | undefined): string | null; // uuid depois do prefixo, senão null
```

Tabela de `decisaoDoPublico` (`publico` null ou `quem: "todos"` → `enviar`):

| quem | seguidor true | seguidor false | não informado |
|---|---|---|---|
| seguidores | enviar | pedir_para_seguir | por `quando_nao_informado`: enviar / fora_do_publico / pedir_para_seguir |
| nao_seguidores | fora_do_publico | enviar | por `quando_nao_informado`, com `pedir_para_seguir` tratado como `fora_do_publico` |

### 1.6 Extras do direct e casamento (`lib/escale/comentarios/direct.ts`, parte pura)

```ts
export interface ExtrasDoDirect {
  mencaoEmStory: boolean;                       // metadata.isStoryMention
  respostaAStory: { storyId: string; storyUrl: string | null } | null; // metadata.storyReply
  botao: string | null;                         // metadata.postbackPayload ?? metadata.quickReplyPayload
  seguidor: boolean | null;                     // message.sender.instagramProfile.isFollower
}
/** Lê do payload cru do `message.received` do Zernio. Nunca lança; ausente = falso/null. */
export function extrasDoDirect(payload: unknown): ExtrasDoDirect;

/** O gatilho de direct desta mensagem: mention → story_mention; storyReply → story_reply; o resto → message_received. Botão do liberar → null (D13). */
export function gatilhoDoDirect(extras: ExtrasDoDirect): GatilhoDeDirect | null;

/** O evento que o fork emite (forma do payload, seção 3.2). */
export const directDoEventoSchema: z.ZodType<DirectDoEvento>;
export interface DirectDoEvento {
  contact_id: string; conversation_id: string; message_id: string; channel_session_id: string;
  plataforma: PlataformaDeComentario; conta_id: string; conversa_zernio_id: string;
  texto: string; recebida_em: string; seguidor: boolean | null;
  story: { id: string; url: string | null } | null;
}
/** Para o motor (encaixe 3): a regra casa se a conta é a do evento e o filtro casa com o texto (mention: sempre). */
export function directCasa(evento: string, triggerConfig: unknown, payload: unknown): boolean;
```

### 1.7 Puras da casca (mudanças em `lib/escale/comentarios/tela.ts`)

- `configInicialDoComentario()` ganha `publico: null, repeticao: { modo: "uma_vez" }, proxima: null` e o caminho `ocultar_depois: false, curtir: false`.
- `export function configInicialDoDirect(evento: GatilhoDeDirect): ConfigDoDirect` → `{ channel_session_id: "", filtro: { modo: "qualquer" } }`.
- `telaInicialDoGatilho(evento)`: os três de direct usam `configInicialDoDirect`; `comConfigPropria` também os põe em `tela.configPropria`.
- `export function armarProxima(publicacoes: readonly PublicacaoDaConta[], agora: Date): NonNullable<ConfigDoComentario["proxima"]>` → `{ armada_em: agora.toISOString(), conhecidas: publicacoes.map(p => p.id).slice(0, 50), resolvida: null }`.
- `export function publicoPadrao(): PublicoDoComentario` → `{ quem: "seguidores", quando_nao_informado: "enviar", liberar: { texto: TEXTO_PADRAO_DO_LIBERAR, titulo: TITULO_PADRAO_DO_LIBERAR, texto_de_quem_nao_segue: TEXTO_PADRAO_DE_QUEM_NAO_SEGUE } }`.
- `export function filtroComCondicoes(filtro: FiltroDoCaminho): FiltroDoCaminho` → regrava o formato da 10B como `condicoes` (a tela sempre salva no formato novo; nada muda no comportamento).

---

## 2. Banco e Zernio

### 2.1 Migration 9804 (`supabase/migrations/20261203150000_9804_instagram_avancado.sql`)

Antes de escrever, conferir na `main` (Task 0) os nomes da 9801/9802 citados aqui (`uq_escale_disparos_de_comentario_pessoa`, os `check` de `direct` e `resposta`, `fn_escale_resumo_dos_comentarios`). Os nomes dos `check` gerados pelo Postgres saem de `select conname from pg_constraint where conrelid = 'public.escale_disparos_de_comentario'::regclass`; a migration usa `drop constraint if exists` com os nomes conferidos.

```sql
-- manifest: **Instagram avançado (fork Escale, Fase 10D).** `escale_disparos_de_comentario` ganha os desfechos `aguardando_seguir` e `fora_do_publico` no direct, as colunas `ocultar` e `curtir` (`pendente`/`feito`/`falhou`/`nao_pedido`), `toques_no_liberar` e `direct_pendente` (o direct guardado do "Siga para liberar"). O índice único por pessoa (`uq_escale_disparos_de_comentario_pessoa`) sai: a regra "uma vez por pessoa" ou "de novo depois de N horas" passa para a função `fn_escale_reivindicar_disparo` (security definer, só service_role), que trava por regra e pessoa com `pg_advisory_xact_lock` e grava normal ou `repetido` na mesma transação. O índice único por comentário fica. `fn_escale_resumo_dos_comentarios` é recriada com `fora_do_publico`, `aguardando_seguir` e `ocultados`. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · Instagram avançado (migration 9804) ----

alter table public.escale_disparos_de_comentario
  drop constraint if exists escale_disparos_de_comentario_direct_check;
alter table public.escale_disparos_de_comentario
  add constraint escale_disparos_de_comentario_direct_check
  check (direct in ('pendente', 'enviado', 'falhou', 'sem_passo', 'pulado', 'aguardando_seguir', 'fora_do_publico'));

alter table public.escale_disparos_de_comentario
  add column if not exists ocultar text not null default 'nao_pedido'
    check (ocultar in ('nao_pedido', 'pendente', 'feito', 'falhou')),
  add column if not exists curtir text not null default 'nao_pedido'
    check (curtir in ('nao_pedido', 'pendente', 'feito', 'falhou')),
  add column if not exists toques_no_liberar smallint not null default 0
    check (toques_no_liberar between 0 and 10),
  add column if not exists direct_pendente jsonb
    check (direct_pendente is null or pg_column_size(direct_pendente) <= 8192);

drop index if exists public.uq_escale_disparos_de_comentario_pessoa;
create index if not exists idx_escale_disparos_de_comentario_pessoa
  on public.escale_disparos_de_comentario (rule_id, plataforma, autor_id, created_at desc)
  where not repetido;

-- Decide e grava o disparo de UM comentário numa regra, sem corrida entre dois
-- comentários da mesma pessoa: a trava é por (regra, rede, autor).
-- Devolve 'novo' | 'repetido' | 'ja_existe' (reentrega do mesmo comentário).
create or replace function public.fn_escale_reivindicar_disparo(p_linha jsonb, p_intervalo_horas integer)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_rule uuid := (p_linha ->> 'rule_id')::uuid;
  v_plat text := p_linha ->> 'plataforma';
  v_autor text := p_linha ->> 'autor_id';
  v_ultimo timestamptz;
  v_repetido boolean;
begin
  perform pg_advisory_xact_lock(hashtextextended(v_rule::text || ':' || v_plat || ':' || v_autor, 9804));

  if exists (
    select 1 from public.escale_disparos_de_comentario d
     where d.organization_id = (p_linha ->> 'organization_id')::uuid
       and d.rule_id = v_rule
       and d.comentario_id = p_linha ->> 'comentario_id'
  ) then
    return 'ja_existe';
  end if;

  select max(d.created_at) into v_ultimo
    from public.escale_disparos_de_comentario d
   where d.rule_id = v_rule and d.plataforma = v_plat and d.autor_id = v_autor and not d.repetido;

  v_repetido := v_ultimo is not null
    and (p_intervalo_horas is null or v_ultimo > now() - make_interval(hours => p_intervalo_horas));

  insert into public.escale_disparos_de_comentario (
    organization_id, rule_id, channel_session_id, event_id, contact_id, caminho_id, plataforma,
    comentario_id, publicacao_id, autor_id, autor_usuario, autor_nome, texto, comentado_em,
    publicacao_legenda, publicacao_miniatura, publicacao_link,
    repetido, direct, resposta, motivo, ocultar, curtir
  ) values (
    (p_linha ->> 'organization_id')::uuid, v_rule, nullif(p_linha ->> 'channel_session_id', '')::uuid,
    nullif(p_linha ->> 'event_id', '')::uuid, nullif(p_linha ->> 'contact_id', '')::uuid,
    p_linha ->> 'caminho_id', v_plat, p_linha ->> 'comentario_id', p_linha ->> 'publicacao_id',
    v_autor, p_linha ->> 'autor_usuario', p_linha ->> 'autor_nome', p_linha ->> 'texto',
    (p_linha ->> 'comentado_em')::timestamptz,
    p_linha ->> 'publicacao_legenda', p_linha ->> 'publicacao_miniatura', p_linha ->> 'publicacao_link',
    v_repetido,
    case when v_repetido then 'pulado' else coalesce(p_linha ->> 'direct', 'pendente') end,
    case when v_repetido then 'pulada' else 'pendente' end,
    case when v_repetido then 'ja_recebeu' else p_linha ->> 'motivo' end,
    case when v_repetido then 'nao_pedido' else coalesce(p_linha ->> 'ocultar', 'nao_pedido') end,
    case when v_repetido then 'nao_pedido' else coalesce(p_linha ->> 'curtir', 'nao_pedido') end
  );
  return case when v_repetido then 'repetido' else 'novo' end;
exception when unique_violation then
  return 'ja_existe';
end;
$$;

revoke all on function public.fn_escale_reivindicar_disparo(jsonb, integer) from public, anon, authenticated;
grant execute on function public.fn_escale_reivindicar_disparo(jsonb, integer) to service_role;

create or replace function public.fn_escale_resumo_dos_comentarios(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'comentarios', count(*) filter (where not d.repetido),
    'repetidos', count(*) filter (where d.repetido),
    'directs', count(*) filter (where d.direct = 'enviado'),
    'directs_com_falha', count(*) filter (where d.direct = 'falhou'),
    'respostas', count(*) filter (where d.resposta = 'publicada'),
    'respostas_com_falha', count(*) filter (where d.resposta = 'falhou'),
    'fora_do_publico', count(*) filter (where d.direct = 'fora_do_publico'),
    'aguardando_seguir', count(*) filter (where d.direct = 'aguardando_seguir'),
    'ocultados', count(*) filter (where d.ocultar = 'feito')
  )
  from public.escale_disparos_de_comentario d
  where d.rule_id = p_regra and (p_desde is null or d.created_at >= p_desde);
$$;

revoke all on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) from public, anon;
grant execute on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) to authenticated, service_role;

notify pgrst, 'reload schema';
```

`p_intervalo_horas null` = "uma vez por pessoa" (qualquer disparo anterior não repetido conta). O `insert` da função carrega as colunas da 10C; se a 10C tiver mudado nomes, ajustar na Task 0.

### 2.2 Invariantes (`tests/invariants/escale-comentarios-9804.test.ts`)

Molde `tests/invariants/escale-comentarios-9801.test.ts` (10B) e `-9802` (10C). Ids `e5ca1e00-9804-4000-8000-…`. Casos:
- `authenticated` não executa `fn_escale_reivindicar_disparo` (erro de permissão); a função é definer com `search_path = ''` (`pg_proc.prosecdef`, `proconfig`);
- como `service_role`: primeiro comentário de Ana → `novo`; o mesmo `comentario_id` de novo → `ja_existe` (uma linha só); segundo comentário de Ana com `p_intervalo_horas null` → `repetido` (`direct 'pulado'`, `resposta 'pulada'`, `motivo 'ja_recebeu'`);
- intervalo: com `p_intervalo_horas = 1` e a linha de Ana com `created_at` empurrada 2 h para trás (`update … set created_at = now() - interval '2 hours'`) → o novo comentário é `novo`; com a linha a 30 min → `repetido`;
- duas pessoas diferentes na mesma regra → as duas `novo`; a mesma pessoa em regras diferentes → as duas `novo`;
- corrida: duas conexões `service_role` chamando a função ao mesmo tempo para dois comentários da mesma pessoa (`Promise.all` com dois clientes `postgres`) → exatamente um `novo` e um `repetido`;
- o `check` novo de `direct` aceita `aguardando_seguir` e `fora_do_publico` e recusa `talvez` (`23514`); `ocultar`/`curtir` recusam valor fora da lista; `toques_no_liberar` 11 → `23514`;
- `fn_escale_resumo_dos_comentarios` conta `fora_do_publico`, `aguardando_seguir` e `ocultados`; membro de outra organização vê zero;
- o índice único por pessoa não existe mais (`pg_indexes`), o por comentário existe.

### 2.3 Cliente do Zernio (acrescentar em `lib/escale/comentarios/zernio.ts`)

```ts
/** POST inbox/conversations/{conversationId}/messages (SendInboxMessageRequest). D8 e D13 (direct depois do toque). */
export function enviarDirect(chave: string, e: { conversaZernioId: string; accountId: string; texto: string;
  botoes: readonly BotaoDoDirect[]; anexo?: { tipo: string; url: string } | null }): Promise<RespostaDoZernio<{ messageId: string | null }>>;
// corpo: { accountId, message, ...(botoes.length ? { buttons } : {}), ...(anexo ? { attachmentUrl: anexo.url, attachmentType: anexo.tipo } : {}) }
// D8: com anexo E texto, são DUAS chamadas: primeiro o texto (com botões), depois { accountId, attachmentUrl, attachmentType }.
//     `enviarDirect` faz as duas; falha do anexo devolve ok com `anexoFalhou: true` (o texto já saiu).

export type BotaoDoDirect = { tipo: "url"; titulo: string; url: string } | { tipo: "postback"; titulo: string; payload: string };
// `respostaPrivada` (10B) passa a aceitar BotaoDoDirect[] (o postback do D13).

/** POST inbox/comments/{postId}/{commentId}/hide com { accountId }. */
export function ocultarComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
/** POST e DELETE inbox/comments/{postId}/{commentId}/like com { accountId } (só Facebook, D14/D15). */
export function curtirComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
export function descurtirComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
```

`pedir` (10B) ganha o método `DELETE`. `MotivoDoDirect` ganha `janela_fechada` e `nao_seguiu`; `motivoDoErro` reconhece a janela fechada pelo corpo (código Meta 10 com subcódigo 2018278, ou texto que contenha `outside of allowed window`) → `janela_fechada`. `EXPLICACAO_DO_MOTIVO`:
- `janela_fechada`: "Passaram 24 horas desde a última mensagem da pessoa. O Instagram só aceita mensagem dentro dessa janela."
- `nao_seguiu`: "A pessoa tocou em liberar 3 vezes sem seguir a conta. O direct não foi enviado."

### 2.4 Contrato do Zernio (conferido no SDK 0.0.1300 em 01/11; a Task 0 prova numa chamada real)

| Uso | Chamada / campo | O que importa |
|---|---|---|
| Mention e resposta a story | `message.received` → `metadata.isStoryMention` (só Instagram), `metadata.storyReply.{storyId, storyUrl}` | Mutuamente exclusivos; `storyUrl` vence em ~24 h |
| Toque em botão | `message.received` → `metadata.postbackPayload`, `metadata.postbackTitle` (e `quickReplyPayload`) | É o único aviso de toque; botão de link não avisa (D16) |
| Seguidor | `message.sender.instagramProfile.isFollower`; `comment.author.instagramProfile.isFollower` | Opcional: ausente = não informado (D12) |
| Botão postback na resposta privada | `POST inbox/comments/{postId}/{commentId}/private-reply`, `buttons: [{ type: "postback", title, payload }]` | 1 a 3 botões; aparecem em Solicitações de mensagem |
| Direct comum | `POST inbox/conversations/{conversationId}/messages` com `accountId`, `message`, `buttons` (máx. 3, título ≤ 20) e `attachmentUrl`/`attachmentType` | O adaptador do original já usa o mesmo caminho (`lib/channels/social/adapter.ts`) |
| Ocultar | `POST inbox/comments/{postId}/{commentId}/hide` | Instagram e Facebook |
| Curtir | `POST`/`DELETE inbox/comments/{postId}/{commentId}/like` | Facebook geral; Instagram só em liberação restrita (403 `PLATFORM_BETA_RESTRICTED`) |
| Publicação nova | `post.external.created` | Por varredura (~1 h), não em tempo real: **não usado** (D11) |
| Clique em link | — | Não existe (D16) |

---

## 3. Servidor

### 3.1 Comentário: público, próxima e repetição (`receber.ts`, `proxima.ts`, `disparos.ts`)

- **`lerComentarioDoWebhook`** (10B) passa a ler `comment.author.instagramProfile.isFollower` → `autor.seguidor: boolean | null`, e o payload do evento `comment.received` ganha `comentario.autor.seguidor` (o `comentarioDoEventoSchema` aceita `seguidor: z.boolean().nullable().default(null)`).
- **`receberComentario`** (10B), passo 4: antes de procurar caminho, para cada regra ativa com `escopo: "proxima"` e `proxima.resolvida` nulo cuja conta é a do canal e cuja `proxima.conhecidas` não tem a publicação do comentário, chama `resolverProximaPublicacao`. Depois segue igual (o `caminhoDoComentario` já vê a regra resolvida).

```ts
/** D11. Lê as publicações da conta, acha "a próxima" e grava na regra se for a do comentário. Devolve o trigger_config novo, ou null. Nunca lança (loga). */
export async function resolverProximaPublicacao(admin: SupabaseClient, e: {
  organizationId: string; regraId: string; triggerConfig: ConfigDoComentario; chave: string; contaId: string;
  publicacaoDoComentario: string;
}): Promise<ConfigDoComentario | null>;
```

`publicacoesDaConta` (10B); a candidata é a de menor `criadaEm >= proxima.armada_em` (data ilegível fica fora); se `candidata.id !== publicacaoDoComentario` → null. Senão monta `resolvida` (id, legenda, miniatura, tipo, `publicada_em`) e grava com update condicional: `automation_rules` `update({ trigger_config: novo })` com `.eq("id", regraId).eq("organization_id", org).is("trigger_config->proxima->resolvida", null)` (conferir na Task 0 que o PostgREST aceita o filtro por caminho JSON; senão, RPC pequena não entra: ler, conferir e gravar com `.eq("updated_at", lido)`). Nenhuma linha afetada → relê a regra e devolve o config atual (outro comentário resolveu antes).

- **`reivindicarDisparos`** (10B) passa a chamar `admin.rpc("fn_escale_reivindicar_disparo", { p_linha, p_intervalo_horas })` por regra (`p_intervalo_horas = repeticao.modo === "intervalo" ? repeticao.horas : null`). Antes de chamar, decide o público: `decisaoDoPublico(config.publico, plataforma, autor.seguidor)`:
  - `fora_do_publico` → `p_linha.direct = "fora_do_publico"`, `motivo = "fora_do_publico"`; a regra **não** volta para execução;
  - `enviar` / `pedir_para_seguir` → `p_linha` normal com `ocultar`/`curtir` = `"pendente"` quando o caminho pede (`curtir` só com plataforma `facebook`). Resultado `novo` → a regra roda; `repetido` / `ja_existe` → não roda.
  - A decisão `pedir_para_seguir` não é gravada aqui; quem a aplica é o passo Instagram (3.3), que relê o público.
- **`concluirDisparo`** (10B) ganha, depois da resposta pública: `direct === "aguardando_seguir"` → não publica resposta nem oculta nem curte agora (`liberarDirect` faz isso depois, D13); `direct === "enviado"` (ou sem passo) → `ocultar === "pendente"` chama `ocultarComentario` → `feito`/`falhou`; `curtir === "pendente"` → `curtirComentario` → `feito`/`falhou`. Falha só loga e grava o estado (o `motivo` do direct não é sobrescrito). Extrair a parte "ações no comentário" para `async function acoesNoComentario(admin, disparo, comentario, chave)` (o `liberarDirect` reaproveita).

### 3.2 Direct que entra (`lib/escale/comentarios/direct.ts`)

```ts
export type ResultadoDoDirect = { calarIa: boolean };
/** Chamado pela ingestão (encaixe 5) DEPOIS de gravar a mensagem e ANTES do despacho do agente. Nunca lança. */
export async function aoReceberDirect(admin: SupabaseClient, e: {
  organizationId: string; channelSessionId: string; contactId: string; conversationId: string; messageId: string;
  msg: SocialMessage; extras: ExtrasDoDirect;
}): Promise<ResultadoDoDirect>;
```

1. `msg.platform` fora de instagram/facebook, ou `msg.direction !== "inbound"` → `{ calarIa: false }`.
2. `disparoDoLiberar(extras.botao)` não nulo → `await liberarDirect(admin, { organizationId, disparoId, seguidor: extras.seguidor, conversaZernioId: msg.conversationId, contaId: msg.accountId })` e `silenciar(...)`; `{ calarIa: true }` (o toque é da automação; não dispara gatilho de direct).
3. `gatilho = gatilhoDoDirect(extras)`. Mention com plataforma ≠ instagram → nada.
4. Regras ativas do gatilho na organização (cache D5: `Map<org, { em, regras }>` de `automation_rules` `select("id, trigger_event, trigger_config")` com `trigger_event in GATILHOS_DE_DIRECT` e `is_active`; filtra em memória pelo gatilho). Nenhuma com `directCasa(gatilho, cfg, payloadProvisorio)` → `{ calarIa: false }`.
5. `silenciar(admin, organizationId, conversationId)`: lê `bot_silenced_until`; se é nulo ou menor que `agora + SILENCIO_DA_AUTOMACAO_MS`, grava `bot_silenced_until`, `last_handoff_at = agora`, `last_handoff_reason = MOTIVO_DO_SILENCIO` (mesma regra "nunca encurta" do `pausarIaPorAtendimentoManual`, que não é usado porque o prazo dele é o da empresa). Erro → loga.
6. `emit_event` com `p_event_type: gatilho`, `p_entity_kind: "contact"`, `p_entity_id: contactId`, `p_payload` na forma `DirectDoEvento` (`recebida_em = msg.sentAt ?? agora`, `conversa_zernio_id = msg.conversationId`, `story` de `extras.respostaAStory` ou, na mention, `{ id: msg.externalId, url: primeiro anexo }`), `p_metadata: { source: "zernio_direct" }`. Erro → loga (a mensagem já foi gravada; não derruba a ingestão).
7. `{ calarIa: true }`.

O teste prova a ordem: a ingestão chama `aoReceberDirect` antes de `aplicarEfeitosPosEntrada`, e com `calarIa` a conversa já está com `bot_silenced_until` quando o despacho do agente roda (o despacho lê esse campo; conferir na Task 0 em `lib/channels/pos-entrada.ts` que o agente respeita `bot_silenced_until`; se a checagem for em outro campo, usar o mesmo).

### 3.3 Passo Instagram (mudanças em `acao-do-instagram.ts`)

O passo 2 da 10B ("só com gatilho de comentário") vira um desvio:
- **Gatilho de direct (D8):** `directDoEventoSchema.safeParse(ctx.event.payload)`; fora da janela (`dentroDaJanela(recebida_em)`) → `failed`, `janela_fechada`; texto pelo renderizador; credencial; `gravarDirectNaConversa` (10B) com `metadata.origem = "direct"` e `metadata.anexo`; `enviarDirect`; ok → `confirmarDirect`, `success` (com `detail.anexo_falhou` se for o caso); recusa → `motivoDoErro`, `falharDirect`, `failed` com `detail.{reason, explicacao}`. Sem disparo (não há tabela para direct).
- **Gatilho de comentário:** o caminho da 10B, com dois acréscimos antes do envio:
  - `decisaoDoPublico(config.publico, plataforma, autor.seguidor) === "pedir_para_seguir"` → `respostaPrivada` com `liberar.texto` e o botão `{ tipo: "postback", titulo: liberar.titulo, payload: payloadDoLiberar(disparo.id) }`; disparo `direct = "aguardando_seguir"`, `direct_pendente = { texto: renderizado, botoes }`; a mensagem de liberar é gravada na conversa como a 10B grava o direct; `success` com `detail.reason "aguardando_seguir"` e `explicacao` "A pessoa ainda não segue a conta. Ela recebeu o pedido para seguir e o link sai quando tocar em Já estou seguindo.";
  - `config.anexo` no gatilho de comentário → ignorado (o schema já recusa salvar; defesa).

### 3.4 Liberar (`lib/escale/comentarios/liberar.ts`)

```ts
/** D13: o toque no "Já estou seguindo". Nunca lança. */
export async function liberarDirect(admin: SupabaseClient, e: {
  organizationId: string; disparoId: string; seguidor: boolean | null; conversaZernioId: string; contaId: string;
}): Promise<"enviado" | "pediu_de_novo" | "desistiu" | "ignorado">;
```

1. Disparo da organização com `direct = "aguardando_seguir"`; não achou → `ignorado`.
2. Regra do disparo (para `publico.liberar` e o caminho); credencial pela conta.
3. `seguidor === true` → `enviarDirect` com `direct_pendente` (gravado na conversa com `origem "direct"`); ok → disparo `enviado`, `direct_message_id`, `direct_pendente = null`; depois a resposta pública que estava esperando (mesma lógica do `concluirDisparo` para a resposta) e `acoesNoComentario`. Falha → disparo `falhou` + motivo. → `enviado`.
4. Senão (`false` ou não informado): `toques_no_liberar + 1`; chegou a `MAXIMO_DE_TOQUES_NO_LIBERAR` → disparo `falhou`, motivo `nao_seguiu`, `direct_pendente = null` → `desistiu`; antes disso → `enviarDirect` com `liberar.texto_de_quem_nao_segue` e o mesmo botão postback → `pediu_de_novo`.

---

## 4. Telas (provisórias)

### 4.1 Escolha do gatilho (`EscolhaDoGatilho`, `gatilhos.ts`)

A fonte "instagram" da 10B passa os três cartões de `emBreve` para `opcoes`, na ordem da captura 07-020: `{ evento: "instagram.message_received", titulo: "Contato envia uma mensagem", descricao: "O contato envia uma mensagem para o Instagram", icone: "mensagem" }`, o de comentário (10B), `{ evento: "instagram.story_mention", titulo: "Alguém marca a conta em um story", descricao: "Quando alguém menciona a conta do Instagram em um story", icone: "instagram" }`, `{ evento: "instagram.story_reply", titulo: "Alguém responde a um story", descricao: "Quando alguém responde a um story da conta do Instagram", icone: "instagram" }`. `emBreve` fica vazio (o campo continua no tipo). `precisaDeFormulario` → true para os três.

### 4.2 Painel dos gatilhos de direct (`FormularioDoDirect`)

O `PainelDoGatilho` escolhe: evento em `GATILHOS_DE_DIRECT` → `<FormularioDoDirect evento config aoMudar />`. Corpo:
1. **"Selecione o dispositivo Instagram"** + `AjudaDaCasca` — o `SeletorDeConta` da 10B, com a prop nova `soInstagram` nos dois de story. Sem a garantia de assinatura (o `message.received` já é assinado).
2. Divisória. **Mention:** só o texto 12 px `casca-texto-2` em caixa `rounded-lg bg-casca-raia p-3`: "Este gatilho dispara para toda menção recebida pela conta. Não há texto para filtrar." **Mensagem e resposta a story:** **"Filtro de mensagem"** 12 px 600 com os dois botões segmentados "Qualquer mensagem" / "Com palavras" e, com palavras, o `FiltroDePalavras` (4.3).
3. Aviso `casca-aviso` (só "Contato envia uma mensagem" com "Qualquer mensagem"): "Com \"Qualquer mensagem\", o agente de IA fica em silêncio por 10 minutos a cada mensagem desta conta, para a automação responder sozinha." Com palavras, nota 11 px `casca-suave`: "Quando a mensagem casar com o filtro, o agente de IA fica em silêncio por 10 minutos nesta conversa."

### 4.3 Filtro com operadores (`FiltroDePalavras`, D3)

Substitui o campo de chips da 10B no `CaminhoDoComentario` e é usado no `FormularioDoDirect`. Lista de linhas `flex items-center gap-2`: `SeletorDaCasca` do operador (largura 180, opções de `ROTULO_DO_OPERADOR` por `t()`), `CampoDeTexto` do valor (placeholder "Digite a palavra"), `Trash2` 14 ("Remover condição"). Embaixo, "+ Adicionar condição" (desabilitado com 20) e "Combinar palavras com" + `SeletorDaCasca` ("Qualquer palavra", "Todas as palavras"); com só uma condição positiva, o seletor de combinar some. Linha de "Não contém": o operador aparece em `casca-alerta` e a dica `AjudaDaCasca` "\"Não contém\" sempre impede o disparo, qualquer que seja a combinação." Abrir um filtro da 10B mostra cada palavra como "Contém" (`filtroComCondicoes`).

### 4.4 Gatilho de comentário: blocos novos (`FormularioDoComentario`, `CaminhoDoComentario`)

- **Escopo:** terceiro cartão "Próxima publicação" / "Um caminho para a primeira publicação feita depois de salvar". Escolher → `caminhos = [caminho único]` e `proxima = armarProxima(publicacoes, agora)` (usa `usePublicacoesDaConta` da 10B; sem conta, o cartão fica desabilitado com "Selecione um dispositivo para ver as publicações."). Com `proxima.resolvida`: no lugar do resumo, a publicação (miniatura 40, legenda, "Publicada em {dd/mm/aaaa HH:mm}") e o texto 11 px "Esta automação agora vale só para esta publicação."; sem resolver: "Aguardando a próxima publicação da conta. Ela vira o caminho do fluxo assim que alguém comentar nela."
- **Público** (`PublicoDoComentario`, só com conta do Instagram), depois dos caminhos: título "Quem recebe a mensagem" 13 px 600 + `AjudaDaCasca` ("O Instagram informa se a pessoa segue a conta. Quando não informa, vale a opção abaixo."). `SeletorDaCasca` "Todos" / "Só seguidores" / "Só quem não segue"; fora de "Todos": "Quando o Instagram não informar" + `SeletorDaCasca` ("Enviar mesmo assim", "Não enviar", e só em "Só seguidores" "Pedir para seguir"). Com "Só seguidores": bloco "Siga para liberar" `rounded-lg bg-casca-raia p-3` com "Mensagem para quem ainda não segue" (`textarea`, contador `/640`), "Título do botão" (contador `/20`) e "Mensagem quando tocar sem seguir" (`textarea`, `/640`); nota 11 px "Quem não segue recebe esta mensagem com o botão. O link sai quando a pessoa seguir e tocar no botão (até 3 toques)." Primeira escolha fora de "Todos" preenche com `publicoPadrao()`.
- **Repetição** (`RepeticaoDoComentario`): título "Quantas vezes a mesma pessoa recebe" 13 px 600; dois botões segmentados "Uma vez por pessoa" / "De novo depois de"; no segundo, campo numérico (o `CampoDeNumero` da casca, se existir; senão `CampoDeTexto` com `inputMode="numeric"`) e o texto "horas" (1 a 720).
- **No caminho:** depois da resposta ao comentário, dois `InterruptorDaCasca`: "Ocultar o comentário depois do direct" (dica "O comentário continua visível para quem comentou e para a conta.") e, só com conta do Facebook, "Curtir o comentário".

### 4.5 Nós

- `CorpoDoDirect` (no `CorposDoNo`, evento de direct): chip da conta (como o da 10B) e uma linha `rounded-lg bg-casca-raia px-3 py-2` com o filtro ("Qualquer mensagem" ou as condições em chips "Contém · eu quero"); mention: "Toda menção à conta em story".
- `CorpoDoComentario` (10B): "Próxima publicação" como rótulo do caminho (ou a legenda da resolvida); chips 10 px por caminho quando `ocultar_depois` ("Oculta") e `curtir` ("Curte"); linha 11 px do público ("Só seguidores · Siga para liberar") e da repetição ("De novo depois de 24 h") quando não são o padrão.
- `CorpoDoInstagram` (10B): anexo como linha 12 px com `Paperclip` 12 e o nome do arquivo.

### 4.6 Passo Instagram: anexo (`PainelDoInstagram`)

Com gatilho de direct: depois dos botões, "Anexo" 13 px 600 + "+ Adicionar anexo" que abre a biblioteca de mídia do PR #148 (reaproveitar o componente do clipe das respostas rápidas; conferir o nome na Task 0) e grava `{ tipo, url, nome }`; anexo escolhido aparece como linha com `Paperclip`, nome e `X` ("Remover anexo"); nota 11 px "O anexo vai numa segunda mensagem, logo depois do texto." Com gatilho de comentário: o botão fica desligado com a dica da D9. A nota do topo da 10B passa a depender do gatilho: comentário (texto da 10B); direct: "Esta mensagem sai na conversa do contato. O Instagram aceita mensagens até 24 horas depois da última mensagem da pessoa."

### 4.7 Insights e curtir à mão

- `VisaoGeralDoNo` (nó do comentário): os três números novos da D17 ao lado dos da 10B ("Fora do público", "Aguardando seguir", "Ocultados"), pela mesma rota (`/comentarios`), que já devolve o JSON da função.
- **Caixa de comentários (10A):** no item do comentário, só com conta do Facebook, botão de ícone `ThumbsUp` 14 ("Curtir" / "Descurtir", `aria-pressed`) que chama `POST`/`DELETE /api/v1/escale/comentarios/{comentarioId}/curtir` com `{ canal, publicacao }`. A rota segue o molde das rotas de ação da 10A (`requireSupportWrite`, papel de quem atende o canal), conta do Facebook senão 422 "Curtir comentário só está disponível no Facebook.", e devolve `{ curtido: boolean }`. Atualização otimista com volta no erro (toast "Não consegui curtir o comentário.").

---

## 5. Dados que a tela guarda no desenho

- `trigger_config` do comentário: o da 10B mais `escopo: "proxima"`, `publico`, `repeticao`, `proxima` e, por caminho, `ocultar_depois` e `curtir`. Filtro sempre no formato `condicoes` ao salvar.
- `trigger_config` dos gatilhos de direct: `{ channel_session_id, filtro }`.
- Passo Instagram: `{ texto, botoes, anexo }`.

---

## 6. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 10D: …`.

1. **`lib/schemas/webhooks.ts`** — em `ENTIDADE_ESPERADA_POR_GATILHO`, depois do `"comment.received"` da 10B: as três chaves `"instagram.message_received" | "instagram.story_mention" | "instagram.story_reply": "contact"` (comentário: "direct do Instagram; quem emite é `lib/escale/comentarios/direct.ts`"). `GATILHOS_SO_DA_CASCA` ganha as três. `createAutomationRuleSchema`/`updateAutomationRuleSchema`: `.superRefine(exigirConfigDoDirect).superRefine(exigirAnexoSoNoDirect)` junto dos da 10B.
2. **`app/app/webhooks/_components/labels.ts`** e **`RuleEditor.tsx`** — `TRIGGER_LABELS` e `CURATED_FIELDS` das três (os Records exigem): "Quando alguém mandar mensagem no Instagram", "Quando alguém marcar a conta num story", "Quando alguém responder a um story"; `CURATED_FIELDS` vazio (como o do comentário).
3. **`lib/automation/engine.ts`** — no `matched.filter` de `applicable`, depois da linha do comentário da 10B: `if ((GATILHOS_DE_DIRECT as readonly string[]).includes(row.event_type) && !directCasa(row.event_type, rule.trigger_config, row.payload)) return false;` (imports de `constantes` e `direct`).
4. **`lib/channels/social/parser.ts`** — o `schema` passa a aceitar (opcionais) `metadata: z.record(z.string(), z.unknown()).nullish()` no topo do payload e `instagramProfile: z.record(z.string(), z.unknown()).nullish()` dentro de `sender`; `SocialMessage` ganha `extras?: ExtrasDoDirect` e `parseSocialMessage` preenche `extras: extrasDoDirect(payload)` (import do fork). Conferir na Task 0 se o `metadata` vem no topo ou dentro de `message` no payload real e ajustar o leitor do fork (o leitor aceita os dois lugares).
5. **`lib/channels/zernio/ingest.ts`** — em `efeitosDaEntrada`, antes de `aplicarEfeitosPosEntrada(...)`: `if (input.socialMessage) await aoReceberDirect(admin, { organizationId: input.organizationId, channelSessionId: input.channelSessionId, contactId, conversationId, messageId, msg: input.socialMessage as SocialMessage, extras: (input.socialMessage as SocialMessage).extras ?? SEM_EXTRAS });` (`SEM_EXTRAS` exportado de `direct.ts`). O `Pick<SocialMessage, "platform">` do parâmetro passa a `SocialMessage` (conferir os chamadores; se mudar a assinatura em mais de um lugar, passar `extras` e os campos por parâmetro novo opcional em vez de trocar o tipo).
6. **`supabase/baseline.sql`**, **`lib/i18n/dicionario.ts`** — blocos do fork nos pontos fixos.
7. **`tests/unit/escale-fluxo-regras.test.ts`** — a fonte "instagram" passa a ter quatro opções e nenhum `emBreve`.

O webhook do canal social **não muda de assinatura** (o `message.received` já é assinado): nada em `store.ts`.

---

## 7. Textos (pt → es)

Da Clint (`label.*`): Contato envia uma mensagem → Contacto envía un mensaje; O contato envia uma mensagem para o Instagram → El contacto envía un mensaje a Instagram; Alguém marca a conta em um story → Alguien etiqueta la cuenta en una historia; Quando alguém menciona a conta do Instagram em um story → Cuando alguien menciona la cuenta de Instagram en una historia; Alguém responde a um story → Alguien responde a una historia; Quando alguém responde a um story da conta do Instagram → Cuando alguien responde a una historia de la cuenta de Instagram; Este gatilho dispara para toda menção recebida pela conta. Não há texto para filtrar. → Este disparador se activa con cada mención que recibe la cuenta. No hay texto para filtrar.; É → Es; Contém → Contiene; Contém palavra inteira → Contiene la palabra completa; Começa com → Empieza con; Termina com → Termina con; Não contém → No contiene; Qualquer mensagem → Cualquier mensaje. (Conferir com `grep` os que já existem no dicionário, como "Começa com" e "Qualquer mensagem", e não duplicar; o espanhol da Clint está em `raw-v2/js/es-ES--Nhr_a4A.js.txt` e vale mais que o daqui.)

Nossos: Filtro de mensagem → Filtro de mensaje; Com palavras → Con palabras; Digite a palavra → Escribe la palabra; Adicionar condição → Agregar condición; Remover condição → Quitar condición; "Não contém" sempre impede o disparo, qualquer que seja a combinação. → "No contiene" siempre impide el disparo, sea cual sea la combinación.; Selecione um dispositivo Instagram. → Selecciona un dispositivo de Instagram.; Preencha a palavra do filtro ou use "Qualquer mensagem". → Completa la palabra del filtro o usa "Cualquier mensaje".; Adicione ao menos uma condição que não seja "Não contém". → Agrega al menos una condición que no sea "No contiene".; Com "Qualquer mensagem", o agente de IA fica em silêncio por 10 minutos a cada mensagem desta conta, para a automação responder sozinha. → Con "Cualquier mensaje", el agente de IA queda en silencio 10 minutos con cada mensaje de esta cuenta, para que la automatización responda sola.; Quando a mensagem casar com o filtro, o agente de IA fica em silêncio por 10 minutos nesta conversa. → Cuando el mensaje coincida con el filtro, el agente de IA queda en silencio 10 minutos en esta conversación.; Próxima publicação → Próxima publicación; Um caminho para a primeira publicação feita depois de salvar → Un camino para la primera publicación hecha después de guardar; Aguardando a próxima publicação da conta. Ela vira o caminho do fluxo assim que alguém comentar nela. → Esperando la próxima publicación de la cuenta. Se convierte en el camino del flujo en cuanto alguien la comente.; Esta automação agora vale só para esta publicação. → Esta automatización ahora vale solo para esta publicación.; Publicada em {data} → Publicada el {data}; Quem recebe a mensagem → Quién recibe el mensaje; O Instagram informa se a pessoa segue a conta. Quando não informa, vale a opção abaixo. → Instagram informa si la persona sigue la cuenta. Cuando no lo informa, vale la opción de abajo.; Todos → Todos; Só seguidores → Solo seguidores; Só quem não segue → Solo quien no sigue; Quando o Instagram não informar → Cuando Instagram no lo informe; Enviar mesmo assim → Enviar de todos modos; Não enviar → No enviar; Pedir para seguir → Pedir que siga; Siga para liberar → Sigue para desbloquear; Mensagem para quem ainda não segue → Mensaje para quien todavía no sigue; Título do botão → Título del botón; Mensagem quando tocar sem seguir → Mensaje cuando toque sin seguir; Quem não segue recebe esta mensagem com o botão. O link sai quando a pessoa seguir e tocar no botão (até 3 toques). → Quien no sigue recibe este mensaje con el botón. El enlace sale cuando la persona sigue y toca el botón (hasta 3 toques).; Para receber o link, siga a conta e toque em Já estou seguindo. → Para recibir el enlace, sigue la cuenta y toca Ya estoy siguiendo.; Já estou seguindo → Ya estoy siguiendo; Ainda não encontramos o seu follow. Siga a conta e toque de novo. → Todavía no encontramos tu follow. Sigue la cuenta y toca de nuevo.; Quantas vezes a mesma pessoa recebe → Cuántas veces recibe la misma persona; Uma vez por pessoa → Una vez por persona; De novo depois de → De nuevo después de; horas → horas; Ocultar o comentário depois do direct → Ocultar el comentario después del mensaje directo; O comentário continua visível para quem comentou e para a conta. → El comentario sigue visible para quien comentó y para la cuenta.; Curtir o comentário → Dar me gusta al comentario; Oculta → Oculta; Curte → Me gusta; Toda menção à conta em story → Toda mención a la cuenta en historias; Anexo → Adjunto; Adicionar anexo → Agregar adjunto; Remover anexo → Quitar adjunto; O anexo vai numa segunda mensagem, logo depois do texto. → El adjunto va en un segundo mensaje, justo después del texto.; No comentário, a primeira mensagem aceita só texto e botões (regra do Instagram). → En el comentario, el primer mensaje acepta solo texto y botones (regla de Instagram).; Esta mensagem sai na conversa do contato. O Instagram aceita mensagens até 24 horas depois da última mensagem da pessoa. → Este mensaje sale en la conversación del contacto. Instagram acepta mensajes hasta 24 horas después del último mensaje de la persona.; O passo Instagram funciona com os gatilhos do Instagram. → El paso Instagram funciona con los disparadores de Instagram.; Fora do público → Fuera del público; Aguardando seguir → Esperando que siga; Ocultados → Ocultados; Curtir → Me gusta; Descurtir → Quitar me gusta; Não consegui curtir o comentário. → No pude dar me gusta al comentario.; Curtir comentário só está disponível no Facebook. → Dar me gusta a comentarios solo está disponible en Facebook.; as explicações novas da 2.3 e da 3.3.

---

## 8. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree, nomes e contrato do Zernio
- [ ] Conferir que a Frente 10-I está publicada (10B, 10C e 10A na `main` e na tag em produção; `LOG.md`). Se não estiver, **parar**: a 10D depende das três.
- [ ] `git -C repo fetch escale-crm && git -C repo worktree add ../wt-10d -b feat/fase-10d-instagram-avancado escale-crm/main`; `corepack pnpm install --frozen-lockfile`; copiar este plano para `wt-10d/docs/superpowers/plans/`.
- [ ] Conferir na `main` e ajustar o plano se divergir: nomes da 9801/9802 (índices, `check`s, colunas da 10C), último carimbo de migration (e se a 10A criou a 9803); assinaturas de `reivindicarDisparos`, `concluirDisparo`, `respostaPrivada`, `pedir`, `gravarDirectNaConversa`, `comentarioDoEventoSchema`, `SeletorDeConta`; o campo que o despacho do agente lê para saber se está calado (`bot_silenced_until` em `lib/channels/pos-entrada.ts`); o componente da biblioteca de mídia do PR #148; o item de comentário e o molde das rotas de ação da 10A; os chamadores de `efeitosDaEntrada`.
- [ ] **Provar o contrato numa chamada real** (conta de teste do @oregismarques, chave pelo `zernioCredsForAccountId` num script local que não loga a chave): um `message.received` de resposta a story e um de menção chegam com `metadata.storyReply`/`isStoryMention` (ver no `event_log`/log do webhook, ou pelo `GET /v1/webhooks/logs` se existir); um postback de teste (`POST private-reply` com botão postback num comentário de teste) chega com `postbackPayload`; `instagramProfile.isFollower` vem no comentário e no direct; `POST hide` funciona. Anotar no PR o que não veio. **O que não vier, sai da fase** (com o item e a decisão marcados "fora: API não entrega" no PRD), e o resto segue.

### Task 1: Constantes, schema, filtro e público
**Files:** modify `lib/escale/comentarios/{constantes,schema,caminhos}.ts`; create `lib/escale/comentarios/{filtro,publico}.ts`; tests `tests/unit/escale-comentarios-filtro.test.ts`, `-publico.test.ts`; acrescentar casos em `tests/unit/escale-comentarios-regras.test.ts` (10B).
**Produces:** seções 1.1 a 1.5 (nomes e tipos exatos).
- [ ] Filtro: cada operador com "Eu QUERO" (com e sem acento, caixa, espaços duplos); `palavra_inteira` "eu" casa em "eu quero!" e não em "seu link"; `nao_contem` bloqueia em "qualquer" e em "todas"; só `nao_contem` → false; formato 10B `{ palavras: ["quero"], combinar: "qualquer" }` casa igual a `{ condicoes: [{ operador: "contem", valor: "quero" }] }`; `normalizar` do fork igual ao do motor em 6 entradas.
- [ ] Público: a tabela da 1.5 inteira (12 casos); Facebook sempre `enviar`; `payloadDoLiberar`/`disparoDoLiberar` ida e volta, payload sem prefixo ou com lixo → null.
- [ ] Schema: config da 10B sem os campos novos passa e sai com os padrões; `escopo: "proxima"` com um caminho e `proxima` passa; `problemasDoGatilho` itens 12 a 14; `exigirConfigDoDirect` (conta vazia, só `nao_contem`); `exigirGatilhoDoPassoDoInstagram` aceita os 3 de direct; `exigirAnexoSoNoDirect` recusa anexo no comentário; anexo `http://` recusado.
- [ ] Commit: `feat(escale): filtro com operadores da Clint, público e regras do Instagram avançado`.

### Task 2: Migration 9804, baseline e invariantes
**Files:** create a migration (2.1); colar no `supabase/baseline.sql`; create `tests/invariants/escale-comentarios-9804.test.ts` (2.2).
- [ ] Escrever o teste; escrever a migration; colar o bloco no baseline.
- [ ] `corepack pnpm test:db tests/invariants/escale-comentarios-9804.test.ts` (Git Bash, Docker aberto) até ficar verde; rodar também o `-9801` e o `-9802` (o caso "segunda linha não repetido → 23505 pelo índice da pessoa" da 9801 passa a ser coberto pela função: **ajustar o teste da 9801** para a regra nova, com o comentário "9804 trocou o índice pela função").
- [ ] `corepack pnpm checar:colisao-de-migration`.
- [ ] Commit: `feat(escale): migration 9804 (Instagram avançado)`.

### Task 3: Zernio e disparos
**Files:** modify `lib/escale/comentarios/{zernio,disparos,receber}.ts`, `lib/escale/comentarios/webhook.ts` (seguidor); create `lib/escale/comentarios/proxima.ts`; tests `tests/unit/escale-comentarios-zernio-10d.test.ts`, `-disparos-10d.test.ts`, `-proxima.test.ts` (fetch e Supabase dublados, molde dos testes da 10B).
**Consumes:** Task 1, Task 2.
- [ ] Zernio: `enviarDirect` monta o corpo com botões e, com anexo, faz duas chamadas na ordem; falha do anexo → ok com `anexoFalhou`; `respostaPrivada` com botão postback; `ocultarComentario`/`curtirComentario` (POST) e `descurtirComentario` (DELETE) com `encodeURIComponent`; `motivoDoErro` reconhece `janela_fechada`.
- [ ] Disparos: `reivindicarDisparos` chama a RPC com `p_intervalo_horas` certo; `novo` roda, `repetido`/`ja_existe` não; `fora_do_publico` grava e não roda; `ocultar`/`curtir` `pendente` só quando o caminho pede (curtir só Facebook). `concluirDisparo`: `aguardando_seguir` não publica nem oculta; `enviado` oculta e curte; falha de ocultar grava `falhou` sem mexer no motivo do direct.
- [ ] Próxima: candidata é a mais antiga depois de `armada_em`; comentário em outra publicação → null sem gravar; publicação em `conhecidas` → não chama o Zernio; update sem linha afetada → relê e devolve o atual; erro do Zernio → null e loga.
- [ ] Commit: `feat(escale): disparo com público, repetição por intervalo, próxima publicação e ações no comentário`.

### Task 4: Direct que entra, silêncio da IA e liberar
**Files:** create `lib/escale/comentarios/{direct,liberar}.ts`; modify `lib/channels/social/parser.ts` (encaixe 4), `lib/channels/zernio/ingest.ts` (encaixe 5); tests `tests/unit/escale-comentarios-direct.test.ts`, `-liberar.test.ts`; rodar os testes existentes do parser e da ingestão (`git grep -ln "parseSocialMessage\|ingestZernioInbound" tests lib`).
- [ ] `extrasDoDirect`: payload com `metadata.isStoryMention`, com `storyReply`, com `postbackPayload`, com `instagramProfile.isFollower` (no topo e dentro de `message`); payload sem nada → tudo falso/null; lixo → não lança.
- [ ] `aoReceberDirect`: sem regra → `calarIa: false`, sem `emit_event`, sem update; regra que casa → silêncio gravado (não encurta um `infinity`), `emit_event` com o gatilho certo e o payload `DirectDoEvento`; mention de página do Facebook → nada; postback do liberar → chama `liberarDirect`, cala a IA e não emite; cache: duas mensagens em 30 s → uma leitura de regras; erro do `emit_event` não lança.
- [ ] Ingestão: com `socialMessage` de Instagram, `aoReceberDirect` é chamado antes de `aplicarEfeitosPosEntrada` (ordem por mock); WhatsApp não chama; o parser continua devolvendo o mesmo `SocialMessage` de antes mais `extras`.
- [ ] `liberarDirect`: seguidor → `enviarDirect` com o pendente, disparo `enviado`, resposta pública e ocultar feitos; não seguidor → pede de novo e soma toque; terceiro toque → `nao_seguiu`; disparo que não está aguardando → `ignorado`.
- [ ] Commit: `feat(escale): gatilhos de direct e story no Instagram, sem resposta dupla com a IA`.

### Task 5: Motor e passo Instagram
**Files:** modify `lib/automation/engine.ts` (encaixe 3), `lib/schemas/webhooks.ts` (encaixe 1), `app/app/webhooks/_components/{labels.ts,RuleEditor.tsx}` (encaixe 2), `lib/escale/comentarios/{acao-do-instagram,eco}.ts`; tests `tests/unit/escale-comentarios-motor-10d.test.ts`, `-acao-10d.test.ts` (molde `-motor` e `-acao` da 10B).
- [ ] Motor: evento `instagram.message_received` com regra cujo filtro casa → roda; filtro não casa ou conta errada → `no_match`; mention roda sem filtro; o designer original não lista os três (`TRIGGER_EVENTS_DO_ORIGINAL`).
- [ ] Passo: gatilho de direct dentro da janela → `enviarDirect`, mensagem gravada com `origem "direct"`, `success`; fora da janela → `janela_fechada` sem chamar a API; comentário com público `pedir_para_seguir` → resposta privada com o botão postback, disparo `aguardando_seguir` com `direct_pendente`; comentário com público `enviar` → caminho da 10B intacto (os testes da 10B seguem verdes).
- [ ] Eco: `message.sent` que casa com uma mensagem `origem "direct"` não duplica nem pausa a IA.
- [ ] Rodar `tests/unit/escale-fluxo-mesmo-corpo.test.ts` e os testes da 10B: verdes.
- [ ] Commit: `feat(escale): passo Instagram com direct comum, anexo e siga para liberar`.

### Task 6: Escolha do gatilho, painel de direct e filtro com operadores
**Files:** modify `lib/escale/automacoes/fluxo/gatilhos.ts`, `lib/escale/comentarios/tela.ts`, `components/escale/automacoes/fluxo/painel/{EscolhaDoGatilho,PainelDoGatilho}.tsx`, `…/comentario/{SeletorDeConta,CaminhoDoComentario}.tsx`; create `…/comentario/{FormularioDoDirect,FiltroDePalavras}.tsx`; tests `tests/unit/escale-comentarios-formulario-direct.test.tsx`, `-filtro-de-palavras.test.tsx`; ajustar `tests/unit/escale-fluxo-regras.test.ts` (encaixe 7).
- [ ] Escolha: a fonte Instagram mostra 4 cartões clicáveis, sem "Em breve", na ordem da 4.1.
- [ ] Painel de direct: mention mostra só o texto da Clint; story esconde contas do Facebook; "Qualquer mensagem" mostra o aviso da IA; "Com palavras" mostra o `FiltroDePalavras`.
- [ ] `FiltroDePalavras`: adicionar, trocar operador, remover; "Combinar" some com uma positiva; "Não contém" em `casca-alerta` com a dica; filtro da 10B abre como "Contém"; salva no formato `condicoes`; não muta a entrada.
- [ ] Commit: `feat(escale): painel dos gatilhos de direct e filtro com operadores da Clint`.

### Task 7: Comentário avançado no painel e nos nós
**Files:** modify `…/comentario/{FormularioDoComentario,CaminhoDoComentario,CorpoDoComentario,CorpoDoInstagram,PainelDoInstagram}.tsx`, `components/escale/automacoes/fluxo/CorposDoNo.tsx`; create `…/comentario/{PublicoDoComentario,RepeticaoDoComentario,CorpoDoDirect}.tsx`; tests `tests/unit/escale-comentarios-publico-tela.test.tsx` e acrescentar em `tests/unit/escale-comentarios-{formulario,nos}.test.tsx` (10B).
- [ ] "Próxima publicação": desabilitada sem conta; escolher grava `proxima` com as publicações listadas; resolvida mostra a publicação e a data `dd/mm/aaaa HH:mm`.
- [ ] Público: só com conta do Instagram; "Só seguidores" preenche o padrão e mostra "Siga para liberar"; "Pedir para seguir" só em "Só seguidores"; contadores 640/20.
- [ ] Repetição: "De novo depois de" com 0 ou 721 mostra erro e não salva.
- [ ] Caminho: "Curtir o comentário" só em conta do Facebook; "Ocultar" nas duas.
- [ ] Passo Instagram: anexo só com gatilho de direct; no comentário, desligado com a dica da D9; nota do topo muda com o gatilho.
- [ ] Nós: `CorpoDoDirect` (filtro e mention), chips "Oculta"/"Curte", linha do público e da repetição, anexo no corpo do passo.
- [ ] Commit: `feat(escale): próxima publicação, público, repetição e ações no comentário na tela`.

### Task 8: Insights, curtir à mão, textos e documentos
**Files:** modify `components/escale/automacoes/fluxo/insights/VisaoGeralDoNo.tsx`, o item de comentário da 10A, `hooks/escale/useComentarios.ts`, `lib/i18n/dicionario.ts`, `docs/modulos/{10-comentarios,5-automacoes}.md`; create `app/api/v1/escale/comentarios/[comentarioId]/curtir/route.ts`; test `tests/unit/escale-comentarios-curtir.test.ts(x)` (rota e botão).
- [ ] Insights: os três números novos aparecem com `toLocaleString("pt-BR")`.
- [ ] Rota de curtir: sem `requireSupportWrite` → recusa; conta do Instagram → 422 com o texto; Facebook → chama o Zernio e devolve `{ curtido }`; erro do Zernio → 502. Botão: só no Facebook, otimista, volta no erro com o toast.
- [ ] Textos da seção 7 (pt e es); teste de completude do dicionário, se existir.
- [ ] PRD 10: seção 8, estado da 10D "Mergeada"; quadro B, "erro de digitação" e "etiqueta de clique" marcados fora com o porquê (D4, D16) e os itens que a Task 0 tirou. PRD 5: os três gatilhos da fonte Instagram funcionam.
- [ ] Commit: `feat(escale): insights e curtir no Facebook; textos e documentos da 10D`.

### Task 9: Fechamento da fase (bateria, revisão e publicação da Frente 10-II)
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/comentarios components/escale/automacoes "app/api/v1/escale/comentarios" lib/channels/social/parser.ts lib/channels/zernio/ingest.ts lib/automation/engine.ts lib/schemas/webhooks.ts tests/unit/escale-comentarios-*`.
- [ ] Diff do original: `git diff --stat escale-crm/main -- lib app components` mostra do Rafael só os arquivos da seção 6.
- [ ] PR para `escale-crm/main` (itens do PRD cobertos, D1–D18, o provisório, o que a Task 0 tirou); merge.
- [ ] **Bateria (em segundo plano):** unidade completa, `test:db`, `test:db:update`, cercas (`corepack pnpm vitest run -c vitest.cercas.ts`; falhas antigas do Windows anotadas, memória `frente-automacoes-estado`). Falha nova → corrige antes de publicar.
- [ ] **Revisor Opus 5.5** (um, a frente inteira): pedir atenção à `fn_escale_reivindicar_disparo` (trava, definer, corrida), ao encaixe antes do despacho do agente e à leitura do payload cru do Zernio. Sem Critical/Important aberto.
- [ ] **Conferência visual** (casca ligada): escolha do gatilho contra 07-020; painel e nós contra o molde da 10B; anotar por escrito cada diferença.
- [ ] **Publicar:** tag `vX.Y.Z-escale.N` + release; esperar `promover-stable`; na VPS nova, `df -h` (memória `vps-disco-cheio-imagens-antigas`), `backup.sh`, `update.sh --to <tag>`; conferir 3 containers healthy, `/login` 200, sem erro nos logs, e no banco (só leitura): `fn_escale_reivindicar_disparo` com `prosecdef`, o índice `uq_…_pessoa` sumido, as colunas novas. Falhou: volta para a tag anterior e avisa.
- [ ] **Prova ponta a ponta com o @oregismarques** (critério da seção 9). `LOG.md` atualizado; commit `docs: LOG da fase 10D`.

---

## 9. Critério de pronto (linha 10D da seção 8 do PRD)

- Uma automação "Contato envia uma mensagem" (Instagram) com "Contém palavra inteira · eu quero" responde o direct com o passo Instagram (texto, botão e anexo), e o agente de IA **não** responde aquela mensagem; uma mensagem que não casa é respondida pela IA como antes.
- "Alguém marca a conta em um story" e "Alguém responde a um story" disparam com uma menção e uma resposta de teste.
- No gatilho de comentário: "Não contém · grátis" impede o disparo; "Próxima publicação" pega o próximo Reels publicado e só ele; "Só seguidores" com "Siga para liberar" manda o pedido para quem não segue e o link depois do toque de quem passou a seguir; "De novo depois de 1 h" deixa a mesma pessoa receber de novo depois de uma hora e não antes; "Ocultar o comentário depois do direct" oculta; num post do Facebook, "Curtir o comentário" curte, e o "Curtir" à mão funciona na caixa de comentários.
- O Insights mostra os números novos. Regras da 10B continuam iguais.

## 10. Riscos desta fase

| Risco | Mitigação |
|---|---|
| O Zernio não entregar algum campo (story, postback, isFollower) como o SDK diz | Task 0 prova numa chamada real; o que não vier sai da fase com registro no PRD |
| Trocar o índice único por função abrir corrida de "uma vez por pessoa" | Trava `pg_advisory_xact_lock` por regra+pessoa; teste de corrida com duas conexões (Task 2); revisor Opus olha |
| O encaixe antes do despacho do agente atrasar a ingestão | Uma leitura com cache de 30 s por organização; sem regra, nenhum update nem `emit_event`; nunca lança |
| "Qualquer mensagem" calar a IA de uma conta inteira | Aviso no painel (4.2); silêncio de 10 min, nunca durável |
| Salvar a regra pela tela sobrescrever a "próxima" resolvida por um comentário no meio | A tela relê a regra ao abrir (`comConfigPropria`); a janela é pequena; se acontecer, o próximo comentário resolve de novo pela mesma regra (a publicação continua a "mais antiga depois de armar") |
| Mensagem de liberar cair em Solicitações de mensagem e a pessoa não ver | É a regra da Meta para a primeira mensagem; o botão postback aparece lá (seção 2.4) |
| Instagram bloquear por repetição | "Uma vez por pessoa" continua o padrão; intervalo mínimo de 1 h |

## 11. Perguntas ao usuário (não bloqueiam a execução)

1. **"Erro de digitação" (D4):** o PRD cita esse modo, mas a Clint não tem. O plano segue a Clint e deixa fora. Quer mesmo assim (seria um operador nosso, a mais que a Clint)?
2. **Silêncio da IA (D6):** 10 minutos a cada direct que casa com uma automação. Prefere outro tempo, ou que a IA fique quieta só quando a automação tiver passo Instagram?
3. **Público no Facebook (D12):** o Facebook não informa se a pessoa curte a página, então o bloco "Quem recebe a mensagem" só aparece no Instagram. Ok?
4. **Curtir no Instagram:** está em liberação restrita no Zernio (só contas de teste do app deles). Quando liberarem, basta tirar a trava do Facebook. Quer que eu pergunte ao suporte do Zernio junto com a dúvida de custo (decisão 7 do PRD)?
