import type { SupabaseClient } from "@supabase/supabase-js";

import { logger } from "@/lib/logger";

import { configDoComentarioSchema, type ConfigDoComentario } from "./schema";
import { publicacoesDaConta } from "./zernio";

/**
 * FORK ESCALE · Fase 10D (D11): "Próxima publicação". O Zernio não avisa publicação nova em tempo
 * real, então a regra se resolve sob demanda: no primeiro comentário numa publicação que não estava
 * listada ao armar, lê as publicações da conta e vê se aquela é a mais antiga depois de `armada_em`.
 */
export interface EntradaDaProxima {
  organizationId: string;
  regraId: string;
  /** O `updated_at` lido junto do `trigger_config`: a gravação só vale se ninguém mexeu na regra. */
  atualizadoEm: string;
  triggerConfig: ConfigDoComentario;
  chave: string;
  contaId: string;
  publicacaoDoComentario: string;
}

/** Devolve o `trigger_config` com a próxima resolvida (ou o que outro comentário já resolveu), ou null. Nunca lança. */
export async function resolverProximaPublicacao(
  admin: SupabaseClient,
  e: EntradaDaProxima,
): Promise<ConfigDoComentario | null> {
  try {
    const { proxima } = e.triggerConfig;
    if (!proxima || proxima.resolvida !== null) return null;
    if (proxima.conhecidas.includes(e.publicacaoDoComentario)) return null;

    const armadaEm = Date.parse(proxima.armada_em);
    if (Number.isNaN(armadaEm)) return null;
    const lidas = await publicacoesDaConta(e.chave, e.contaId);
    if (!lidas.ok) {
      logger.warn("[comentarios.proxima] leitura das publicações falhou", { status: lidas.status });
      return null;
    }
    const candidata = lidas.dados
      .flatMap((p) => {
        const quando = p.criadaEm ? Date.parse(p.criadaEm) : Number.NaN;
        return Number.isNaN(quando) || quando < armadaEm ? [] : [{ p, quando }];
      })
      .sort((a, b) => a.quando - b.quando)[0];
    if (!candidata || candidata.p.id !== e.publicacaoDoComentario) return null;

    const novo: ConfigDoComentario = {
      ...e.triggerConfig,
      proxima: {
        ...proxima,
        resolvida: {
          id: candidata.p.id,
          legenda: candidata.p.legenda?.slice(0, 300) ?? null,
          miniatura: candidata.p.miniatura,
          tipo: candidata.p.tipo,
          publicada_em: candidata.p.criadaEm,
        },
      },
    };
    const { data, error } = await admin
      .from("automation_rules")
      .update({ trigger_config: novo })
      .eq("id", e.regraId)
      .eq("organization_id", e.organizationId)
      .eq("updated_at", e.atualizadoEm)
      .select("id");
    if (error) throw new Error(error.message);
    if (data && data.length > 0) return novo;

    // Outro comentário (ou a tela) mexeu na regra antes: devolve o que está lá agora.
    const { data: atual } = await admin
      .from("automation_rules")
      .select("trigger_config")
      .eq("id", e.regraId)
      .eq("organization_id", e.organizationId)
      .maybeSingle();
    const lida = configDoComentarioSchema.safeParse((atual as { trigger_config?: unknown } | null)?.trigger_config);
    return lida.success ? lida.data : null;
  } catch (erro) {
    logger.error("[comentarios.proxima] resolver falhou", { erro: erro instanceof Error ? erro.message : String(erro) });
    return null;
  }
}
