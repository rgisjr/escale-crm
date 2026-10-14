"use server";
/**
 * Grava as preferências do painel Origens (fork Escale, Fase 1B) em cookie
 * httpOnly — painel/lista recolhidos, grupos ocultos e o último funil aberto.
 *
 * Preferência pessoal de tela, sem banco e sem organização (como
 * `app/actions/shell/toggleSidebar.ts`). Tudo passa por `cookieDaPreferencia`:
 * o navegador não escolhe nome de cookie nem grava texto livre.
 */
import { cookies } from "next/headers";

import { cookieDaPreferencia, type PreferenciaDeOrigens } from "@/lib/escale/origens/preferencias";
import { cookieSecure } from "@/lib/supabase/cookie-secure";

export async function guardarPreferenciaDeOrigens(pedido: PreferenciaDeOrigens): Promise<void> {
  const alvo = cookieDaPreferencia(pedido);
  if (!alvo) return;
  const store = await cookies();
  store.set(alvo.cookie, alvo.valor, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(),
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}
