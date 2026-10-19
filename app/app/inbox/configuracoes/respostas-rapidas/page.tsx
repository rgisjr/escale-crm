import { TelaRespostasRapidas } from "@/components/escale/conversas/configuracoes/respostas/TelaRespostasRapidas";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function RespostasRapidasPage() {
  return paginaDaConfiguracao(<TelaRespostasRapidas />);
}
