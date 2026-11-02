# Fase 10B — Gatilho "Alguém comenta em um post" e passo "Instagram" · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão dos planos da 5B e da 5C: decisões, arquivos, interfaces, regras, SQL, textos e testes escritos aqui; o código de tela restante é escrito na execução seguindo os moldes citados.

> **PRD:** `docs/modulos/10-comentarios.md` (aprovado em 01/11/2026): quadro B inteiro da seção 4 marcado 10B, as linhas 10B do quadro C, seções 5 a 7, linha 10B da seção 8, decisões 1 a 7 da seção 9 e os riscos da seção 12.
> **Frente 10-I** (10B → 10C → 10A; executa tudo, testa tudo uma vez, publica tudo uma vez). Worktree nova `wt-10b` a partir de `escale-crm/main` (hoje `ce21569cd`, com a 5C). **Uma migration (9801).** Um PR (`feat/fase-10b-gatilho-de-comentario`).

**Goal:** com a casca ligada, montar no fluxo de Automações uma automação "Alguém comenta em um post" (Instagram ou Facebook) com caminhos por publicação, filtro de palavra, resposta pública com variações e o passo "Instagram" que manda o direct como resposta privada pela API do Zernio; o comentário que casa vira contato (mesma identidade do direct), roda o fluxo uma vez só por comentário e por pessoa, a mensagem aparece na conversa sem pausar a IA, e o Insights mostra os números.

**Architecture:**
- **O motor é o nosso, o Zernio é o braço** (decisão 1 do PRD). O webhook `comment.received` do Zernio entra pelo mesmo caminho do direct (`lib/channels/inbound.ts` → `ingestSocialInbound`), é desviado para o código do fork (`lib/escale/comentarios/receber.ts`), que confere se alguma automação ativa quer aquele comentário, cria ou acha o contato pela identidade social e emite o evento `comment.received` (entidade `contact`) no `event_log`. O motor de Automações roda a regra como qualquer outra.
- **Gatilho novo no motor, escondido do original.** `comment.received` entra em `ENTIDADE_ESPERADA_POR_GATILHO`; o designer sem casca não o oferece (`TRIGGER_EVENTS_DO_ORIGINAL`). A configuração do gatilho (conta, escopo, caminhos, resposta) mora no `trigger_config` e é montada inteira pela casca (`TelaDoGatilho.configPropria`).
- **Deduplicação no banco.** A tabela `escale_disparos_de_comentario` (9801) tem índice único por comentário e por pessoa em cada regra. O motor "reivindica" o disparo antes das ações; quem perde a corrida não roda. A mesma linha guarda o desfecho do direct e da resposta pública e alimenta o Insights.
- **Passo "Instagram" = ação nova `send_instagram_message`**, executada pelo fork (`lib/escale/comentarios/acao-do-instagram.ts`, registrada no motor). Com gatilho de comentário, envia **resposta privada** (`POST /v1/inbox/comments/{postId}/{commentId}/private-reply`) com texto e botões de link. A mensagem é gravada na conversa **antes** do envio (`sent_via = 'automation'`) e o eco `message.sent` do Zernio é reconhecido como a mesma mensagem (decisão 6), sem pausar a IA.
- **A resposta pública é do gatilho** (como na Clint): sai no fim da execução, só se o direct saiu (ou se a automação não tem passo Instagram).

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query, `@xyflow/react` 12, Radix, `lucide-react` 1.x e Phosphor pela `lib/ui/icons-da-casca.ts`, Supabase (RLS, RPC), Vitest + Testing Library, `test:db` (Postgres efêmero, `gov-helpers`). API do Zernio pelo SDK `zernio` 0.0.1300 (docs.rs), conferido em 01/11.

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega é do Claude, mas **nada da Frente 10-I vai para produção antes da 10A** (CLAUDE.md: executa tudo, testa tudo, publica tudo). A 10B é mergeada na `main` e fica parada.
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` (com `NODE_OPTIONS=--max-old-space-size=10240`) e `corepack pnpm eslint <arquivos>`. **Exceção:** a Task 2 roda `corepack pnpm test:db tests/invariants/escale-comentarios-9801.test.ts` uma vez (pelo **Git Bash**, com `CONFERENCIA_KIT_RELEASE=<última tag>`; memória `frente-automacoes-estado`). Rodada cheia, `test:db` completo e `test:db:update` ficam para a bateria da frente (fim da 10A).
- **Migration 9801:** `supabase/migrations/20261203120000_9801_disparos_de_comentario.sql` (carimbo seguinte ao da 9707, `20261202170000`; se a `main` já tiver outro depois, pegar o seguinte). Cabeçalho `-- manifest:` obrigatório, sem linha no `MANIFEST.md`; `corepack pnpm checar:colisao-de-migration` antes do PR. O bloco vai colado no `supabase/baseline.sql` **logo depois do bloco da 9707** (`grep -n "migration 9707" supabase/baseline.sql`) e antes da varredura de anon (memória `baseline-ordem-dos-blocos-do-fork`).
- **Arquivos do Rafael** só nos encaixes da seção 6, com poucas linhas e o comentário `// FORK ESCALE · Fase 10B: …`. Em arquivo compartilhado (`lib/i18n/dicionario.ts`, `app/globals.css`, `app/escale-tema.css`, `supabase/baseline.sql`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **O designer original não muda de comportamento:** sem a casca, a lista de gatilhos e o corpo gravado são os de hoje; os testes e e2e dele seguem verdes. O teste "mesmo corpo" da 5B (`tests/unit/escale-fluxo-mesmo-corpo.test.ts`) segue verde sem mudar as regras de exemplo dele.
- **Igual à Clint:** cada componente cita a ficha que o define (07-014 paleta, 07-019/07-020 escolha do gatilho, 07-013 painel e nó, 07-027 passo de canal). **Não há print** do painel do gatilho de comentário, do nó com caminhos, do seletor de publicações nem do passo Instagram (PRD, seção 11): o molde da seção 4 sai dos textos do código da Clint e é **provisório**; aprovar este plano vale como confirmação do molde, salvo se o usuário mandar os prints antes da Task 8. Nada de `<select>`, checkbox nativo ou controle do navegador. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`). A conferência lado a lado é da bateria da frente.
- **Marca:** onde a Clint usa o roxo (Salvar, cartão escolhido, contador, foco), `casca-marca`. O rosa do Instagram é cor de tipo de nó (token próprio, seção 4.8), como o verde do WhatsApp.
- **Formatos BR:** datas `dd/mm/aaaa HH:mm` pelo `dataHoraBr` (`lib/escale/negocio/arquivos.ts`) no fuso da organização; números com `toLocaleString("pt-BR")`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`. Onde a Clint tem texto, copia o da Clint (seção 7).
- **Segredos:** a chave do Zernio só sai de `zernioCredsForAccountId` (a cópia por canal, sincronizada com a chave do perfil, Spec 22); nunca em log, nunca em resposta de rota.
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (usar `logger`). `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Evento `comment.received`, entidade `contact`.** `buildContext` já hidrata o contato por `entity_id`; o payload traz `contact_id` e `channel_session_id` (as guardas de contato pessoal e de canal desativado funcionam sem mudança) | Reaproveita o motor inteiro |
| D2 | **Caminhos sem saída própria.** Cada caminho tem publicações, filtro e resposta pública; **todos seguem pelo "Próximo passo"** do gatilho. No nó aparece o texto da Clint "Caminhos sem conexão seguem pelo **Próximo passo** da automação." Ligar um caminho a um passo diferente fica para depois | O motor é uma fila sem ramificação (PRD 5, D11 da 5B). Quem precisa de directs diferentes por post monta duas automações |
| D3 | **Escopo "Todos os posts" e "Posts específicos".** "Todos" = um caminho só, sem publicação. "Específicos" = 1 a 10 caminhos, cada um com 1 ou mais publicações, até 20 no total, sem a mesma publicação em dois caminhos. **"Próxima publicação" não aparece** (fica para a 10D): o Zernio só avisa post novo do que foi publicado por ele | PRD 4.B; regra da 5B "nada aparece sem funcionar" |
| D4 | **Conta:** as conexões `zernio_social` com `metadata.social_platform` `instagram` ou `facebook`, não arquivadas. A fonte se chama **"Instagram"** (Clint) e o seletor mostra as contas das duas redes com o logo de cada uma. Trocar de conta com caminhos pede a confirmação da Clint e limpa os caminhos | PRD 4.B (Facebook no mesmo painel) |
| D5 | **Fonte "Instagram" na escolha do gatilho** (07-020) com os quatro cartões da Clint. Só "Alguém comenta em um post" funciona; "Contato envia uma mensagem", "Alguém marca a conta em um story" e "Alguém responde a um story" aparecem **desligados** com o selo "Em breve" | PRD 4.B linha 1 manda mostrar os quatro desde já |
| D6 | **Seletor de publicações** pela `GET /v1/accounts/{accountId}/posts` do Zernio (as **25 mais recentes**, sem paginação). Sem "Carregar mais": a lista mostra o aviso da Clint "Exibindo as publicações mais recentes. Para uma específica, use o ID." e a aba "Digitar o ID da publicação". Busca por legenda e filtro por tipo são feitos na tela | A API não pagina |
| D7 | **Filtro do caminho:** "Qualquer comentário" ou lista de palavras com "Combinar palavras com" ("Qualquer palavra" / "Todas as palavras"). Cada palavra casa por **contém**, sem caixa e sem acento (`casaComPalavraChave(..., "contem")` do motor). Modos extras e palavras que bloqueiam: 10D | PRD 4.B |
| D8 | **Resposta pública por caminho, com variações** (até 5, até 300 caracteres cada, texto padrão "Te respondi no direct, dá uma olhada!"). Uma variação sorteada é publicada como resposta ao comentário **no fim da execução**: se a automação tem passo Instagram, só quando o direct saiu; sem passo Instagram, sempre | Clint (resposta é parte do gatilho) + regra do ManyChat do PRD |
| D9 | **Passo "Instagram" (`send_instagram_message`)**: texto (até 1.000 caracteres; até 640 com botão) com as variáveis do WhatsApp, e de 0 a 3 botões de link (título até 20 caracteres, endereço `https://`). **Na 10B o passo só funciona com o gatilho de comentário**: a paleta o deixa desligado em outro gatilho (dica "O passo Instagram funciona com o gatilho “Alguém comenta em um post”.") e o schema recusa a regra | A resposta privada precisa do comentário; o envio por conversa fica para a 10D (gatilho de direct) |
| D10 | **Regra da Meta no passo:** comentário com mais de 7 dias → não chama a API, falha `prazo_vencido`. Recusas do Zernio viram motivo legível: `resposta_privada_ja_usada` (400 com `details.privateReplyConsumed`), `botoes_recusados` (código Meta 2 / subcódigo 1545133: quem comentou não segue a conta), `resultado_incerto` (502 com `privateReplyOutcome: "unknown"`, não repete), `acesso_recusado` (401/403), `provedor_indisponivel` (o resto) | Contrato do SDK (seção 2.4) |
| D11 | **Uma vez por comentário e por pessoa em cada automação**, sem opção na tela. O segundo comentário da mesma pessoa vira linha `repetido` (direct e resposta "pulados") e não roda o fluxo | PRD 4.B; "zero duplicado" |
| D12 | **Só cria contato quando alguma automação ativa quer o comentário** (conta + caminho casam). Comentário da própria conta (`isOwnAccount`) e de live (`isLive`) são ignorados | Sem isto cada comentário de qualquer post viraria contato |
| D13 | **Mensagem na conversa antes do envio:** a ação grava a linha (`sending`, `sent_via 'automation'`, `metadata.origem 'comentario'`) e a atualiza com o id do Zernio (`sent`) ou com a falha (`failed`). O eco `message.sent` que casa com ela (mesmo id, ou mesmo texto em até 15 minutos) **não** vira outra linha, **não** pausa a IA e grava o `provider_conversation_id` da conversa | Decisão 6 do PRD; o eco pode chegar antes da resposta da API |
| D14 | **Assinatura de `comment.received`:** canais novos já assinam (lista de eventos da `connectSocialInbox`). Canal antigo: ao escolher a conta no painel do gatilho, a tela chama `POST /api/v1/escale/comentarios/assinatura`, que acrescenta o evento por `PUT webhooks/settings` (parcial) e relê para provar. Falhou: aviso no painel com "Tentar novamente" | Decisão 4 do PRD; a ressincronização mantém os eventos antigos |
| D15 | **Insights:** o resultado do passo Instagram já entra em `actions_result` (com `detail.explicacao`, que a 5C mostra). O nó do gatilho ganha quatro números da tabela de disparos: Comentários, Repetidos, Respostas públicas, Respostas com falha (sem clique: a listagem é de execuções, e o repetido não tem execução) | PRD 4.B "eventos do comentário" |
| D16 | **Limites provisórios** (a Clint tem limites, mas os números não estão no código baixado): 10 caminhos, 20 publicações, 5 variações, 300 caracteres na resposta, 20 palavras por caminho, 60 caracteres por palavra | Conferir com o usuário na bateria |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/escale/comentarios/constantes.ts` | Nomes (`GATILHO_DE_COMENTARIO`, `PASSO_DO_INSTAGRAM`), limites, texto padrão, prazo de 7 dias |
| `lib/escale/comentarios/schema.ts` | zod: configuração do gatilho, ação do Instagram, refinamentos que o schema do motor chama (sem importar `lib/schemas/webhooks.ts`) |
| `lib/escale/comentarios/caminhos.ts` | Puras: `comentarioDoEvento`, `caminhoDoComentario`, `casaComFiltro`, `sortearVariacao`, `dentroDoPrazo`, `problemasDoGatilho` |
| `lib/escale/comentarios/webhook.ts` | Pura: `lerComentarioDoWebhook` (payload `comment.received` do Zernio) |
| `lib/escale/comentarios/tela.ts` | Puras da casca: `configInicialDoComentario`, `telaInicialDoGatilho`, `comConfigPropria`, `resumoDosCaminhos` |
| `lib/escale/comentarios/zernio.ts` | HTTP do Zernio com o corpo do erro: `respostaPrivada`, `responderComentario`, `publicacoesDaConta`, `motivoDoErro` |
| `lib/escale/comentarios/receber.ts` | `receberComentario`: confere conta e caminhos, contato, `emit_event` |
| `lib/escale/comentarios/disparos.ts` | `reivindicarDisparos`, `disparoDaRegra`, `concluirDisparo` |
| `lib/escale/comentarios/acao-do-instagram.ts` | O executor `send_instagram_message` (registra no motor) |
| `lib/escale/comentarios/conversa.ts` | `gravarDirectNaConversa`, `confirmarDirect`, `falharDirect` |
| `lib/escale/comentarios/eco.ts` | `ecoDaMensagemDaAutomacao` |
| `lib/escale/comentarios/assinatura.ts` | `garantirAssinaturaDeComentarios` |
| `app/api/v1/escale/comentarios/publicacoes/route.ts` | GET das publicações da conta |
| `app/api/v1/escale/comentarios/assinatura/route.ts` | POST que garante a assinatura |
| `app/api/v1/automacoes-da-casca/[id]/comentarios/route.ts` | GET dos números do gatilho (Insights) |
| `hooks/escale/useComentarios.ts` | `useContasSociais`, `usePublicacoesDaConta`, `useGarantirAssinatura`, `useResumoDosComentarios` |
| `components/escale/automacoes/fluxo/comentario/FormularioDoComentario.tsx` | Conta, escopo, lista de caminhos, resumo |
| `components/escale/automacoes/fluxo/comentario/SeletorDeConta.tsx` | Contas Instagram/Facebook + estado da assinatura |
| `components/escale/automacoes/fluxo/comentario/CaminhoDoComentario.tsx` | Cartão do caminho: publicações, filtro |
| `components/escale/automacoes/fluxo/comentario/RespostaAoComentario.tsx` | Variações da resposta pública |
| `components/escale/automacoes/fluxo/comentario/SeletorDePublicacoes.tsx` | Modal "Selecionar publicações" (busca, tipo, ID, agrupar) |
| `components/escale/automacoes/fluxo/comentario/CorpoDoComentario.tsx` | Corpo do nó do gatilho de comentário |
| `components/escale/automacoes/fluxo/comentario/PainelDoInstagram.tsx` | Painel do passo Instagram (texto e botões) |
| `components/escale/automacoes/fluxo/comentario/CorpoDoInstagram.tsx` | Corpo do nó do passo Instagram |
| Encaixes (seção 6) | `lib/schemas/webhooks.ts`, `app/app/webhooks/_components/labels.ts`, `app/app/webhooks/_components/RuleEditor.tsx`, `app/app/webhooks/automacoes/[id]/_components/PainelDaCaixa.tsx`, `lib/automation/desenho-da-regra.ts`, `lib/automation/engine.ts`, `lib/automation/actions/register-all.ts`, `lib/channels/social/store.ts`, `lib/channels/social/ingest.ts`, `lib/channels/zernio/ingest.ts`, `supabase/baseline.sql`, `app/globals.css`, `app/escale-tema.css`, `lib/i18n/dicionario.ts` |
| Fork já existente (muda) | `lib/escale/automacoes/fluxo/{gatilhos,paleta}.ts`, `components/escale/automacoes/fluxo/{useFluxo.ts,visual-do-fluxo.ts,CorposDoNo.tsx,PaletaDoFluxo.tsx,TelaDoFluxo.tsx}`, `…/painel/{PainelDoGatilho,EscolhaDoGatilho}.tsx`, `…/insights/{VisaoGeralDoNo,CartaoDaExecucao}.tsx`, `lib/escale/automacoes/insights/{regras,csv}.ts` |
| Testes | `tests/unit/escale-comentarios-{regras,webhook,tela,zernio,receber,disparos,acao,eco,assinatura,rotas,motor,formulario,seletor,nos,insights}.test.ts(x)`, `tests/invariants/escale-comentarios-9801.test.ts` |
| Docs | `docs/modulos/5-automacoes.md` (item C7: a fonte Instagram deixa de ser "ignorar" e aponta para o PRD 10), `docs/modulos/10-comentarios.md` (estado da 10B) |

---

## 1. Regras puras

### 1.1 Constantes (`lib/escale/comentarios/constantes.ts`)

```ts
/** FORK ESCALE · Fase 10B: o gatilho de comentário e o passo Instagram. */
export const GATILHO_DE_COMENTARIO = "comment.received" as const;
export const PASSO_DO_INSTAGRAM = "send_instagram_message" as const;
export const PLATAFORMAS_DE_COMENTARIO = ["instagram", "facebook"] as const;
export type PlataformaDeComentario = (typeof PLATAFORMAS_DE_COMENTARIO)[number];

