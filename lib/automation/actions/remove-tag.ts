/**
 * Ação `remove_tag` — o espelho de `add_tag`: tira tags do LEAD do contexto (ou do CONTATO, se o
 * contexto não tiver lead). Lê as tags GRAVADAS no banco (o contexto é uma foto que pode estar velha:
 * regravá-la desfaria o que outra regra do mesmo evento acabou de gravar) e grava de volta só o que sobrou.
 * Idempotente: tag que o alvo não tem não escreve nada. Não emite evento.
 */
import { registerAction } from "@/lib/automation/actions";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";

const chave = (tag: string): string => tag.trim().toLocaleLowerCase("pt-BR");

async function execute(ctx: ActionCtx, config: Record<string, unknown>): Promise<ActionResultDetail> {
  const tags = Array.isArray(config.tags) ? config.tags.map(String).filter((t) => t.trim() !== "") : [];
  if (!tags.length) return { type: "remove_tag", status: "skipped", detail: { reason: "no_tags" } };

  const lead = ctx.context.lead as { id: string } | undefined;
  const contact = ctx.context.contact as { id: string } | undefined;
  const alvo = lead
    ? { tabela: "crm_leads" as const, id: lead.id }
    : contact
      ? { tabela: "contacts" as const, id: contact.id }
      : null;
  if (!alvo) return { type: "remove_tag", status: "skipped", detail: { reason: "missing_input" } };

  const { data, error } = await ctx.admin
    .from(alvo.tabela)
    .select("tags")
    .eq("id", alvo.id)
    .eq("organization_id", ctx.organizationId)
    .maybeSingle();
  if (error) return { type: "remove_tag", status: "failed", error: error.message };
  if (!data) return { type: "remove_tag", status: "skipped", detail: { reason: "no_target" } };

  const atuais = (data as { tags?: string[] | null }).tags ?? [];
  const sair = new Set(tags.map(chave));
  const restantes = atuais.filter((t) => !sair.has(chave(t)));
  const removed = atuais.filter((t) => sair.has(chave(t)));
  if (!removed.length) return { type: "remove_tag", status: "success", detail: { removed: [] } };

  const { error: erroDeEscrita } = await ctx.admin
    .from(alvo.tabela)
    .update({ tags: restantes, updated_at: new Date().toISOString() })
    .eq("id", alvo.id)
    .eq("organization_id", ctx.organizationId);
  if (erroDeEscrita) return { type: "remove_tag", status: "failed", error: erroDeEscrita.message };
  return { type: "remove_tag", status: "success", detail: { removed } };
}

registerAction({ type: "remove_tag", execute });
