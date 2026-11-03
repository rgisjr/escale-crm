/**
 * A conferência lado a lado com a Clint só vale com os dois navegadores na mesma escala
 * (`devicePixelRatio`). Zoom salvo por site no Chrome (ex.: 90% no Escale) encolhe a tela
 * inteira e parece "diferença de layout" (02/11).
 */
export function escalaConfere(escalaDoEscale: number, escalaDaClint: number): boolean {
  return Math.abs(escalaDoEscale - escalaDaClint) < 0.001;
}
