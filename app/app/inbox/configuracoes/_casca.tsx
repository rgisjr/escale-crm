import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { ConversasDaCasca } from "@/components/escale/conversas/ConversasDaCasca";
import { origensDaPagina } from "@/lib/escale/contatos/origens-da-pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

/**
 * FORK ESCALE · Fase 3C (N9): toda tela de "Conversas › Configurações" é a
 * casca com a fila à esquerda e a tela no lugar do centro e do painel. Sem a
 * casca ligada, volta para o inbox do original.
 */
export async function paginaDaConfiguracao(tela: ReactNode) {
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) !== "topo") {
    redirect("/app/inbox");
  }
  // FORK ESCALE · Fase 3D: o painel de filtros da fila também vale aqui.
  const { origens, opcoesDoFiltro } = await origensDaPagina();
  return <ConversasDaCasca configuracao={tela} origens={origens} opcoesDoFiltro={opcoesDoFiltro} />;
}
