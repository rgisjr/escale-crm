"use client";
import { useT } from "@/hooks/i18n/useT";
import { ehGrupo } from "@/lib/escale/automacoes/fluxo/grupos";
import { cartaoDasCondicoes, cartoesDoPasso } from "@/lib/escale/automacoes/insights/regras";
import { TIPO_DO_CARTAO_DO_GRUPO, type CartaoDeNumero } from "@/lib/escale/automacoes/insights/tipos";
import type { DadosDaCaixa } from "@/lib/automation/desenho-da-regra";
import { cn } from "@/lib/utils";

import { useInsightsDoNo } from "./contexto";

const SEM_DADO = "—";

function cartoesDoNo(id: string, dados: DadosDaCaixa, c: NonNullable<ReturnType<typeof useInsightsDoNo>>): CartaoDeNumero[] {
  if (!c.resumo || dados.kind === "gatilho") return [];
  if (dados.kind === "condicoes") return [cartaoDasCondicoes(c.resumo)];
  const acoes = c.acoesDosPassos.get(id) ?? [];
  return cartoesDoPasso(c.resumo, acoes, ehGrupo(dados) ? TIPO_DO_CARTAO_DO_GRUPO : (acoes[0]?.tipo ?? TIPO_DO_CARTAO_DO_GRUPO));
}

/**
 * O "OVERVIEW DE RESULTADOS" NO TOPO DO NÓ (07-011, 07-012; fork Escale, Fase 5C; I5, I6, I14).
 * Nada no gatilho; nas condições, "Passaram"; nas ações, as contagens do passo. Clicar num número
 * abre a listagem de execuções com aquele filtro.
 */
export function VisaoGeralDoNo({ id, dados }: { id: string; dados: DadosDaCaixa }) {
  const t = useT();
  const insights = useInsightsDoNo();
  if (!insights || dados.kind === "gatilho") return null;

  const cartoes = cartoesDoNo(id, dados, insights);
  const esqueletos = dados.kind === "condicoes" ? 1 : 3;
  const sombra = "nodrag nopan min-w-[88px] rounded-lg bg-casca-raia px-2.5 py-2 text-left";

  return (
    <section className="border-b border-casca-divisoria px-5 pt-4 pb-3" aria-label={t("Overview de resultados")}>
      <p className="mb-2 text-[13px] font-medium text-casca-texto">{t("Overview de resultados")}</p>
      <div className="flex flex-wrap gap-2">
        {insights.carregando
          ? Array.from({ length: esqueletos }, (_, i) => (
              <div key={i} data-testid="esqueleto-do-no" className="h-[52px] w-[88px] animate-pulse rounded-lg bg-casca-raia" />
            ))
          : insights.erro
            ? (cartoes.length > 0 ? cartoes : Array.from({ length: esqueletos }, () => null)).map((c, i) => (
                <button key={c?.chave ?? i} type="button" disabled className={cn(sombra, "cursor-not-allowed opacity-60")}>
                  <span className="block text-[12px] text-casca-texto-2">{c ? t(c.rotulo) : SEM_DADO}</span>
                  <span className="block text-[14px] font-semibold text-casca-marca">{SEM_DADO}</span>
                </button>
              ))
            : cartoes.map((c) => (
                <button
                  key={c.chave}
                  type="button"
                  title={c.dica ? t(c.dica) : undefined}
                  onClick={() => c.filtro && insights.aoAbrir(c.filtro)}
                  className={cn(sombra, "hover:bg-casca-marca-suave")}
                >
                  <span className="block text-[12px] text-casca-texto-2">{t(c.rotulo)}</span>
                  <span className="block text-[14px] font-semibold text-casca-marca">
                    {typeof c.valor === "number" ? c.valor.toLocaleString("pt-BR") : c.valor}
                  </span>
                </button>
              ))}
      </div>
    </section>
  );
}
