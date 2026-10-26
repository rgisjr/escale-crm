import type { ActionCtx } from "@/lib/automation/types";
import { carregarFontes } from "@/lib/variaveis/fontes";
import { tokensUsados, type FontesDasVariaveis } from "@/lib/variaveis/resolver";

const idDe = (v: unknown): string | null => {
  if (!v || typeof v !== "object") return null;
  const id = (v as { id?: unknown }).id;
  return typeof id === "string" ? id : null;
};

/**
 * As fontes dos tokens da Clint (`[CONTACT.FIRST_NAME]`) para um envio de
 * automação (Frente V). Texto sem token novo não consulta nada (`null`), e o
 * `renderTemplate` segue igual a antes. O "Usuário" é o responsável pelo
 * negócio (D3).
 */
export async function fontesDaAutomacao(
  ctx: Pick<ActionCtx, "admin" | "organizationId" | "context">,
  textos: readonly string[],
): Promise<FontesDasVariaveis | null> {
  const tokens = [...new Set(textos.flatMap(tokensUsados))];
  if (tokens.length === 0) return null;
  const lead = ctx.context.lead as { owner_user_id?: unknown } | undefined;
  return carregarFontes(ctx.admin, ctx.admin, ctx.organizationId, {
    contactId: idDe(ctx.context.contact),
    leadId: idDe(lead),
    usuarioId: typeof lead?.owner_user_id === "string" ? lead.owner_user_id : null,
  }, tokens);
}
