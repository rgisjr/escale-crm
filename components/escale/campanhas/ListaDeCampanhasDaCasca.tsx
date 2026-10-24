"use client";
import { useEffect, useMemo, useState } from "react";

import { PaginacaoDaCasca } from "@/components/escale/ui/PaginacaoDaCasca";
import { channelLabel, useChannelSessions } from "@/hooks/channels/useChannelSessions";
import {
  useCampanhasAoVivo,
  useListaDeCampanhas,
  useResumoDasCampanhas,
} from "@/hooks/escale/useCampanhasDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { FILTROS_VAZIOS, temFiltro, type FiltrosDeCampanhas } from "@/lib/escale/campanhas/filtros";
import { POR_PAGINA, POR_PAGINA_PADRAO } from "@/lib/escale/contatos/regras";

import { BarraDeFiltrosDasCampanhas } from "./BarraDeFiltrosDasCampanhas";
import { FaixaDoResumo } from "./FaixaDoResumo";
import { TabelaDeCampanhas } from "./TabelaDeCampanhas";
import { VazioSemCampanhas } from "./VaziosDasCampanhas";

/**
 * A ABA WHATSAPP (002; PRD A3–A13): filtros, resumo, tabela e paginação; a
 * lista ao vivo. Sem nenhuma campanha (e sem filtro), só o vazio (N15).
 */
export function ListaDeCampanhasDaCasca({
  organizacaoId,
  fuso,
}: {
  organizacaoId: string;
  fuso?: string;
}) {
  const t = useT();
  const [filtros, setFiltros] = useState<FiltrosDeCampanhas>(FILTROS_VAZIOS);
  const [versaoDosFiltros, setVersaoDosFiltros] = useState(0);
  const [pagina, setPagina] = useState(1);
  const [porPagina, setPorPagina] = useState<number>(POR_PAGINA_PADRAO);
  const [resumoAberto, setResumoAberto] = useState(false);
  useCampanhasAoVivo(organizacaoId);
  const lista = useListaDeCampanhas(filtros, pagina, porPagina);
  const resumo = useResumoDasCampanhas(filtros, resumoAberto);
  const sessoes = useChannelSessions().data;
  const numeros = useMemo(
    () => (sessoes ?? []).map((s) => ({ valor: s.id, rotulo: channelLabel(s, t) })),
    [sessoes, t],
  );
  const nomeDoNumero = useMemo(() => {
    const nomes = new Map(numeros.map((n) => [n.valor, n.rotulo]));
    return (id: string) => nomes.get(id) ?? "—";
  }, [numeros]);

  const total = lista.data?.total ?? 0;
  const filtrando = temFiltro(filtros);

  // A página ficou vazia (excluiu a última da página): volta uma.
  useEffect(() => {
    if (lista.data && lista.data.linhas.length === 0 && pagina > 1) setPagina((p) => p - 1);
  }, [lista.data, pagina]);

  const mudarFiltros = (f: FiltrosDeCampanhas) => {
    setFiltros(f);
    setPagina(1);
  };
  const limparFiltros = () => {
    mudarFiltros(FILTROS_VAZIOS);
    setVersaoDosFiltros((v) => v + 1);
  };

  if (!lista.isLoading && !lista.isError && !filtrando && total === 0) return <VazioSemCampanhas />;

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div className="space-y-3 px-6 pt-4 pb-3">
        <BarraDeFiltrosDasCampanhas
          key={versaoDosFiltros}
          filtros={filtros}
          numeros={numeros}
          aoMudar={mudarFiltros}
        />
        <FaixaDoResumo
          aberta={resumoAberto}
          aoAlternar={() => setResumoAberto((a) => !a)}
          resumo={resumo.data}
          carregando={resumo.isLoading}
        />
      </div>
      <TabelaDeCampanhas
        linhas={lista.data?.linhas ?? []}
        carregando={lista.isLoading}
        erro={lista.isError}
        filtrando={filtrando}
        fuso={fuso}
        nomeDoNumero={nomeDoNumero}
        aoLimparFiltros={limparFiltros}
        aoTentarDeNovo={() => void lista.refetch()}
      />
      {total > POR_PAGINA_PADRAO ? (
        <footer className="shrink-0 border-t border-casca-divisoria px-6">
          <PaginacaoDaCasca
            pagina={pagina}
            total={total}
            porPagina={porPagina}
            opcoesPorPagina={POR_PAGINA}
            aoMudarPagina={setPagina}
            aoMudarPorPagina={(n) => {
              setPorPagina(n);
              setPagina(1);
            }}
          />
        </footer>
      ) : null}
    </div>
  );
}
