import { cookies } from "next/headers";
import type { ReactNode } from "react";

import { requireAuth, resolveActiveOrg } from "@/lib/auth/server";
import { ROLE_RANK } from "@/lib/auth/types";
import { lerOrigens } from "@/lib/escale/origens/ler-origens";
import type { Origens } from "@/lib/escale/origens/regras";
import { lerPreferenciasDoPainel } from "@/lib/escale/origens/preferencias";
import { chaveDosRecentes } from "@/lib/escale/recentes/regras";
import { lerVisualizacoes } from "@/lib/escale/visualizacoes/ler-visualizacoes";
import type { Visualizacao } from "@/lib/escale/visualizacoes/regras";
import { COOKIE_DO_MENU, lerPreferenciaDeMenu } from "@/lib/escale/preferencia-de-menu";
import { createClient } from "@/lib/supabase/server";

import { CONTEUDO_AO_LADO_DO_PAINEL, ENVOLTORIO_DO_PAINEL } from "./estilos-do-painel";
import { PainelOrigens } from "./PainelOrigens";

type Supabase = Awaited<ReturnType<typeof createClient>>;

/** Banco sem a 9003 (ou fora do ar): o painel abre com a seção Visualizações vazia. */
async function visualizacoesOuNada(supabase: Supabase, orgId: string): Promise<Visualizacao[]> {
  try {
    return await lerVisualizacoes(supabase, orgId);
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

  const supabase = await createClient();
  let origens: Origens;
  try {
    origens = await lerOrigens(supabase, activeOrg.orgId);
  } catch (err) {
    console.error("[escale/origens] não consegui ler os grupos de funis; o quadro abre sem o painel", err);
    return <>{children}</>;
  }

  return (
    <div className={ENVOLTORIO_DO_PAINEL}>
      <PainelOrigens
        origens={origens}
        visualizacoes={await visualizacoesOuNada(supabase, activeOrg.orgId)}
        podeGerenciar={ROLE_RANK[activeOrg.role] >= ROLE_RANK.manager}
        // Painel/lista recolhidos e grupos ocultos vêm de cookie: o primeiro render já sai certo.
        preferencias={lerPreferenciasDoPainel((nome) => store.get(nome)?.value)}
        // Fase 1E: os Recentes moram no navegador, por organização e pessoa.
        chaveDeRecentes={chaveDosRecentes(activeOrg.orgId, user.id)}
      />
      <div className={CONTEUDO_AO_LADO_DO_PAINEL}>{children}</div>
    </div>
  );
}
