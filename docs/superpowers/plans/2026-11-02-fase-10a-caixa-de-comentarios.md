# Fase 10A — Caixa de comentários do Instagram e do Facebook em Atendimento · Implementation Plan

> **Para quem executa:** use superpowers:executing-plans, inline, em Sonnet 5.5 (memória `executar-planos-com-executing-plans`). Steps use checkbox (`- [ ]`) syntax for tracking. Mesmo padrão dos planos da 10B, da 10C e da 10D: decisões, arquivos, interfaces, regras, SQL, textos e testes escritos aqui; o código de tela restante é escrito na execução seguindo os moldes citados.

> **PRD:** `docs/modulos/10-comentarios.md` (aprovado em 01/11/2026): linhas 10A do quadro A da seção 4, linha "Ver, no comentário, se a pessoa já é contato e abrir a ficha" do quadro C, seções 5 (linha "Comentários de uma conta"), 6 ("Posts com comentários" e "Comentários de um post") e 7 ("Comentário: não se guarda"), linha 10A da seção 8, decisões 1, 2, 3 e 4 da seção 9, riscos "Duas chaves do Zernio", "Contato duplicado por id diferente", "LGPD" e "Sincronia com o original" da seção 12.
> **Frente 10-I** (10B → 10C → **10A**; executa tudo, testa tudo uma vez, publica tudo uma vez). **É a última fase da frente:** depende da 10B (PR #150: `lib/escale/comentarios/*`, `escale_disparos_de_comentario`, `respostaPrivada`, `responderComentario`, `gravarDirectNaConversa`, `ecoDaMensagemDaAutomacao`, `hooks/escale/useComentarios.ts`) e da 10C (PR #151: 9802, a mescla dos disparos, `/app/contacts/{id}`). Worktree nova `wt-10a` a partir de `escale-crm/main` (hoje `3067703c4`). **Uma migration (9803).** Um PR (`feat/fase-10a-caixa-de-comentarios`). A Task 10 fecha a fase **e a Frente 10-I inteira**: bateria, revisor, conferência visual, provas reais e UMA publicação.

**Goal:** com a casca ligada, Atendimento ganha a caixa de comentários: escolher uma conta do Instagram ou do Facebook, ver a lista das publicações com comentários, abrir uma publicação e ler os comentários em ordem, com as respostas aninhadas, responder um comentário em público, mandar direct a partir dele (com a regra da Meta na tela: um por comentário, até 7 dias), ocultar e reexibir, apagar (com confirmação, só gerente e admin) e ver se quem comentou já é contato, com o atalho para a ficha. O direct mandado daqui aparece na conversa do contato em Atendimento, sem duplicar.

**Architecture:**
- **O Zernio é a fonte dos comentários** (decisão 1 e seção 7 do PRD: o comentário não se guarda). As listas são lidas sob demanda da API de comentários do Zernio (`GET /v1/inbox/comments` e `GET /v1/inbox/comments/{postId}`), pelo servidor, com a chave da conta (`zernioCredsForAccountId`). Nada de webhook nem de tempo real nesta fase.
- **O banco guarda só o que o CRM fez.** A 9803 cria `escale_acoes_no_comentario`: uma linha por ação feita à mão (resposta, direct, ocultar, reexibir, apagar), com quem fez e o desfecho. Ela segura a regra "um direct por comentário" com índice único (dois cliques ou duas pessoas ao mesmo tempo) e marca o que o CRM já respondeu. O direct que a automação da 10B mandou vem de `escale_disparos_de_comentario`.
- **"Já é contato"** sai do banco, não do Zernio: a identidade `<rede>:<conta>:<autor>` em `contacts.social_identity` (a mesma do direct e da 10B) e, na falta, o `contact_id` do disparo da automação para aquele autor (que a 10C leva junto na mescla).
- **Direct à mão = resposta privada** (`respostaPrivada` da 10B, sem botões). Antes do envio o fork acha ou cria o contato (`upsertSocialContact`) e grava a mensagem na conversa como envio de pessoa (`sent_via 'user'`, `sent_by_user_id`). O eco `message.sent` do Zernio é reconhecido como a mesma mensagem (`eco.ts` passa a aceitar a origem nova).
- **Rotas de ação com prólogo único** (`lib/escale/comentarios/rota-da-acao.ts`): suporte, papel, quem atende a conta, canal, credencial. A 10D encaixa o "Curtir" no mesmo molde.

**Tech Stack:** Next.js 16 App Router, TypeScript estrito, zod 4, React Query (`useInfiniteQuery`), Radix, `lucide-react` 1.x e Phosphor pela `lib/ui/icons-da-casca.ts`, Supabase (RLS), Vitest + Testing Library, `test:db` (Postgres efêmero, `gov-helpers`). API do Zernio pelo SDK `zernio` 0.0.1300 (crates.io), **frágil**: a Task 0 prova.

## Global Constraints

- **REGRA PÉTREA:** a execução só começa com o "pode fazer" do usuário. Depois, a entrega até produção é do Claude (CLAUDE.md): PR, merge, tag `vX.Y.Z-escale.N`, release, `promover-stable`, `backup.sh`, `update.sh --to <tag>` na VPS nova `76.13.228.29`, conferência da produção. Proibido: push em `origin` (Rafael), gravar no banco de produção fora das migrations, mexer em n8n, evolution, traefik, portainer, `postgres_postgres` e na rede `todanet`.
- **Ordem da frente (CLAUDE.md, executa tudo, testa tudo, publica tudo):** a 10A é a última fase da Frente 10-I. Executar todas as tasks sem teste pesado; depois UMA bateria da frente inteira (10B + 10C + 10A: unidade completa + `test:db` + `test:db:update`, em segundo plano), UM revisor **Opus 5.5** para a frente inteira (nunca Sonnet; Fable só se o revisor achar algo de concorrência ou RLS sutil demais), UMA conferência visual, UMA publicação. Tags no meio da frente: nenhuma.
- **Durante a execução:** só o teste que a task cria, `corepack pnpm typecheck` (com `NODE_OPTIONS=--max-old-space-size=10240`) e `corepack pnpm eslint <arquivos>`. **Exceção:** a Task 2 roda `corepack pnpm test:db tests/invariants/escale-comentarios-9803.test.ts` uma vez (pelo **Git Bash**, Docker aberto, com `CONFERENCIA_KIT_RELEASE=<última tag>`; memória `frente-automacoes-estado`).
- **Migration 9803:** `supabase/migrations/20261203140000_9803_acoes_no_comentario.sql` (carimbo seguinte ao da 9802, `20261203130000`; a 10D já reservou `20261203150000` para a 9804). Cabeçalho `-- manifest:` obrigatório, sem linha no `MANIFEST.md`; `corepack pnpm checar:colisao-de-migration` antes do PR. O bloco vai colado no `supabase/baseline.sql` **logo depois do bloco da 9802** (`grep -n "migration 9802" supabase/baseline.sql`) e antes da varredura de anon (memória `baseline-ordem-dos-blocos-do-fork`).
- **Arquivos do Rafael** só nos encaixes da seção 6 (dois, de poucas linhas), com o comentário `// FORK ESCALE · Fase 10A: …`. Em arquivo compartilhado (`lib/i18n/dicionario.ts`, `lib/audit/actions.ts`, `supabase/baseline.sql`) o bloco do fork entra no ponto fixo indicado, nunca no fim.
- **Sem a casca nada muda:** a rota `/app/inbox/comentarios` redireciona para `/app/inbox` quando a casca está desligada (molde `app/app/inbox/configuracoes/_casca.tsx`); o inbox do original não ganha nada.
- **Igual à Clint:** a Clint **não tem** caixa de comentários (PRD 4.A e decisão 2). O visual segue o padrão da casca de Atendimento, que já é o da Clint: três colunas da ficha 02-003 (lista 320 | centro | painel 384), a linha da fila (c01), o cabeçalho e o painel do contato da 3A. O molde da seção 4 é **provisório**: o PRD pede "molde confirmado antes do plano", e não há confirmação nem print; **aprovar este plano vale como confirmação do molde**, salvo se o usuário mandar outra referência antes da Task 7. Nada de `<select>`, checkbox nativo ou controle do navegador. **Não escrever caminho de imagem** neste plano nem no PR (cerca `evidencia-citada`). A conferência lado a lado é da bateria.
- **Marca:** `casca-marca` onde a Clint usa o roxo (botão Enviar, contador, item ativo, aba escolhida). Os logos do Instagram e do Facebook só como selo da rede (o mesmo do `SeletorDeConta` da 10B).
- **Formatos BR:** hora e data das linhas pelo `horaDaLinha` (`lib/escale/conversas/linha.ts`, o mesmo da fila); datas completas `dd/mm/aaaa HH:mm` pelo `dataHoraBr` (`lib/escale/negocio/arquivos.ts`) no fuso da organização; números com `toLocaleString("pt-BR")`.
- **Textos de interface** em `lib/i18n/dicionario.ts` (pt e es), lidos por `useT()`, num bloco novo do fork **logo depois do bloco da 10C** (`grep -n "Fase 10C" lib/i18n/dicionario.ts`).
- **Segredos:** a chave do Zernio só sai de `zernioCredsForAccountId` (a cópia por canal, sincronizada com a chave do perfil, Spec 22); nunca em log, nunca em resposta de rota, nunca no erro devolvido.
- **Dado de fora:** miniatura e link da publicação passam pelos filtros da 10C (`miniaturaSegura`, `linkDaPublicacao` de `lib/escale/comentarios/origem.ts`); foto de quem comentou só `https:`. Texto de comentário é renderizado como texto, nunca como HTML.
- **Tooltip:** a tela nova é uma árvore própria: envolver em `TooltipProvider` (memória `provedor-escondido-pelo-teste`) e testar **sem** o provedor no wrapper do teste.
- **Imutabilidade, arquivos pequenos (≤ 400 linhas), sem `console.log`** (usar `logger`; as rotas da 10B usam `console.error` com `requestId`: nas novas, `logger.error`). `corepack pnpm`. Commits convencionais, um por task.

---

## Decisões desta fase

| # | Decisão | Por quê |
|---|---|---|
| D1 | **Lugar: `/app/inbox/comentarios`, uma tela da casca de Atendimento.** Entrada: botão de ícone "Comentários" (`MessagesSquare` 18) na barra da fila, ao lado da engrenagem de Configurações, que só aparece quando a organização tem conta do Instagram/Facebook. Na tela de comentários, o topo da coluna da esquerda tem as abas `AbasDaCasca` "Conversas" / "Comentários" (Conversas volta para `/app/inbox`) | Decisão 3 do PRD ("aba em Atendimento"); Atendimento da casca não tem barra de abas, e pôr abas na fila mexeria numa tela aprovada (regra do ajuste cirúrgico). Pergunta 1 |
| D2 | **Três colunas, como Conversas (02-003):** lista de publicações (320) · comentários da publicação (1fr) · painel do comentário escolhido (384, some abaixo de `xl` como o painel do contato). Estado na URL: `?conta=<canal>&p=<publicação>&c=<comentário>` | Mesmo esqueleto que a pessoa já usa em Atendimento |
| D3 | **Uma conta por vez.** Seletor de conta (`SeletorDaCasca` com o selo da rede) no topo da lista; abre na última usada (`localStorage`, por organização, com try/catch) ou na primeira. "Rede" do filtro do PRD 6 é a da conta | A API do Zernio pagina por conta; juntar duas paginações é complexo e pouco usado |
| D4 | **Leitura sob demanda, sem cópia no banco** (PRD 7). Lista de publicações: `useInfiniteQuery` com "Carregar mais" (cursor do Zernio), `staleTime` 30 s. Comentários da publicação aberta: `useInfiniteQuery`, `refetchInterval` 60 s só com a aba visível, e botão "Atualizar". Sem tempo real | O webhook `comment.received` só chega para a automação (10B); refazer a lista por webhook seria cópia do comentário |
| D5 | **"Sem resposta"** = comentário de outra pessoa, de primeiro nível, sem resposta da própria conta entre as respostas dele e sem ação `resposta` `feito` do CRM. Dentro da publicação: contador no cabeçalho e filtro. **Na lista de publicações**, o número "sem resposta" só aparece se o Zernio o devolver na listagem (a Task 0 confere); senão a linha mostra o total e o filtro "Só com comentário sem resposta" da lista fica fora (fica o da publicação) | Contar exigiria ler os comentários de cada publicação (uma chamada por linha). Pergunta 2 |
| D6 | **Filtros e ordem** (PRD 6). Lista: período (`SeletorDaCasca` "Últimos 7 dias", "Últimos 30 dias", "Últimos 90 dias", "Tudo"; padrão 30) e ordem ("Comentário mais recente" padrão, "Mais comentários"), pelo `since` e `sortBy` do Zernio quando existirem (Task 0); senão a ordem é aplicada na página carregada e o período vira filtro da tela. Comentários: "Todos", "Sem resposta", "Respondidos", "Ocultos", "Já é contato" (`SeletorDaCasca`) e busca por @ ou texto (sem caixa e sem acento), aplicados no que foi carregado | O Zernio não filtra comentários por esses critérios |
| D7 | **Quem vê e quem age** (PRD 5): quem **atende a conta**: admin sempre; gerente e atendente quando a conta está liberada para eles em Configurações › Canais (`channel_routing_responsibles`, migration 0228; conta sem política = "todos os atendentes", `legacy_unconfigured`). Leitor não vê. Responder, mandar direct, ocultar e reexibir: quem atende. **Apagar: gerente e admin** que atendem a conta. A configuração é a lista de quem está no dispositivo, que já existe (princípio 3) | PRD 5; o atendente de um canal só vê as conversas dele, os comentários seguem a mesma régua |
| D8 | **Direct à mão = resposta privada** (`POST …/private-reply`), só texto (1 a 1.000 caracteres, sem botões e sem variáveis). Botão "Mandar direct" desligado, com o motivo em `AjudaDaCasca`, quando: comentário com mais de 7 dias (`dentroDoPrazo` da 10B); direct já usado (ação `direct` `feito`/`enviando` na 9803, disparo da automação com `direct` `enviado`, ou o Zernio respondeu `privateReplyConsumed` antes); comentário da própria conta; conta desconectada | Regra da Meta (PRD 4.A); `privateReplyConsumed` vira ação `falhou` com motivo `resposta_privada_ja_usada`, que também desliga o botão |
| D9 | **O direct à mão vai para a conversa.** Antes do envio: contato por `upsertSocialContact(identidade, nome ?? usuário)` (mesma chave do direct), conversa e mensagem gravadas como envio de pessoa (`sent_via 'user'`, `sent_by_user_id`, `status 'sending'`, `metadata { origem: 'comentario_manual', comentario_id, acao_id }`); depois `sent` com o id do Zernio ou `failed` com a explicação. O eco `message.sent` casa com ela (D10) e **não pausa a IA** (como qualquer envio feito pelo CRM) | Decisão 6 do PRD vale também aqui: o CRM grava, o eco não duplica |
| D10 | **`eco.ts` aceita as duas origens:** `metadata->>origem in ('comentario', 'comentario_manual')` e `sent_via in ('automation', 'user')`. Nada mais muda no eco | A busca da 10B filtrava só a automação |
| D11 | **Resposta pública** pelo `responderComentario` da 10B, 1 a 1.000 caracteres, `Idempotency-Key` = id da ação (a 9803 gera antes do envio); mira o comentário escolhido (responder uma resposta responde no mesmo fio, como o Instagram faz) | Dois cliques não publicam duas vezes |
| D12 | **Ocultar/reexibir:** `POST`/`DELETE inbox/comments/{postId}/{commentId}/hide`, Instagram e Facebook, atualização otimista com volta no erro. **Apagar:** `DELETE inbox/comments/{postId}?accountId=&commentId=`, com a `JanelaDeConfirmacao` ("Apagar comentário?" / "O comentário some do Instagram para todos. Não dá para desfazer."), sem otimismo (some da lista quando o Zernio confirma) | PRD 4.A; apagar não tem volta |
| D13 | **Migration 9803: `escale_acoes_no_comentario`.** Uma linha por ação à mão, com status `enviando` → `feito`/`falhou`, quem fez, o motivo, o id devolvido pelo Zernio e, no direct, o contato e a mensagem. Índice único parcial `(organization_id, comentario_id)` para `acao = 'direct'` com status `enviando`/`feito`. `enviando` com mais de 2 minutos é tratado como `falhou` (`interrompido`) antes de reservar de novo. Já aceita `curtir`/`descurtir` (para a 10D não precisar de outra migration) | "Um direct por comentário" precisa de trava no banco; o PRD 7 proíbe guardar o **comentário**, não o que o CRM fez (o texto guardado é o nosso, não o de quem comentou) |
| D14 | **"Já é contato"**: para os autores da página carregada, `contacts` pela `social_identity` (não mesclado) e, na falta, `escale_disparos_de_comentario.contact_id` do mesmo autor (índice novo da 9803). Mostra o chip "Contato" no comentário e, no painel, nome + "Abrir ficha" (`/app/contacts/{id}`, como a D9 da 10C). Sem contato: "Ainda não é contato" (só texto; o contato nasce do direct, D9) | PRD 4.C linha 10A; risco "contato duplicado por id diferente" medido na Task 0 |
| D15 | **Rotas no molde único** `prepararAcaoNoComentario` (seção 3.3): `requireSupportWrite` → `requireRole("agent")` → alvo `{ canal, publicacao }` (corpo JSON no POST, query no DELETE) → canal `zernio_social` da org, instagram/facebook, não arquivado → D7 → `WORKING` e credencial (senão 409 `conta_desconectada`). A rota de curtir da 10D usa o mesmo prólogo | O item (2) que a 10D espera |
| D16 | **Audit:** `comment.replied`, `comment.private_replied`, `comment.hidden`, `comment.unhidden`, `comment.deleted` (lista fechada de `lib/audit/actions.ts`, bloco do fork), com `resourceType "channel_session"` e `metadata { comentario_id, publicacao_id }` (sem texto) | Toda escrita fica registrada (seção 7 do roteiro) |
| D17 | **Limites provisórios:** 25 publicações e 50 comentários por página (o que o Zernio aceitar; a Task 0 confere), 1.000 caracteres na resposta e no direct | Conferir na bateria |
| D18 | **Fora desta fase:** curtir (10D, D15 dela), fixar (PRD: ignorar), resposta com anexo, editar comentário, comentário de live, TikTok/LinkedIn/YouTube/Threads | PRD 4.A e seção 9 |

---

## Arquivos

| Arquivo | Responsabilidade |
|---|---|
| `lib/escale/comentarios/caixa.ts` (novo) | Tipos e regras puras da caixa: `PublicacaoDaCaixa`, `ComentarioDaCaixa`, `EstadoDoDirect`, `estadoDoDirect`, `semResposta`, `filtrarComentarios`, `ordenarPublicacoes`, `dentroDoPeriodo` |
| `lib/escale/comentarios/acesso.ts` (novo) | `podeAtenderAConta`, `podeApagarComentario` (puras), `contasDaCaixa` (servidor) |
| `lib/escale/comentarios/zernio.ts` (10B, muda) | `pedir` exportado e com `DELETE`; `ocultarComentario`, `reexibirComentario`, `apagarComentario` |
| `lib/escale/comentarios/zernio-caixa.ts` (novo) | `listarPublicacoesComComentarios`, `listarComentarios` e os leitores tolerantes do retorno |
| `lib/escale/comentarios/leitura-da-caixa.ts` (novo) | Servidor: `publicacoesDaCaixa`, `comentariosDaCaixa` (Zernio + contatos + ações do CRM + disparos) |
| `lib/escale/comentarios/acoes-manuais.ts` (novo) | Servidor: `reservarAcao`, `concluirAcao`, `responderAMao`, `mandarDirectAMao`, `ocultarAMao`, `apagarAMao` |
| `lib/escale/comentarios/conversa.ts` (10B, muda) | `gravarDirectManualNaConversa` (o miolo comum sai para uma função interna) |
| `lib/escale/comentarios/eco.ts` (10B, muda) | D10 |
| `lib/escale/comentarios/rota-da-acao.ts` (novo) | `prepararAcaoNoComentario`, `lerAlvoDaAcao`, `respostaDoErroDoZernio` |
| `app/api/v1/escale/comentarios/contas/route.ts` (novo) | GET das contas que a pessoa atende |
| `app/api/v1/escale/comentarios/caixa/route.ts` (novo) | GET das publicações com comentários |
| `app/api/v1/escale/comentarios/caixa/[publicacaoId]/route.ts` (novo) | GET dos comentários de uma publicação |
| `app/api/v1/escale/comentarios/[comentarioId]/route.ts` (novo) | DELETE (apagar) |
| `app/api/v1/escale/comentarios/[comentarioId]/responder/route.ts` (novo) | POST resposta pública |
| `app/api/v1/escale/comentarios/[comentarioId]/direct/route.ts` (novo) | POST direct (resposta privada) |
| `app/api/v1/escale/comentarios/[comentarioId]/ocultar/route.ts` (novo) | POST oculta, DELETE reexibe |
| `hooks/escale/useComentarios.ts` (10B, muda) | `useContasDaCaixa`, `usePublicacoesDaCaixa`, `useComentariosDaPublicacao`, `chaveDosComentarios`, `useResponderComentario`, `useDirectDoComentario`, `useOcultarComentario`, `useApagarComentario` |
| `app/app/inbox/comentarios/page.tsx` (novo) | Página (casca ligada; senão redireciona) |
| `components/escale/conversas/comentarios/TelaDeComentarios.tsx` (novo) | As três colunas, a URL e o `TooltipProvider` |
| `…/comentarios/ListaDePublicacoes.tsx`, `LinhaDaPublicacao.tsx`, `BarraDaCaixa.tsx` (novos) | Coluna da esquerda: abas, conta, filtros, linhas, "Carregar mais" |
| `…/comentarios/ComentariosDaPublicacao.tsx`, `CabecalhoDaPublicacao.tsx`, `FiltroDosComentarios.tsx` (novos) | Centro: cabeçalho, filtro, lista, "Carregar mais", compositor |
| `…/comentarios/ItemDoComentario.tsx` (novo) | **O item de comentário** (com respostas aninhadas). A 10D põe o "Curtir" aqui, em `AcoesDoComentario` |
| `…/comentarios/AcoesDoComentario.tsx` (novo) | A fileira de botões de ícone do item (Responder, Mandar direct, Ocultar/Reexibir, Apagar) |
| `…/comentarios/CompositorDoComentario.tsx` (novo) | "Responder em público" / "Mandar direct", texto, contador, Enviar |
| `…/comentarios/PainelDoComentario.tsx`, `EstadosDaCaixa.tsx` (novos) | Painel da direita; vazio, sem conta, desconectada, erro, carregando |
| `components/escale/conversas/fila/BarraDaFila.tsx` (fork 3A, muda) | O botão "Comentários" (`BotaoDosComentarios.tsx`, novo, ao lado) |
| Encaixes (seção 6) | `lib/audit/actions.ts`, `tests/unit/navegacao-completude.test.ts`, `supabase/baseline.sql`, `lib/i18n/dicionario.ts` |
| Testes | `tests/unit/escale-comentarios-caixa-regras.test.ts`, `-acesso.test.ts`, `-zernio-caixa.test.ts`, `-leitura-da-caixa.test.ts`, `-acoes-manuais.test.ts`, `-rota-da-acao.test.ts`, `-caixa-rotas.test.ts`, `-caixa-hooks.test.tsx`, `-caixa-tela.test.tsx`, `-item.test.tsx`, `-compositor.test.tsx`, `-painel.test.tsx`; acrescentar em `-eco.test.ts`, `-zernio.test.ts` (10B); `tests/invariants/escale-comentarios-9803.test.ts` |
| Docs | `docs/modulos/10-comentarios.md` (estado da 10A, D5/D13, divergências da seção 11 deste plano) |

---

## 1. Regras puras

### 1.1 Constantes (acrescentar em `lib/escale/comentarios/constantes.ts`)

```ts
/** FORK ESCALE · Fase 10A: a caixa de comentários. */
export const MAXIMO_DO_TEXTO_A_MAO = 1000;
export const COMENTARIOS_POR_PAGINA = 50;
export const PUBLICACOES_POR_PAGINA = 25;
/** D13: uma ação `enviando` mais velha que isto foi interrompida (o processo caiu no meio). */
export const ACAO_INTERROMPIDA_MS = 2 * 60 * 1000;
export const ACOES_NO_COMENTARIO = ["resposta", "direct", "ocultar", "reexibir", "apagar", "curtir", "descurtir"] as const;
export type AcaoNoComentario = (typeof ACOES_NO_COMENTARIO)[number];
export const PERIODOS_DA_CAIXA = ["7d", "30d", "90d", "tudo"] as const;
export type PeriodoDaCaixa = (typeof PERIODOS_DA_CAIXA)[number];
export const ORDENS_DA_CAIXA = ["recentes", "mais_comentarios"] as const;
export const FILTROS_DOS_COMENTARIOS = ["todos", "sem_resposta", "respondidos", "ocultos", "contatos"] as const;
export type FiltroDosComentarios = (typeof FILTROS_DOS_COMENTARIOS)[number];
```

### 1.2 Tipos e regras da caixa (`lib/escale/comentarios/caixa.ts`)

```ts
export interface PublicacaoDaCaixa {
  id: string;                         // o id que o Zernio usa em inbox/comments/{postId}
  legenda: string | null;
  miniatura: string | null;           // já filtrada por miniaturaSegura
  link: string | null;                // já filtrado por linkDaPublicacao
  tipo: string | null;
  publicadaEm: string | null;         // ISO
  ultimoComentarioEm: string | null;  // ISO, quando o Zernio devolve
  comentarios: number | null;
  semResposta: number | null;         // D5: null = o Zernio não informa
}

export interface AutorDoComentario { id: string; usuario: string | null; nome: string | null; foto: string | null; daPropriaConta: boolean }

export type EstadoDoDirect =
  | { liberado: true }
  | { liberado: false; motivo: "prazo_vencido" | "ja_usado" | "da_propria_conta" | "conta_desconectada" };

export interface ComentarioDaCaixa {
  id: string;
  texto: string;
  comentadoEm: string;                // ISO
  autor: AutorDoComentario;
  oculto: boolean;
  curtido: boolean | null;            // a 10D usa; null = não informado
  curtidas: number | null;
  respostas: ComentarioDaCaixa[];     // um nível só (o Instagram não aninha mais que isso)
  respondido: boolean;                // D5
  contato: { id: string; nome: string } | null;   // D14
  direct: EstadoDoDirect;             // D8 (só em primeiro nível; nas respostas, o mesmo cálculo)
}

/** D5. `acoesFeitas` = ids dos comentários com resposta `feito` do CRM. */
export function semResposta(c: Pick<ComentarioDaCaixa, "autor" | "respostas" | "id">, acoesFeitas: ReadonlySet<string>): boolean;

/** D8. `usados` = ids com direct já usado (9803 + disparos + privateReplyConsumed). */
export function estadoDoDirect(e: { comentario: Pick<ComentarioDaCaixa, "id" | "comentadoEm" | "autor">; usados: ReadonlySet<string>; contaConectada: boolean; agora: Date }): EstadoDoDirect;

/** D6. Busca sem caixa e sem acento em `@usuario`, nome e texto (inclui as respostas). Não muta a entrada. */
export function filtrarComentarios(lista: readonly ComentarioDaCaixa[], filtro: FiltroDosComentarios, busca: string): ComentarioDaCaixa[];

/** D6 (só quando o Zernio não ordena): recentes = `ultimoComentarioEm ?? publicadaEm` desc; mais_comentarios = `comentarios` desc, nulos no fim. */
export function ordenarPublicacoes(lista: readonly PublicacaoDaCaixa[], ordem: (typeof ORDENS_DA_CAIXA)[number]): PublicacaoDaCaixa[];

/** D6: `since` do período (ISO) ou null para "tudo". */
export function inicioDoPeriodo(periodo: PeriodoDaCaixa, agora: Date): string | null;

/** A explicação que a tela mostra no botão desligado. */
export const EXPLICACAO_DO_DIRECT: Record<Exclude<EstadoDoDirect, { liberado: true }>["motivo"], string> = {
  prazo_vencido: "O Instagram só aceita o direct até 7 dias depois do comentário.",
  ja_usado: "Este comentário já recebeu um direct. O Instagram aceita um só por comentário.",
  da_propria_conta: "Este comentário é da própria conta.",
  conta_desconectada: "A conta está desconectada. Reconecte em Configurações › Canais.",
};
```

Regras:
- `estadoDoDirect`: ordem dos motivos `conta_desconectada` → `da_propria_conta` → `ja_usado` → `prazo_vencido` (usa `dentroDoPrazo` da 10B; data ilegível = vencido).
- `semResposta`: `false` para comentário da própria conta; `true` quando nenhuma resposta tem `autor.daPropriaConta` e o id não está em `acoesFeitas`.
- `filtrarComentarios`: `respondidos` = `!semResposta` entre os de outras pessoas; `ocultos` = `oculto`; `contatos` = `contato !== null`. Um comentário fica se ele **ou** uma resposta dele casa com a busca; a normalização é a do `filtro.ts`/`palavra-chave.ts` (copiar a função de uma linha com o comentário de onde veio, como a 10D faz).

### 1.3 Acesso (`lib/escale/comentarios/acesso.ts`, parte pura)

```ts
import type { CanalDoRoteamento } from "@/lib/escale/conversas/canais";
/** D7. `canal` null = conta sem política de roteamento (todos os atendentes). */
export function podeAtenderAConta(e: { papel: Role; userId: string; canal: CanalDoRoteamento | null }): boolean;
export const podeApagarComentario = (papel: Role): boolean => roleAtLeast(papel, "manager");
```

`admin` → true; `viewer` → false; `agent`/`manager`: `canal` null ou `legacy_unconfigured` → true; `restricted` → `user_ids.includes(userId)`; `restricted_empty` → false.

---

## 2. Banco e Zernio

### 2.1 Migration 9803 (`supabase/migrations/20261203140000_9803_acoes_no_comentario.sql`)

Conferir na Task 0 se as tabelas do fork usam `references auth.users(id)` para `user_id` (há 86 ocorrências no baseline; seguir a forma mais recente da faixa 9700/9800).

```sql
-- manifest: **Ações na caixa de comentários (fork Escale, Fase 10A).** Tabela nova `escale_acoes_no_comentario`: uma linha por ação feita à mão num comentário do Instagram/Facebook pela caixa de comentários de Atendimento (resposta pública, direct, ocultar, reexibir, apagar; curtir e descurtir ficam prontos para a 10D), com quem fez, o desfecho (`enviando`, `feito`, `falhou`), o motivo e o id devolvido pelo Zernio. O comentário de quem comentou NÃO é guardado (só o id dele e o texto que o CRM mandou). Índice único parcial garante um direct por comentário (regra da Meta) mesmo com dois cliques ou duas pessoas ao mesmo tempo. Dois índices novos em `escale_disparos_de_comentario` (por comentário e por autor) para a caixa achar o direct da automação e o contato de quem comentou. RLS: a organização lê; só o servidor (service_role) grava. Nenhuma tabela do original muda.
-- ---- FORK ESCALE · ações no comentário (migration 9803) ----

create table if not exists public.escale_acoes_no_comentario (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  channel_session_id uuid references public.channel_sessions(id) on delete set null,
  plataforma text not null check (plataforma in ('instagram', 'facebook')),
  comentario_id text not null check (char_length(comentario_id) between 1 and 128),
  publicacao_id text not null check (char_length(publicacao_id) between 1 and 128),
  autor_id text check (autor_id is null or char_length(autor_id) between 1 and 128),
  acao text not null
    check (acao in ('resposta', 'direct', 'ocultar', 'reexibir', 'apagar', 'curtir', 'descurtir')),
  status text not null default 'enviando' check (status in ('enviando', 'feito', 'falhou')),
  motivo text check (motivo is null or char_length(motivo) <= 80),
  texto text check (texto is null or char_length(texto) <= 1000),
  resultado_id text check (resultado_id is null or char_length(resultado_id) <= 200),
  user_id uuid references auth.users(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  message_id uuid,  -- messages.id da conversa (sem FK: a linha da conversa pode ser apagada pela LGPD sem travar)
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_escale_acoes_no_comentario_direct
  on public.escale_acoes_no_comentario (organization_id, comentario_id)
  where acao = 'direct' and status in ('enviando', 'feito');
create index if not exists idx_escale_acoes_no_comentario_publicacao
  on public.escale_acoes_no_comentario (organization_id, channel_session_id, publicacao_id, created_at desc);

create index if not exists idx_escale_disparos_de_comentario_por_comentario
  on public.escale_disparos_de_comentario (organization_id, comentario_id);
create index if not exists idx_escale_disparos_de_comentario_por_autor
  on public.escale_disparos_de_comentario (organization_id, plataforma, autor_id)
  where contact_id is not null;

alter table public.escale_acoes_no_comentario enable row level security;
drop policy if exists escale_acoes_no_comentario_select on public.escale_acoes_no_comentario;
create policy escale_acoes_no_comentario_select on public.escale_acoes_no_comentario for select
  using ((organization_id in (select public.fn_user_org_ids())) or public.fn_is_platform_admin());
revoke all on public.escale_acoes_no_comentario from anon;
revoke insert, update, delete, truncate on public.escale_acoes_no_comentario from authenticated;
grant select on public.escale_acoes_no_comentario to authenticated;
grant all on public.escale_acoes_no_comentario to service_role;

comment on table public.escale_acoes_no_comentario is
  'Fork Escale (9803): ações feitas à mão na caixa de comentários; um direct por comentário (índice único parcial).';

notify pgrst, 'reload schema';
```

### 2.2 Invariantes (`tests/invariants/escale-comentarios-9803.test.ts`)

Molde `tests/invariants/escale-comentarios-9801.test.ts` e `-9802`. Ids `e5ca1e00-9803-4000-8000-…`. Casos:
- membro da org A lê as linhas de A e não as de B; `authenticated` não insere, não atualiza, não apaga (erro de permissão); `anon` não lê;
- como `service_role`: direct `enviando` no comentário X → ok; segundo direct `enviando` ou `feito` em X → `23505`; o primeiro vira `falhou` → um novo `enviando` em X entra; direct em X na org B → ok (o índice é por organização);
- `resposta` duas vezes no mesmo comentário → ok (só o direct é único);
- `check`: `acao 'fixar'` → `23514`; `status 'talvez'` → `23514`; `texto` com 1.001 caracteres → `23514`; `plataforma 'tiktok'` → `23514`;
- os dois índices novos de `escale_disparos_de_comentario` existem (`pg_indexes`), e os da 9801 continuam.

### 2.3 Cliente do Zernio

**`lib/escale/comentarios/zernio.ts` (muda):** `pedir` passa a `export` e aceita `"DELETE"` (a 10D, que planejava acrescentar o `DELETE`, só reaproveita). Novos, todos com `encodeURIComponent` nos segmentos:

```ts
/** POST inbox/comments/{postId}/{commentId}/hide com { accountId }. */
export function ocultarComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
/** DELETE inbox/comments/{postId}/{commentId}/hide?accountId= */
export function reexibirComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
/** DELETE inbox/comments/{postId}?accountId=&commentId= */
export function apagarComentario(chave: string, e: { postId: string; commentId: string; accountId: string }): Promise<RespostaDoZernio<unknown>>;
```

`MotivoDoDirect` não muda; o motivo das ações à mão é o mesmo `motivoDoErro` da 10B (o `privateReplyConsumed` já vira `resposta_privada_ja_usada`).

**`lib/escale/comentarios/zernio-caixa.ts` (novo):**

```ts
export interface PaginaDoZernio<T> { itens: T[]; proximo: string | null }
/** GET inbox/comments?accountId=&limit=&cursor=&since=&sortBy= — as publicações da conta com comentários. */
export function listarPublicacoesComComentarios(chave: string, e: { accountId: string; cursor: string | null; desde: string | null; ordem: "recentes" | "mais_comentarios" }): Promise<RespostaDoZernio<PaginaDoZernio<PublicacaoDaCaixa>>>;
/** GET inbox/comments/{postId}?accountId=&limit=&cursor= — os comentários (com respostas) de uma publicação. */
export function listarComentarios(chave: string, e: { accountId: string; postId: string; cursor: string | null }): Promise<RespostaDoZernio<PaginaDoZernio<ComentarioDoZernio>>>;
export interface ComentarioDoZernio { id: string; texto: string; comentadoEm: string; autor: AutorDoComentario; oculto: boolean; curtido: boolean | null; curtidas: number | null; respostas: ComentarioDoZernio[] }
/** Leitores tolerantes (nunca lançam; item sem id some). Exportados para o teste. */
export function lerPublicacoes(dados: unknown): PaginaDoZernio<PublicacaoDaCaixa>;
export function lerComentarios(dados: unknown, contaId: string): PaginaDoZernio<ComentarioDoZernio>;
```

Leitores: a lista vem em `data` **ou** `posts`/`comments`; o cursor em `pagination.nextCursor` (com `hasMore` false → null) ou `nextCursor`. Publicação: `id`, `content ?? message` → legenda, `picture ?? thumbnailUrl ?? imageUrl` → `miniaturaSegura`, `permalink` → `linkDaPublicacao`, `createdTime ?? createdAt`, `lastCommentTime` (se houver), `commentCount`, `unansweredCount ?? unrepliedCount` (D5; ausente = null). Comentário: `id`, `message ?? text`, `createdTime ?? createdAt`, `from ?? author` → `{ id, username, name, picture (só https), isOwner ?? isOwnAccount ?? (id === contaId) }`, `isHidden ?? hidden ?? false`, `isLiked ?? liked ?? null`, `likeCount`, `replies` (array ou `replies.data`), recursivo um nível. **Os nomes exatos saem da Task 0**; o leitor aceita as variantes para não quebrar com a 0.0.x.

### 2.4 Contrato do Zernio (SDK 0.0.1300; **frágil**, a Task 0 prova numa chamada real)

| Uso | Chamada | O que importa |
|---|---|---|
| Publicações com comentários | `GET /v1/inbox/comments` | filtro por conta (`accountId`), `limit`, `cursor`, ordem e período se existirem; o `id` devolvido é o que vai em `{postId}` |
| Comentários de uma publicação | `GET /v1/inbox/comments/{postId}?accountId=` | autor com marca de "dono"; `isHidden`; respostas aninhadas; cursor |
| Resposta pública | `POST /v1/inbox/comments/{postId}` | já usado na 10B (`commentId` no corpo, `Idempotency-Key`) |
| Resposta privada | `POST /v1/inbox/comments/{postId}/{commentId}/private-reply` | já usado na 10B; 1 por comentário, até 7 dias; 400 `privateReplyConsumed` |
| Ocultar / reexibir | `POST` / `DELETE /v1/inbox/comments/{postId}/{commentId}/hide` | Instagram e Facebook |
| Apagar | `DELETE /v1/inbox/comments/{postId}?accountId=&commentId=` | só comentário em publicação da própria conta |

---

## 3. Servidor

### 3.1 Contas (`lib/escale/comentarios/acesso.ts`, parte do servidor)

```ts
export interface ContaDaCaixa { id: string; nome: string; plataforma: PlataformaDeComentario; contaId: string; conectada: boolean; podeApagar: boolean }
/** As contas instagram/facebook (`zernio_social`, não arquivadas) que a pessoa atende (D7). */
export async function contasDaCaixa(admin: SupabaseClient, e: { organizationId: string; userId: string; papel: Role }): Promise<ContaDaCaixa[]>;
/** Uma conta só, ou null quando não existe ou a pessoa não atende (as rotas devolvem 404, sem dizer qual). */
export async function contaDaCaixa(admin: SupabaseClient, e: { organizationId: string; userId: string; papel: Role; canal: string }): Promise<(ContaDaCaixa & { status: string }) | null>;
```

Lê `channel_sessions` (`id, display_name, phone_number, zernio_account_id, status, metadata`) e a política do canal (`channel_routing_policies` + `channel_routing_responsibles`, as mesmas tabelas que `loadChannelRoutingSettings` lê; não chamar a função inteira, que busca nomes de todos os atendentes). `conectada = status === "WORKING"`; `podeApagar = podeApagarComentario(papel)`.

### 3.2 Leitura (`lib/escale/comentarios/leitura-da-caixa.ts`)

```ts
export async function publicacoesDaCaixa(admin: SupabaseClient, e: { conta: ContaDaCaixa; chave: string; cursor: string | null; periodo: PeriodoDaCaixa; ordem: (typeof ORDENS_DA_CAIXA)[number] }): Promise<RespostaDoZernio<PaginaDoZernio<PublicacaoDaCaixa>>>;

export async function comentariosDaCaixa(admin: SupabaseClient, e: { organizationId: string; conta: ContaDaCaixa; chave: string; publicacaoId: string; cursor: string | null; agora: Date }): Promise<RespostaDoZernio<PaginaDoZernio<ComentarioDaCaixa>>>;
```

`comentariosDaCaixa`:
1. `listarComentarios`; erro → devolve o erro (a rota traduz).
2. Ids da página (com as respostas) e autores de outras pessoas.
3. Em paralelo, três leituras (todas com `organization_id`): `escale_acoes_no_comentario` (`comentario_id in ids`, `acao in ('resposta','direct')`, `status in ('enviando','feito')` mais `direct` `falhou` com motivo `resposta_privada_ja_usada`); `escale_disparos_de_comentario` (`comentario_id in ids`, `direct = 'enviado'`, e por `plataforma` + `autor_id in autores` com `contact_id` não nulo); `contacts` (`social_identity in` as identidades `${plataforma}:${contaId}:${autorId}`, `is_merged_into is null`, `select id, name` — conferir na Task 0 o nome da coluna do nome, e usar `rotuloDoContato` se ele já resolve).
4. Monta `ComentarioDaCaixa` com `respondido` (D5), `contato` (identidade primeiro, disparo depois; D14) e `direct` (`estadoDoDirect` com `usados` = ações + disparos).
5. Erro de banco nos passos 3: loga e segue sem os extras (a lista do Zernio ainda aparece; `contato` null, `direct` calculado só pelo prazo). Nunca derruba a leitura.

### 3.3 Prólogo das rotas de ação (`lib/escale/comentarios/rota-da-acao.ts`) — **o molde que a 10D usa**

```ts
export interface AlvoDaAcao { canal: string; publicacao: string }
/** POST: corpo JSON `{ canal, publicacao, ... }`; DELETE: query `?canal=&publicacao=`. zod (uuid; publicação 1–128). */
export async function lerAlvoDaAcao(req: NextRequest): Promise<{ alvo: AlvoDaAcao; corpo: Record<string, unknown> } | null>;

export interface ContextoDaAcao {
  requestId: string;
  userId: string;
  organizationId: string;
  papel: Role;
  admin: SupabaseClient;
  conta: ContaDaCaixa;              // a conta do alvo, já conferida (D7)
  chave: string;                    // a chave do Zernio da conta (nunca sai da rota)
  comentarioId: string;             // params, 1–128
  publicacaoId: string;
  corpo: Record<string, unknown>;   // o resto do corpo do POST (texto, autor…)
}
export type PreparoDaAcao = { ok: true; ctx: ContextoDaAcao } | { ok: false; response: Response };

/** requireSupportWrite → requireRole("agent") → alvo (422) → conta da org e atendida (404) → `papelMinimo` (403) → WORKING e credencial (409). */
export async function prepararAcaoNoComentario(
  req: NextRequest,
  params: Promise<{ comentarioId: string }>,
  opcoes: { papelMinimo: "agent" | "manager" },
): Promise<PreparoDaAcao>;

/** Erro do Zernio → resposta da rota: 401/403 → 409 `acesso_recusado`; 404 → 404 `comentario_nao_encontrado` ("O comentário não existe mais."); 400 com `privateReplyConsumed` → 409 `resposta_privada_ja_usada`; o resto → 502 `provedor_indisponivel`. A mensagem é a `EXPLICACAO_DO_MOTIVO` da 10B (nunca o corpo do Zernio). */
export function respostaDoErroDoZernio(status: number, corpo: unknown, requestId: string): Response;
```

Textos das recusas: 404 "Conta não encontrada."; 403 `forbidden_role` "Só gerente e administrador podem apagar comentários."; 409 `conta_desconectada` "A conta está desconectada."; 422 `validation_failed` "Falha na validação dos dados!". `export const dynamic = "force-dynamic"` em toda rota; 500 com `logger.error("[escale-comentarios] <rota>", { requestId, erro })` e "Erro inesperado.".

### 3.4 Ações à mão (`lib/escale/comentarios/acoes-manuais.ts`)

```ts
/** Insere a ação `enviando`. Antes, vira `falhou`/`interrompido` o direct `enviando` do mesmo comentário com mais de 2 min (D13). 23505 → "ja_usado". */
export async function reservarAcao(admin: SupabaseClient, e: { ctx: ContextoDaAcao; acao: AcaoNoComentario; autorId: string | null; texto: string | null }): Promise<{ ok: true; id: string } | { ok: false; motivo: "ja_usado" }>;
export async function concluirAcao(admin: SupabaseClient, e: { organizationId: string; id: string; status: "feito" | "falhou"; motivo?: string | null; resultadoId?: string | null; contactId?: string | null; messageId?: string | null }): Promise<void>; // nunca lança (loga)

export type ResultadoDaAcao = { ok: true; dados: Record<string, unknown> } | { ok: false; status: number; corpo: unknown } | { ok: false; jaUsado: true };
export async function responderAMao(ctx: ContextoDaAcao, texto: string): Promise<ResultadoDaAcao>;     // → { commentId }
export async function mandarDirectAMao(ctx: ContextoDaAcao, e: { texto: string; autor: { id: string; usuario: string | null; nome: string | null }; comentadoEm: string }): Promise<ResultadoDaAcao>; // → { conversationId | null }
export async function ocultarAMao(ctx: ContextoDaAcao, ocultar: boolean, autorId: string | null): Promise<ResultadoDaAcao>; // → { oculto }
export async function apagarAMao(ctx: ContextoDaAcao, autorId: string | null): Promise<ResultadoDaAcao>; // → { apagado: true }
```

`mandarDirectAMao`, na ordem (o teste prova a ordem):
1. `dentroDoPrazo(comentadoEm)` falso → `{ ok: false, status: 409, corpo: { motivo: "prazo_vencido" } }` sem tocar no banco nem no Zernio (a data vem da tela; o Zernio recusa de qualquer jeito se ela mentir).
2. Disparo da automação com `direct = 'enviado'` para o comentário → `jaUsado`.
3. `reservarAcao("direct")`; 23505 → `jaUsado`.
4. `upsertSocialContact(admin, org, \`${plataforma}:${contaId}:${autor.id}\`, autor.nome ?? autor.usuario)`; falhou → segue sem contato (o direct sai assim mesmo; a ação fica sem `contact_id`).
5. Com contato: `gravarDirectManualNaConversa` (3.5) → `messageId` (null não impede o envio).
6. `respostaPrivada` (sem botões). Ok → `concluirAcao(feito, resultadoId = messageId do Zernio, contactId, messageId)`, `confirmarDirect(linha, socialMessageId(contaId, messageId))`. Recusa → `motivoDoErro`, `concluirAcao(falhou, motivo)`, `falharDirect(linha, EXPLICACAO_DO_MOTIVO[motivo])`, devolve o erro.

`responderAMao`: `reservarAcao("resposta")` → `responderComentario({ idempotencia: acao.id })` → `concluirAcao`. `ocultarAMao`/`apagarAMao`: `reservarAcao` → Zernio → `concluirAcao`. Toda ação concluída com sucesso grava o audit da D16 (`void audit(...)`, molde da rota de assinatura da 10B).

### 3.5 Conversa e eco (`conversa.ts`, `eco.ts`)

```ts
/** D9: a mensagem do direct à mão, como envio de pessoa. Devolve o id da linha e da conversa, ou null (só loga). */
export async function gravarDirectManualNaConversa(admin: SupabaseClient, e: {
  organizationId: string; channelSessionId: string; contactId: string; plataforma: string;
  texto: string; userId: string; comentarioId: string; acaoId: string;
}): Promise<{ mensagemId: string; conversationId: string } | null>;
```

O miolo de `gravarDirectNaConversa` (conversa por `fn_upsert_wa_conversation`, canal, insert, `marcarConversaComMensagem`) sai para `gravarSaidaNaConversa(admin, e, campos)` **interna**; as duas funções públicas só montam os campos (`sent_via`, `sent_by_user_id`, `metadata`). A assinatura e o comportamento de `gravarDirectNaConversa` não mudam (os testes da 10B seguem verdes).

`eco.ts` (D10): o filtro `.eq("sent_via", "automation").eq("metadata->>origem", "comentario")` vira `.in("sent_via", ["automation", "user"]).in("metadata->>origem", ORIGENS_DO_ECO)` com `ORIGENS_DO_ECO = ["comentario", "comentario_manual"]` em `constantes.ts` (a 10D acrescenta `"direct"` nessa mesma lista). Conferir na Task 0 que o PostgREST aceita `in` sobre `metadata->>origem`; senão, dois `or` explícitos.

### 3.6 Rotas

| Rota | Papel | Resposta |
|---|---|---|
| `GET /api/v1/escale/comentarios/contas` | `requireRole("agent")` | `{ contas: ContaDaCaixa[] }` (sem `contaId` do Zernio na resposta: só `id`, `nome`, `plataforma`, `conectada`, `podeApagar`) |
| `GET /api/v1/escale/comentarios/caixa?canal=&cursor=&periodo=&ordem=` | agent + D7 | `{ publicacoes: PublicacaoDaCaixa[], proximo: string \| null }`; desconectada → 409 `conta_desconectada`; erro do Zernio → `respostaDoErroDoZernio` |
| `GET /api/v1/escale/comentarios/caixa/[publicacaoId]?canal=&cursor=` | agent + D7 | `{ comentarios: ComentarioDaCaixa[], proximo: string \| null }` |
| `POST /api/v1/escale/comentarios/[comentarioId]/responder` `{ canal, publicacao, texto, autor }` | agent + D7 | `{ commentId }` |
| `POST /api/v1/escale/comentarios/[comentarioId]/direct` `{ canal, publicacao, texto, autor: { id, usuario, nome }, comentadoEm }` | agent + D7 | `{ conversationId }`; `jaUsado` → 409 `resposta_privada_ja_usada` com o texto de `EXPLICACAO_DO_DIRECT.ja_usado`; prazo → 409 `prazo_vencido` |
| `POST` / `DELETE /api/v1/escale/comentarios/[comentarioId]/ocultar` | agent + D7 | `{ oculto: boolean }` |
| `DELETE /api/v1/escale/comentarios/[comentarioId]?canal=&publicacao=&autor=` | **manager** + D7 | `{ apagado: true }` |

As rotas de leitura (`contas`, `caixa`) usam `requireRole("agent")` direto (sem `requireSupportWrite`, que é de escrita) e `contaDaCaixa`. Textos: 1 a 1.000 caracteres depois do `trim` (422). A rota de curtir da 10D (`[comentarioId]/curtir`, POST/DELETE) entra ao lado, com `prepararAcaoNoComentario(req, params, { papelMinimo: "agent" })` e `reservarAcao("curtir" | "descurtir")`.

---

## 4. Telas (provisórias; molde da casca de Atendimento)

### 4.1 Página e entrada (D1)

- `app/app/inbox/comentarios/page.tsx`: server, `dynamic = "force-dynamic"`; casca desligada → `redirect("/app/inbox")` (mesma leitura de `COOKIE_DO_MENU` do `_casca.tsx`); senão `<TelaDeComentarios />`. O `loading.tsx` de `/app/inbox` vale para a sub-rota (conferir).
- `BotaoDosComentarios.tsx`: `useContasSociais()` (10B); nenhuma conta → nada; senão um `Link` `href="/app/inbox/comentarios"`, `size-8 rounded-casca-gatilho text-casca-suave hover:bg-casca-raia`, `MessagesSquare` 18, `aria-label`/`title` "Comentários". `BarraDaFila` o põe **antes** da engrenagem. Única mudança na tela de Conversas.
- `tests/unit/navegacao-completude.test.ts`: `"/app/inbox/comentarios": "caixa de comentários (Fase 10A), alcançada pelo botão Comentários da barra da fila de Conversas"` no `NAV_ALLOWLIST`.

### 4.2 Coluna da esquerda (`ListaDePublicacoes`, `BarraDaCaixa`, `LinhaDaPublicacao`)

`w-[320px] border-r border-casca-borda bg-white flex flex-col`:
1. **Abas** `AbasDaCasca` "Conversas" / "Comentários" (Comentários escolhida; Conversas = `router.push("/app/inbox")`), altura 56 como a linha da busca da fila.
2. **Barra** (altura 56, `px-4`, como a 2ª linha da `BarraDaFila`): `SeletorDaCasca` da conta (selo da rede 16 + nome; desconectada em `casca-meta` com "desconectada"); à direita, `SeletorDaCasca` compacto do período e `MenuDeOrdem`-like para a ordem (reaproveitar o visual do `MenuDeOrdem` com as duas opções da D6).
3. **Linhas** (molde `LinhaDaFila`, altura 88, `px-4 py-3`, `hover:bg-casca-raia`, escolhida `bg-casca-marca-suave`): miniatura 56×56 `rounded-lg object-cover` com o selo da rede no canto (como o `FotoDaConversa`); sem miniatura, caixa `bg-casca-raia` com o ícone do tipo; à direita da miniatura, legenda 15 px 600 `casca-texto` em 1 linha (`line-clamp-1`, "Sem legenda" em `casca-meta` itálico, texto da Clint da 10B) e embaixo "{n} comentários" 14 px `casca-suave`; canto direito: `horaDaLinha(ultimoComentarioEm ?? publicadaEm)` 12 px `casca-meta` e, se `semResposta > 0`, o contador redondo `bg-casca-marca text-white` 11 px (como o da fila).
4. **Rodapé da lista:** "Carregar mais" (`BotaoDaCasca` secundário, largura total) enquanto houver `proximo`; carregando, três linhas-esqueleto.
5. **Estados** (`EstadosDaCaixa`, texto 14 px `casca-suave` centralizado, ícone 32 `casca-meta`): sem conta ("Nenhuma conta do Instagram ou do Facebook liberada para você." + "Conecte em Configurações › Canais." com link, só para quem pode ver canais); conta desconectada ("Esta conta está desconectada. Reconecte em Configurações › Canais."); acesso recusado (texto da 10B "Não foi possível acessar esta conta…"); vazio ("Nenhuma publicação com comentários no período."); erro ("Erro ao carregar os comentários." + "Tentar novamente").

### 4.3 Centro (`ComentariosDaPublicacao`, `CabecalhoDaPublicacao`, `FiltroDosComentarios`)

1. **Cabeçalho** (altura 64, `border-b`, `px-6`): miniatura 40 `rounded-md`, legenda 16 px 600 em 1 linha, embaixo "Publicada em {dd/mm/aaaa HH:mm}" 12 px `casca-meta` · "{n} comentários" · "{m} sem resposta" (`casca-marca` quando > 0); à direita "Ver no Instagram"/"Ver no Facebook" (`ExternalLink` 14, `target="_blank" rel="noopener noreferrer"`, só com link seguro) e "Atualizar" (ícone, `aria-label`).
2. **Filtro** (altura 48, `px-6`): busca (`CampoDeBuscaDaLista`, placeholder "Buscar por @ ou texto") e `SeletorDaCasca` com "Todos", "Sem resposta", "Respondidos", "Ocultos", "Já é contato".
3. **Lista** (`flex-1 overflow-y-auto px-6 py-4 space-y-4`), em ordem de data **crescente** (o mais antigo em cima, como uma conversa); "Carregar mais" no topo quando há cursor. Sem publicação escolhida: `VazioDaCasca` com "Escolha uma publicação para ver os comentários.". Filtro sem resultado: "Nenhum comentário corresponde ao filtro." + "Limpar filtro".
4. **Compositor** (4.5) fixo embaixo.

### 4.4 Item do comentário (`ItemDoComentario` + `AcoesDoComentario`) — o ponto da 10D

```tsx
interface ItemDoComentarioProps {
  comentario: ComentarioDaCaixa;
  conta: ContaDaCaixa;
  escolhido: boolean;
  nivel: 0 | 1;
  aoEscolher: (c: ComentarioDaCaixa) => void;
  aoResponder: (c: ComentarioDaCaixa) => void;       // põe o compositor em "Responder em público" mirando c
  aoMandarDirect: (c: ComentarioDaCaixa) => void;    // põe o compositor em "Mandar direct" mirando c
  aoOcultar: (c: ComentarioDaCaixa, ocultar: boolean) => void;
  aoApagar: (c: ComentarioDaCaixa) => void;          // abre a confirmação
}
interface AcoesDoComentarioProps {
  comentario: ComentarioDaCaixa;
  conta: ContaDaCaixa;
  aoResponder: () => void; aoMandarDirect: () => void; aoOcultar: (ocultar: boolean) => void; aoApagar: () => void;
  /** A 10D acrescenta `aoCurtir?: (curtir: boolean) => void` e o botão "Curtir"/"Descurtir" (ThumbsUp) quando `conta.plataforma === "facebook"`. */
}
```

- **Item** (`flex gap-3`, nível 1 com `pl-11` e fio `border-l border-casca-borda`): avatar 32 redondo (foto `https:` ou monograma pela `corDoAvatar`); linha 1: `@usuario` 14 px 600 (ou o nome), nome 13 px `casca-meta`, chips 11 px: "Você" (`bg-casca-marca-suave text-casca-marca`) quando `daPropriaConta`, "Contato" (`bg-casca-raia`, `UserRound` 12; clique = abre o painel) quando `contato`, "Oculto" (`EyeOff` 12, `casca-aviso`) quando `oculto`, "Sem resposta" (ponto `bg-casca-marca` 6 px + texto 11 px) quando `semResposta`; linha 2: texto 14 px `casca-texto` `whitespace-pre-wrap break-words` (oculto: `opacity-60`); linha 3: `horaDaLinha(comentadoEm)` 12 px `casca-meta` e `{n} curtidas` quando houver. Clique no item = escolhido (`ring-1 ring-casca-marca rounded-lg`, painel da direita mostra ele). Respostas do nível 1 aparecem embaixo, sempre abertas.
- **Ações** (`AcoesDoComentario`, aparecem no `hover`/foco do item e sempre no escolhido; botões de ícone `size-7 rounded-casca-gatilho text-casca-suave hover:bg-casca-raia`, ícone 14, `aria-label` + `title`): "Responder" (`MessageCircle`), "Mandar direct" (`Send`; desligado com `title` = `EXPLICACAO_DO_DIRECT[motivo]` e `aria-disabled`), "Ocultar"/"Reexibir" (`EyeOff`/`Eye`), "Apagar" (`Trash2`, `hover:text-casca-alerta`, só com `conta.podeApagar`). Comentário da própria conta: só "Responder", "Ocultar" e "Apagar" (sem direct).

### 4.5 Compositor (`CompositorDoComentario`)

`border-t border-casca-borda px-6 py-3 bg-white`: `AbasDaCasca` pequena "Responder em público" / "Mandar direct" (`semBorda`); acima da caixa, a pílula "Respondendo a @usuario" com `X` ("Cancelar"); sem alvo, a caixa fica desligada com "Escolha um comentário para responder.". `textarea` 3 linhas (cresce até 6), placeholder "Escreva a resposta" / "Escreva a mensagem do direct", contador `{n}/1.000` 12 px (vermelho `casca-alerta` acima), botão "Enviar" (`BotaoDaCasca` primário `casca-marca`, `Send` 14), `Ctrl+Enter` envia. No modo direct, nota 11 px `casca-suave` com `Info` 12: "Uma mensagem por comentário, até 7 dias depois dele (regra do Instagram). Ela vai para a conversa do contato em Atendimento." Direct não liberado: a aba "Mandar direct" fica desligada com a explicação da D8. Enviando: botão com spinner e caixa travada. Sucesso: limpa o texto, toast "Resposta publicada." / "Direct enviado." (o direct com o link "Abrir conversa" para `/app/inbox?id={conversationId}`). Erro: toast com a mensagem da rota, texto mantido.

### 4.6 Painel da direita (`PainelDoComentario`)

`w-[384px] border-l bg-white hidden xl:flex flex-col` (mesma régua de `useTelaExtraGrande` do painel do contato). Sem comentário escolhido: a publicação (miniatura 100% largura `rounded-lg`, legenda inteira 14 px, "Publicada em …", "Ver no Instagram"). Com comentário escolhido, seções como `SecaoAberta` do painel do contato:
1. **Quem comentou:** avatar 48, `@usuario`, nome, rede; com contato: nome do contato 14 px 600 + "Abrir ficha" (`Link` `/app/contacts/{id}`, `casca-marca-forte`); sem contato: "Ainda não é contato" 13 px `casca-meta` e a nota 11 px "Vira contato quando receber um direct pela caixa ou por uma automação.".
2. **Comentário:** texto inteiro, data `dd/mm/aaaa HH:mm`, "Respondido"/"Sem resposta", "Oculto".
3. **Direct:** liberado ("Pode receber um direct até {dd/mm/aaaa HH:mm}" = comentadoEm + 7 dias) ou o motivo da D8.

### 4.7 Atualização otimista e confirmação

- Ocultar/reexibir: `setQueryData` em `chaveDosComentarios(canal, publicacao)` troca `oculto` no comentário (também dentro de `respostas`), sem mutar; erro → volta e toast "Não consegui ocultar o comentário." / "Não consegui reexibir o comentário.".
- Responder: depois do sucesso, `invalidateQueries` da chave (a resposta da conta aparece na leitura seguinte) e marca `respondido: true` na hora.
- Direct: sucesso → `direct = { liberado: false, motivo: "ja_usado" }` na hora; erro 409 `resposta_privada_ja_usada` → idem, com o toast da explicação.
- Apagar: `JanelaDeConfirmacao` (molde da exclusão de contatos da casca) "Apagar comentário?" / "O comentário some do Instagram para todos. Não dá para desfazer." / botões "Cancelar" e "Apagar" (perigo); sucesso → tira da cache e toast "Comentário apagado."; erro → toast "Não consegui apagar o comentário.".

---

## 5. Hooks (`hooks/escale/useComentarios.ts`, acrescentar)

```ts
export function useContasDaCaixa(): UseQueryResult<ContaDaCaixa[]>;                 // ["escale-comentarios", "caixa", "contas"], staleTime 60 s
export function usePublicacoesDaCaixa(canal: string | null, filtros: { periodo: PeriodoDaCaixa; ordem: "recentes" | "mais_comentarios" }): UseInfiniteQueryResult<InfiniteData<{ publicacoes: PublicacaoDaCaixa[]; proximo: string | null }>>;
/** A chave do cache dos comentários de uma publicação — a 10D usa no "Curtir" otimista. */
export const chaveDosComentarios = (canal: string | null, publicacao: string | null) => ["escale-comentarios", "caixa", canal, "publicacao", publicacao] as const;
export function useComentariosDaPublicacao(canal: string | null, publicacao: string | null): UseInfiniteQueryResult<InfiniteData<{ comentarios: ComentarioDaCaixa[]; proximo: string | null }>>; // refetchInterval 60 s com a aba visível
export function useResponderComentario(canal: string, publicacao: string): UseMutationResult<{ commentId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }>;
export function useDirectDoComentario(canal: string, publicacao: string): UseMutationResult<{ conversationId: string | null }, ApiError, { comentario: ComentarioDaCaixa; texto: string }>;
export function useOcultarComentario(canal: string, publicacao: string): UseMutationResult<{ oculto: boolean }, ApiError, { comentario: ComentarioDaCaixa; ocultar: boolean }>;
export function useApagarComentario(canal: string, publicacao: string): UseMutationResult<{ apagado: true }, ApiError, { comentario: ComentarioDaCaixa }>;
/** Troca um comentário (ou resposta) na cache sem mutar. Exportada para a 10D. */
export function trocarComentarioNaCache(dados: InfiniteData<{ comentarios: ComentarioDaCaixa[]; proximo: string | null }> | undefined, id: string, troca: (c: ComentarioDaCaixa) => ComentarioDaCaixa): typeof dados;
```

`codigoDoErro` (10B) continua servindo para a tela escolher o texto. Ids na URL com `encodeURIComponent`. O arquivo passa de ~80 para ~230 linhas; se passar de 400, separar as mutações em `hooks/escale/useAcoesNoComentario.ts` (e a 10D importa de lá; anotar no PR).

---

## 6. Encaixes nos arquivos do original

Cada encaixe leva `// FORK ESCALE · Fase 10A: …`.

1. **`lib/audit/actions.ts`** — no bloco do fork, depois de `"automation.comment_subscription_ensured"` (10B): as cinco ações da D16.
2. **`tests/unit/navegacao-completude.test.ts`** — a linha do `NAV_ALLOWLIST` (4.1).
3. **`supabase/baseline.sql`**, **`lib/i18n/dicionario.ts`** — blocos do fork nos pontos fixos (Global Constraints).

Nada em `lib/channels/*` nem no motor: a caixa só lê o Zernio e escreve por rotas do fork. O webhook, a assinatura e a ingestão não mudam.

---

## 7. Textos (pt → es)

Conferir com `grep` os que já existem no dicionário (por exemplo "Comentários", "Sem legenda", "Tentar novamente", "Todos", "Cancelar", "Carregar mais", "Limpar filtro") e não duplicar.

Conversas → Conversaciones; Comentários → Comentarios; Nenhuma conta do Instagram ou do Facebook liberada para você. → Ninguna cuenta de Instagram o de Facebook habilitada para ti.; Conecte em Configurações › Canais. → Conéctala en Configuración › Canales.; Esta conta está desconectada. Reconecte em Configurações › Canais. → Esta cuenta está desconectada. Vuelve a conectarla en Configuración › Canales.; Nenhuma publicação com comentários no período. → Ninguna publicación con comentarios en el período.; Erro ao carregar os comentários. → Error al cargar los comentarios.; Últimos 7 dias → Últimos 7 días; Últimos 30 dias → Últimos 30 días; Últimos 90 dias → Últimos 90 días; Tudo → Todo; Comentário mais recente → Comentario más reciente; Mais comentários → Más comentarios; {n} comentários → {n} comentarios; {n} sem resposta → {n} sin respuesta; Publicada em {data} → Publicada el {data}; Ver no Instagram → Ver en Instagram; Ver no Facebook → Ver en Facebook; Atualizar → Actualizar; Buscar por @ ou texto → Buscar por @ o texto; Sem resposta → Sin respuesta; Respondidos → Respondidos; Ocultos → Ocultos; Já é contato → Ya es contacto; Escolha uma publicação para ver os comentários. → Elige una publicación para ver los comentarios.; Nenhum comentário corresponde ao filtro. → Ningún comentario coincide con el filtro.; Você → Tú; Contato → Contacto; Oculto → Oculto; {n} curtidas → {n} me gusta; Responder → Responder; Mandar direct → Enviar mensaje directo; Ocultar → Ocultar; Reexibir → Volver a mostrar; Apagar → Eliminar; Responder em público → Responder en público; Respondendo a {usuario} → Respondiendo a {usuario}; Escolha um comentário para responder. → Elige un comentario para responder.; Escreva a resposta → Escribe la respuesta; Escreva a mensagem do direct → Escribe el mensaje directo; Enviar → Enviar; Uma mensagem por comentário, até 7 dias depois dele (regra do Instagram). Ela vai para a conversa do contato em Atendimento. → Un mensaje por comentario, hasta 7 días después (regla de Instagram). Va a la conversación del contacto en Atención.; Resposta publicada. → Respuesta publicada.; Direct enviado. → Mensaje directo enviado.; Abrir conversa → Abrir conversación; O Instagram só aceita o direct até 7 dias depois do comentário. → Instagram solo acepta el mensaje directo hasta 7 días después del comentario.; Este comentário já recebeu um direct. O Instagram aceita um só por comentário. → Este comentario ya recibió un mensaje directo. Instagram acepta solo uno por comentario.; Este comentário é da própria conta. → Este comentario es de la propia cuenta.; A conta está desconectada. Reconecte em Configurações › Canais. → La cuenta está desconectada. Vuelve a conectarla en Configuración › Canales.; Quem comentou → Quién comentó; Abrir ficha → Abrir ficha; Ainda não é contato → Todavía no es contacto; Vira contato quando receber um direct pela caixa ou por uma automação. → Se convierte en contacto cuando recibe un mensaje directo desde la bandeja o por una automatización.; Comentário → Comentario; Respondido → Respondido; Pode receber um direct até {data} → Puede recibir un mensaje directo hasta el {data}; Apagar comentário? → ¿Eliminar comentario?; O comentário some do Instagram para todos. Não dá para desfazer. → El comentario desaparece de Instagram para todos. No se puede deshacer.; Comentário apagado. → Comentario eliminado.; Não consegui apagar o comentário. → No pude eliminar el comentario.; Não consegui ocultar o comentário. → No pude ocultar el comentario.; Não consegui reexibir o comentário. → No pude volver a mostrar el comentario.; Só gerente e administrador podem apagar comentários. → Solo el gerente y el administrador pueden eliminar comentarios.; O comentário não existe mais. → El comentario ya no existe.; desconectada → desconectada.

---

## 8. Tasks

Cada task: teste primeiro (RED), rodar `corepack pnpm vitest run <arquivo>` e ver falhar, implementar, ver passar, `corepack pnpm typecheck`, `corepack pnpm eslint <arquivos>`, commit.

### Task 0: Worktree, nomes, contrato do Zernio e prova de identidade
- [ ] Conferir que a 10B (#150) e a 10C (#151) estão na `escale-crm/main` e que nada da Frente 10-I foi publicado (`LOG.md`).
- [ ] `git -C repo fetch escale-crm`; `git -C repo worktree add ../wt-10a -b feat/fase-10a-caixa-de-comentarios escale-crm/main`; `corepack pnpm install --frozen-lockfile`; copiar este plano para `wt-10a/docs/superpowers/plans/`.
- [ ] Conferir na `main` e ajustar o plano se divergir: último carimbo de migration (a 9803 é `20261203140000`); a forma de `user_id` nas tabelas do fork; a coluna do nome em `contacts` e o `rotuloDoContato`; `upsertSocialContact` (exportada na 10B); `socialMessageId`; `horaDaLinha`; `JanelaDeConfirmacao`, `AbasDaCasca`, `CampoDeBuscaDaLista`, `VazioDaCasca`, `FotoDaConversa`, `corDoAvatar`; se `icons-da-casca.ts` tem `MessagesSquare`, `MessageCircle`, `Send`, `Eye`, `EyeOff`, `Trash2`, `UserRound`, `ExternalLink`, `Info`, `RefreshCw` (o que faltar entra no `icons-da-casca.ts`, do fork); se o PostgREST aceita `.in("metadata->>origem", …)`; o `loading.tsx` de `/app/inbox` na sub-rota.
- [ ] **Contrato do Zernio, só leitura, com o "pode" do usuário para usar a chave de produção** (script de uma vez no scratchpad, sem gravar nem logar a chave): `GET /v1/inbox/comments?accountId=<@oregismarques>` e `GET /v1/inbox/comments/{postId}?accountId=` de um Reels. Anotar no PR: nomes dos campos (lista, cursor, autor, dono, oculto, respostas), se há `since`/`sortBy`, se há contagem de "sem resposta" (D5), qual id vai em `{postId}` (o mesmo de `GET accounts/{id}/posts` da 10B?). Ajustar os leitores da 2.3. Ocultar, apagar e direct reais **não** entram aqui (são escrita): ficam para a prova da bateria.
- [ ] **Prova de identidade** (risco "Contato duplicado por id diferente" do PRD): no mesmo script, comparar o `from.id` de um comentário de alguém que também já mandou direct para a conta com o `participantId` da conversa dele (`contacts.social_identity` no banco de produção, **só leitura**). Anotar no PR. Se forem diferentes, **parar e avisar o usuário** antes da Task 4: a D14 e a D9 (e o contato da 10B) precisam de outra chave.
- [ ] Se o usuário não liberar a leitura agora, seguir pelo contrato do SDK com os leitores tolerantes e marcar no PR que a prova fica para a bateria.

### Task 1: Constantes, regras da caixa e acesso
**Files:** modify `lib/escale/comentarios/constantes.ts`; create `lib/escale/comentarios/{caixa,acesso}.ts` (só a parte pura do `acesso`); tests `tests/unit/escale-comentarios-caixa-regras.test.ts`, `-acesso.test.ts`.
**Produces:** seções 1.1 a 1.3 (nomes e tipos exatos).
- [ ] `semResposta`: sem respostas → true; com resposta da própria conta → false; com ação `feito` → false; comentário da própria conta → false.
- [ ] `estadoDoDirect`: 6 dias 23 h → liberado; 7 dias e 1 min → `prazo_vencido`; id em `usados` → `ja_usado` (mesmo dentro do prazo); da própria conta → `da_propria_conta`; desconectada vence todos; data ilegível → `prazo_vencido`.
- [ ] `filtrarComentarios`: cada filtro; busca "JOAO" acha `@joão.silva`; busca que só casa numa resposta mantém o pai; não muta a entrada.
- [ ] `ordenarPublicacoes` (nulos no fim) e `inicioDoPeriodo` (7d/30d/90d/tudo).
- [ ] `podeAtenderAConta`: admin sem política → true; viewer → false; agente com `legacy_unconfigured` → true; `restricted` com e sem o usuário; `restricted_empty` → false; gerente segue a lista; `podeApagarComentario` (agent false, manager/admin true).
- [ ] Commit: `feat(escale): regras da caixa de comentários e de quem atende a conta`.

### Task 2: Migration 9803, baseline e invariantes
**Files:** create a migration (2.1); colar no `supabase/baseline.sql`; create `tests/invariants/escale-comentarios-9803.test.ts` (2.2).
- [ ] Escrever o teste; escrever a migration; colar o bloco no baseline.
- [ ] `corepack pnpm test:db tests/invariants/escale-comentarios-9803.test.ts` (Git Bash, Docker aberto) até ficar verde; rodar também o `-9801` e o `-9802` (índices novos na tabela deles).
- [ ] `corepack pnpm checar:colisao-de-migration`.
- [ ] Commit: `feat(escale): migration 9803 (ações no comentário)`.

### Task 3: Cliente do Zernio da caixa
**Files:** modify `lib/escale/comentarios/zernio.ts`; create `lib/escale/comentarios/zernio-caixa.ts`; tests `tests/unit/escale-comentarios-zernio-caixa.test.ts`, acrescentar em `-zernio.test.ts` (10B) (fetch dublado).
- [ ] `ocultarComentario` (POST), `reexibirComentario` (DELETE com `accountId` na query), `apagarComentario` (DELETE com `accountId` e `commentId` na query), ids com `/` e `_` codificados; `pedir` com `DELETE` não manda corpo; a chave nunca aparece em erro devolvido.
- [ ] `listarPublicacoesComComentarios` monta a query (`accountId`, `limit=25`, `cursor`, `since`, `sortBy` quando existirem na Task 0); `listarComentarios` idem (`limit=50`).
- [ ] Leitores: payload do SDK → tipos da 1.2; variantes (`data` × `posts`/`comments`, `from` × `author`, `message` × `text`, `replies` array × `replies.data`); `isOwner` ausente e `from.id === contaId` → `daPropriaConta`; miniatura `http:`/`javascript:` → null; link de outro domínio → null; item sem id some; lixo → lista vazia sem lançar; `hasMore: false` → `proximo` null.
- [ ] Commit: `feat(escale): leitura e moderação de comentários pelo Zernio`.

### Task 4: Leitura da caixa, ações à mão, conversa e eco
**Files:** create `lib/escale/comentarios/{leitura-da-caixa,acoes-manuais}.ts`, parte do servidor de `acesso.ts`; modify `lib/escale/comentarios/{conversa,eco}.ts`; tests `tests/unit/escale-comentarios-leitura-da-caixa.test.ts`, `-acoes-manuais.test.ts`, acrescentar em `-eco.test.ts` (Supabase e Zernio dublados, molde dos testes da 10B).
**Consumes:** Tasks 1 a 3.
- [ ] `contasDaCaixa`: só `zernio_social` instagram/facebook não arquivadas; agente fora da lista do canal não vê; `podeApagar` pelo papel; `contaDaCaixa` de outra org → null.
- [ ] `comentariosDaCaixa`: contato pela identidade; sem identidade, pelo disparo do autor; ação `resposta` `feito` → `respondido`; disparo `enviado` ou ação `direct` `feito`/`enviando` ou `falhou`+`resposta_privada_ja_usada` → `ja_usado`; erro de banco → lista do Zernio sem os extras (loga, não lança).
- [ ] `mandarDirectAMao`: ordem provada (reserva → contato → mensagem → Zernio → conclusão); prazo vencido não toca em nada; disparo da automação enviado → `jaUsado` sem reservar; 23505 → `jaUsado`; recusa `privateReplyConsumed` → ação `falhou` com `resposta_privada_ja_usada` e mensagem `failed`; sucesso → mensagem `sent` com `socialMessageId`, ação `feito` com `contact_id` e `message_id`; `enviando` velho do mesmo comentário vira `interrompido` antes da reserva.
- [ ] `responderAMao` manda `Idempotency-Key = id da ação`; `ocultarAMao`/`apagarAMao` gravam `feito`/`falhou`; audit só no sucesso.
- [ ] Conversa: `gravarDirectManualNaConversa` grava `sent_via 'user'`, `sent_by_user_id`, `metadata.origem 'comentario_manual'`; os testes da 10B de `gravarDirectNaConversa` seguem verdes sem mudar.
- [ ] Eco: `message.sent` que casa com a linha manual (id ou texto em 15 min) → true, sem duplicar; o da automação continua; uma linha `sent_via 'user'` sem a origem do comentário não casa.
- [ ] Commit: `feat(escale): ações à mão nos comentários com direct na conversa`.

### Task 5: Rotas
**Files:** create `lib/escale/comentarios/rota-da-acao.ts` e as rotas da 3.6; modify `lib/audit/actions.ts` (encaixe 1); tests `tests/unit/escale-comentarios-rota-da-acao.test.ts`, `-caixa-rotas.test.ts` (molde `tests/unit/escale-comentarios-rotas.test.ts`).
- [ ] Prólogo: sem `requireSupportWrite` ok → recusa; leitor → 403; alvo inválido → 422; canal de outra org, WhatsApp ou que a pessoa não atende → 404 (mesma resposta); `papelMinimo: "manager"` com agente → 403 com o texto; desconectada ou sem credencial → 409; ok → `ctx` com a chave e os ids.
- [ ] `respostaDoErroDoZernio`: 401/403/404/400 consumido/500 → os códigos da 3.3; o corpo do Zernio nunca vai na resposta.
- [ ] Leitura: `contas` não devolve `zernio_account_id`; `caixa` com período e cursor repassados; `caixa/[publicacaoId]` devolve `{ comentarios, proximo }`.
- [ ] Ações: `responder` com texto vazio ou de 1.001 → 422; `direct` com `jaUsado` → 409 `resposta_privada_ja_usada`; `ocultar` POST/DELETE → `{ oculto }`; `DELETE [comentarioId]` com agente → 403, gerente → `{ apagado: true }`; erro inesperado → 500 com `requestId`.
- [ ] Commit: `feat(escale): rotas da caixa de comentários`.

### Task 6: Hooks
**Files:** modify `hooks/escale/useComentarios.ts`; test `tests/unit/escale-comentarios-caixa-hooks.test.tsx` (molde `-hooks.test.tsx` da 10B).
- [ ] `useContasDaCaixa`; `usePublicacoesDaCaixa` desligado sem canal, `fetchNextPage` manda o cursor; `useComentariosDaPublicacao` desligado sem publicação.
- [ ] Mutações: ocultar otimista e volta no erro; direct marca `ja_usado` no sucesso e no 409; apagar tira da cache só no sucesso; `trocarComentarioNaCache` acha respostas e não muta.
- [ ] Commit: `feat(escale): hooks da caixa de comentários`.

### Task 7: Página, entrada e coluna das publicações
**Files:** create `app/app/inbox/comentarios/page.tsx`, `components/escale/conversas/comentarios/{TelaDeComentarios,ListaDePublicacoes,LinhaDaPublicacao,BarraDaCaixa,EstadosDaCaixa}.tsx`, `components/escale/conversas/fila/BotaoDosComentarios.tsx`; modify `BarraDaFila.tsx`, `tests/unit/navegacao-completude.test.ts` (encaixe 2); test `tests/unit/escale-comentarios-caixa-tela.test.tsx` (hooks mockados, **sem** `TooltipProvider` no wrapper).
- [ ] Página: casca desligada → redireciona; ligada → tela.
- [ ] Barra da fila: sem conta social, sem botão; com conta, o link "Comentários" antes da engrenagem; os testes da 3A da barra seguem verdes.
- [ ] Tela: abas com "Comentários" escolhida e "Conversas" levando a `/app/inbox`; conta da URL ou a primeira; trocar a conta limpa `p` e `c`; linha com legenda, "Sem legenda", "{n} comentários" em pt-BR, hora pelo `horaDaLinha`, contador só com `semResposta > 0`; escolher grava `p` na URL; "Carregar mais"; os cinco estados com os textos da 4.2.
- [ ] Commit: `feat(escale): caixa de comentários em Atendimento (lista de publicações)`.

### Task 8: Comentários da publicação, item e compositor
**Files:** create `…/comentarios/{ComentariosDaPublicacao,CabecalhoDaPublicacao,FiltroDosComentarios,ItemDoComentario,AcoesDoComentario,CompositorDoComentario}.tsx`; tests `tests/unit/escale-comentarios-item.test.tsx`, `-compositor.test.tsx`, acrescentar em `-caixa-tela.test.tsx`.
- [ ] Cabeçalho com "Publicada em {dd/mm/aaaa HH:mm}", "{m} sem resposta" e o link só quando seguro.
- [ ] Lista em ordem crescente, respostas aninhadas, chips "Você", "Contato", "Oculto", "Sem resposta"; filtro e busca.
- [ ] Ações: "Mandar direct" desligado com a explicação certa em cada motivo; sem "Apagar" para quem não pode; comentário da própria conta sem direct; "Ocultar" vira "Reexibir".
- [ ] Compositor: sem alvo desligado; "Responder" mira o comentário; contador 1.000; Ctrl+Enter; modo direct com a nota; sucesso limpa e mostra o toast com "Abrir conversa"; erro mantém o texto.
- [ ] Apagar: a confirmação com os textos e o botão de perigo; cancelar não chama a rota.
- [ ] Commit: `feat(escale): comentários de uma publicação com responder, direct, ocultar e apagar`.

### Task 9: Painel da direita, textos e documentos
**Files:** create `…/comentarios/PainelDoComentario.tsx`; modify `lib/i18n/dicionario.ts`, `docs/modulos/10-comentarios.md`; test `tests/unit/escale-comentarios-painel.test.tsx`.
- [ ] Painel: sem comentário, a publicação; com contato, "Abrir ficha" para `/app/contacts/{id}`; sem contato, "Ainda não é contato" e a nota; direct liberado com a data-limite `dd/mm/aaaa HH:mm`; escondido abaixo de `xl`.
- [ ] Textos da seção 7 (pt e es) no bloco do fork; rodar `tests/unit/i18n-espanhol-cobre-a-tela.test.ts` e os `i18n-*` que existirem.
- [ ] PRD 10: seção 8, 10A "Mergeada"; quadro A, linha "Ver, no comentário, se a pessoa já é contato" marcada 10A (estava 10C); seção 12, risco "IA pausada pela automação" coberto na 10B (não 10C); D5 e D13 registradas; o resultado da prova de identidade.
- [ ] Commit: `feat(escale): painel do comentário e textos da 10A`.

### Task 10: Fechamento da fase e da Frente 10-I (bateria, revisão, provas e publicação)
- [ ] `corepack pnpm typecheck`; `corepack pnpm eslint lib/escale/comentarios components/escale/conversas/comentarios components/escale/conversas/fila hooks/escale/useComentarios.ts app/api/v1/escale/comentarios app/app/inbox/comentarios tests/unit/escale-comentarios-*`.
- [ ] Diff do original: `git diff --stat escale-crm/main -- lib app components` mostra do Rafael só os encaixes da seção 6.
- [ ] Auto-revisão pela checklist de `code-review.md`. PR para `escale-crm/main` (itens do PRD cobertos, D1–D18, o provisório, o resultado da Task 0 e da prova de identidade, a nota "a Frente 10-I publica agora"); merge direto.
- [ ] **Bateria da Frente 10-I (em segundo plano):** unidade completa, `test:db`, `test:db:update`, cercas (`corepack pnpm cercas`, nunca `vitest run -c vitest.cercas.ts`; as 47 falhas antigas do Windows anotadas na 10C; falha nova → corrige antes de publicar).
- [ ] **Revisor Opus 5.5** (um, a frente inteira 10B + 10C + 10A): pedir atenção ao motor e à ingestão da 10B (reivindicação, eco, encaixes), ao gatilho definer da mescla da 10C, ao índice único do direct e às rotas de ação desta fase (D7, credencial, nada da chave na resposta). Sem Critical/Important aberto.
- [ ] **Conferência visual** (casca ligada, `corepack pnpm dev`): 10B contra 07-014, 07-020 e 07-027; 10C contra a linha "Tags" da aba Contato e o filtro "Telefone"; 10A contra 02-003 e a fila (c01). Anotar por escrito cada diferença que sobrou.
- [ ] **Publicar:** tag `vX.Y.Z-escale.N` + release; esperar `promover-stable`; na VPS nova, `df -h` (memória `vps-disco-cheio-imagens-antigas`), `backup.sh`, `update.sh --to <tag>`; conferir 3 containers healthy, `/login` 200, sem erro nos logs e, no banco (só leitura), as tabelas `escale_disparos_de_comentario` e `escale_acoes_no_comentario`, `fn_escale_resumo_dos_comentarios`, o gatilho da mescla da 9802, os índices da 9803. Falhou: volta para a tag anterior e avisa.
- [ ] **Provas reais com o @oregismarques:** os critérios da bateria da 10B (N comentários → N directs com botão em menos de 1 minuto, 0 duplicados, N respostas públicas, Insights, um contato só, mensagem na conversa, IA ligada), da 10C (origem na ficha, filtro, atalhos) e da 10A (seção 9). `LOG.md` atualizado (feito / onde estamos / próximo: Frente 10-II, a 10D); commit `docs: LOG da Frente 10-I`.

---

## 9. Critério de pronto (linha 10A da seção 8 do PRD)

- Com a casca, o botão "Comentários" da fila abre a caixa; numa conta conectada dá para ver os comentários de um Reels do @oregismarques, com as respostas aninhadas, **responder um em público e mandar direct para outro, e as duas ações aparecem no Instagram**; o direct aparece na conversa do contato em Atendimento, uma vez só.
- O botão de direct fica desligado, com o motivo, num comentário com mais de 7 dias e num que já recebeu direct (pela caixa ou pela automação da 10B).
- Ocultar e reexibir funcionam; apagar pede confirmação e só aparece para gerente e admin; um atendente fora da lista da conta não vê a conta.
- Quem já é contato aparece com o chip e o "Abrir ficha"; quem recebeu o direct pela caixa vira **um** contato só (mesma identidade do direct).
- RLS e o índice único do direct provados (Task 2). Sem a casca, o inbox do original não muda.

## 10. Riscos desta fase

| Risco | Mitigação |
|---|---|
| O contrato da listagem de comentários do Zernio (0.0.x) divergir do SDK | Leitores tolerantes num arquivo só; Task 0 lê de verdade e ajusta; o que não vier (contagem de sem resposta, período, ordem) cai para a tela (D5, D6) |
| O id de quem comenta não ser o `participantId` do direct (dois contatos; "já é contato" errado) | Prova de identidade na Task 0 e parada antes da Task 4 se divergir (vale também para a 10B, ainda não publicada) |
| Dois cliques ou duas pessoas mandarem dois directs no mesmo comentário | Índice único parcial da 9803 + reserva antes do envio; `enviando` velho vira `interrompido` |
| O eco do direct à mão virar uma segunda linha na conversa | A linha é gravada antes do envio e `eco.ts` aceita a origem manual (D10); teste na Task 4 |
| Uma chamada ao Zernio por abertura de publicação e por minuto pesar na franquia | Uma conta e uma publicação por vez, `staleTime` 30 s, `refetchInterval` só com a aba visível, "Atualizar" à mão; custo perguntado ao Zernio (decisão 7 do PRD) |
| Atendente ver comentários de conta que não atende | `contaDaCaixa` confere a lista do canal em toda rota (404 sem dizer por quê); teste na Task 5 |
| LGPD: quem comenta não deu dado nenhum | Nada do comentário é guardado; contato só nasce de um direct que a pessoa da empresa decidiu mandar; a 9803 guarda só ids e o texto da empresa |
| Molde sem referência da Clint | Provisório no PR; reaproveita as peças da casca de Atendimento; pergunta 1 |

## 11. Perguntas ao usuário (não bloqueiam a execução)

1. **Molde e entrada (D1, D2):** o PRD pedia o molde confirmado antes do plano, e a Clint não tem esta tela. O plano usa as três colunas de Conversas (publicações | comentários | quem comentou) e entra por um botão "Comentários" na barra da fila, ao lado da engrenagem, com as abas "Conversas" / "Comentários" na tela de comentários. Pode, ou prefere as abas também na tela de Conversas (mexe numa tela já aprovada)?
2. **"Sem resposta" na lista (D5):** se o Zernio não devolver essa conta na lista de publicações, o número aparece só dentro da publicação. Pode?
3. **Quem vê (D7):** a régua é a mesma das conversas: quem está no dispositivo em Configurações › Canais (admin sempre). Gerente também segue a lista do dispositivo. Pode, ou gerente deve ver todas as contas?
4. **Direct à mão e a IA (D9):** o direct mandado pela caixa conta como envio feito pelo CRM e não pausa o agente de IA da conversa (igual a uma mensagem mandada em Atendimento). Pode?
5. **Limites (D17):** 1.000 caracteres na resposta e no direct à mão. Pode?

### Divergências achadas entre o PRD e o código (registradas no PRD na Task 9)

- O PRD (seção 8) pede "molde confirmado antes do plano" para a 10A; não houve confirmação nem print: o molde aqui é provisório (pergunta 1).
- O quadro A marca "Ver, no comentário, se a pessoa já é contato" como **10C**; o quadro C e a seção 8 marcam **10A**. A 10C não fez; entra aqui (D14).
- O risco "Contato duplicado por id diferente" mandava provar a identidade "na 10A antes de escrever a 10C"; a 10C foi mergeada antes. A prova entra na Task 0 desta fase, antes da publicação da frente.
- O risco "IA pausada pela automação" diz "coberto na 10C"; quem cobriu foi a 10B (`eco.ts`).
- PRD 7 "comentário não se guarda": a 9803 guarda as **ações** do CRM (necessário para "um direct por comentário"), não o comentário (D13).
- A rota `GET /api/v1/escale/comentarios/publicacoes` da 10B é só de gerente (é do editor de automação); a caixa, que o atendente usa, tem rotas próprias.
- O plano da 10D espera `ocultarComentario` em `zernio.ts` e o `DELETE` no `pedir`: a 10A já entrega os dois; a Task 0 da 10D só confere.