export const MAXIMO_DE_CAMINHOS = 10;
export const MAXIMO_DE_PUBLICACOES = 20;
export const MAXIMO_DE_VARIACOES = 5;
export const MAXIMO_DA_RESPOSTA = 300;
export const MAXIMO_DE_PALAVRAS = 20;
export const MAXIMO_DA_PALAVRA = 60;
export const MAXIMO_DO_TEXTO = 1000;
export const MAXIMO_DO_TEXTO_COM_BOTAO = 640;
export const MAXIMO_DE_BOTOES = 3;
export const MAXIMO_DO_TITULO_DO_BOTAO = 20;
/** Meta, Private Replies: até 7 dias depois do comentário. */
export const PRAZO_DA_RESPOSTA_PRIVADA_MS = 7 * 24 * 60 * 60 * 1000;
/** Clint: components.automation.InstagramCommentTriggerConfig.replyDefaultText. */
export const TEXTO_PADRAO_DA_RESPOSTA = "Te respondi no direct, dá uma olhada!";
export const ID_DO_CAMINHO_UNICO = "qualquer";
/** Janela em que o eco do Zernio casa com a mensagem que a automação gravou (D13). */
export const JANELA_DO_ECO_MS = 15 * 60 * 1000;
```

### 1.2 Schema (`lib/escale/comentarios/schema.ts`)

Importa só `zod` e `./constantes` (o `lib/schemas/webhooks.ts` importa este arquivo; o contrário faria ciclo).

```ts
const publicacaoSchema = z.object({
  /** O id da publicação NA PLATAFORMA (o `platformPostId` do webhook, o `id` de `accounts/{id}/posts`). */
  id: z.string().trim().min(1).max(64),
  legenda: z.string().max(300).nullable(),
  miniatura: z.string().url().max(2000).nullable(),
  tipo: z.string().max(30).nullable(),
});
const filtroSchema = z.discriminatedUnion("modo", [
  z.object({ modo: z.literal("qualquer") }),
  z.object({
    modo: z.literal("palavras"),
    palavras: z.array(z.string().trim().min(1).max(MAXIMO_DA_PALAVRA)).max(MAXIMO_DE_PALAVRAS),
    combinar: z.enum(["qualquer", "todas"]),
  }),
]);
const respostaSchema = z.object({ variacoes: z.array(z.string()).max(MAXIMO_DE_VARIACOES) });
const caminhoSchema = z.object({
  id: z.string().min(1).max(40),
  publicacoes: z.array(publicacaoSchema).max(MAXIMO_DE_PUBLICACOES),
  filtro: filtroSchema,
  resposta: respostaSchema.nullable(),
});
export const configDoComentarioSchema = z.object({
  channel_session_id: z.string(),            // vazio = conta não escolhida (a recusa sai em problemasDoGatilho)
  escopo: z.enum(["todos", "especificos"]),
  caminhos: z.array(caminhoSchema).max(MAXIMO_DE_CAMINHOS + 1),
});
export type ConfigDoComentario = z.infer<typeof configDoComentarioSchema>;
export type CaminhoDoGatilho = ConfigDoComentario["caminhos"][number];
export type FiltroDoCaminho = CaminhoDoGatilho["filtro"];
export type PublicacaoDoCaminho = CaminhoDoGatilho["publicacoes"][number];

export const botaoDoInstagramSchema = z.object({
  titulo: z.string().trim().min(1).max(MAXIMO_DO_TITULO_DO_BOTAO),
  url: z.string().url().max(2000).refine((u) => u.startsWith("https://"), "O link do botão começa com https://."),
});
export const configDoPassoDoInstagramSchema = z
  .object({ texto: z.string().trim().min(1).max(MAXIMO_DO_TEXTO), botoes: z.array(botaoDoInstagramSchema).max(MAXIMO_DE_BOTOES) })
  .refine((c) => c.botoes.length === 0 || c.texto.length <= MAXIMO_DO_TEXTO_COM_BOTAO, {
    message: "Com botão, a mensagem aceita até 640 caracteres.", path: ["texto"],
  });
export const acaoDoInstagramSchema = z.object({ type: z.literal(PASSO_DO_INSTAGRAM), config: configDoPassoDoInstagramSchema });

/** superRefine do create/update do motor: o gatilho de comentário com a configuração dele (mensagens da Clint). */
export function exigirConfigDoComentario(regra: { trigger_event?: string; trigger_config?: Record<string, unknown> }, ctx: z.RefinementCtx): void;
/** superRefine: o passo Instagram só com o gatilho de comentário (D9). Só olha quando a regra traz gatilho E ações. */
export function exigirGatilhoDoPassoDoInstagram(regra: { trigger_event?: string; actions?: readonly { type: string }[] }, ctx: z.RefinementCtx): void;
```

`exigirConfigDoComentario`: se `trigger_event !== GATILHO_DE_COMENTARIO`, sai. Senão `configDoComentarioSchema.safeParse(trigger_config)`; falhou → `addIssue({ code: "custom", path: ["trigger_config"], message: "Revise a configuração do gatilho." })`; passou → para cada mensagem de `problemasDoGatilho(config)` um `addIssue` custom no mesmo caminho. `exigirGatilhoDoPassoDoInstagram`: sem `trigger_event` ou sem `actions`, sai; se alguma ação é `PASSO_DO_INSTAGRAM` e o gatilho não é o de comentário → `addIssue({ code: "custom", path: ["actions"], message: "O passo Instagram funciona com o gatilho “Alguém comenta em um post”." })`.

### 1.3 Caminhos e filtro (`lib/escale/comentarios/caminhos.ts`)

```ts
import { casaComPalavraChave } from "@/lib/automation/palavra-chave";

/** O que o evento `comment.received` emitido por `receberComentario` traz (seção 3.1). */
export const comentarioDoEventoSchema = z.object({
  contact_id: z.string().uuid(),
  channel_session_id: z.string().uuid(),
  plataforma: z.enum(PLATAFORMAS_DE_COMENTARIO),
  conta_id: z.string().min(1),
  comentario: z.object({
    id: z.string().min(1),
    texto: z.string(),
    comentado_em: z.string(),
    publicacao_id: z.string().min(1),
    publicacao_zernio_id: z.string().nullable(),
    autor: z.object({ id: z.string().min(1), usuario: z.string().nullable(), nome: z.string().nullable() }),
  }),
  publicacao: z.object({ legenda: z.string().nullable(), miniatura: z.string().nullable(), link: z.string().nullable() }),
});
export type ComentarioDoEvento = z.infer<typeof comentarioDoEventoSchema>;
export function comentarioDoEvento(payload: unknown): ComentarioDoEvento | null;

export function casaComFiltro(texto: string, filtro: FiltroDoCaminho): boolean {
  if (filtro.modo === "qualquer") return true;
  const palavras = filtro.palavras.filter((p) => p.trim() !== "");
  if (palavras.length === 0) return false;
  const casa = (p: string) => casaComPalavraChave(texto, p, "contem");
  return filtro.combinar === "todas" ? palavras.every(casa) : palavras.some(casa);
}

/**
 * O caminho que o comentário pega nesta regra, ou null. Conta errada, config ilegível ou
 * nenhum caminho com a publicação → null. "todos" = o primeiro caminho, sem olhar publicação.
 * "especificos" = o caminho que contém a publicação (uma publicação está em um caminho só).
 */
export function caminhoDoComentario(triggerConfig: unknown, payload: unknown): CaminhoDoGatilho | null;

/** Sorteia a variação não vazia (o `aleatorio` é injetável para teste). Nenhuma → null. */
export function sortearVariacao(variacoes: readonly string[], aleatorio: () => number = Math.random): string | null;

/** Meta: até 7 dias. Data ilegível → false (não arrisca gastar a resposta privada). */
export function dentroDoPrazo(comentadoEm: string, agora: Date): boolean;

