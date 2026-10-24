"use client";
import { useEffect, useRef, useState } from "react";

import {
  SeletorDoFiltro,
  type OpcaoDoFiltro,
} from "@/components/escale/conversas/filtros/SeletorDoFiltro";
import { useT } from "@/hooks/i18n/useT";
import {
  ESPERA_DA_BUSCA_MS,
  ROTULO_DO_FILTRO_DE_STATUS,
  STATUS_DO_FILTRO,
  type FiltrosDeCampanhas,
  type StatusDoFiltro,
} from "@/lib/escale/campanhas/filtros";
import { Search } from "@/lib/ui/icons-da-casca";

import { CampoDeDataDasCampanhas } from "./CampoDeDataDasCampanhas";

/**
 * A BARRA DE FILTROS (002, 004–006; N4): busca (500 ms), data do agendamento,
 * data de criação, Status (várias) e Número (uma) — "Conta" e "Dispositivos"
 * da Clint viram "Número". Quem limpa os filtros remonta a barra (`key`), e a
 * busca volta vazia.
 */
export function BarraDeFiltrosDasCampanhas({
  filtros,
  numeros,
  aoMudar,
}: {
  filtros: FiltrosDeCampanhas;
  numeros: OpcaoDoFiltro<string>[];
  aoMudar: (f: FiltrosDeCampanhas) => void;
}) {
  const t = useT();
  const [texto, setTexto] = useState(filtros.busca ?? "");
  const atual = useRef({ filtros, aoMudar });
  useEffect(() => {
    atual.current = { filtros, aoMudar };
  });
  useEffect(() => {
    if (texto.trim() === (atual.current.filtros.busca ?? "")) return;
    const espera = setTimeout(() => {
      const { filtros: f, aoMudar: mudar } = atual.current;
      mudar({ ...f, busca: texto.trim() || undefined });
    }, ESPERA_DA_BUSCA_MS);
    return () => clearTimeout(espera);
  }, [texto]);

  const opcoesDeStatus: OpcaoDoFiltro<StatusDoFiltro>[] = STATUS_DO_FILTRO.map((s) => ({
    valor: s,
    rotulo: t(ROTULO_DO_FILTRO_DE_STATUS[s]),
  }));
  const tirarVazios = (f: FiltrosDeCampanhas): FiltrosDeCampanhas =>
    Object.fromEntries(Object.entries(f).filter(([, v]) => v !== undefined)) as FiltrosDeCampanhas;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <label className="relative block max-w-[280px] min-w-[180px] flex-[1_1_220px]">
        <input
          type="search"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder={t("Buscar campanha")}
          aria-label={t("Buscar campanha")}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca pr-8 pl-2.5 text-[13px] text-casca-texto placeholder:text-casca-meta focus-visible:ring-1 focus-visible:ring-casca-marca focus-visible:outline-hidden"
        />
        <Search
          size={16}
          aria-hidden
          className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-texto-2"
        />
      </label>
      <CampoDeDataDasCampanhas
        rotulo={t("Filtrar por data do agendamento")}
        valor={filtros.disparo}
        aoMudar={(p) => aoMudar(tirarVazios({ ...filtros, disparo: p }))}
      />
      <CampoDeDataDasCampanhas
        rotulo={t("Filtrar por data de criação")}
        valor={filtros.criacao}
        aoMudar={(p) => aoMudar(tirarVazios({ ...filtros, criacao: p }))}
      />
      <div className="w-[160px]">
        <SeletorDoFiltro<StatusDoFiltro>
          aria-label={t("Status")}
          vazio={t("Status")}
          valores={filtros.status ?? []}
          opcoes={opcoesDeStatus}
          aoMudar={(v) => aoMudar(tirarVazios({ ...filtros, status: v.length ? v : undefined }))}
        />
      </div>
      <div className="w-[170px]">
        <SeletorDoFiltro<string>
          multiplo={false}
          aria-label={t("Número")}
          vazio={t("Número")}
          valores={filtros.numero ? [filtros.numero] : []}
          opcoes={numeros}
          aoMudar={(v) => aoMudar(tirarVazios({ ...filtros, numero: v[0] }))}
        />
      </div>
    </div>
  );
}
