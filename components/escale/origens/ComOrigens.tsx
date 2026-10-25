import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { origensDaRequisicao } from "@/lib/escale/origens/da-requisicao";
import type { Origens } from "@/lib/escale/origens/regras";
import { COOKIE_ULTIMO_FUNIL, lerPreferenciasDoPainel, lerUuid } from "@/lib/escale/origens/preferencias";
import { chaveDosRecentes } from "@/lib/escale/recentes/regras";
import { visualizacoesDaRequisicao } from "@/lib/escale/visualizacoes/da-requisicao";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";

import { CONTEUDO_AO_LADO_DO_PAINEL, ENVOLTORIO_DO_PAINEL } from "./estilos-do-painel";
import { PainelOrigens } from "./PainelOrigens";

/** Banco sem a 9003 (ou fora do ar): o painel abre com a seção Visualizações vazia. */
async function visualizacoesOuNada(orgId: string): Promise<Visualizacao[]> {
  try {
    return await visualizacoesDaRequisicao(orgId);
  } catch (err) {
    console.error("[escale/visualizacoes] não consegui ler as visualizações; o painel abre sem elas", err);
    return [];
  }
}

/**
 * O PAINEL ORIGENS AO LADO DE NEGÓCIOS (fork Escale, Fase 1A; coluna da Clint na casca V3).
 *
 * Só com a casca nova ligada (cookie `escale_menu=topo`, Fase 0). Na lateral do
 * original a tela é exatamente a de sempre: `children` sem embrulho nenhum, e o
 * banco nem é consultado.
 *
 * O marcador de gerente é o mesmo critério das rotas (`requireRole("manager")`,
 * sem atalho de platform admin). Mostrar um botão que o servidor recusaria seria
 * prometer o que não se cumpre (ver `app/app/kanban/page.tsx`).
 *
 * Na casca, o envoltório cola o painel no topo, na esquerda e no fundo da tela
 * (01-010), e o conteúdo começa 20px depois dele (`estilos-do-painel.ts`).
 *
 * Se a leitura falhar (banco ainda sem a migration 9001, ou fora do ar), o
 * quadro abre sem o painel: Negócios nunca fica fora do ar por causa dele.
 */
export async function ComOrigens({ children }: { children: ReactNode }) {
  const store = await cookies();
  if (lerPreferenciaDeMenu(store.get(COOKIE_DO_MENU)?.value) !== "topo") return <>{children}</>;

  const user = await requireAuth();
  const activeOrg = await resolveActiveOrg(user);
  if (!activeOrg) return <>{children}</>;

  // As duas leituras são independentes: em paralelo. Origens com erro = quadro sem painel.
  let origens: Origens;
  let visualizacoes: Visualizacao[];
  try {
    [origens, visualizacoes] = await Promise.all([
      origensDaRequisicao(activeOrg.orgId),
      visualizacoesOuNada(activeOrg.orgId),
    ]);
  } catch (err) {
    console.error("[escale/origens] não consegui ler os grupos de funis; o quadro abre sem o painel", err);
    return <>{children}</>;
  }

  return (
    <div className={ENVOLTORIO_DO_PAINEL}>
      <PainelOrigens
        origens={origens}
        visualizacoes={visualizacoes}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
        // Painel/lista recolhidos e grupos ocultos vêm de cookie: o primeiro render já sai certo.
        preferencias={lerPreferenciasDoPainel((nome) => store.get(nome)?.value)}
        ultimoFunil={lerUuid(store.get(COOKIE_ULTIMO_FUNIL)?.value)}
        // Fase 1E: os Recentes moram no navegador, por organização e pessoa.
        chaveDeRecentes={chaveDosRecentes(activeOrg.orgId, user.id)}
      />
      <div className={CONTEUDO_AO_LADO_DO_PAINEL}>{children}</div>
    </div>
  );
}
