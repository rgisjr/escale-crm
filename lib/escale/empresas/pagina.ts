import { redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import type { Role } from "@/lib/auth/types";
import { moedaDaOrganizacaoDe } from "@/lib/escale/empresas/banco";
import { createClient } from "@/lib/supabase/server";

/** O que a página de empresas da casca lê no servidor: o papel e a moeda da organização. */
export async function dadosDaPaginaDeEmpresas(): Promise<{ papel: Role; moedaPadrao: string }> {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  if (!org) redirect("/app");
  const moedaPadrao = await moedaDaOrganizacaoDe(await createClient(), org.orgId);
  return { papel: org.role as Role, moedaPadrao };
}
