import type { SupabaseClient } from "@supabase/supabase-js";

import { candidatosPorIds } from "@/lib/campanhas/consulta-de-audiencia";
import type { CandidatoDaAudiencia } from "@/lib/campanhas/elegibilidade";
import { fusoDaOrganizacao } from "@/lib/escale/contatos/lista";

import { publicoSchema, type MensagemDeModelo } from "./assistente";
import { modeloDaCampanha, tokensDoModelo } from "./modelo";
import { compilarPublico, idsDoPublico } from "./publico-banco";

/**
 * O PÚBLICO DA CASCA NA PREPARAÇÃO (fork Escale, Fase 8B; N7). `null` quando a
 * campanha é do formulário do original (sem `escale_publico`): aí o filtro
 * antigo segue como sempre. Sem teto: todos os ids do banco, em páginas.
 */
export async function candidatosDaCasca(
  admin: SupabaseClient,
  c: {
    organization_id: string;
    escale_publico?: unknown;
    escale_mensagem?: unknown;
    message_body: string | null;
  },
): Promise<{ candidatos: CandidatoDaAudiencia[]; modelo: MensagemDeModelo | null } | null> {
  if (c.escale_publico == null) return null;
  const publico = publicoSchema.safeParse(c.escale_publico);
  if (!publico.success)
    throw new Error(
      "O público desta campanha não pôde ser lido. Escolha os destinatários de novo.",
    );
  const fuso = await fusoDaOrganizacao(admin, c.organization_id);
  const ids = await idsDoPublico(admin, c.organization_id, compilarPublico(publico.data, fuso));
  const modelo = modeloDaCampanha(c.escale_mensagem);
  const corpo = modelo ? tokensDoModelo(modelo) : (c.message_body ?? "");
  return {
    candidatos: await candidatosPorIds(admin, { organizationId: c.organization_id, ids, corpo }),
    modelo,
  };
}
