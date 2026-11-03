/**
 * O ZOOM DO FLUXO, igual ao editor da Clint (07-013, 07-026): de 0,25 a 1,15 e `fitView` com o
 * padding padrão do React Flow (0,1). Um fluxo pequeno abre a 1,15×, como lá.
 */
export const ZOOM_DO_FLUXO = { minZoom: 0.25, maxZoom: 1.15 } as const;

/** O "Reorganizar" reenquadra como o botão da Clint: só a animação, sem padding próprio. */
export const REENQUADRAR_O_FLUXO = { duration: 500 } as const;
