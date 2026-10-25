/**
 * POST /app/escale/preferencia-de-origens — grava as preferências do painel
 * Origens (fork Escale, Fase 1B) em cookie httpOnly.
 *
 * Route Handler, e não Server Action: gravar cookie numa Server Action faz o Next
 * re-renderizar a página e os layouts no servidor (docs: "Mutating data"), então
 * cada clique no painel refazia o quadro inteiro. Aqui o cookie sai na resposta
 * do `fetch` e nada é re-renderizado.
 *
 * Preferência pessoal de tela, sem banco e sem organização. Tudo passa por
 * `cookieDaPreferencia`: o navegador não escolhe nome de cookie nem grava texto livre.
 */
import { type NextRequest, NextResponse } from "next/server";

import { cookieDaPreferencia } from "@/lib/escale/origens/preferencias";
import { cookieSecure } from "@/lib/supabase/cookie-secure";

export const dynamic = "force-dynamic";

const UM_ANO = 60 * 60 * 24 * 365;

export async function POST(req: NextRequest): Promise<NextResponse> {
  let pedido: unknown;
  try {
    pedido = await req.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido" }, { status: 400 });
  }
  const alvo = cookieDaPreferencia(pedido);
  if (!alvo) return NextResponse.json({ error: "Preferência inválida" }, { status: 400 });

  const resposta = new NextResponse(null, { status: 204 });
  resposta.cookies.set(alvo.cookie, alvo.valor, {
    httpOnly: true,
    sameSite: "strict",
    secure: cookieSecure(),
    path: "/",
    maxAge: UM_ANO,
  });
  return resposta;
}
