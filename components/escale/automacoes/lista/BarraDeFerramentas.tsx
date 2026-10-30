"use client";
import { CampoDeBuscaDaLista } from "@/components/escale/ui/CampoDeBuscaDaLista";
import { useT } from "@/hooks/i18n/useT";
import { textoDeItens } from "@/lib/escale/automacoes/regras";
import type {
  AgenteDaLista,
  AgenteDoFiltro,
  PastaDeAutomacao,
  StatusDoFiltro,
  Visao,
} from "@/lib/escale/automacoes/tipos";

import { FiltroDeAgente } from "./FiltroDeAgente";
import { FiltroDeStatus } from "./FiltroDeStatus";

const ATRASO_DA_BUSCA_MS = 750;

/** A barra de ferramentas (07-001, 07-002, 07-003, 07-032): trilha, busca, filtros e "N itens". */
export function BarraDeFerramentas({
  visao,
  pastas,
  busca,
  aoBuscar,
  status,
  aoMudarStatus,
  agentesDaOrg,
  agentes,
  aoMudarAgentes,
  total,
  aoVoltarParaTodas,
}: {
  visao: Visao;
  pastas: readonly PastaDeAutomacao[];
  busca: string;
  aoBuscar: (q: string) => void;
  status: readonly StatusDoFiltro[];
  aoMudarStatus: (v: readonly StatusDoFiltro[]) => void;
  agentesDaOrg: readonly AgenteDaLista[];
  agentes: readonly AgenteDoFiltro[];
  aoMudarAgentes: (v: readonly AgenteDoFiltro[]) => void;
  total: number;
  aoVoltarParaTodas: () => void;
}) {
  const t = useT();
  const itens = textoDeItens(total);
  const pasta = visao.tipo === "pasta" ? pastas.find((p) => p.id === visao.id) : undefined;
  return (
    <div className="shrink-0 border-b border-casca-divisoria">
      {pasta && (
        <nav aria-label={t("Trilha")} className="flex items-center gap-1.5 px-6 pt-2 text-[12px] text-casca-suave">
          <button type="button" onClick={aoVoltarParaTodas} className="hover:text-casca-texto hover:underline">
            {t("Todas")}
          </button>
          <span aria-hidden>›</span>
          <span className="text-casca-texto">{pasta.nome}</span>
        </nav>
      )}
      <div className="flex h-14 items-center gap-4 px-6">
        <CampoDeBuscaDaLista
          valorDaUrl={busca}
          aoBuscar={(q) => aoBuscar(q ?? "")}
          rotulo={t("Buscar")}
          atrasoMs={ATRASO_DA_BUSCA_MS}
          className="flex h-8 w-60 items-center gap-2 rounded-casca-gatilho border border-casca-borda bg-surface px-3 focus-within:border-casca-marca"
        />
        <FiltroDeStatus valor={status} aoMudar={aoMudarStatus} />
        <FiltroDeAgente agentes={agentesDaOrg} valor={agentes} aoMudar={aoMudarAgentes} />
        <span className="ml-auto text-[12px] text-casca-suave">{t(itens.chave).replace("{n}", itens.n)}</span>
      </div>
    </div>
  );
}
