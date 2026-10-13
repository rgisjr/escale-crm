/**
 * GET /app/escale/menu?usar=topo|lateral&voltar=/app/... — liga ou desliga a casca
 * nova (menu no topo + tema Escale) para QUEM CHAMOU, e volta para a tela de origem.
 *
 * Fica sob `/app`, então o `proxy.ts` já exige sessão. Não toca banco: a escolha é
 * só um cookie de preferência visual, como o de recolher a barra lateral.
 */
import { NextResponse, type NextRequest } from "next/server";

import { cookieSecure } from "@/lib/supabase/cookie-secure";
import { COOKIE_DO_MENU, destinoSeguro } from "@/lib/escale/preferencia-de-menu";

export const dynamic = "force-dynamic";

export function GET(req: NextRequest): NextResponse {
  const usar = req.nextUrl.searchParams.get("usar");
  const destino = destinoSeguro(req.nextUrl.searchParams.get("voltar"));
  const res = NextResponse.redirect(new URL(destino, req.url));
  if (usar === "topo" || usar === "lateral") {
    res.cookies.set(COOKIE_DO_MENU, usar, {
      httpOnly: true,
      sameSite: "strict",
      secure: cookieSecure(),
      path: "/",
      maxAge: 60 * 60 * 24 * 365,
    });
  }
  return res;
}
