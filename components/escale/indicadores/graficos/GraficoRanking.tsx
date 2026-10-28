"use client";
import { useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import { corDoAvatar } from "@/lib/escale/indicadores/graficos/cores";
import { ITENS_VISIVEIS_DO_RANKING, linhasDoRanking } from "@/lib/escale/indicadores/graficos/dados-avancados";
import type { Clique } from "@/lib/escale/indicadores/graficos/detalhamento";
import { formatarPercentual, formatarValor } from "@/lib/escale/indicadores/graficos/formatos";
import type { OpcoesDoGrafico } from "@/lib/escale/indicadores/graficos/opcoes";
import type { Resultado } from "@/lib/escale/indicadores/motor/executar";

const ROTULO_DA_UNIDADE = { contagem: "quantidade", valor: "", percentual: "", duracao: "" } as const;

/** Ranking de distribuição (print 10-045): posição, avatar, nome, barra e valor; mostra 5 e "Ver todos". */
export function GraficoRanking({
  resultado,
  opcoes,
  aoClicarNoPonto,
}: {
  resultado: Resultado;
  opcoes: OpcoesDoGrafico;
  aoClicarNoPonto?: (clique: Clique) => void;
}) {
  const t = useT();
  const [todos, setTodos] = useState(false);
  const linhas = linhasDoRanking(resultado, opcoes);
  if (linhas.length === 0) return null;
  const visiveis = todos ? linhas : linhas.slice(0, ITENS_VISIVEIS_DO_RANKING);
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto">
      <ul>
        {visiveis.map((l) => (
          <li
            key={l.nome}
            className={`flex h-14 items-center gap-3 border-b border-casca-divisoria ${aoClicarNoPonto ? "cursor-pointer" : ""}`}
            {...(aoClicarNoPonto ? { onClick: () => aoClicarNoPonto({ rotulo: l.nome }) } : {})}
          >
            <span className="w-7 text-[13px] text-casca-suave">#{l.posicao}</span>
            <span
              aria-hidden
              className="grid size-10 shrink-0 place-items-center rounded-full text-[13px] font-semibold text-white"
              style={{ background: l.posicao === 1 ? "var(--color-casca-marca)" : corDoAvatar(l.nome) }}
            >
              {l.iniciais}
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-semibold text-casca-texto" title={l.nome}>
                {l.nome}
              </p>
              <div className="mt-1 h-2 rounded-[4px] bg-casca-raia">
                <div className="h-full rounded-[4px] bg-casca-marca" style={{ width: `${Math.round(l.proporcao * 100)}%` }} />
              </div>
            </div>
            <span className="shrink-0 text-right text-[13px] text-casca-texto">
              {formatarValor(l.valor, l.unidade)} {t(ROTULO_DA_UNIDADE[l.unidade])}
              {l.foraDaMeta !== null ? (
                <span className="block text-[12px] text-casca-alerta">
                  {t("{pct}% fora da meta").replace("{pct}", formatarPercentual(l.foraDaMeta, 0).replace("%", ""))}
                </span>
              ) : null}
            </span>
          </li>
        ))}
      </ul>
      {linhas.length > ITENS_VISIVEIS_DO_RANKING ? (
        <button
          type="button"
          onClick={() => setTodos((v) => !v)}
          className="mx-auto mt-2 h-8 shrink-0 rounded-[6px] border border-casca-borda px-3 text-[13px] text-casca-texto hover:bg-casca-raia"
        >
          {todos ? t("Mostrar menos") : t("Ver todos os {count} itens").replace("{count}", String(linhas.length))}
        </button>
      ) : null}
    </div>
  );
}
