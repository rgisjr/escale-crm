/**
 * Cria um funil COM as etapas com que ele nasce. Chamado pela rota REST
 * (`POST /api/v1/pipelines`) e pela ferramenta MCP `crm_create_pipeline`.
 *
 * Duas escritas sem transação (funil e etapas), então há compensação: um funil sem
 * etapa é quadro morto, e o recém-criado ainda não tem negócio para impedir o
 * desfazimento. A validação do nome vem ANTES de tocar o banco.
 */
import type { SupabaseClient } from "@supabase/supabase-js";

import { falhaDeEscrita, type ResultadoDeEscrita } from "@/lib/api/resultado-de-escrita";
import { audit } from "@/lib/audit";
import { slugDeNome } from "@/lib/leads/stage-editing";
import {
  ETAPAS_INICIAIS,
  posicaoEntre,
  slugDeFunil,
  validarNomeDeFunil,
  type FunilEditavel,
} from "@/lib/pipelines/pipeline-editing";

export interface EtapaDoFunil {
  name: string;
  is_won?: boolean;
  is_lost?: boolean;
}

export interface FunilCriado {
  id: string;
  slug: string;
  isDefault: boolean;
}

const COLUNAS_DO_FUNIL = "id, name, slug, description, position, is_default, is_client_pipeline, is_archived";

/** Etapas do funil já com a régua de posição do board e slugs únicos dentro do funil. */
function etapasParaGravar(organizationId: string, pipelineId: string, etapas: readonly EtapaDoFunil[] | undefined) {
  if (etapas === undefined || etapas.length === 0) {
    return ETAPAS_INICIAIS.map((etapa, i) => ({
      organization_id: organizationId,
      pipeline_id: pipelineId,
      name: etapa.name,
      slug: etapa.slug,
      position: (i + 1) * 1000,
      is_won: etapa.is_won,
      is_lost: etapa.is_lost,
    }));
  }
  const slugs: string[] = [];
  return etapas.map((etapa, i) => {
    const slug = slugDeNome(etapa.name, slugs, "etapa");
    slugs.push(slug);
    return {
      organization_id: organizationId,
      pipeline_id: pipelineId,
      name: etapa.name,
      slug,
      position: (i + 1) * 1000,
      is_won: etapa.is_won === true,
      is_lost: etapa.is_lost === true,
    };
  });
}

export async function criarFunil(
  db: SupabaseClient,
  entrada: {
    organizationId: string;
    nome: string;
    descricao?: string | null;
    etapas?: readonly EtapaDoFunil[];
    actorUserId: string | null;
    requestId: string;
  },
): Promise<ResultadoDeEscrita<FunilCriado>> {
  const { organizationId } = entrada;
  const nome = entrada.nome.trim();

  const { data: existentes, error: erroDeLeitura } = await db
    .from("crm_pipelines")
    .select(COLUNAS_DO_FUNIL)
    .eq("organization_id", organizationId)
    .order("position", { ascending: true });
  if (erroDeLeitura) return falhaDeEscrita("internal_error", erroDeLeitura.message, 500);
  const funis = (existentes ?? []) as unknown as FunilEditavel[];

  // VALIDAR ANTES DE TOCAR O BANCO: um 23505 cru não diz QUAL funil já tem esse nome.
  const veredito = validarNomeDeFunil(nome, funis, null);
  if (!veredito.ok) return falhaDeEscrita("unprocessable_entity", veredito.erro, 422);

  const linha = {
    organization_id: organizationId,
    name: nome,
    description: entrada.descricao?.trim() || null,
    // Arquivados entram na conta do slug: `uniq_crm_pipelines_org_slug` não é parcial.
    slug: slugDeFunil(nome, funis.map((f) => f.slug)),
    position: posicaoEntre(funis[funis.length - 1]?.position ?? null, null),
    // O primeiro funil da organização nasce padrão: sem padrão, lead sem funil escolhido não tem para onde ir.
    is_default: funis.filter((f) => !f.is_archived).length === 0,
  };

  const { data: criado, error } = await db.from("crm_pipelines").insert(linha).select("id").single();
  if (error) {
    if ((error as { code?: string }).code === "23505") {
      return falhaDeEscrita(
        "state_conflict",
        `«${nome}» mudou enquanto você editava — outro funil já ocupa esse nome ou o lugar de padrão. Recarregue a página e tente de novo.`,
        409,
      );
    }
    return falhaDeEscrita("internal_error", error.message, 500);
  }
  const pipelineId = (criado as { id: string }).id;

  const { error: erroDasEtapas } = await db
    .from("crm_stages")
    .insert(etapasParaGravar(organizationId, pipelineId, entrada.etapas));
  if (erroDasEtapas) {
    await db.from("crm_pipelines").delete().eq("id", pipelineId).eq("organization_id", organizationId);
    return falhaDeEscrita(
      "internal_error",
      `Não consegui criar as etapas de «${nome}». Nada foi salvo — tente de novo.`,
      500,
      { erro: erroDasEtapas.message },
    );
  }

  void audit({
    action: "pipeline.created",
    actorUserId: entrada.actorUserId,
    organizationId,
    resourceType: "crm_pipeline",
    resourceId: pipelineId,
    requestId: entrada.requestId,
    metadata: { name: nome, slug: linha.slug, is_default: linha.is_default },
  });
  return { ok: true, dado: { id: pipelineId, slug: linha.slug, isDefault: linha.is_default } };
}
