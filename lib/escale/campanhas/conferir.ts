import type { SupabaseClient } from "@supabase/supabase-js";

import type { Recusa } from "@/lib/campanhas/acoes";
import { listSelectableChannels } from "@/lib/channels/selectable";

import type { Assistente } from "./assistente";
import { variaveisDoCorpo } from "./modelo";

const recusa = (codigo: Recusa["codigo"], mensagem: string, status: number): Recusa => ({
  ok: false,
  codigo,
  mensagem,
  status,
});

/**
 * O ASSISTENTE CONTRA A ORGANIZAÇÃO (fork Escale, Fase 8B; N4, N5, N11). O
 * schema já validou a forma; aqui, o que só o banco sabe: o número é desta
 * organização e aceita esta mensagem, o modelo está aprovado, a etapa é da
 * origem, o atendente e o agente são daqui. Devolve a primeira recusa.
 */
export async function conferirAssistente(
  admin: SupabaseClient,
  org: string,
  a: Assistente,
): Promise<Recusa | null> {
  const canais = await listSelectableChannels(admin, org);
  const principal = canais.find((c) => c.id === a.numeroId);
  if (!principal)
    return recusa(
      "campanha_canal_indisponivel",
      "Escolha uma conexão de WhatsApp desta organização.",
      409,
    );
  const oficial = !principal.aceitaMensagemLivre;

  if (oficial && a.mensagem.tipo !== "modelo") {
    return recusa(
      "campanha_conteudo_invalido",
      "Este número só envia modelo aprovado pela Meta. Escolha um modelo.",
      422,
    );
  }
  if (!oficial && a.mensagem.tipo === "modelo") {
    return recusa(
      "campanha_conteudo_invalido",
      "Este número envia texto livre. Escreva a mensagem.",
      422,
    );
  }
  if (a.mensagem.tipo === "modelo") {
    const m = a.mensagem;
    const { data, error } = await admin
      .from("meta_templates")
      .select("status")
      .eq("organization_id", org)
      .eq("name", m.nome)
      .eq("language", m.idioma);
    if (error) throw new Error(`conferir: modelo — ${error.message}`);
    const aprovado = ((data ?? []) as Array<{ status: string | null }>).some(
      (l) => (l.status ?? "").toUpperCase() === "APPROVED",
    );
    if (!aprovado)
      return recusa(
        "campanha_conteudo_invalido",
        "O modelo escolhido não está aprovado pela Meta.",
        422,
      );
    if (variaveisDoCorpo(m.corpo).some((chave) => !m.variaveis[chave])) {
      return recusa(
        "campanha_conteudo_invalido",
        "Resolva as variáveis do modelo para avançar.",
        422,
      );
    }
  }

  if (a.numerosExtras.length > 0) {
    if (oficial)
      return recusa(
        "campanha_canal_indisponivel",
        "Números extras só com número não oficial.",
        422,
      );
    const livres = new Set(canais.filter((c) => c.aceitaMensagemLivre).map((c) => c.id));
    if (a.numerosExtras.some((id) => !livres.has(id))) {
      return recusa(
        "campanha_canal_indisponivel",
        "Um dos números escolhidos não é uma conexão desta organização.",
        409,
      );
    }
  }

  const p = a.posEnvio;
  if (p.origemId && p.etapaId) {
    const { data } = await admin
      .from("crm_stages")
      .select("pipeline_id, is_archived")
      .eq("organization_id", org)
      .eq("id", p.etapaId)
      .maybeSingle();
    const etapa = data as { pipeline_id: string; is_archived: boolean } | null;
    if (!etapa || etapa.pipeline_id !== p.origemId || etapa.is_archived) {
      return recusa("campanha_estado_invalido", "Escolha a origem e a etapa.", 422);
    }
  }
  if (p.atendenteId) {
    const { data } = await admin
      .from("user_organizations")
      .select("role")
      .eq("organization_id", org)
      .eq("user_id", p.atendenteId)
      .maybeSingle();
    const papel = (data as { role: string } | null)?.role;
    if (!papel || !["agent", "manager", "admin"].includes(papel)) {
      return recusa("campanha_estado_invalido", "Escolha um atendente desta organização.", 422);
    }
  }
  if (a.agenteId) {
    const { data } = await admin
      .from("ai_agents")
      .select("id")
      .eq("organization_id", org)
      .eq("id", a.agenteId)
      .maybeSingle();
    if (!data)
      return recusa("campanha_estado_invalido", "Escolha um agente desta organização.", 422);
  }
  return null;
}
