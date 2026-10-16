/**
 * AS MEDIDAS DO PAINEL ESQUERDO NA CASCA NOVA (fork Escale · casca V3).
 *
 * Tiradas de 01-010 (px do print ÷ 1,25) e de 01-032, 01-033 e 01-034 (JPEGs de
 * 500px que já estão em px de CSS) — ver a tabela "Medidas" do plano
 * `docs/superpowers/plans/2026-10-16-casca-clint-v3-painel.md`. Um lugar só
 * para as classes que as linhas de grupo, de origem e de visualização repetem:
 * mudar aqui muda as três.
 */

/** Botão só de ícone (lupa, ^, +, ⋮): 24px, ícone cinza #686D86, foco visível na cor da marca. */
export const BOTAO_DE_ICONE =
  "grid size-6 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave transition-colors hover:text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca";

/**
 * Ações que somem em repouso (01-010) e aparecem no hover da linha, no foco
 * pelo teclado e enquanto o menu delas está aberto (01-032/033). Quem usa
 * acrescenta o `group-hover/<nome>:opacity-100` do próprio grupo.
 */
export const SO_NO_HOVER =
  "flex items-center opacity-0 transition-opacity focus-within:opacity-100 has-[[data-state=open]]:opacity-100";

/** A linha de 34px (grupo, origem, visualização), de borda a borda do painel, texto 12px #2F2C5D. */
export const LINHA = "relative flex h-[34px] items-center text-xs text-casca-texto";

/** O cinza #F3F3F3 da linha no hover e com o menu dela aberto (01-032/033/034). */
export const LINHA_COM_HOVER =
  "hover:bg-(--escale-painel-hover) has-[[data-state=open]]:bg-(--escale-painel-hover)";

/** A linha atual: fundo #EFF3FF e a barra de 3px da marca colada na borda esquerda do painel (01-032). */
export const LINHA_ATUAL =
  "bg-casca-raia before:absolute before:inset-y-0 before:left-0 before:w-[3px] before:bg-casca-marca";

/** O texto das origens e das visualizações começa a 43px da borda, alinhado ao nome do grupo (01-032). */
export const RECUO_DO_TEXTO = "pl-[43px]";

/** O botão redondo de recolher/abrir o painel: 20px, branco, borda #E8E4F5, sombra curta para baixo (01-010). */
export const BOLINHA_DO_PAINEL =
  "absolute top-4 z-10 grid size-5 place-items-center rounded-full border border-casca-borda bg-surface text-casca-texto shadow-[0_2px_4px_rgb(17_24_39/0.10)] transition-colors hover:bg-casca-raia focus-visible:outline-2 focus-visible:outline-casca-marca";

/**
 * A COLUNA COLADA NAS BORDAS (01-010): o painel não é cartão flutuante, ele vai
 * do topo ao fundo da tela, encostado na esquerda.
 *
 * O `<main>` da casca tem padding: `sm:p-6` e, no fundo, a reserva do rodapé.
 * Sem peça fixa a reserva é `pb-area-segura`; com peça, é `estiloDaReserva`
 * (`lib/ui/rodape-ocupado.tsx`). As margens negativas devolvem esse padding nas
 * três bordas.
 *
 * A do fundo é a MESMA conta do `<main>`: o `max()` de `estiloDaReserva`, que
 * sem peça vale o mesmo que `pb-area-segura`. Senão a página rolaria a
 * diferença. Só do md para cima: abaixo disso o painel não aparece.
 */
export const ENVOLTORIO_DO_PAINEL =
  "flex items-start md:-mt-6 md:-ml-6 md:-mb-[max(var(--space-6),env(safe-area-inset-bottom,0px),var(--rodape-ocupado,0px))]";

/** O conteúdo começa 20px depois da borda do painel e 24px abaixo do topo (01-010), e devolve a reserva do fundo. */
export const CONTEUDO_AO_LADO_DO_PAINEL =
  "min-w-0 flex-1 md:pt-6 md:pl-5 md:pb-[max(var(--space-6),env(safe-area-inset-bottom,0px),var(--rodape-ocupado,0px))]";
