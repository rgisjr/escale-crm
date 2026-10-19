import { HubDeConfiguracoes } from "@/components/escale/conversas/configuracoes/HubDeConfiguracoes";

import { paginaDaConfiguracao } from "./_casca";

export const dynamic = "force-dynamic";

export default async function ConfiguracoesDeConversasPage() {
  return paginaDaConfiguracao(<HubDeConfiguracoes />);
}
