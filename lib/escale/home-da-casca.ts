/**
 * A TELA INICIAL COM A CASCA NOVA (fork Escale): como na Clint, entrar no app abre Negócios.
 *
 * Só vai para Negócios quem tem organização ativa e enxerga "Negócios" (`/app/kanban`)
 * pela interface da organização; o resto segue a regra do original (`homeDaInterface`).
 * O papel é exigido porque, sem organização, `/app/escale/negocios` devolve para `/app`:
 * sem esta trava, um admin da plataforma sem organização ficaria num laço.
 */
import type { Role } from "@/lib/auth/types";
import { destinosDaInterface, homeDaInterface } from "@/lib/navigation/interface";

export const NEGOCIOS_DA_CASCA = "/app/escale/negocios";

export function homeDaCasca(raw: unknown, platform: boolean, role: Role | null): string {
  const veNegocios = destinosDaInterface(raw, platform, role).some((d) => d.href === "/app/kanban");
  return role && veNegocios ? NEGOCIOS_DA_CASCA : homeDaInterface(raw, platform, role);
}
