import { cookies } from "next/headers";

import { ImportsListClient } from "./_client";
// ── FORK ESCALE · Fase 2F: com a casca, as importações da Clint ──
import { ListaDeImportacoes } from "@/components/escale/importacao/ListaDeImportacoes";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function ImportsPage() {
  // ── FORK ESCALE · Fase 2F ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") return <ListaDeImportacoes />;
  // ── fim FORK ESCALE ──
  return <ImportsListClient />;
}
