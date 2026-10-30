"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { GatilhoDeFiltro } from "@/components/escale/ui/GatilhoDeFiltro";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { SEM_AGENTE, semAcento } from "@/lib/escale/automacoes/regras";
import type { AgenteDaLista, AgenteDoFiltro } from "@/lib/escale/automacoes/tipos";
import { Bot, Search } from "@/lib/ui/icons-da-casca";

import { AvatarDoAgente } from "./AgenteDaLinha";

/** O filtro Agente (07-003): busca, "Sem agente" e os agentes não arquivados. */
export function FiltroDeAgente({
  agentes,
  valor,
  aoMudar,
}: {
  agentes: readonly AgenteDaLista[];
  valor: readonly AgenteDoFiltro[];
  aoMudar: (v: readonly AgenteDoFiltro[]) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const termo = semAcento(busca.trim());
  const visiveis = termo ? agentes.filter((a) => semAcento(a.nome).includes(termo)) : agentes;
  const mostrarSemAgente = !termo || semAcento(t("Sem agente")).includes(termo);

  function alternar(v: AgenteDoFiltro, marcar: boolean) {
    aoMudar(marcar ? [...valor, v] : valor.filter((x) => x !== v));
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <GatilhoDeFiltro
          rotulo={t("Agente")}
          contagem={valor.length}
          icone={<Bot size={13} aria-hidden />}
        />
      </PopoverTrigger>
      <PainelSuspenso className="w-[280px] p-0">
        <label className="flex h-10 items-center gap-2 border-b border-casca-divisoria px-3">
          <Search size={14} aria-hidden className="shrink-0 text-casca-suave" />
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar agente")}
            aria-label={t("Buscar agente")}
            className="w-full bg-transparent text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
        </label>
        <div className="max-h-[260px] overflow-y-auto p-1">
          {mostrarSemAgente && (
            <div className="flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-casca-raia">
              <CaixaDaCasca
                marcada={valor.includes(SEM_AGENTE)}
                aoMudar={(m) => alternar(SEM_AGENTE, m)}
                rotulo={t("Sem agente")}
              />
            </div>
          )}
          {visiveis.map((a) => (
            <div key={a.id} className="flex h-9 items-center gap-2.5 rounded-md px-2 hover:bg-casca-raia">
              <AvatarDoAgente nome={a.nome} tamanho={22} />
              <CaixaDaCasca marcada={valor.includes(a.id)} aoMudar={(m) => alternar(a.id, m)} rotulo={a.nome} />
            </div>
          ))}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
