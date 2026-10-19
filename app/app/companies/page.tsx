import { cookies } from "next/headers";

import { CompaniesListClient } from "./_client";
// ── FORK ESCALE · Fase 2D: com a casca, a lista de empresas da Clint ──
import { ListaDeEmpresas } from "@/components/escale/empresas/ListaDeEmpresas";
import { dadosDaPaginaDeEmpresas } from "@/lib/escale/empresas/pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function CompaniesPage() {
  // ── FORK ESCALE · Fase 2D ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    return <ListaDeEmpresas {...(await dadosDaPaginaDeEmpresas())} />;
  }
  // ── fim FORK ESCALE ──
  return <CompaniesListClient />;
}
