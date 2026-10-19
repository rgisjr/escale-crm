import { TelaUsuarios } from "@/components/escale/conversas/configuracoes/usuarios/TelaUsuarios";

import { paginaDaConfiguracao } from "../_casca";

export const dynamic = "force-dynamic";

export default async function UsuariosPage() {
  return paginaDaConfiguracao(<TelaUsuarios />);
}
