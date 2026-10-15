import { notFound, redirect } from "next/navigation";

import { QuadroDaVisualizacao } from "@/components/escale/visualizacoes/QuadroDaVisualizacao";
import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import { origensVivasDaVisualizacao } from "@/lib/escale/visualizacoes/regras";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/**
 * O QUADRO DE UMA VISUALIZAÇÃO (fork Escale, Fase 1C). Mora dentro de
 * `app/app/pipelines/` para herdar o layout com o painel Origens.
 *
 * A visualização é lida com a sessão: se a RLS não deixa a pessoa vê-la (acesso
 * "escolhidos" sem ela na lista), ela não vem, e a resposta é 404 — o mesmo de
 * um id que não existe, sem dizer qual dos dois.
 */
export default async function VisualizacaoPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) redirect("/app");

  const { id } = await params;
  const supabase = await createClient();
  const [visualizacoes, origens] = await Promise.all([
    lerVisualizacoes(supabase, activeOrg.orgId),
    lerOrigens(supabase, activeOrg.orgId),
  ]);
  const visualizacao = visualizacoes.find((v) => v.id === id);
  if (!visualizacao) notFound();

  return (
    <QuadroDaVisualizacao
      id={visualizacao.id}
      nome={visualizacao.name}
      origens={origensVivasDaVisualizacao(visualizacao, origens).map((f) => ({ id: f.id, name: f.name }))}
    />
  );
}
