import { randomUUID } from "node:crypto";

import type { NextRequest } from "next/server";
import { z } from "zod";

import { fail, ok } from "@/lib/api/wrappers";
import { requireRole } from "@/lib/auth/require-role";
import { publicoSchema } from "@/lib/escale/campanhas/assistente";
import {
  PublicoInvalido,
  compilarPublico,
  paginaDoPublico,
} from "@/lib/escale/campanhas/publico-banco";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";
import { POR_PAGINA } from "@/lib/escale/contatos/regras";
import { traduzir } from "@/lib/i18n/dicionario";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const corpoSchema = z.object({
  publico: publicoSchema,
  pagina: z.number().int().min(1).max(1_000_000).default(1),
  porPagina: z
    .number()
    .int()
    .refine((n) => (POR_PAGINA as readonly number[]).includes(n))
    .default(10),
});

/**
 * POST /api/v1/campanhas-da-casca/publico — a página dos destinatários do
 * passo 2 (fork Escale, Fase 8B; N7). POST porque o público (ids e filtro) não
 * cabe na URL. Só lê: sessão do usuário, gerente; a função confere o papel de novo.
 */
export async function POST(req: NextRequest): Promise<Response> {
  const requestId = randomUUID();
  const authz = await requireRole("manager", { requestId, resource: "campaigns" });
  if (!authz.ok) return authz.response;
  const t = (texto: string) => traduzir(texto, authz.user.idioma);
  const lido = corpoSchema.safeParse(await req.json().catch(() => null));
  if (!lido.success) return fail("validation_failed", t("Dados inválidos."), 422, { requestId });
  try {
    const supabase = await createClient();
    const compilado = compilarPublico(
      lido.data.publico,
      await fusoDaOrganizacao(supabase, authz.org.orgId),
    );
    const r = await paginaDoPublico(
      supabase,
      authz.org.orgId,
      compilado,
      lido.data.pagina,
      lido.data.porPagina,
    );
    return ok(r, { requestId });
  } catch (err) {
    if (err instanceof PublicoInvalido)
      return fail("validation_failed", t("Filtro inválido."), 422, { requestId });
    return fail("internal_error", (err as Error).message, 500, { requestId });
  }
}
