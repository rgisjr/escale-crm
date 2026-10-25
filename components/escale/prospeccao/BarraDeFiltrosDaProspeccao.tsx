"use client";
import { useEffect, useState } from "react";

import {
  SeletorDoFiltro,
  type OpcaoDoFiltro,
} from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { useT } from "@/hooks/i18n/useT";
import { ESPERA_DA_BUSCA_MS } from "@/lib/escale/campanhas/filtros";
import { ROTULO_DA_SITUACAO } from "@/lib/escale/prospeccao/apresentacao";
import {
  SITUACOES_DA_PROSPECCAO,
  type FiltrosDaProspeccao,
  type SituacaoDaProspeccao,
} from "@/lib/escale/prospeccao/tipos";
import { Search } from "@/lib/ui/icons-da-casca";

/** A BARRA DE FILTROS DA PROSPECÇÃO (molde 002; D7): busca (500 ms) e Status. */
export function BarraDeFiltrosDaProspeccao({
  filtros,
  aoMudar,
}: {
  filtros: FiltrosDaProspeccao;
  aoMudar: (f: FiltrosDaProspeccao) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(filtros.busca ?? "");
  // A busca que mudou por fora (Limpar filtros) volta para o campo: sem isso o texto antigo
  // ficava digitado e o efeito abaixo o reaplicava 500 ms depois.
  const [buscaVista, setBuscaVista] = useState(filtros.busca);
  if (filtros.busca !== buscaVista) {
    setBuscaVista(filtros.busca);
    if ((filtros.busca ?? "") !== texto) setTexto(filtros.busca ?? "");
  }

  useEffect(() => {
    // Só espaços ou espaço nas pontas não é mudança: evita um filtros novo (e página 1) a cada ciclo.
    if (texto.trim() === (filtros.busca ?? "").trim()) return;
    const espera = setTimeout(
      () => aoMudar({ ...filtros, busca: texto.trim() ? texto : undefined }),
      ESPERA_DA_BUSCA_MS,
    );
    return () => clearTimeout(espera);
  }, [texto, filtros, aoMudar]);

  const opcoes: OpcaoDoFiltro<SituacaoDaProspeccao>[] = SITUACOES_DA_PROSPECCAO.map((s) => ({
    valor: s,
    rotulo: t(ROTULO_DA_SITUACAO[s]),
  })).sort((a, b) => a.rotulo.localeCompare(b.rotulo, "pt-BR"));

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative w-[220px] max-w-[280px] min-w-[180px]">
        <span className="sr-only">{t("Buscar prospecção")}</span>
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Buscar prospecção")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:bg-surface focus:ring-1 focus:ring-casca-marca"
        />
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-2 right-2.5 text-casca-suave"
        />
      </label>
      <div className="w-[160px]">
        <SeletorDoFiltro
          aria-label={t("Status")}
          vazio={t("Status")}
          valores={filtros.situacoes ?? []}
          opcoes={opcoes}
          aoMudar={(v) => aoMudar({ ...filtros, situacoes: v.length ? v : undefined })}
        />
      </div>
    </div>
  );
}
