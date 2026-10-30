/**
 * Designer de automações — a mesma automação da aba Webhooks › Automações,
 * montada como caixas ligadas, no formato do construtor de follow-up.
 *
 * Fase 1: convive com o editor em lista (a gaveta do `RuleEditor`). Os dois
 * gravam o MESMO corpo pela MESMA rota (`/api/v1/automation-rules`); o desenho
 * em si não é gravado (ver `lib/automation/desenho-da-regra.ts`).
 *
 * Porta: o botão "Montar no designer" e o atalho de cada cartão na aba
 * Automações. `[id]` é tela de detalhe, alcançada pela lista, como a do
 * follow-up — por isso não entra no menu.
 */
import { notFound, redirect } from "next/navigation";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { NOME_MAXIMO } from "@/lib/escale/automacoes/regras"; // FORK ESCALE · Fase 5A

import { DesignerDeAutomacao } from "./_components/DesignerDeAutomacao";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default async function DesignerDeAutomacaoPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  // FORK ESCALE · Fase 5A: o nome e a pasta que o modal "Criar nova automação" manda para o fluxo novo.
  searchParams: Promise<{ nome?: string | string[]; pasta?: string | string[] }>;
}) {
  const { id } = await params;
  // A mesma régua da tela Webhooks: só gerente ou administrador monta automação.
  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  const canManage = !!activeOrg && ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager;
  if (!canManage) redirect("/app/inbox");
  if (id !== "nova" && !UUID.test(id)) notFound();

  // FORK ESCALE · Fase 5A
  const { nome, pasta } = await searchParams;
  const nomeInicial = id === "nova" && typeof nome === "string" ? nome.slice(0, NOME_MAXIMO) : undefined;
  const pastaInicial = id === "nova" && typeof pasta === "string" && UUID.test(pasta) ? pasta : null;

  return (
    <div className="flex h-full flex-col">
      <DesignerDeAutomacao id={id} nomeInicial={nomeInicial} pastaInicial={pastaInicial} />
    </div>
  );
}
