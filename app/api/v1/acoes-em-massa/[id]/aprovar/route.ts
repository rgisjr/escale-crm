/** POST /api/v1/acoes-em-massa/[id]/aprovar — o admin aprova o pedido de exportação (fork Escale, Fase 2B; Q4). */
import { type NextRequest } from "next/server";

import { decidirExportacao } from "@/lib/escale/massa/decisao-da-exportacao";

export const dynamic = "force-dynamic";

export async function POST(
  _req: NextRequest,
  ctx: { params: Promise<{ id: string }> },
): Promise<Response> {
  return decidirExportacao(ctx, true);
}
