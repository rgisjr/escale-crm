import { notFound } from "next/navigation";

import { TelaDoCanal } from "@/components/escale/conversas/configuracoes/canais/TelaDoCanal";
import { canalDoSlug } from "@/lib/escale/conversas/canais";

import { paginaDaConfiguracao } from "../../_casca";

export const dynamic = "force-dynamic";

export default async function CanalPage({ params }: { params: Promise<{ canal: string }> }) {
  const canal = canalDoSlug((await params).canal);
  if (!canal) notFound();
  return paginaDaConfiguracao(<TelaDoCanal canal={canal} />);
}
