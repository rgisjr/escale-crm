# Ficha do negócio sem carregar o quadro (G2-9)

> Item G2-9 da revisão de outubro (`docs/revisao-2026-10/grupo-2.md`). Aprovado em 25/10/2026 ("pode fazer").

**Problema.** Abrir a ficha pelo endereço direto baixa o funil inteiro (todos os negócios e 9 enriquecimentos em série) para mostrar um negócio. Pelo clique no quadro o cache já está quente e não pesa.

## Decisões

| # | Decisão |
|---|---|
| D1 | Rota nova `GET /api/v1/leads/[id]/ficha` devolve `BoardData` com UM negócio: `{ pipeline, stages, leads: [negocio] }`. Enriquece só o que a ficha usa (dono IA, tarefas, conversa, contato, tags). Fora: próxima ação (grava na caixa a partir de um GET) e score. 404 para arquivado, funil ausente e contato pessoal. |
| D2 | Cache do quadro quente na montagem: caminho de sempre, zero requisição a mais. Frio: rota leve, chave `["board", origem, "negocio", id]`. |
| D3 | Frio: a ficha pinta com a rota leve e o quadro é buscado em segundo plano logo depois; quando chega, a ficha passa a ler dele (igual à de sempre, com tempo real). Até lá `leadsDoRecorte` é `null` e as setas do próximo negócio ficam desativadas; a duplicidade do "Novo negócio" vê só este negócio (o `POST /leads` confere no banco). |
| D4 | `quadroEmCache(qc, pipelineId)`: moeda, motivos de perda e portões de campos leem o quadro e, se frio, o negócio leve do mesmo funil. |
| D5 | Os enriquecimentos saem de `board/route.ts` para `lib/kanban/enriquecer-negocios.ts` (as duas rotas usam). Cercas que liam o corpo das funções na rota passam a ler o arquivo novo. |
| D6 | A chave leve mora debaixo de `["board", origem]`: todo ponto que invalida `["board"]` ou `["board", origem]` alcança a ficha por link sem mexer nas mutations. `useMoveCard.onSuccess` também grava o `updated_at` novo no negócio leve (mesma causa da #916). Tempo real próprio (`id=eq.<id>`) enquanto o canal do quadro não existe. |

Sem migration. Um PR.
