import { TelaConfiguracaoDeCanais } from "@/components/escale/conversas/configuracoes/canais/TelaConfiguracaoDeCanais";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function CanaisPage() {
  return paginaDaConfiguracao(<TelaConfiguracaoDeCanais />);
}