/** As recusas do gatilho, com os textos da Clint (seção 7). Vazio = pode salvar. */
export function problemasDoGatilho(config: ConfigDoComentario): string[];
```

`problemasDoGatilho`, na ordem (cada texto uma vez):
1. `channel_session_id` vazio → "Selecione um dispositivo para ver as publicações."
2. escopo `todos` com número de caminhos ≠ 1 ou com publicação → "Revise a configuração do gatilho."
3. escopo `especificos` sem caminho → "Adicione ao menos uma publicação ao gatilho."
4. mais de 10 caminhos → "O gatilho aceita até 10 caminhos de publicação."
5. caminho sem publicação (em `especificos`) → "Cada caminho precisa ter ao menos uma publicação."
6. mais de 20 publicações no total → "O gatilho aceita até 20 publicações."
7. a mesma publicação em dois caminhos → "Uma publicação só pode estar em um caminho."
8. filtro `palavras` sem nenhuma palavra preenchida → "Preencha a palavra do filtro de cada publicação ou use \"Qualquer comentário\"."
9. resposta com mais de 5 variações → "Cada resposta aceita até 5 variações."
10. resposta sem variação preenchida, ou com variação vazia → "Escreva a resposta ao comentário ou remova a resposta."
11. variação com mais de 300 caracteres → "A resposta ao comentário aceita até 300 caracteres."

### 1.4 Payload do webhook (`lib/escale/comentarios/webhook.ts`)

Contrato do SDK (`WebhookPayloadComment*`, seção 2.4). Lê com zod e devolve:

```ts
export interface ComentarioDoWebhook {
  eventoId: string | null;               // `id` (o X-Zernio-Event-Id)
  contaId: string;                       // account.id
  plataforma: string;                    // account.platform
  comentario: { id: string; texto: string; comentadoEm: string; ehResposta: boolean;
    publicacaoId: string; publicacaoZernioId: string | null; aoVivo: boolean };
  autor: { id: string; usuario: string | null; nome: string | null; daPropriaConta: boolean };
  publicacao: { legenda: string | null; miniatura: string | null; link: string | null };
}
/** null quando não é `comment.received` ou falta campo obrigatório. */
export function lerComentarioDoWebhook(payload: unknown): ComentarioDoWebhook | null;
```

Campos lidos: `event === "comment.received"`, `id?`, `account.{id,platform}`, `comment.{id, text, createdAt, isReply, platformPostId, postId?, isLive?, author.{id, username?, name?, isOwnAccount?}}`, `post.{content?, imageUrl?, permalink?}`. `isOwnAccount` ausente = `false` (o SDK diz que no Instagram e no Facebook ele sempre vem).

### 1.5 Puras da casca (`lib/escale/comentarios/tela.ts`)

```ts
export function configInicialDoComentario(): ConfigDoComentario; // { channel_session_id: "", escopo: "todos", caminhos: [{ id: "qualquer", publicacoes: [], filtro: { modo: "qualquer" }, resposta: null }] }
/** A tela de um gatilho recém-escolhido: a padrão do motor e, no de comentário, a configuração inicial. */
export function telaInicialDoGatilho(evento: string): TelaDoGatilho;
/** Ao abrir uma regra: põe o `trigger_config` gravado em `tela.configPropria` do nó do gatilho de comentário. */
export function comConfigPropria(desenho: Desenho, regra: RegraGravada | null): Desenho;
/** "{n} publicações · {m} caminhos no fluxo" (D2), para o resumo do painel. */
export function resumoDosCaminhos(config: ConfigDoComentario): { publicacoes: number; caminhos: number };
/** Um caminho novo por publicação, ou um só com todas (agrupar). Ids `caminho-1`, `caminho-2`… sem repetir os que existem. */
export function caminhosDasPublicacoes(existentes: readonly CaminhoDoGatilho[], novas: readonly PublicacaoDoCaminho[], agrupar: boolean): CaminhoDoGatilho[];
```

---

## 2. Banco e Zernio

### 2.1 Migration 9801 (`supabase/migrations/20261203120000_9801_disparos_de_comentario.sql`)

```sql
-- manifest: **Disparos de comentário (fork Escale, Fase 10B).** Tabela nova `escale_disparos_de_comentario`: uma linha por comentário que casou com uma automação de gatilho `comment.received` (conta, caminho, publicação, autor, texto, contato, execução, desfecho do direct e da resposta pública, motivo). Índice único por comentário em cada regra (o webhook reentregue não roda de novo) e por pessoa em cada regra fora das linhas `repetido` (uma mensagem por pessoa por automação). Gatilho de mesma organização reaproveita `fn_escale_automacao_da_mesma_org` (9701). RLS: a organização lê; só o servidor (service_role) grava. Função `fn_escale_resumo_dos_comentarios` (security invoker) conta os disparos de uma regra no período para o Insights. `automation_rules` e `automation_rule_runs` não mudam.
-- ---- FORK ESCALE · disparos de comentário (migration 9801) ----

