import type { PreferenciaDeOrigens } from "./preferencias";

/**
 * Grava uma preferência do painel Origens pelo Route Handler
 * `app/app/escale/preferencia-de-origens` (e não por Server Action, que
 * re-renderizaria a página no servidor a cada clique). Falha de rede não
 * atrapalha: é só preferência de tela, e o estado local já mudou.
 */
export function guardarPreferenciaDeOrigens(pedido: PreferenciaDeOrigens): void {
  void fetch("/app/escale/preferencia-de-origens", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(pedido),
    keepalive: true,
  }).catch(() => undefined);
}
