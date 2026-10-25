# Faixa B da revisão de 24/10 e os dois pontos da fila

Fonte dos ids: `docs/revisao-2026-10/relatorio-final.md` e `grupo-N.md` / `grupo-N-bugs.md` (G = qualidade, B = bugs). Toda fase começa conferindo no código se o item ainda existe.

Processo: base `escale-crm/main`, um PR por fase mergeado ao terminar, sem teste pesado no meio (só o teste da tarefa, typecheck e eslint dos arquivos alterados), uma bateria no fim (unit + `test:db` + `test:db:update`), um revisor por frente (Opus 5.5; Fable só em RLS/migration), publicação com tag, `backup.sh` e `update.sh --to`.

| fase | módulo | itens | migration |
|---|---|---|---|
| FB0 | Segurança e graves | fora-1, fora-3, fora-4, fora-5, fora-8 | sim (fora-1) |
| FB7 | Banco | B7-4..B7-8, G7-8, G7-9, G7-11, G7-13, G7-20, índice do B2-14, ordem estável do B3-9, view do G3-11 | sim (9403+) |
| FB1 | Conversas | recarga da fila, total da fila, B1-10..18, B1-21..25, G1-5, G1-9..11 | não |
| FB2 | Negócios | B2-9, B2-11..18, G2-23 | não |
| FB3 | Contatos e empresas | B3-10..18, B9-7, B9-9, G3-4, G3-6..8, G3-12, G9-2, G9-11 | não |
| FB4 | Configurações e casca | B4-7..13, B6-11, B9-8, B9-10, B9-11, G4-2, G4-4, G4-5, G4-7, G4-8, G9-16, G9-19 | não |
| FB5 | Importação, filtros e massa | B5-9, B5-12..18, G5-6, G5-9, G5-19, G5-20, G5-22, G6-14 | não |
| FB6 | Campanhas | B8-11..14, G8-3..5, G8-9..11, G8-16 | não |

Fora: só simplificação sem ganho visível (G1-25, G2-25, G4-22, G5-21, G6-22, G8-25, G9-18) e os grandes herdados do original (G6-8, G6-22).

## Fila (FB1)
1. Recarga: `recarregarPrimeiraPagina` só grava a página 1 quando a fila está ociosa (sem `fetchNextPage` em voo); teste com "Carregar mais" pendente.
2. Total: `invalidarTotalDaFila(qc)` em `useTotalDaFila.ts`, chamado nas ações da pessoa (fechar, reabrir, espera, setor, assumir, transferir, soltar). Tempo real continua sem recontar.
