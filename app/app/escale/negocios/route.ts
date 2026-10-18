/**
 * GET /app/escale/negocios — o "Negócios" do menu do topo (fork Escale, Fase 1B).
 *
 * Abre direto no quadro, como na Clint: o último funil aberto (cookie
 * `escale_ultimo_funil`), senão o padrão da organização, senão o primeiro da
 * lista (`escolherFunilInicial`). Sem funil visível — ou com o banco fora do
 * ar — cai na lista de funis, que continua existindo em `/app/kanban`.
 *
 * Route Handler, e não página: só redireciona (e assim não entra na régua de
 * telas de `tests/unit/navegacao-completude.test.ts`). O endereço do redirect é
 * o público (`NEXT_PUBLIC_APP_URL`): atrás do proxy, `req.url` é 0.0.0.0:3000.
 */
import { cookies } from "next/headers";
import { type NextRequest, NextResponse } from "next/server";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { env } from "@/lib/env";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { COOKIE_ULTIMO_FUNIL, lerUuid } from "@/lib/escale/origens/preferencias";
import { escolherFunilInicial } from "@/lib/escale/origens/regras";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const para = (caminho: string) => NextResponse.redirect(new URL(caminho, env.NEXT_PUBLIC_APP_URL));

export async function GET(req: NextRequest): Promise<NextResponse> {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return para("/app");

  const lembrado = lerUuid((await cookies()).get(COOKIE_ULTIMO_FUNIL)?.value);
  let destino: string | null = null;
  try {
    destino = escolherFunilInicial(await lerOrigens(await createClient(), activeOrg.orgId), lembrado);
  } catch (err) {
    console.error("[escale/negocios] não consegui ler as origens; abro a lista de funis", err);
  }
  // 1J (Q5): o aviso da Clint de quem caiu num negócio de origem sem acesso segue para o quadro.
  const aviso =
    new URL(req.url).searchParams.get("aviso") === "origem-sem-acesso" ? "?aviso=origem-sem-acesso" : "";
  return para(destino ? `/app/pipelines/${destino}${aviso}` : `/app/kanban${aviso}`);
}
