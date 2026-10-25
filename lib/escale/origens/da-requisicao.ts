import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

import { lerOrigens } from "./ler-origens";

/**
 * As origens da organização lidas UMA vez por requisição: o layout (`ComOrigens`)
 * e a página de uma visualização pedem as mesmas, e o `cache` do React junta os
 * pedidos. A chave é só o `orgId` (um cliente novo por chamada quebraria a chave).
 * Só para Server Components; rotas e mutações seguem com `lerOrigens`.
 */
export const origensDaRequisicao = cache(async (orgId: string) => lerOrigens(await createClient(), orgId));