create table if not exists public.escale_disparos_de_comentario (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  rule_id uuid not null references public.automation_rules(id) on delete cascade,
  channel_session_id uuid references public.channel_sessions(id) on delete set null,
  event_id uuid references public.event_log(id) on delete set null,
  run_id uuid references public.automation_rule_runs(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  caminho_id text not null check (char_length(caminho_id) between 1 and 40),
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  comentario_id text not null check (char_length(comentario_id) between 1 and 128),
  publicacao_id text not null check (char_length(publicacao_id) between 1 and 128),
  autor_id text not null check (char_length(autor_id) between 1 and 128),
  autor_usuario text check (autor_usuario is null or char_length(autor_usuario) <= 100),
  autor_nome text check (autor_nome is null or char_length(autor_nome) <= 200),
  texto text not null check (char_length(texto) <= 5000),
  comentado_em timestamptz not null,
  repetido boolean not null default false,
  direct text not null default 'pendente'
    check (direct in ('pendente', 'enviado', 'falhou', 'sem_passo', 'pulado')),
  resposta text not null default 'pendente'
    check (resposta in ('pendente', 'publicada', 'falhou', 'sem_resposta', 'pulada')),
  motivo text check (motivo is null or char_length(motivo) <= 80),
  resposta_publicada text check (resposta_publicada is null or char_length(resposta_publicada) <= 300),
  direct_message_id text check (direct_message_id is null or char_length(direct_message_id) <= 200),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index if not exists uq_escale_disparos_de_comentario_comentario
  on public.escale_disparos_de_comentario (organization_id, rule_id, comentario_id);
create unique index if not exists uq_escale_disparos_de_comentario_pessoa
  on public.escale_disparos_de_comentario (rule_id, plataforma, autor_id) where not repetido;
create index if not exists idx_escale_disparos_de_comentario_regra
  on public.escale_disparos_de_comentario (rule_id, created_at desc);

drop trigger if exists trg_escale_disparos_de_comentario_mesma_org on public.escale_disparos_de_comentario;
create trigger trg_escale_disparos_de_comentario_mesma_org
  before insert or update of rule_id, organization_id on public.escale_disparos_de_comentario
  for each row execute function public.fn_escale_automacao_da_mesma_org();

alter table public.escale_disparos_de_comentario enable row level security;
drop policy if exists escale_disparos_de_comentario_select on public.escale_disparos_de_comentario;
create policy escale_disparos_de_comentario_select on public.escale_disparos_de_comentario for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
revoke insert, update, delete, truncate on public.escale_disparos_de_comentario from anon, authenticated;
grant select on public.escale_disparos_de_comentario to authenticated;
grant all on public.escale_disparos_de_comentario to service_role;

create or replace function public.fn_escale_resumo_dos_comentarios(p_regra uuid, p_desde timestamptz)
returns jsonb language sql stable security invoker set search_path = public, pg_temp as $$
  select jsonb_build_object(
    'comentarios', count(*) filter (where not d.repetido),
    'repetidos', count(*) filter (where d.repetido),
    'directs', count(*) filter (where d.direct = 'enviado'),
    'directs_com_falha', count(*) filter (where d.direct = 'falhou'),
    'respostas', count(*) filter (where d.resposta = 'publicada'),
    'respostas_com_falha', count(*) filter (where d.resposta = 'falhou')
  )
  from public.escale_disparos_de_comentario d
  where d.rule_id = p_regra and (p_desde is null or d.created_at >= p_desde);
$$;
revoke all on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) from public, anon;
grant execute on function public.fn_escale_resumo_dos_comentarios(uuid, timestamptz) to authenticated, service_role;
```

Antes de colar, conferir no baseline da `main`: `fn_escale_automacao_da_mesma_org` existe (9701) e checa só `rule_id`/`organization_id`; `public.event_log(id)` é `uuid`; o nome de `fn_user_org_ids` e `fn_is_platform_admin` (usados na 9701).

### 2.2 Invariantes (`tests/invariants/escale-comentarios-9801.test.ts`)

Molde `tests/invariants/escale-automacoes-9707.test.ts` (`seedGov()`, `como(userId, sql)`, `lastLine`; ids `e5ca1e00-9801-4000-8000-…`). Casos:
- membro da org A lê as linhas da A e **não** vê as da B; anon não lê nada;
- `authenticated` (gerente da A) não consegue `insert`, `update` nem `delete` (erro de permissão);
- `service_role` grava; segunda linha com o mesmo `(organization_id, rule_id, comentario_id)` → 23505; segunda linha não `repetido` com o mesmo `(rule_id, plataforma, autor_id)` → 23505; com `repetido = true` entra;
- linha com `organization_id` diferente do da regra → `automacao_de_outra_organizacao`;
- `fn_escale_resumo_dos_comentarios` como membro da A conta 2 comentários, 1 repetido, 1 direct, 1 resposta; como membro da B devolve tudo zero (a RLS filtra); `p_desde` no futuro → zero;
- apagar a regra apaga as linhas (cascade).

### 2.3 Cliente do Zernio (`lib/escale/comentarios/zernio.ts`)

`socialRequest` (`lib/channels/social/client.ts`) joga fora o corpo do erro, e o motivo da recusa está nele (D10). O fork tem o próprio `fetch`, com as mesmas proteções (`redirect: "error"`, `cache: "no-store"`, `AbortSignal.timeout(15_000)`, base `zernioBaseUrl()`):

```ts
export type RespostaDoZernio<T> = { ok: true; dados: T } | { ok: false; status: number; corpo: unknown };
async function pedir<T>(chave: string, caminho: string, metodo: "GET" | "POST", corpo?: unknown, idempotencia?: string): Promise<RespostaDoZernio<T>>;

/** POST inbox/comments/{postId}/{commentId}/private-reply → { messageId } (SendPrivateReplyToComment200Response). */
export function respostaPrivada(chave: string, e: { postId: string; commentId: string; accountId: string; texto: string;
  botoes: readonly { titulo: string; url: string }[] }): Promise<RespostaDoZernio<{ messageId: string | null }>>;
// corpo: { accountId, message, ...(botoes.length ? { buttons: botoes.map(b => ({ type: "url", title: b.titulo, url: b.url })) } : {}) }

/** POST inbox/comments/{postId} com { accountId, message, commentId } e o header Idempotency-Key. */
export function responderComentario(chave: string, e: { postId: string; commentId: string; accountId: string; texto: string;
  idempotencia: string }): Promise<RespostaDoZernio<{ commentId: string | null }>>;

/** GET accounts/{accountId}/posts → as 25 mais recentes (GetAccountPosts200Response). */
export function publicacoesDaConta(chave: string, accountId: string): Promise<RespostaDoZernio<PublicacaoDaConta[]>>;
export interface PublicacaoDaConta { id: string; legenda: string | null; miniatura: string | null; tipo: string | null;
  criadaEm: string | null; link: string | null; comentarios: number | null }

export type MotivoDoDirect = "prazo_vencido" | "resposta_privada_ja_usada" | "botoes_recusados" | "resultado_incerto"
  | "acesso_recusado" | "provedor_indisponivel" | "credencial_indisponivel";
/** D10: o motivo pela resposta de erro (status + corpo). */
export function motivoDoErro(status: number, corpo: unknown): MotivoDoDirect;
export const EXPLICACAO_DO_MOTIVO: Record<MotivoDoDirect, string>;
```

O `postId` dos dois POST é `comentario.publicacao_zernio_id ?? comentario.publicacao_id` (o SDK não diz qual dos dois a rota aceita: a Task 0 confere numa chamada real e, se só um valer, a função passa a usar só ele). Todo caminho vai com `encodeURIComponent`.

`motivoDoErro`: 401/403 → `acesso_recusado`; corpo com `details.privateReplyConsumed === true` → `resposta_privada_ja_usada`; corpo com código Meta 2 e subcódigo 1545133 (procurar `code`/`subcode`/`error_subcode` em `details` ou `error`) → `botoes_recusados`; 502 com `details.privateReplyOutcome === "unknown"` → `resultado_incerto`; o resto → `provedor_indisponivel`.

`EXPLICACAO_DO_MOTIVO` (vai em `detail.explicacao`, que a 5C mostra):
- `prazo_vencido`: "O comentário tem mais de 7 dias. O Instagram só aceita resposta no direct até 7 dias depois do comentário."
- `resposta_privada_ja_usada`: "Este comentário já recebeu uma resposta no direct. O Instagram aceita uma só por comentário."
- `botoes_recusados`: "O Instagram recusou a mensagem com botão porque a pessoa não segue a conta. A resposta deste comentário foi gasta."
- `resultado_incerto`: "O Instagram não confirmou o envio. Confira a conversa antes de mandar de novo."
- `acesso_recusado`: "O Zernio recusou o acesso. Confira a conexão da conta em Canais."
- `provedor_indisponivel`: "O Zernio não respondeu agora. A mensagem não foi enviada."
- `credencial_indisponivel`: "A chave do Zernio desta conta não está disponível. Reconecte a conta em Canais."

### 2.4 Contrato do Zernio (conferido no SDK 0.0.1300 em 01/11; **frágil**, a Task 0 prova)

| Uso | Chamada | O que importa |
|---|---|---|
| Webhook | `comment.received` | `id`, `account.{id, platform, username}`, `comment.{id, postId?, platformPostId, text, createdAt, isReply, isLive?, author.{id, username?, name?, isOwnAccount?}}`, `post.{id?, platformPostId, content?, imageUrl?, permalink?}` |
| Resposta privada | `POST /v1/inbox/comments/{postId}/{commentId}/private-reply` | corpo `{ accountId, message, buttons?: [{ type: "url", title, url }] (1–3) }`; resposta `{ messageId, commentId, platform }`; 1 por comentário, até 7 dias; 400 `privateReplyConsumed`; 502 `privateReplyOutcome: "unknown"`; dispara `message.sent` uma vez |
| Resposta pública | `POST /v1/inbox/comments/{postId}` | corpo `{ accountId, message, commentId }`; header `Idempotency-Key` (24 h); resposta `{ success, data.commentId }` |
| Publicações | `GET /v1/accounts/{accountId}/posts` | 25 mais recentes; `posts[].{ id (da plataforma), message, createdTime, permalink, picture, mediaType, commentCount }` |
| Assinatura | `GET/PUT /v1/webhooks/settings` | o `PUT` é parcial (`{ webhookId, events }`), já usado pela ressincronização |

---

## 3. Servidor

### 3.1 Entrada do webhook (`lib/escale/comentarios/receber.ts`)

```ts
export type ResultadoDoComentario = { status: "ingested" | "ignored"; reason?: string };
export async function receberComentario(
  db: SupabaseClient,
  canal: { organizationId: string; channelSessionId: string; contaId: string; plataforma: string },
  payload: unknown,
): Promise<ResultadoDoComentario>;
```

1. `lerComentarioDoWebhook(payload)`; null → `ignored` / `comentario_ilegivel`.
2. Conta ou plataforma diferentes das do canal → `comentario_de_outra_conta`; plataforma fora de instagram/facebook → `rede_sem_comentario`.
3. `autor.daPropriaConta` → `comentario_da_propria_conta`; `comentario.aoVivo` → `comentario_de_live`.
4. Monta o payload do evento (forma `ComentarioDoEvento`, com `contact_id` provisório vazio) e lê as regras ativas: `automation_rules` `organization_id`, `trigger_event = 'comment.received'`, `is_active`, só `trigger_config`. Nenhuma com `caminhoDoComentario(cfg, payloadSemContato)` → `nenhum_caminho_casou` (D12). Para isso `caminhoDoComentario` não exige `contact_id` válido: ela lê o payload por um schema parcial (`channel_session_id`, `comentario.publicacao_id`, `comentario.texto`).
5. `upsertSocialContact(db, org, \`${plataforma}:${contaId}:${autor.id}\`, autor.nome ?? autor.usuario)` (exportada no encaixe 9; a mesma identidade do direct).
6. `db.rpc("emit_event", { p_event_type: "comment.received", p_entity_kind: "contact", p_entity_id: contactId, p_payload, p_metadata: { source: "zernio_comment", ...(eventoId ? { zernio_event_id: eventoId } : {}) }, p_organization_id })` (molde `lib/messaging/falha-de-entrega.ts`). Erro do RPC **lança** (a rota devolve 500 e o Zernio reentrega; a dedup do disparo segura a repetição).
7. `ingested`.

Reentrega do Zernio = evento repetido no `event_log`; quem segura é o índice único do disparo (3.2).

### 3.2 Disparos (`lib/escale/comentarios/disparos.ts`)

```ts
interface RegraDoMotor { id: string; name: string; actions: Array<{ type: string; config?: Record<string, unknown> }>; trigger_config?: Record<string, unknown> | null }
export interface DisparoDeComentario { id: string; caminho_id: string; direct: string; resposta: string; repetido: boolean }

/** Insere um disparo por regra. Fica só quem ganhou: 23505 no índice do comentário = reentrega (sai); 23505 no da pessoa = grava `repetido` (direct/resposta "pulado"/"pulada", motivo "ja_recebeu") e sai. Outro erro lança. */
export async function reivindicarDisparos<R extends RegraDoMotor>(admin: SupabaseClient, row: EventRow, regras: readonly R[]): Promise<R[]>;
export async function disparoDaRegra(admin: SupabaseClient, organizationId: string, ruleId: string, comentarioId: string): Promise<DisparoDeComentario | null>;
/** Fim da execução: run_id, "sem_passo" quando não há passo Instagram, e a resposta pública (D8). Nunca lança (loga). */
export async function concluirDisparo(admin: SupabaseClient, e: { row: EventRow; rule: RegraDoMotor; runId: string | null }): Promise<void>;
```

`concluirDisparo`: relê o disparo; acha o caminho por `caminho_id` no `trigger_config` da regra; `temPasso = rule.actions.some(a => a.type === PASSO_DO_INSTAGRAM)`. Resposta: sem `caminho.resposta` → `sem_resposta`; `temPasso` e `direct !== "enviado"` → `pulada`; senão `sortearVariacao` e `responderComentario` com `idempotencia = disparo.id` → `publicada` + `resposta_publicada`, ou `falhou` + `motivo` (`motivoDoErro`, sem sobrescrever o motivo do direct se ele já tem). Grava `run_id`, `direct = "sem_passo"` quando `!temPasso`, `resposta`, `updated_at`. A credencial vem de `zernioCredsForAccountId(admin, { organizationId, accountId: payload.conta_id })`; sem ela → resposta `falhou`, motivo `credencial_indisponivel`. O nome do índice que estourou sai de `error.message` (contém `uq_escale_disparos_de_comentario_pessoa` ou `_comentario`).

### 3.3 Passo Instagram (`lib/escale/comentarios/acao-do-instagram.ts`)

`registerAction({ type: PASSO_DO_INSTAGRAM, execute })` (sem `postponeUntil`: não há janela nem limite diário). `execute(ctx, config)`:
1. `configDoPassoDoInstagramSchema.safeParse(config)`; falhou → `failed`, `error: "config_invalida"`.
2. `ctx.event.event_type !== GATILHO_DE_COMENTARIO` → `skipped`, `detail.reason "so_com_gatilho_de_comentario"`, `explicacao` com a frase do D9.
3. `comentarioDoEvento(ctx.event.payload)`; null → `failed`, `error: "evento_ilegivel"`.
4. `disparoDaRegra(...)`; null → `skipped` (`sem_disparo`); `direct === "enviado"` → `success` (idempotente no Reenviar).
5. Fora do prazo (`dentroDoPrazo`) → atualiza o disparo (`direct "falhou"`, `motivo "prazo_vencido"`) e `failed` com `detail.{reason, explicacao}`.
6. Texto com as variáveis pelo mesmo renderizador do `send_whatsapp_message` (`lib/automation/template.ts`; conferir o nome exportado na Task 0) sobre `ctx.context`.
7. Credencial (`zernioCredsForAccountId`); sem ela → `credencial_indisponivel`.
8. `gravarDirectNaConversa(...)` (3.4) **antes** do envio; devolve o id da linha (ou null, sem impedir o envio: o erro é logado).
9. `respostaPrivada(...)`. Recusa → `motivoDoErro`, disparo `falhou` + motivo, `falharDirect(linha, motivo)`, `failed` com `detail.{reason, explicacao, erro: "HTTP {status}"}`. Sucesso → disparo `enviado` + `direct_message_id`, `confirmarDirect(linha, socialMessageId(contaId, messageId))`, `success` com `detail.message_id`.

### 3.4 Conversa e eco (`conversa.ts`, `eco.ts`)

```ts
export async function gravarDirectNaConversa(admin: SupabaseClient, e: { organizationId: string; channelSessionId: string;
  contactId: string; plataforma: string; texto: string; botoes: readonly { titulo: string; url: string }[]; disparoId: string }): Promise<string | null>;
export async function confirmarDirect(admin: SupabaseClient, organizationId: string, mensagemId: string, externalId: string | null): Promise<void>;
export async function falharDirect(admin: SupabaseClient, organizationId: string, mensagemId: string, motivo: string): Promise<void>;
export async function ecoDaMensagemDaAutomacao(admin: SupabaseClient, e: { organizationId: string; channelSessionId: string; msg: SocialMessage }): Promise<boolean>;
```

- `gravarDirectNaConversa`: conversa por `rpc("fn_upsert_wa_conversation", { p_org, p_contact, p_session })` (a mesma da ingestão); `ehCanalDeConversa(plataforma)` antes de gravar `conversations.channel`; insere `messages` com `direction "outbound"`, `sent_via "automation"`, `status "sending"`, `type "text"`, `body`, `metadata { origem: "comentario", disparo_id, botoes }`, `external_id null`; marca a conversa com `marcarConversaComMensagem` (`lib/channels/marcar-conversa.ts`; conferir a assinatura na Task 0). Erro → loga e devolve null.
- `confirmarDirect`: `status "sent"`, `sent_at`, `external_id` (23505 = o eco já gravou com o mesmo id: ignora). `falharDirect`: `status "failed"`, `error_code "zernio_error"`, `error_message` com a explicação.
- `ecoDaMensagemDaAutomacao`: só `msg.direction === "outbound"` e `msg.kind === "message"`. Acha o contato pela identidade `${msg.platform}:${msg.accountId}:${msg.participantId}` (não mesclado). Procura em `messages` (mesma org, mesmo canal, do contato, `sent_via "automation"`, `metadata->>origem = 'comentario'`, criada nos últimos 15 min) a linha com `external_id = msg.externalId`, senão a linha sem `metadata.eco` cujo `body` é igual a `msg.text`, a mais recente. Achou → grava `external_id = msg.externalId` (se diferente; 23505 ignora) e `metadata.eco = true`; grava `conversations.provider_conversation_id = msg.conversationId` na conversa dela; devolve true. Não achou → false.

### 3.5 Assinatura (`lib/escale/comentarios/assinatura.ts`)

```ts
export type EstadoDaAssinatura = "ja_assinada" | "assinada";
export async function garantirAssinaturaDeComentarios(db: SupabaseClient, org: string, channelSessionId: string): Promise<EstadoDaAssinatura>;
```

Canal `zernio_social` da org, não arquivado, com `webhook_path_token` → `readSocialIntegration` (sem integração: `SocialError` 422 "Configure a integração primeiro.") → `GET webhooks/settings` (lido com `events: z.array(z.string()).optional()`) → acha pelo sufixo `/api/v1/webhooks/channel/{token}` (não achou: 422 "Não há assinatura de webhook para esta conta. Reconecte a conta em Canais.") → já tem `comment.received` → `ja_assinada`; senão `PUT webhooks/settings { webhookId, events: [...EVENTOS_DA_ASSINATURA_SOCIAL] }`, relê e confere (não confirmou: 502 "O provedor não confirmou a assinatura de comentários.") → `assinada`. Usa `socialRequest` (aqui o corpo do erro não importa).

### 3.6 Rotas

Molde do prólogo: `app/api/v1/escale/tags/route.ts` (`requireSupportWrite` só no POST, `requireRole("manager", { requestId, resource: "automation_rules" })`, `fail`/`ok` de `lib/api/wrappers`, `export const dynamic = "force-dynamic"`, 500 com `requestId` no log).

- **`GET /api/v1/escale/comentarios/publicacoes?canal=<uuid>`**: canal da org, `zernio_social`, `social_platform` instagram/facebook (senão 404 "Conta não encontrada."); `status !== "WORKING"` → 409 `conta_desconectada`; credencial ausente → 409 `conta_desconectada`; `publicacoesDaConta`: 401/403 → 409 `acesso_recusado`; outro erro → 502 `erro_ao_carregar`; ok → `{ publicacoes: PublicacaoDaConta[] }`.
- **`POST /api/v1/escale/comentarios/assinatura`** corpo `{ canal: uuid }` (zod; 422): `garantirAssinaturaDeComentarios` → `{ estado }`; `SocialError` → `fail("assinatura_falhou", erro.message, erro.status)`. Audit `automation.comment_subscription_ensured` só quando `assinada` (acrescentar a ação em `lib/audit/actions.ts` no bloco do fork, se a lista for fechada; conferir na Task 0).
- **`GET /api/v1/automacoes-da-casca/[id]/comentarios?periodo=7d|30d|90d|tudo`**: `comRegraDosInsights` (5C) → `rpc("fn_escale_resumo_dos_comentarios", { p_regra, p_desde })` com o mesmo `p_desde` da rota `insights` (reaproveitar o ajudante dela) → `{ comentarios, repetidos, directs, directs_com_falha, respostas, respostas_com_falha }`.

---

## 4. Telas (provisórias: sem print, molde pelos textos da Clint)

Medidas e controles seguem o painel de 400 px da 5B (07-013, 07-027). Componentes da casca: `SeletorDaCasca`, `CampoDeTexto`, `BotaoDaCasca`, `JanelaDaCasca`, `JanelaDeConfirmacao`, `AjudaDaCasca`, `AvisoDaCasca` (ou o aviso que a 5B usa), `AbasDaCasca`, `InterruptorDaCasca`.

### 4.1 Escolha do gatilho (`EscolhaDoGatilho`, 07-020, D5)

`FONTES_DOS_GATILHOS` ganha, **depois de "mensagens"**, a fonte `{ fonte: "instagram", rotulo: "Instagram", opcoes: [{ evento: "comment.received", titulo: "Alguém comenta em um post", descricao: "Quando alguém comenta em um post da conta do Instagram", icone: "instagram" }], emBreve: [ "Contato envia uma mensagem" / "O contato envia uma mensagem para o Instagram"; "Alguém marca a conta em um story" / "Quando alguém menciona a conta do Instagram em um story"; "Alguém responde a um story" / "Quando alguém responde a um story da conta do Instagram" ] }`. Tipos: `FonteDoGatilho` ganha `"instagram"`; `IconeDoGatilho` ganha `"instagram"` (`InstagramLogo` da Phosphor em `ICONE_DO_GATILHO`); `FonteDosGatilhos` ganha `emBreve?: readonly { titulo: string; descricao: string }[]`. Ordem dos cartões da fonte, como na captura: "Contato envia uma mensagem" (em breve), "Alguém comenta em um post", os dois de story (em breve). Cartão em breve: `aria-disabled`, opaco 60 %, sem clique, selo "Em breve" 10 px `bg-casca-raia text-casca-texto-2 rounded px-1.5`. Ícone da fonte na coluna da esquerda: `InstagramLogo`. `precisaDeFormulario("comment.received")` → true.

### 4.2 Painel do gatilho de comentário (`FormularioDoComentario`, vista "formulário" do `PainelDoGatilho`)

O `PainelDoGatilho` passa a escolher: evento de comentário → `<FormularioDoComentario config={tela.configPropria} aoMudar={(c) => setTela({ ...tela, configPropria: c })} />`; senão o `FormularioDoGatilho` de hoje. `escolher(novo)` usa `telaInicialDoGatilho(novo)`. Corpo, de cima para baixo:

1. **"Selecione o dispositivo Instagram"** 13 px 600 + `AjudaDaCasca` ("A conta do Instagram ou a página do Facebook cujos comentários disparam a automação."). `SeletorDeConta` (`SeletorDaCasca aparencia="janela"`): cada conta com `InstagramLogo`/`FacebookLogo` 14 e o `display_name`; conta sem `WORKING` desabilitada com " — desconectada". Ao escolher (e ao abrir com conta já escolhida): `useGarantirAssinatura().mutate(canal)`; pendente → linha 11 px `casca-suave` "Ligando o recebimento de comentários…"; erro → aviso `casca-alerta` "Não consegui ligar o recebimento de comentários nesta conta. {mensagem}" + "Tentar novamente"; sucesso → nada. Trocar de conta com caminho que tem publicação → `JanelaDeConfirmacao` "Trocar a conta do Instagram?" / "As publicações dos caminhos atuais pertencem à conta anterior, então os caminhos serão removidos." / "Trocar conta e remover caminhos".
2. Divisória. **"Quais publicações disparam o gatilho?"** 13 px 600. Dois cartões de escolha `button aria-pressed rounded-lg border p-3` lado a lado (escolhido: borda `casca-marca`, fundo `casca-marca-suave`): "Todos os posts" / "Um único caminho para comentários em qualquer publicação"; "Posts específicos" / "Cada publicação vira um caminho no fluxo". Trocar de escopo com caminhos preenchidos → "Trocar as publicações do gatilho?" / "Ao salvar, os caminhos por publicação deixam de existir." / "Trocar". "Todos" → `caminhos = [caminho único]` (mantém filtro e resposta do primeiro); "Específicos" → `caminhos = []`.
3. **Todos:** um `CaminhoDoComentario` sem cabeçalho de publicação (título "Qualquer publicação").
   **Específicos:** linha de resumo 12 px `casca-suave` "{n} publicações · {m} caminhos no fluxo" (sem caminho: o texto vazio da Clint "Nenhuma publicação no gatilho ainda. Adicione publicações. Cada uma vira um caminho no fluxo, com seu próprio filtro de comentário."); os cartões `CaminhoDoComentario`; botão tracejado `h-11 w-full` com `Plus` "Adicionar publicação" (desabilitado sem conta, dica "Selecione um dispositivo para ver as publicações.") → `SeletorDePublicacoes`.
4. Embaixo, os problemas de `problemasDoGatilho` só depois de um Salvar recusado (o `ProblemasDoPainel` da 5B já mostra os do nó).

`CaminhoDoComentario` (`rounded-lg border border-casca-divisoria p-4 flex flex-col gap-3`):
- Cabeçalho (só em "específicos"): miniatura 40×40 `rounded-md object-cover` (sem miniatura: quadrado `bg-casca-raia` com o ícone da rede), legenda em 2 linhas 12 px ou "Sem legenda"; grupo → "Grupo · {n} publicações" e as miniaturas empilhadas (até 3). À direita, `Trash2` 14 ("Remover publicação" / "Remover grupo").
- **"Filtro de comentário"** 12 px 600: dois botões segmentados "Qualquer comentário" / "Com palavras". Com palavras: campo de palavras em chips (Enter ou vírgula adiciona; × remove; placeholder "Digite uma palavra e aperte Enter"; até 20) e "Combinar palavras com" + `SeletorDaCasca` ("Qualquer palavra", "Todas as palavras").
- `RespostaAoComentario` (4.3).

### 4.3 Resposta ao comentário (`RespostaAoComentario`, D8)

Sem resposta: botão de texto `casca-marca-forte` com `Plus` "Adicionar resposta ao comentário" → cria `{ variacoes: [TEXTO_PADRAO_DA_RESPOSTA] }`. Com resposta: título 12 px 600 "Resposta ao comentário" + `AjudaDaCasca` com "Uma das variações é escolhida ao acaso e publicada como resposta ao comentário."; cada variação com rótulo "Variação {n}" 11 px, `textarea` 2 linhas (fundo `casca-raia`, sem borda, 13 px, placeholder "Escreva a resposta ao comentário", contador `{len}/300` 10 px à direita, vermelho acima de 300) e `X` ("Remover variação", só com 2+); rodapé com "Adicionar variação" (desabilitado com 5) e o contador "{n}/5 variações"; link 11 px `casca-alerta` "Remover resposta ao comentário" → `resposta: null`.

### 4.4 Seletor de publicações (`SeletorDePublicacoes`, D6)

`JanelaDaCasca` 720 px. Cabeçalho "Selecionar publicações" + subtítulo 12 px "{conta} · cada publicação vira um caminho no fluxo". Linha 12 px "Escolha como deseja encontrar a publicação" e `AbasDaCasca`: **"Pesquisar publicação"** / **"Digitar o ID da publicação"**.
- **Pesquisar:** busca (`Search` 14, placeholder "Buscar por legenda", sem acento e sem caixa) e, ao lado, "Tipo de publicação" com chips "Todos", "Imagem", "Vídeo", "Reel", "Carrossel" (de `mediaType`: `IMAGE`→Imagem, `VIDEO`→Vídeo, `REELS`/`REEL`→Reel, `CAROUSEL_ALBUM`→Carrossel; desconhecido só em "Todos"). Grade `grid-cols-3 gap-3` de cartões `button aria-pressed` (miniatura quadrada, legenda 2 linhas 12 px ou "Sem legenda", data `dd/mm/aaaa`, tipo 10 px); escolhido: borda `casca-marca` e `Check` no canto; já em outro caminho: selo "No fluxo", desabilitado. Aviso 11 px `casca-suave` no fim: "Exibindo as publicações mais recentes. Para uma específica, use o ID.". Estados: carregando "Carregando publicações" (esqueletos 6 cartões); vazio "Nenhuma publicação encontrada"; filtro sem resultado "Nenhuma publicação corresponde aos filtros" + "Limpar filtro"; erro (`erro_ao_carregar`) "Erro ao carregar publicações" + "Tentar novamente"; `conta_desconectada` "Esta conta do Instagram está desconectada. Vá até Canais e conecte a conta novamente para carregar as publicações."; `acesso_recusado` "Não foi possível acessar esta conta do Instagram. Vá até Canais, desconecte a conta e conecte-a novamente para carregar as publicações.".
- **Digitar o ID:** "ID da publicação" (`CampoDeTexto`, placeholder "Ex: 17912345678901234", dica "Cole o ID da publicação do Instagram. Útil para posts antigos ou fora da lista."), botão "Adicionar"; aceita `^\d{5,40}(_\d{5,40})?$` (o `_` é do Facebook), senão "Use o ID numérico da publicação ou busque pela legenda."; já escolhido → "Esta publicação já está selecionada."; já no fluxo → "Esta publicação já está no fluxo.". Os IDs adicionados aparecem como chips com × ("Remover o ID {id}"), sem legenda nem miniatura.
- **Rodapé:** com 2+ escolhidas, `InterruptorDaCasca` "Agrupar em um único caminho" + dica "As publicações compartilham o mesmo filtro e a mesma resposta"; "Cancelar" e "Concluir" (marca, desabilitado sem escolha) → `caminhosDasPublicacoes(existentes, escolhidas, agrupar)`. Passar de 10 caminhos ou 20 publicações: "Concluir" desabilitado com o texto do limite (seção 1.3, itens 4 e 6).

### 4.5 Nó do gatilho de comentário (`CorpoDoComentario`)

No `CorposDoNo` da 5B, evento de comentário → `CorpoDoComentario` no lugar do chip de detalhe. Abaixo da linha com o ícone e "ALGUÉM COMENTA EM UM POST": chip da conta (logo 12 + `display_name`; sem conta "Dispositivo não configurado"); depois uma linha por caminho `rounded-lg bg-casca-raia px-3 py-2` com a miniatura 24×24, o rótulo ("Qualquer publicação" em "todos"; a legenda truncada ou "Sem legenda"; "Grupo · {n} publicações") e, embaixo, 11 px: "Qualquer comentário" ou as palavras em chips; a resposta, se houver, em itálico `casca-suave` "“{primeira variação}”" (`line-clamp-1`). "Específicos" sem caminho: "Nenhuma publicação selecionada". Rodapé extra 11 px `casca-suave`: "Caminhos sem conexão seguem pelo **Próximo passo** da automação." (D2). O "Próximo passo" da 5B continua.

### 4.6 Passo Instagram: paleta, nó e painel (`PainelDoInstagram`, `CorpoDoInstagram`, 07-014, 07-027, D9)

- **Paleta:** `PassoDaPaleta` ganha `"send_instagram_message"`; item `{ passo: "send_instagram_message", secao: "canais", titulo: "Instagram", descricao: "Enviar mensagem no Instagram" }` logo depois do WhatsApp. Com gatilho que não é de comentário: `aria-disabled`, sem arrastar, `title` com a frase do D9 (mesmo tratamento do item travado pelo laço).
- **Tipo do nó:** `TipoDoNo` ganha `"instagram"`; `tipoDoNo` mapeia `send_instagram_message` → `instagram` (e o `agrupar` da 5B não o põe dentro de "Ações": conferir que ele agrupa só `tipoDoNo === "acoes"`). `VISUAL_DO_NO.instagram`: `InstagramLogo`, rótulo "Instagram", `text-casca-fluxo-instagram`, `border-casca-fluxo-instagram`, `bg-casca-fluxo-instagram-suave`. Título do nó: "Enviar mensagem no Instagram".
- **`useFluxo.adicionar`** aceita `PASSO_DO_INSTAGRAM` e cria `{ type: PASSO_DO_INSTAGRAM, config: { texto: "", botoes: [] } }` (o `defaultActionConfig` do original não conhece o tipo); recusa com `toast.error` (frase do D9) se o gatilho não é de comentário.
- **Corpo do nó:** o balão da mensagem como o do WhatsApp (sem texto: "Escreva a mensagem") e, embaixo, os botões como pílulas `rounded-md border border-casca-divisoria px-2 py-1 text-[12px] text-center` com `ExternalLink` 11 e o título.
- **Painel** (cabeçalho `bg-casca-fluxo-instagram-suave`, logo e "Enviar mensagem no Instagram"): nota 12 px `casca-texto-2` em caixa `rounded-lg bg-casca-raia p-3`: "Esta mensagem sai como resposta privada ao comentário: uma por comentário, até 7 dias depois dele (regra do Instagram). Ela chega em Solicitações de mensagem, por isso o link vai em botão."; "Configure sua mensagem" 13 px 600; caixa com o `SeletorDeVariaveis` e o `textarea` (5 linhas, placeholder "Oi [CONTACT.FIRST_NAME], aqui está o link que você pediu!", contador `{len}/{640 ou 1000}`); "Botões" 13 px 600 + `AjudaDaCasca` ("Até 3 botões de link. O título aceita até 20 caracteres."); cada botão num bloco `rounded-lg bg-casca-raia p-3` com "Título do botão" (contador `/20`), "Link" (placeholder "https://") e `Trash2` ("Remover botão"); "+ Adicionar botão" (desabilitado com 3). Aviso `casca-aviso` quando há botão: "Se a pessoa não segue a conta, o Instagram pode recusar a mensagem com botão, e a resposta daquele comentário se perde." Erros de campo inline pelo `configDoPassoDoInstagramSchema` (texto vazio "Escreva a mensagem.", link inválido "O link do botão começa com https://."). "Salvar" do painel aplica no nó (como a 5B).

### 4.7 Insights (D15)

- `useResumoDosComentarios(ruleId, periodo)` só quando o gatilho é de comentário. Na `VisaoGeralDoNo` do gatilho, quatro cartões a mais, sem clique (`filtro: null`): "Comentários", "Repetidos" (dica "Pessoas que já tinham recebido esta automação: o fluxo não rodou de novo."), "Respostas públicas", "Respostas com falha". O cálculo entra na função que monta os cartões do nó do gatilho em `lib/escale/automacoes/insights/regras.ts` (conferir o nome na Task 0), recebendo o resumo como argumento opcional.
- O passo Instagram nos cartões da execução e no CSV: rótulo "Enviar mensagem no Instagram" por um mapa do fork `ROTULO_DO_PASSO_DA_CASCA` (em `lib/escale/automacoes/insights/regras.ts`), consultado antes do `ACTION_LABELS` em `CartaoDaExecucao.tsx` e `csv.ts`. A explicação já vem em `detail.explicacao`.

### 4.8 Tokens

Nos **mesmos quatro lugares** de `--color-casca-fluxo-whatsapp` (`grep -n "color-casca-fluxo-whatsapp" app/globals.css app/escale-tema.css`), logo abaixo dele, com `/* FORK ESCALE · Fase 10B: passo e gatilho do Instagram */`:

| Token | Claro | Escuro | Padrão do original |
|---|---|---|---|
| `--color-casca-fluxo-instagram` | `#d62976` | `#f472b6` | `var(--color-danger)` |
| `--color-casca-fluxo-instagram-suave` | `#fdeef5` | `color-mix(in oklab, #d62976 16%, #181b26)` | `var(--color-danger-bg)` |

(Provisórios; conferir `--color-danger`/`--color-danger-bg` no `@theme` do original e trocar pelo token vermelho/rosa que existir.)

---

## 5. Dados que a tela guarda no desenho

- **Gatilho:** `DadosDoGatilho.tela.configPropria` (encaixe 5) carrega a `ConfigDoComentario` inteira; `triggerConfigDaTela` a devolve como `trigger_config` quando existe. Abrir uma regra: `useFluxo` aplica `comConfigPropria(desenho, regraGravada)` logo depois de `desenhoDaRegra` (antes de `agrupar` e da arrumação). `retratoDoFluxo` já compara os dados, então mexer na configuração marca "Alterações não salvas".
- **Passo:** `acao = { type: "send_instagram_message", config: { texto, botoes } }`.
- **Prova do mesmo corpo:** uma regra de comentário gravada, aberta e salva sem mexer, manda o mesmo `trigger_config` e as mesmas `actions` (teste da Task 7).

---

## 6. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 10B: …`.

1. **`lib/schemas/webhooks.ts`**
   - `import { acaoDoInstagramSchema, exigirConfigDoComentario, exigirGatilhoDoPassoDoInstagram } from "@/lib/escale/comentarios/schema";`
   - Em `ENTIDADE_ESPERADA_POR_GATILHO`, depois de `"lead.stage_stale"`: `"comment.received": "contact",` com o comentário "o comentário do Instagram/Facebook; quem emite é `lib/escale/comentarios/receber.ts`, a entidade é o contato de quem comentou".
   - Depois de `TRIGGER_EVENTS`: `export const GATILHOS_SO_DA_CASCA = ["comment.received"] as const satisfies readonly GatilhoDeAutomacao[];` e `export const TRIGGER_EVENTS_DO_ORIGINAL = TRIGGER_EVENTS.filter((e) => !(GATILHOS_SO_DA_CASCA as readonly string[]).includes(e));`
   - `actionSchema = z.discriminatedUnion("type", [...acoesFixas, aiDecideSchema, acaoDoInstagramSchema])` (fora de `acoesFixas`: o `ai_decide` não escolhe o passo Instagram).
   - `createAutomationRuleSchema`: `.superRefine(exigirConfigDoComentario).superRefine(exigirGatilhoDoPassoDoInstagram)` antes do `recusarLacoDeLead`. `updateAutomationRuleSchema`: no segundo `superRefine`, `exigirConfigDoComentario(patch, ctx)`; e `.superRefine(exigirGatilhoDoPassoDoInstagram)`.
2. **`app/app/webhooks/_components/labels.ts`** — `TRIGGER_LABELS["comment.received"] = "Quando alguém comentar num post do Instagram ou do Facebook"` (o Record exige; a aba Atividade do original mostra o rótulo nas execuções).
3. **`app/app/webhooks/_components/RuleEditor.tsx`** — `CURATED_FIELDS["comment.received"] = []` (o Record exige) e a lista do seletor de gatilho passa a `TRIGGER_EVENTS_DO_ORIGINAL`. **`app/app/webhooks/automacoes/[id]/_components/PainelDaCaixa.tsx`** — a lista também passa a `TRIGGER_EVENTS_DO_ORIGINAL`. (Se o `CURATED_FIELDS` vazio quebrar algo, usar os campos de contato do `contact.tag_added`.)
4. **`lib/automation/engine.ts`**
   - `import { GATILHO_DE_COMENTARIO } from "@/lib/escale/comentarios/constantes"; import { caminhoDoComentario } from "@/lib/escale/comentarios/caminhos"; import { concluirDisparo, reivindicarDisparos } from "@/lib/escale/comentarios/disparos";`
   - No `matched.filter` de `applicable`, depois da linha do `message.sent`: `if (row.event_type === GATILHO_DE_COMENTARIO && !caminhoDoComentario(rule.trigger_config, row.payload)) return false;`
   - Depois do `if (!applicable.length) …no_match`: `const aExecutar = row.event_type === GATILHO_DE_COMENTARIO ? await reivindicarDisparos(admin, row, applicable) : applicable;` e `if (!aExecutar.length) return { consumer_key: AUTOMATION_CONSUMER_KEY, status: "ok", detail: "comentario_ja_tratado" };`. Os dois `for (const rule of applicable)` passam a `aExecutar`.
   - Depois do `insert` do run: `if (row.event_type === GATILHO_DE_COMENTARIO) await concluirDisparo(admin, { row, rule, runId: runRow?.id ?? null });`
5. **`lib/automation/desenho-da-regra.ts`** — `TelaDoGatilho` ganha `/** FORK ESCALE · Fase 10B: gatilho cuja configuração a casca monta inteira (comentário). */ configPropria?: Record<string, unknown>;` e `triggerConfigDaTela` começa com `if (tela.configPropria) return tela.configPropria;`. Nada mais (o `telaDoGatilho` não a preenche; quem preenche é o fork).
6. **`lib/automation/actions/register-all.ts`** — `import "@/lib/escale/comentarios/acao-do-instagram";`
7. **`lib/channels/social/store.ts`** — a lista de eventos do `connectSocialInbox` vira `export const EVENTOS_DA_ASSINATURA_SOCIAL = ["message.received", "message.sent", "message.delivered", "message.read", "message.failed", "comment.received"] as const;` (acima da função) e o corpo usa `events: [...EVENTOS_DA_ASSINATURA_SOCIAL]`.
8. **`lib/channels/social/ingest.ts`** — em `ingestSocialInbound`, depois de ler `platform` e antes de `parseSocialMessage`: `if ((payload as { event?: unknown } | null)?.event === "comment.received") return receberComentario(db, { organizationId: org, channelSessionId: sessionId, contaId: session.zernio_account_id as string, plataforma: platform }, payload);`
9. **`lib/channels/zernio/ingest.ts`** — `upsertSocialContact` passa a `export async function` (o fork usa a mesma porta); em `ingestZernioInbound`, logo depois de `const msg = …` (antes do ramo `status`): `if (input.socialMessage && (await ecoDaMensagemDaAutomacao(admin, { organizationId: input.organizationId, channelSessionId: input.channelSessionId, msg: input.socialMessage }))) return { status: "duplicate", reason: "eco_da_automacao" };`
10. **`supabase/baseline.sql`**, **`app/globals.css`**, **`app/escale-tema.css`**, **`lib/i18n/dicionario.ts`**, **`lib/ui/icons-da-casca.ts`** (só se faltar algum ícone: `ExternalLink`, `Check`; `InstagramLogo`/`FacebookLogo` já estão), **`lib/audit/actions.ts`** (se a lista de ações for fechada).
11. **`tests/unit/escale-fluxo-regras.test.ts`** — a ordem das fontes passa a `["negocios", "contatos", "mensagens", "instagram", "agenda", "datas"]`; a conferência de "cada `TRIGGER_EVENTS` uma vez" continua valendo (o `comment.received` está na fonte Instagram).

---

## 7. Textos (pt → es)

Da Clint: Instagram → Instagram; Alguém comenta em um post → Alguien comenta en una publicación; Quando alguém comenta em um post da conta do Instagram → Cuando alguien comenta en una publicación de la cuenta de Instagram; Contato envia uma mensagem → El contacto envía un mensaje; O contato envia uma mensagem para o Instagram → El contacto envía un mensaje al Instagram; Alguém marca a conta em um story → Alguien menciona la cuenta en una historia; Quando alguém menciona a conta do Instagram em um story → Cuando alguien menciona la cuenta de Instagram en una historia; Alguém responde a um story → Alguien responde a una historia; Quando alguém responde a um story da conta do Instagram → Cuando alguien responde a una historia de la cuenta de Instagram; Quais publicações disparam o gatilho? → ¿Qué publicaciones activan el disparador?; Todos os posts → Todas las publicaciones; Posts específicos → Publicaciones específicas; Um único caminho para comentários em qualquer publicação → Un único camino para comentarios en cualquier publicación; Cada publicação vira um caminho no fluxo → Cada publicación se convierte en un camino del flujo; Nenhuma publicação no gatilho ainda. Adicione publicações. Cada uma vira um caminho no fluxo, com seu próprio filtro de comentário. → Aún no hay publicaciones en el disparador. Agregue publicaciones. Cada una se convierte en un camino del flujo, con su propio filtro de comentario.; Adicionar publicação → Agregar publicación; Remover publicação → Quitar publicación; Remover grupo → Quitar grupo; Grupo · {n} publicações → Grupo · {n} publicaciones; Qualquer comentário → Cualquier comentario; Caminhos sem conexão seguem pelo Próximo passo da automação. → Los caminos sin conexión siguen por el Próximo paso de la automatización.; Nenhuma publicação selecionada → Ninguna publicación seleccionada; {n} publicações · {m} caminhos no fluxo → {n} publicaciones · {m} caminos en el flujo; Adicionar resposta ao comentário → Agregar respuesta al comentario; Adicionar variação → Agregar variación; {n}/{max} variações → {n}/{max} variaciones; Te respondi no direct, dá uma olhada! → ¡Te respondí por mensaje directo, échale un vistazo!; Uma das variações é escolhida ao acaso e publicada como resposta ao comentário. → Una de las variaciones se elige al azar y se publica como respuesta al comentario.; Escreva a resposta ao comentário → Escriba la respuesta al comentario; Remover resposta ao comentário → Quitar respuesta al comentario; Remover variação → Quitar variación; Variação {n} → Variación {n}; Trocar a conta do Instagram? → ¿Cambiar la cuenta de Instagram?; Trocar conta e remover caminhos → Cambiar cuenta y quitar caminos; Trocar as publicações do gatilho? → ¿Cambiar las publicaciones del disparador?; Selecionar publicações → Seleccionar publicaciones; {conta} · cada publicação vira um caminho no fluxo → {conta} · cada publicación se convierte en un camino del flujo; Escolha como deseja encontrar a publicação → Elija cómo desea encontrar la publicación; Pesquisar publicação → Buscar publicación; Digitar o ID da publicação → Escribir el ID de la publicación; Buscar por legenda → Buscar por leyenda; Tipo de publicação → Tipo de publicación; Todos → Todos; Imagem → Imagen; Vídeo → Video; Reel → Reel; Carrossel → Carrusel; Sem legenda → Sin leyenda; No fluxo → En el flujo; Exibindo as publicações mais recentes. Para uma específica, use o ID. → Mostrando las publicaciones más recientes. Para una específica, use el ID.; Carregando publicações → Cargando publicaciones; Nenhuma publicação encontrada → No se encontró ninguna publicación; Nenhuma publicação corresponde aos filtros → Ninguna publicación coincide con los filtros; Limpar filtro → Limpiar filtro; Erro ao carregar publicações → Error al cargar publicaciones; Tentar novamente → Intentar de nuevo; Esta conta do Instagram está desconectada. Vá até Canais e conecte a conta novamente para carregar as publicações. → Esta cuenta de Instagram está desconectada. Vaya a Canales y conecte la cuenta nuevamente para cargar las publicaciones.; Não foi possível acessar esta conta do Instagram. Vá até Canais, desconecte a conta e conecte-a novamente para carregar as publicações. → No fue posible acceder a esta cuenta de Instagram. Vaya a Canales, desconecte la cuenta y conéctela nuevamente para cargar las publicaciones.; ID da publicação → ID de la publicación; Ex: 17912345678901234 → Ej: 17912345678901234; Cole o ID da publicação do Instagram. Útil para posts antigos ou fora da lista. → Pegue el ID de la publicación de Instagram. Útil para publicaciones antiguas o fuera de la lista.; Use o ID numérico da publicação ou busque pela legenda. → Use el ID numérico de la publicación o busque por la leyenda.; Esta publicação já está selecionada. → Esta publicación ya está seleccionada.; Esta publicação já está no fluxo. → Esta publicación ya está en el flujo.; Remover o ID {id} → Quitar el ID {id}; Agrupar em um único caminho → Agrupar en un único camino; As publicações compartilham o mesmo filtro e a mesma resposta → Las publicaciones comparten el mismo filtro y la misma respuesta; Concluir → Concluir; Selecione um dispositivo para ver as publicações. → Seleccione un dispositivo para ver las publicaciones.; Enviar mensagem no Instagram → Enviar mensaje en Instagram; e as recusas da seção 1.3 (textos da Clint com os nossos limites).

Nossos: Em breve → Próximamente; Selecione o dispositivo Instagram → Seleccione el dispositivo de Instagram; A conta do Instagram ou a página do Facebook cujos comentários disparam a automação. → La cuenta de Instagram o la página de Facebook cuyos comentarios activan la automatización.; desconectada → desconectada; Ligando o recebimento de comentários… → Activando la recepción de comentarios…; Não consegui ligar o recebimento de comentários nesta conta. → No pude activar la recepción de comentarios en esta cuenta.; As publicações dos caminhos atuais pertencem à conta anterior, então os caminhos serão removidos. → Las publicaciones de los caminos actuales pertenecen a la cuenta anterior, así que los caminos se quitarán.; Ao salvar, os caminhos por publicação deixam de existir. → Al guardar, los caminos por publicación dejan de existir.; Trocar → Cambiar; Qualquer publicação → Cualquier publicación; Filtro de comentário → Filtro de comentario; Com palavras → Con palabras; Digite uma palavra e aperte Enter → Escriba una palabra y presione Enter; Combinar palavras com → Combinar palabras con; Qualquer palavra → Cualquier palabra; Todas as palavras → Todas las palabras; Resposta ao comentário → Respuesta al comentario; Adicionar → Agregar; Dispositivo não configurado → Dispositivo no configurado; O passo Instagram funciona com o gatilho “Alguém comenta em um post”. → El paso Instagram funciona con el disparador “Alguien comenta en una publicación”.; Esta mensagem sai como resposta privada ao comentário: uma por comentário, até 7 dias depois dele (regra do Instagram). Ela chega em Solicitações de mensagem, por isso o link vai em botão. → Este mensaje sale como respuesta privada al comentario: una por comentario, hasta 7 días después (regla de Instagram). Llega a Solicitudes de mensajes, por eso el enlace va en un botón.; Botões → Botones; Até 3 botões de link. O título aceita até 20 caracteres. → Hasta 3 botones de enlace. El título acepta hasta 20 caracteres.; Título do botão → Título del botón; Link → Enlace; Remover botão → Quitar botón; Adicionar botão → Agregar botón; Se a pessoa não segue a conta, o Instagram pode recusar a mensagem com botão, e a resposta daquele comentário se perde. → Si la persona no sigue la cuenta, Instagram puede rechazar el mensaje con botón y la respuesta de ese comentario se pierde.; Oi [CONTACT.FIRST_NAME], aqui está o link que você pediu! → ¡Hola [CONTACT.FIRST_NAME], aquí está el enlace que pediste!; Escreva a mensagem. → Escriba el mensaje.; O link do botão começa com https://. → El enlace del botón empieza con https://.; Com botão, a mensagem aceita até 640 caracteres. → Con botón, el mensaje acepta hasta 640 caracteres.; Comentários → Comentarios; Repetidos → Repetidos; Pessoas que já tinham recebido esta automação: o fluxo não rodou de novo. → Personas que ya habían recibido esta automatización: el flujo no volvió a ejecutarse.; Respostas públicas → Respuestas públicas; Respostas com falha → Respuestas con error; as explicações da seção 2.3; Quando alguém comentar num post do Instagram ou do Facebook → Cuando alguien comente en una publicación de Instagram o de Facebook.

---

## 8. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree, nomes e contrato do Zernio
- [ ] `git -C repo fetch escale-crm`; `git -C repo worktree add ../wt-10b -b feat/fase-10b-gatilho-de-comentario escale-crm/main`; `corepack pnpm install --frozen-lockfile`; copiar este plano para `wt-10b/docs/superpowers/plans/`.
- [ ] Conferir na `main` os nomes que o plano consome e ajustar o plano se divergirem: o renderizador de texto do `send-whatsapp.ts` (`lib/automation/template.ts`); `marcarConversaComMensagem`; `zernioCredsForAccountId` (forma do retorno: `apiKey`, `accountId`); a função dos cartões do nó em `lib/escale/automacoes/insights/regras.ts` e o ajudante de `p_desde` da rota `insights`; se `lib/audit/actions.ts` é lista fechada; se `agrupar` (`lib/escale/automacoes/fluxo/grupos.ts`) agrupa só `tipoDoNo === "acoes"`; `--color-danger`/`--color-danger-bg` no `@theme`; o último carimbo de migration.
- [ ] **Contrato do Zernio, só leitura, com o "pode" do usuário para usar a chave de produção** (a chave fica na integração da org Escale; rodar por um script de uma vez no scratchpad, sem gravar a chave em arquivo): `GET /v1/webhooks/settings` (a assinatura do @oregismarques traz `events`?) e `GET /v1/accounts/{id}/posts` do @oregismarques (o `id` das publicações é o numérico do Instagram?). Anotar no PR. **A resposta privada e o `comment.received` reais só se provam com o app publicado** (o webhook precisa chegar na VPS): ficam para a conferência da bateria da frente. Se o usuário não liberar a leitura agora, seguir pelo contrato do SDK e marcar no PR.
- [ ] Perguntar de novo ao usuário só se o Zernio já respondeu sobre o custo (decisão 7 do PRD); não bloqueia.

### Task 1: Constantes, schema e regras puras
**Files:** create `lib/escale/comentarios/{constantes,schema,caminhos,webhook,tela}.ts`; tests `tests/unit/escale-comentarios-regras.test.ts`, `-webhook.test.ts`, `-tela.test.ts`.
**Produces:** seção 1 inteira (nomes e tipos exatos).
- [ ] `casaComFiltro`: "Quero o LINK!" casa com `palavras ["link"], qualquer`; "quero" + "preço" com `todas` só casa quando os dois aparecem; sem acento ("PRECO" casa com "preço"); palavras só com espaço → false; `qualquer` → sempre true.
- [ ] `caminhoDoComentario`: conta diferente → null; "todos" → o caminho único, qualquer publicação; "especificos" com a publicação `"179"` no caminho 2 → caminho 2; publicação fora de todos → null; filtro que não casa → null; config ilegível → null; payload sem `channel_session_id` → null.
- [ ] `sortearVariacao(["a","b"], () => 0.99)` → "b"; `(["", " "])` → null; `dentroDoPrazo` com 6 dias 23 h → true, 7 dias e 1 min → false, data inválida → false.
- [ ] `problemasDoGatilho`: um caso por item da lista 1.3 (11 casos, texto exato) e a config válida → `[]`.
- [ ] Schema: `configDoPassoDoInstagramSchema` aceita texto de 1.000 sem botão, recusa 641 com botão ("Com botão, a mensagem aceita até 640 caracteres."), recusa título de 21, link `http://`, 4 botões; `exigirConfigDoComentario` (via um `z.object({...}).superRefine` de teste) põe as mensagens no caminho `trigger_config`; `exigirGatilhoDoPassoDoInstagram` recusa o passo com `contact.tag_added` e aceita com `comment.received`.
- [ ] `lerComentarioDoWebhook`: payload completo do SDK → objeto da 1.4; `isOwnAccount` ausente → false; `event` diferente → null; sem `comment.author.id` → null; `post.content` nulo → legenda null.
- [ ] `tela`: `telaInicialDoGatilho("comment.received").configPropria` = config inicial; outro evento → sem `configPropria`; `comConfigPropria` só mexe no nó do gatilho de comentário e não muda a entrada; `caminhosDasPublicacoes` com 3 publicações e `agrupar=false` → 3 caminhos `caminho-1..3` (pulando ids que existem), `agrupar=true` → 1 caminho com as 3; `resumoDosCaminhos`.
- [ ] Implementar; rodar; commit: `feat(escale): regras do gatilho de comentário e do passo Instagram`.

### Task 2: Migration 9801, baseline e invariantes
**Files:** create a migration (2.1); colar no `supabase/baseline.sql` (Global Constraints); create `tests/invariants/escale-comentarios-9801.test.ts` (2.2).
- [ ] Escrever o teste de invariantes; escrever a migration; colar o bloco no baseline.
- [ ] `corepack pnpm test:db tests/invariants/escale-comentarios-9801.test.ts` (Git Bash, Docker aberto) até ficar verde; `corepack pnpm checar:colisao-de-migration`.
- [ ] Commit: `feat(escale): migration 9801 (disparos de comentário)`.

### Task 3: O gatilho no motor
**Files:** create `lib/escale/comentarios/disparos.ts`; modify encaixes 1–5 e 11 da seção 6; tests `tests/unit/escale-comentarios-motor.test.ts` (molde `lib/automation/regra-por-fonte-no-motor.test.ts`: admin dublado) e `tests/unit/escale-comentarios-disparos.test.ts`.
**Consumes:** Task 1. **Produces:** `reivindicarDisparos`, `disparoDaRegra`, `concluirDisparo`; `GATILHOS_SO_DA_CASCA`, `TRIGGER_EVENTS_DO_ORIGINAL`.
- [ ] Motor: evento `comment.received` com duas regras ativas (uma com caminho que casa, outra com conta diferente) → só a primeira é reivindicada e executa; `reivindicarDisparos` devolvendo `[]` → `detail "comentario_ja_tratado"`, nenhum run; depois do run, `concluirDisparo` chamado com o `runId`; evento de outro tipo não chama nada do fork.
- [ ] Disparos: insert ok → regra fica; 23505 com o nome do índice do comentário → sai sem gravar mais nada; 23505 do índice da pessoa → grava a linha `repetido` com `direct "pulado"`, `resposta "pulada"`, `motivo "ja_recebeu"` e sai; outro erro lança. `concluirDisparo`: sem passo Instagram e com resposta → publica (o `responderComentario` dublado recebe `idempotencia = disparo.id` e a variação sorteada) e grava `direct "sem_passo"`, `resposta "publicada"`; com passo e `direct "falhou"` → `resposta "pulada"` sem chamar o Zernio; sem resposta → `sem_resposta`; Zernio recusa → `falhou` + motivo; nunca lança (erro do banco só loga).
- [ ] Schema do motor: `createAutomationRuleSchema` aceita uma regra de comentário completa; recusa sem conta ("Selecione um dispositivo para ver as publicações.") e recusa `send_instagram_message` com `lead.won`; `TRIGGER_EVENTS_DO_ORIGINAL` não tem `comment.received`; o `PainelDaCaixa` e o `RuleEditor` do original não listam o gatilho (teste de render curto, ou conferir pelos testes dele que já existem).
- [ ] `desenho-da-regra`: `triggerConfigDaTela` com `configPropria` devolve ela; sem, igual a hoje.
- [ ] Rodar também `lib/automation/gatilhos-em-uma-fonte.test.ts`, `lib/automation/desenho-da-regra.test.ts`, `tests/unit/escale-fluxo-regras.test.ts`, `tests/unit/escale-fluxo-mesmo-corpo.test.ts` e `tests/unit/gatilhos-de-encerramento-webhook.test.ts`: verdes.
- [ ] Commit: `feat(escale): gatilho de comentário no motor de automações`.

### Task 4: Passo Instagram, conversa e eco
**Files:** create `lib/escale/comentarios/{zernio,acao-do-instagram,conversa,eco}.ts`; modify encaixes 6 e 9; tests `tests/unit/escale-comentarios-zernio.test.ts`, `-acao.test.ts`, `-eco.test.ts`.
- [ ] Zernio (fetch dublado): `respostaPrivada` manda `POST …/private-reply` com `buttons [{ type: "url", title, url }]` só quando há botão e o `Authorization`; `responderComentario` manda o `Idempotency-Key`; `publicacoesDaConta` mapeia `posts[]`; `motivoDoErro` para os seis casos do D10; a chave nunca aparece em erro devolvido.
- [ ] Ação: config inválida → `failed`; gatilho de outro tipo → `skipped`; disparo já `enviado` → `success` sem chamar o Zernio; prazo vencido → `failed` com `explicacao` e disparo atualizado, sem chamar o Zernio; sucesso → a linha da conversa é gravada **antes** da chamada (ordem conferida pelo dublê), depois `confirmarDirect` com `social:{conta}:{messageId}` e o disparo `enviado`; recusa `botoes_recusados` → `falharDirect` e `failed` com a explicação; o texto sai com as variáveis renderizadas.
- [ ] Eco: eco com o mesmo `external_id` → true, grava `provider_conversation_id`; eco com id diferente e o mesmo texto em 5 min → true e troca o `external_id`; mesmo texto há 20 min → false; mensagem de entrada → false; contato não achado → false. Ingestão (`ingestZernioInbound` com admin dublado): eco da automação → `duplicate`, **sem** `pausarIaPorAtendimentoManual`; eco que não é da automação → o caminho de hoje (pausa).
- [ ] Commit: `feat(escale): passo Instagram com resposta privada e direct na conversa`.

### Task 5: Entrada do comentário e assinatura
**Files:** create `lib/escale/comentarios/{receber,assinatura}.ts`; modify encaixes 7 e 8; tests `tests/unit/escale-comentarios-receber.test.ts`, `-assinatura.test.ts`.
- [ ] Receber: comentário da própria conta, de live, de outra conta e sem regra que case → `ignored` com o motivo e **sem** contato; com regra que casa → `upsertSocialContact` com `instagram:{conta}:{autor}` e `emit_event` com `comment.received`, `contact`, o payload da forma `ComentarioDoEvento` e `zernio_event_id`; erro do `emit_event` lança. `ingestSocialInbound` com `event: "comment.received"` chama `receberComentario` e não o `parseSocialMessage`; `message.received` segue o caminho de hoje (rodar `lib/channels/social/ingest.test.ts` e `parser.test.ts`).
- [ ] Assinatura (`socialRequest` dublado): já tem o evento → `ja_assinada` sem PUT; não tem → PUT com os 6 eventos e releitura → `assinada`; releitura sem o evento → 502; sem assinatura → 422. `connectSocialInbox` cria assinatura com `comment.received` (rodar `lib/channels/social/sincronia.test.ts` e `ressincronizar.test.ts`).
- [ ] Commit: `feat(escale): comentário do Zernio vira contato e evento de automação`.

### Task 6: Rotas e hooks
**Files:** create as três rotas (3.6) e `hooks/escale/useComentarios.ts`; test `tests/unit/escale-comentarios-rotas.test.ts` (molde `tests/unit/escale-insights-rotas.test.ts`).
- [ ] Publicações: agente → 403; canal de outra org ou WhatsApp → 404; desconectado → 409 `conta_desconectada`; 401 do Zernio → 409 `acesso_recusado`; ok → `{ publicacoes }`. Assinatura: sem `requireSupportWrite` ok → 403; corpo inválido → 422; `SocialError` → o status dele. Comentários (Insights): id inválido → 404; ok → o resumo do RPC com o `p_desde` do período.
- [ ] Hooks: `useContasSociais()` = `useChannelSessions()` filtrado por `provider "zernio_social"` e `social_platform` instagram/facebook; `usePublicacoesDaConta(canal)` com `enabled: !!canal`, `staleTime` 60 s e o código do erro exposto; `useGarantirAssinatura()` (mutação, sem toast: o painel mostra o estado); `useResumoDosComentarios(ruleId, periodo, ligado)`.
- [ ] Commit: `feat(escale): rotas das publicações, da assinatura e dos números do comentário`.

### Task 7: Catálogo, paleta, tipo do nó e estado do fluxo
**Files:** modify `lib/escale/automacoes/fluxo/{gatilhos,paleta}.ts`, `components/escale/automacoes/fluxo/{useFluxo.ts,visual-do-fluxo.ts,PaletaDoFluxo.tsx}`, `…/painel/{EscolhaDoGatilho,PainelDoGatilho}.tsx`, tokens (4.8); tests: acrescentar em `tests/unit/escale-fluxo-regras.test.ts`, `escale-fluxo-estado.test.tsx`, `escale-fluxo-paleta.test.tsx`, `escale-fluxo-mesmo-corpo.test.ts`.
- [ ] Regras: a fonte Instagram vem depois de Mensagens com "Alguém comenta em um post" e três `emBreve`; `fonteDoEvento("comment.received")` → `"instagram"`; a paleta tem 8 itens com "Instagram" depois de "WhatsApp"; `tipoDoNo` do passo → `"instagram"`.
- [ ] Estado: abrir uma regra de comentário e salvar sem mexer → o `atualizar.mutateAsync` recebe o mesmo `trigger_config` e as mesmas `actions` (prova do mesmo corpo para o gatilho novo); mexer num caminho deixa `sujo`; `adicionar("send_instagram_message")` com gatilho de comentário cria a caixa com `{ texto: "", botoes: [] }`; com outro gatilho → `toast.error` e nada muda.
- [ ] Paleta e escolha: o item "Instagram" desligado com a dica do D9 quando o gatilho não é de comentário; a escolha mostra a fonte "Instagram", os quatro cartões na ordem da captura, três com "Em breve" e sem clique; escolher "Alguém comenta em um post" abre o formulário.
- [ ] Commit: `feat(escale): fonte Instagram, passo Instagram na paleta e estado do fluxo`.

### Task 8: Painel do gatilho de comentário
**Files:** create `comentario/{FormularioDoComentario,SeletorDeConta,CaminhoDoComentario,RespostaAoComentario}.tsx`; test `tests/unit/escale-comentarios-formulario.test.tsx` (hooks mockados).
- [ ] Testes: "Selecione o dispositivo Instagram" com as contas (Instagram e Facebook, a desconectada desabilitada); escolher a conta chama `garantirAssinatura`; erro da assinatura mostra o aviso e "Tentar novamente"; trocar de conta com caminhos pede "Trocar a conta do Instagram?"; "Todos os posts" mostra um caminho "Qualquer publicação"; "Posts específicos" sem caminho mostra o texto vazio da Clint e "Adicionar publicação" (desabilitado sem conta); o filtro troca para "Com palavras", Enter adiciona a palavra, × tira, "Combinar palavras com" troca; "Adicionar resposta ao comentário" cria a variação com "Te respondi no direct, dá uma olhada!", "Adicionar variação" até 5 e o contador "{n}/5 variações", "Remover resposta ao comentário" volta ao botão; cada mudança chama `aoMudar` com a config nova (sem mutar a anterior).
- [ ] Commit: `feat(escale): painel do gatilho de comentário`.

### Task 9: Seletor de publicações
**Files:** create `comentario/SeletorDePublicacoes.tsx`; test `tests/unit/escale-comentarios-seletor.test.tsx`.
- [ ] Testes: "Selecionar publicações" com o subtítulo da conta; carregando, vazio, erro com "Tentar novamente", `conta_desconectada` e `acesso_recusado` com os textos da Clint; busca "promo" (sem acento/caixa) filtra pela legenda; chip "Reel" filtra; filtro sem resultado → "Nenhuma publicação corresponde aos filtros" e "Limpar filtro"; publicação já no fluxo tem "No fluxo" e não seleciona; aba do ID recusa "abc" com "Use o ID numérico da publicação ou busque pela legenda.", aceita "17912345678901234" e "123456_7891011", recusa repetido; com 2 escolhidas aparece "Agrupar em um único caminho"; "Concluir" chama `aoConcluir` com as escolhidas e o `agrupar`; passar do limite desabilita "Concluir" com o texto.
- [ ] Commit: `feat(escale): seletor de publicações do gatilho de comentário`.

### Task 10: Nós e painel do passo Instagram
**Files:** create `comentario/{CorpoDoComentario,CorpoDoInstagram,PainelDoInstagram}.tsx`; modify `CorposDoNo.tsx`, `TelaDoFluxo.tsx` (painel do tipo `instagram`); test `tests/unit/escale-comentarios-nos.test.tsx`.
- [ ] Nó do gatilho: chip da conta (ou "Dispositivo não configurado"); "todos" → "Qualquer publicação" e "Qualquer comentário"; dois caminhos com palavras e resposta → duas linhas, chips das palavras e "“Te respondi…”"; grupo → "Grupo · 3 publicações"; sem caminho → "Nenhuma publicação selecionada"; o rodapé "Caminhos sem conexão seguem pelo Próximo passo da automação.".
- [ ] Nó do passo: rótulo "Instagram", título "Enviar mensagem no Instagram", balão do texto ou "Escreva a mensagem", pílulas dos botões; borda `border-casca-fluxo-instagram` quando selecionado.
- [ ] Painel: a nota da resposta privada; texto com o contador 0/1000 que vira /640 com botão; "Adicionar botão" até 3; título com 21 caracteres mostra o contador vermelho; link `http://` mostra "O link do botão começa com https://."; o aviso dos botões aparece com botão; "Salvar" manda `{ kind: "acao", acao: { type: "send_instagram_message", config: { texto, botoes } } }`; inserir variável põe o token no cursor.
- [ ] Commit: `feat(escale): nós do comentário e painel do passo Instagram`.

### Task 11: Insights, textos e documentos
**Files:** modify `lib/escale/automacoes/insights/{regras,csv}.ts`, `…/insights/{VisaoGeralDoNo,CartaoDaExecucao}.tsx`, `lib/i18n/dicionario.ts`, `docs/modulos/5-automacoes.md`, `docs/modulos/10-comentarios.md`; test `tests/unit/escale-comentarios-insights.test.tsx`.
- [ ] Testes: o nó do gatilho de comentário no Insights mostra "Comentários 12", "Repetidos 3", "Respostas públicas 9", "Respostas com falha 1" (números em pt-BR), sem botão; outro gatilho não pede o resumo; o cartão da execução mostra "Enviar mensagem no Instagram" e a explicação de `botoes_recusados`; o CSV usa o mesmo rótulo.
- [ ] Textos da seção 7 no dicionário (pt e es), no bloco do fork; rodar o teste de completude do dicionário, se existir (`corepack pnpm vitest run tests/unit/i18n*`).
- [ ] PRD de Automações, item C7: "Instagram: adotado no PRD 10 (10B: comentário; 10D: direct e stories)". PRD 10, seção 8: estado da 10B "Mergeada, sem publicar".
- [ ] Commit: `feat(escale): números do comentário no Insights e textos da 10B`.

### Task 12: Fechamento da fase
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/comentarios components/escale/automacoes/fluxo hooks/escale/useComentarios.ts app/api/v1/escale/comentarios "app/api/v1/automacoes-da-casca/[id]/comentarios" lib/automation/engine.ts lib/automation/desenho-da-regra.ts lib/schemas/webhooks.ts lib/channels/social lib/channels/zernio/ingest.ts tests/unit/escale-comentarios-*`; `corepack pnpm vitest run tests/unit/escale-comentarios-* tests/unit/escale-fluxo-* tests/unit/escale-insights-* lib/automation lib/channels/social`.
- [ ] Cercas: `corepack pnpm vitest run -c vitest.cercas.ts`. Corrigir o que for novo sem mexer na cerca; as ~44 falhas antigas do Windows ficam anotadas (memória `frente-automacoes-estado`).
- [ ] Diff do original: `git diff --stat escale-crm/main -- lib app/app/webhooks` mostra só os arquivos da seção 6.
- [ ] Olhar no navegador local (`corepack pnpm dev`, casca ligada; se a worktree não tiver `.env`, anotar que não deu e deixar para a bateria): escolher a fonte Instagram, montar "Posts específicos" com dois caminhos, uma resposta com duas variações, o passo Instagram com um botão, salvar, reabrir e salvar sem mexer (botão desabilitado).
- [ ] Auto-revisão do diff pela checklist de `code-review.md` (o revisor Opus 5.5 é um por frente, na bateria; esta fase mexe em motor, webhook e banco: pedir revisão dedicada desses pontos lá).
- [ ] PR para `escale-crm/main`: itens do PRD cobertos, decisões D1–D16, o provisório (painel, seletor, nó, passo, cores, limites), as diferenças aceitas (caminhos sem saída própria, sem "Próxima publicação", sem "Carregar mais", passo só com comentário, três gatilhos "Em breve"), o resultado da Task 0 (contrato) e a nota "não publica: Frente 10-I em andamento; prova real com o Reels na bateria". Merge direto. Atualizar `LOG.md` (feito / onde estamos / próximo: plano da 10C).
- [ ] Commit do LOG: `docs: LOG da fase 10B`.

---

## 9. Critério de pronto (linha 10B da seção 8 do PRD)

- Com a casca, a fonte "Instagram" aparece na escolha do gatilho como na 07-020; "Alguém comenta em um post" abre o painel com conta, escopo, caminhos, filtro e resposta; o passo "Instagram" entra pela paleta com texto e botões; a regra salva e reabre igual (prova do mesmo corpo).
- No motor (testes): o comentário que casa cria **um** contato com a identidade `<rede>:<conta>:<autor>`, roda o fluxo **uma vez** por comentário e por pessoa, manda a resposta privada com os botões, grava a mensagem na conversa sem pausar a IA (o eco não duplica), publica a resposta pública só depois do direct, e o Insights mostra os números. RLS da tabela de disparos provada (Task 2).
- Sem a casca, o designer não oferece o gatilho e o corpo de toda regra antiga é o mesmo.
- **Na bateria da Frente 10-I** (depois da 10A publicada): uma automação num Reels do @oregismarques; N comentários de teste com a palavra geram N directs com o botão em menos de 1 minuto, 0 duplicados, N respostas públicas; o Insights mostra os N; cada pessoa é um contato só (mesma identidade do direct); a mensagem aparece na conversa e o agente de IA continua ligado. E a conferência lado a lado com 07-014, 07-020 e 07-027 (e os prints da seção 11 do PRD, se chegarem).

## 10. Riscos desta fase

| Risco | Mitigação |
|---|---|
| O contrato do Zernio (SDK 0.0.x) divergir da API real (`postId`, `events` na assinatura, formato do erro) | Task 0 lê o que dá sem gravar; o cliente do fork fica num arquivo só; a prova real é critério da bateria |
| O id de quem comenta não ser o mesmo `participantId` do direct (dois contatos) | Mesma chave de identidade; a bateria mede (critério "um contato só"); se falhar, a 10C trata antes de seguir (PRD, risco "contato duplicado") |
| O Instagram recusar botões para quem não segue a conta e gastar a resposta | Motivo `botoes_recusados` legível no Insights, aviso no painel; pergunta 1 abaixo |
| O eco chegar com outro id e pausar a IA | `ecoDaMensagemDaAutomacao` casa por id e, na falta, por texto em 15 min; a linha é gravada antes do envio; teste na Task 4 |
| Webhook reentregue ou duas regras ao mesmo tempo mandarem dois directs | Índices únicos do banco (Task 2) + reivindicação antes das ações (Task 3) |
| Cada comentário de qualquer post virar contato | Só cria contato quando alguma regra ativa casa (D12) |
| Canais antigos sem `comment.received` | Assinatura garantida ao escolher a conta (D14), com aviso e "Tentar novamente" |
| Encaixes no motor e na ingestão (arquivos do Rafael) | Poucas linhas, comentadas, cobertas pelos testes que já existem dessas peças; a revisão Opus da bateria olha esses pontos |
| Painel sem print divergir da Clint | Provisório no PR; pedir os prints da seção 11 do PRD |

## 11. Perguntas ao usuário (não bloqueiam a execução)

1. **Botões e quem não segue a conta (D10):** o Zernio avisa que o Instagram pode recusar a mensagem com botão para quem não segue a conta, e aí a resposta daquele comentário se perde. O plano manda com botão (como no PRD) e mostra o motivo no Insights. A alternativa seria mandar o link no texto, sem botão. Fica com botão?
2. **Caminhos (D2):** na Clint cada publicação pode levar a um passo diferente. O nosso motor é uma fila, então todos os caminhos seguem para o mesmo "Próximo passo" (cada caminho tem o próprio filtro e a própria resposta pública). Pode?
3. **Facebook (D4):** a fonte se chama "Instagram", como na Clint, e as páginas do Facebook aparecem no mesmo seletor de conta. Pode, ou prefere a fonte "Instagram e Facebook"?
4. **"Próxima publicação" (D3):** fica para a 10D, porque o Zernio só avisa post novo do que foi publicado por ele. Pode?
5. **Limites (D16):** 10 caminhos, 20 publicações, 5 variações de até 300 caracteres. Pode?
6. **Prints da Clint** que ajudariam (só olhar, sem salvar nada lá): o painel do gatilho "Alguém comenta em um post" aberto, o seletor de publicações, o nó com caminhos no canvas e o painel do passo "Instagram".
