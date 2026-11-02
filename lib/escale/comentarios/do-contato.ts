import type { SupabaseClient } from "@supabase/supabase-js";

import type { PlataformaDeComentario } from "./constantes";
import {
  COMENTARIOS_RECENTES_NA_FICHA,
  linkDaPublicacao,
  miniaturaSegura,
  type ComentarioDoContato,
  type ComentariosDoContato,
} from "./origem";

/**
 * FORK ESCALE · Fase 10C: de que comentário o contato veio. Lido com a sessão de quem olha (a RLS
 * da 9801 deixa a organização ler). A origem é o disparo mais antigo; os recentes são os 10 últimos.
 */
const TABELA = "escale_disparos_de_comentario";
const COLUNAS =
  "id, rule_id, plataforma, texto, comentado_em, repetido, publicacao_id, publicacao_legenda, publicacao_miniatura, publicacao_link, created_at";

type LinhaDoDisparo = {
  id: string;
  rule_id: string;
  plataforma: PlataformaDeComentario;
  texto: string;
  comentado_em: string;
  repetido: boolean;
  publicacao_id: string;
  publicacao_legenda: string | null;
  publicacao_miniatura: string | null;
  publicacao_link: string | null;
};

function paraComentario(l: LinhaDoDisparo, nomes: ReadonlyMap<string, string>): ComentarioDoContato {
  return {
    id: l.id,
    plataforma: l.plataforma,
    texto: l.texto,
    comentadoEm: l.comentado_em,
    repetido: l.repetido,
    publicacao: {
      id: l.publicacao_id,
      legenda: l.publicacao_legenda,
      miniatura: miniaturaSegura(l.publicacao_miniatura),
      link: linkDaPublicacao(l.publicacao_link),
    },
    automacao: { id: l.rule_id, nome: nomes.get(l.rule_id) ?? "" },
  };
}

export async function comentariosDoContato(
  sb: SupabaseClient,
  orgId: string,
  contatoId: string,
): Promise<ComentariosDoContato | null> {
  const { data: contato, error: erroDoContato } = await sb
    .from("contacts")
    .select("id")
    .eq("organization_id", orgId)
    .eq("id", contatoId)
    .maybeSingle();
  if (erroDoContato) throw erroDoContato;
  if (!contato) return null;

  const [primeiro, ultimos] = await Promise.all([
    sb
      .from(TABELA)
      .select(COLUNAS)
      .eq("organization_id", orgId)
      .eq("contact_id", contatoId)
      .order("created_at", { ascending: true })
      .limit(1),
    sb
      .from(TABELA)
      .select(COLUNAS, { count: "exact" })
      .eq("organization_id", orgId)
      .eq("contact_id", contatoId)
      .order("created_at", { ascending: false })
      .limit(COMENTARIOS_RECENTES_NA_FICHA),
  ]);
  if (primeiro.error) throw primeiro.error;
  if (ultimos.error) throw ultimos.error;

  const antigo = ((primeiro.data ?? []) as LinhaDoDisparo[])[0];
  const recentes = (ultimos.data ?? []) as LinhaDoDisparo[];
  if (!antigo) return { origem: null, recentes: [], total: 0 };

  const regras = [...new Set([antigo, ...recentes].map((l) => l.rule_id))];
  const { data: nomesDasRegras, error: erroDasRegras } = await sb
    .from("automation_rules")
    .select("id, name")
    .eq("organization_id", orgId)
    .in("id", regras);
  if (erroDasRegras) throw erroDasRegras;
  const nomes = new Map(((nomesDasRegras ?? []) as Array<{ id: string; name: string }>).map((r) => [r.id, r.name]));

  return {
    origem: paraComentario(antigo, nomes),
    recentes: recentes.map((l) => paraComentario(l, nomes)),
    total: ultimos.count ?? recentes.length,
  };
}
