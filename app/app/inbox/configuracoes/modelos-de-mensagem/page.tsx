import { TelaModelosDeMensagem } from "@/components/escale/conversas/configuracoes/modelos/TelaModelosDeMensagem";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function ModelosDeMensagemPage() {
  return paginaDaConfiguracao(<TelaModelosDeMensagem />);
}
