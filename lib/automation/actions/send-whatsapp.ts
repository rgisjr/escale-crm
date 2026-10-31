import { assertAgendaEffectSupabase } from "@/lib/agenda/efeito";
import { protecaoAgendaSupabase } from "@/lib/agenda/protecao-followup";
import { registerAction } from "@/lib/automation/actions";
import { resolverCanalDaAcao } from "@/lib/automation/canal-da-acao";
import type { ActionCtx, ActionResultDetail } from "@/lib/automation/types";
import { renderTemplate } from "@/lib/automation/template";
import { fontesDaAutomacao } from "@/lib/automation/fontes-da-automacao";
import { serviceForAutomation } from "@/lib/atendimento/origem-automacao";
import { checkDailyLimit, espacarEnvio } from "@/lib/automation/throttle";
import { adiarAteAJanelaAbrir } from "@/lib/automation/janela-do-canal";
import { adiarAteHorarioComercial } from "@/lib/canais/horario-comercial";
import { sendMessageHandler } from "@/app/api/v1/messages/_handler";
import { reportarEnvio, type MensagemEnviada } from "@/lib/automation/desfecho-do-envio";
import { checarGuardasDeContato } from "@/lib/automation/guarda-do-contato";
import { enviarPassos, passosSchema, type PassoDeEnvio } from "@/lib/automation/envio-de-passos";
import { enviadorPeloHandler } from "@/lib/automation/passos-pelo-handler";
import { lerAtivosDoCanal } from "@/lib/canais/ativos-do-canal";

/** Os textos da sequência (texto e legenda), para a leitura das fontes de variáveis. */
function textosDosPassos(passos: readonly PassoDeEnvio[]): string[] {
  return passos.flatMap((p) => {
    if (p.tipo === "texto") return [p.texto];
    if (p.tipo === "midia") return p.legenda ? [p.legenda] : [];
    const itens = p.interativo.tipo === "botoes" ? p.interativo.botoes : p.interativo.linhas;
    return [p.interativo.corpo, ...itens.map((i) => i.titulo)];
  });
}

async function postponeUntil(ctx: ActionCtx, config: Record<string, unknown>): Promise<string | null> {
  const contato = checarGuardasDeContato(ctx);
  if (contato.ok) {
    const protection = (await protecaoAgendaSupabase(ctx.admin, ctx.organizationId, [contato.contact.id])).get(contato.contact.id)!;
    if (protection.motivo === "leitura_indisponivel") throw new Error("agenda_read_failed");
    if (protection.adiar) return protection.reavaliar_em;
  }
  const sessionId = await resolverCanalDaAcao(ctx, config.channel_session_id);
  if (!sessionId) return null; // config inválida falha no execute, não adia

  // A janela vem dos knobs DO NÚMERO (fuso do tenant, domingo configurável) —
  // a mesma régua da tela de Conexões e do agente. Ver janela-do-canal.ts.
  const foraDaJanela = await adiarAteAJanelaAbrir(ctx.admin, ctx.organizationId, sessionId);
  // O horário comercial por dia da semana é a terceira régua: o envio só sai quando as DUAS estão abertas,
  // então segura até a mais tardia das duas aberturas.
  const foraDoHorario = await adiarAteHorarioComercial(ctx.admin, ctx.organizationId, sessionId);
  const aberturas = [foraDaJanela, foraDoHorario].filter((a): a is string => a !== null);
  if (aberturas.length > 0) return aberturas.reduce((a, b) => (new Date(a) >= new Date(b) ? a : b));

  const daily = await checkDailyLimit(ctx.admin, ctx.organizationId, sessionId);
  return daily.allowed ? null : (daily.retry_at ?? null);
}

async function execute(ctx: ActionCtx, config: Record<string, unknown>): Promise<ActionResultDetail> {
  const sessionId = await resolverCanalDaAcao(ctx, config.channel_session_id);
  const template = typeof config.template === "string" ? config.template : null;
  const passos = Array.isArray(config.passos) ? passosSchema.safeParse(config.passos) : null;
  if (passos && !passos.success) return { type: "send_whatsapp_message", status: "failed", error: "passos_invalidos" };
  if (!sessionId || (!template && !passos)) {
    return { type: "send_whatsapp_message", status: "failed", error: "missing_config" };
  }
  // Guardas compartilhadas com send_ai_message — ver guarda-do-contato.ts
  // (existe/bloqueado/telefone/consentimento, este último um gate FIXO).
  const guarda = checarGuardasDeContato(ctx);
  if (!guarda.ok) return { type: "send_whatsapp_message", status: "skipped", detail: { reason: guarda.reason } };
  const contact = guarda.contact;

  // O espaçamento é COMPARTILHADO com a ação de IA (mesmo número, mesmo
  // contador) — ver lib/automation/throttle.ts.
  try {
    await assertAgendaEffectSupabase(ctx.admin, { organizationId: ctx.organizationId, contactId: contact.id });
    // Antes de abrir o atendimento: uma falha ao ler os dados das variáveis não
    // pode deixar uma conversa aberta sem mensagem (Frente V).
    const fontes = await fontesDaAutomacao(ctx, passos?.success ? textosDosPassos(passos.data) : [template ?? ""]);
    const boundary = await serviceForAutomation(ctx, contact.id, sessionId);
    const conversationId = boundary.conversation_id;
    const contextoDoEnvio = {
      organization_id: ctx.organizationId,
      serviceBoundary: boundary,
      proactiveContext: { organizationId: ctx.organizationId, contactId: contact.id },
      actor: { type: "webhook_source" as const, id: ctx.ruleId },
      requestId: `rule:${ctx.ruleId}`,
    };
    if (passos?.success) {
      const resultado = await enviarPassos(passos.data, {
        enviador: enviadorPeloHandler(ctx.admin, {
          organizationId: ctx.organizationId,
          conversationId,
          contexto: contextoDoEnvio,
          espacar: () => espacarEnvio(sessionId),
        }),
        ativosDoCanal: await lerAtivosDoCanal(ctx.admin, ctx.organizationId, sessionId),
        renderizar: (t) => renderTemplate(t, ctx.context, undefined, fontes),
        chaveBase: `rule:${ctx.ruleId}:${ctx.event.id}:${ctx.actionIndex ?? 0}`,
      });
      return resultado.ok
        ? { type: "send_whatsapp_message", status: "success", detail: { passos: resultado.enviados } }
        : {
            type: "send_whatsapp_message",
            status: "failed",
            error: resultado.erro,
            detail: { enviados: resultado.enviados },
          };
    }
    await espacarEnvio(sessionId);
    const body = renderTemplate(template ?? "", ctx.context, undefined, fontes);
    const message = await sendMessageHandler(
      ctx.admin,
      contextoDoEnvio,
      { conversation_id: conversationId, type: "text", body } as Parameters<typeof sendMessageHandler>[2],
    );
    // O desfecho vem do ESTADO DA MENSAGEM, nunca da ausência de exceção:
    // `sendMessageHandler` marca `failed`/`queued` e devolve normalmente (ver
    // lib/automation/desfecho-do-envio.ts para o defeito medido).
    return await reportarEnvio(ctx, "send_whatsapp_message", message as unknown as MensagemEnviada, conversationId);
  } catch (err) {
    return {
      type: "send_whatsapp_message",
      status: "failed",
      error: err instanceof Error ? err.message : String(err),
    };
  }
}

registerAction({ type: "send_whatsapp_message", postponeUntil, execute });
