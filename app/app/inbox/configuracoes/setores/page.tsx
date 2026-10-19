import { TelaSetores } from "@/components/escale/conversas/configuracoes/setores/TelaSetores";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function SetoresPage() {
  return paginaDaConfiguracao(<TelaSetores />);
}
