/** POST /api/v1/acoes-em-massa/[id]/recusar — o admin recusa o pedido de exportação (fork Escale, Fase 2B; Q4). */
import { type NextRequest } from "next/server";

import { requireSupportWrite } from "@/lib/impersonate/support";
import { decidirExportacao } from "@/lib/escale/massa/decisao-da-exportacao";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  const denied = await requireSupportWrite();
  if (denied) return denied;
  return decidirExportacao(ctx, false);
}
