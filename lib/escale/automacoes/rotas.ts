export const ROTA_DA_LISTA_DE_AUTOMACOES = "/app/automacoes";
const ROTA_DO_FLUXO = "/app/webhooks/automacoes";

export type FormaDeMontar = "fluxo" | "editor";

export function rotaDoFluxo(id: string): string {
  return `${ROTA_DO_FLUXO}/${encodeURIComponent(id)}`;
}

/** O fluxo novo já com o nome e a pasta do modal (Q4). Pasta vazia = "Sem pasta". */
export function rotaDoFluxoNovo({ nome, pastaId }: { nome: string; pastaId: string | null }): string {
  const q = new URLSearchParams({ nome });
  if (pastaId) q.set("pasta", pastaId);
  return `${ROTA_DO_FLUXO}/nova?${q.toString()}`;
}

/** A lista com o editor em formulário aberto por cima (o "Ir para a automação" e o ⋮). */
export function rotaDoEditor(id: string): string {
  return `${ROTA_DA_LISTA_DE_AUTOMACOES}?editor=${encodeURIComponent(id)}`;
}

/** Clicar no nome (Q2): a forma gravada; sem registro, o fluxo. */
export function rotaDeAbrir(a: { id: string; forma: FormaDeMontar | null }): string {
  return a.forma === "editor" ? rotaDoEditor(a.id) : rotaDoFluxo(a.id);
}
