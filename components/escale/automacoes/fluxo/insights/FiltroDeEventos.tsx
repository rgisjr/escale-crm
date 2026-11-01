"use client";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { opcoesDosEventos } from "@/lib/escale/automacoes/insights/regras";
import type { FiltroDasExecucoes } from "@/lib/escale/automacoes/insights/tipos";

/**
 * O FILTRO "EVENTOS" DA LISTAGEM (07-030; fork Escale, Fase 5C; I9): caixinhas com as opções do
 * cartão que abriu a listagem. A última marcada não desmarca (a lista vazia não teria sentido).
 * Nas condições não há o que escolher: o botão fica desligado, com a dica.
 */
export function FiltroDeEventos({
  filtro,
  selecionados,
  aoMudar,
}: {
  filtro: FiltroDasExecucoes;
  selecionados: readonly string[];
  aoMudar: (selecionados: string[]) => void;
}) {
  const t = useT();
  const opcoes = opcoesDosEventos(filtro);

  if (opcoes.length === 0) {
    return (
      <GatilhoDeFiltro
        rotulo={t("Eventos")}
        disabled
        title={t("Todas as execuções passaram nas condições.")}
        className="cursor-not-allowed opacity-60"
      />
    );
  }

  function alternar(valor: string, marcar: boolean) {
    const novos = marcar ? [...selecionados, valor] : selecionados.filter((s) => s !== valor);
    aoMudar(opcoes.map((o) => o.valor).filter((v) => novos.includes(v)));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <GatilhoDeFiltro rotulo={t("Eventos")} contagem={selecionados.length} />
      </PopoverTrigger>
      <PainelSuspenso className="w-[240px] p-2">
        <ul className="flex flex-col">
          {opcoes.map((o) => {
            const marcada = selecionados.includes(o.valor);
            return (
              <li key={o.valor} className="flex min-h-[34px] items-center px-2">
                <CaixaDaCasca
                  marcada={marcada}
                  desabilitada={marcada && selecionados.length === 1}
                  aoMudar={(v) => alternar(o.valor, v)}
                  rotulo={t(o.rotulo)}
                />
              </li>
            );
          })}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
