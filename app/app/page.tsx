import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { homeDaCasca } from "@/lib/escale/home-da-casca";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { homeDaInterface } from "@/lib/navigation/interface";
export default async function AppHome() {
  const user = await requireAuth();
  const org = await resolveActiveOrg(user);
  const platform = user.is_platform_admin && !user.support;
  const role = org?.role ?? null;
  // Fork Escale: com a casca nova, entrar no app abre Negócios, como na Clint.
  const casca = lerPreferenciaDeMenu((await cookies()).get(COOKIE_DO_MENU)?.value) === "topo";
  redirect(
    casca
      ? homeDaCasca(org?.interface_settings, platform, role)
      : homeDaInterface(org?.interface_settings, platform, role),
  );
}
