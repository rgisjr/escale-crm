import { cookies } from "next/headers";

import { CompanyDetailClient } from "./_client";
// ── FORK ESCALE · Fase 2D: com a casca, a ficha da empresa da Clint ──
import { FichaDaEmpresa } from "@/components/escale/empresas/FichaDaEmpresa";
import { dadosDaPaginaDeEmpresas } from "@/lib/escale/empresas/pagina";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
// ── fim FORK ESCALE ──

export const dynamic = "force-dynamic";

export default async function CompanyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  // ── FORK ESCALE · Fase 2D ──
  if (lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo") {
    const { papel } = await dadosDaPaginaDeEmpresas();
    return <FichaDaEmpresa id={id} papel={papel} podeAdministrar={papel === "admin"} />;
  }
  // ── fim FORK ESCALE ──
  return <CompanyDetailClient id={id} />;
}
