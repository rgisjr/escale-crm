import { redirect } from "next/navigation";

import type { OrigemParaCriar } from "@/components/escale/contatos/CamposDaOportunidade";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { lerCatalogosSemeando } from "@/lib/escale/campos/banco";
import { CATALOGO_VAZIO, catalogoVisivel } from "@/lib/escale/campos/regras";
import { logger } from "@/lib/logger";
import { createAdminClient } from "@/lib/supabase/admin";
import type { Role } from "@/lib/auth/types";
import { createClient } from "@/lib/supabase/server";

import { camposDaEmpresaDoFiltro, camposDoContatoDoFiltro } from "./filtros";
import { opcoesDoFiltroDasOrigens, type OpcoesDoFiltro } from "./opcoes-do-filtro";

type EtapaLida = {
  id: string;
  name: string;
  position: number | string;
  is_archived: boolean;
  is_won: boolean;
  is_lost: boolean;
};
type OrigemLida = {
  id: string;
  name: string;
  settings: Record<string, unknown> | null;
  crm_stages: EtapaLida[] | null;
};

/**
 * As origens e etapas que as janelas de criar oferecem (fork Escale, Fase 2A,
 * N13): lidas com a sessão (a RLS decide), origens e etapas não arquivadas, sem
 * as etapas de ganho e perda, na ordem do quadro. `GET /api/v1/pipelines` exige
 * gerente; a lista de contatos é aberta a todo papel.
 */
export async function origensDaPagina(): Promise<{
  origens: OrigemParaCriar[];
  papel: Role;
  opcoesDoFiltro: OpcoesDoFiltro;
}> {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");
  const supabase = await createClient();
  const { data } = await supabase
    .from("crm_pipelines")
    .select(
      "id, name, position, settings, crm_stages(id, name, position, is_archived, is_won, is_lost)",
    )
    .eq("organization_id", activeOrg.orgId)
    .eq("is_archived", false)
    .order("position", { ascending: true });
  const lidas = (data ?? []) as unknown as OrigemLida[];
  const origens = lidas.map((p) => ({
    id: p.id,
    nome: p.name,
    etapas: [...(p.crm_stages ?? [])]
      .filter((s) => !s.is_archived && !s.is_won && !s.is_lost)
      .sort((a, b) => Number(a.position) - Number(b.position))
      .map((s) => ({ id: s.id, nome: s.name })),
  }));
  // FORK ESCALE · Fase 2C: os campos do catálogo do contato que o papel de quem olha enxerga.
  let catalogo = CATALOGO_VAZIO;
  let catalogoDaEmpresa = CATALOGO_VAZIO;
  try {
    const [doContato, daEmpresa] = await lerCatalogosSemeando(supabase, createAdminClient(), activeOrg.orgId, ["contato", "empresa"]);
    catalogo = catalogoVisivel(doContato!, activeOrg.role as Role);
    catalogoDaEmpresa = catalogoVisivel(daEmpresa!, activeOrg.role as Role);
  } catch (err) {
    logger.error("contatos.origens-da-pagina.catalogo", { err });
  }
  // FORK ESCALE · Fase 2B: o painel de filtros oferece todas as etapas (ganho e perda também).
  return {
    origens,
    papel: activeOrg.role as Role,
    opcoesDoFiltro: {
      ...opcoesDoFiltroDasOrigens(lidas),
      camposDoContato: camposDoContatoDoFiltro(catalogo),
      camposDaEmpresa: camposDaEmpresaDoFiltro(catalogoDaEmpresa),
    },
  };
}
