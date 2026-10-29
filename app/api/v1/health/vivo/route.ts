/**
 * GET /api/v1/health/vivo — o processo do app responde?
 *
 * É a sonda do healthcheck do contêiner (`docker/app/vigia.cjs`). Não consulta
 * banco, fila nem WhatsApp, de propósito: ela mede só se o laço de eventos do
 * Next atende. Dependência lenta não é motivo para reiniciar o app — isso é o
 * `/api/v1/health` que diz.
 */
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export function GET(): NextResponse {
  return NextResponse.json({ status: "ok" }, { headers: { "cache-control": "no-store" } });
}
