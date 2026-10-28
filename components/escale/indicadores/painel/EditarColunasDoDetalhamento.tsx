"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import type { ColunaDoDetalhamentoNaTela } from "@/lib/escale/indicadores/graficos/detalhamento";
import { Search } from "@/lib/ui/icons-da-casca";

const semAcento = (s: string): string => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();

/** "Editar colunas (N)" (print 10-023): busca e uma caixa por coluna; grava na hora e sempre deixa uma marcada. */
export function EditarColunasDoDetalhamento({
  colunas,
  escolhidas,
  aoAlternar,
}: {
  colunas: readonly ColunaDoDetalhamentoNaTela[];
  escolhidas: readonly string[];
  aoAlternar: (chave: string) => void;
}) {
  const t = useT();
  const [busca, setBusca] = useState("");
  const visiveis = colunas.filter((c) => semAcento(c.nome).includes(semAcento(busca.trim())));
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="inline-flex h-8 items-center gap-2 rounded-[6px] bg-casca-raia px-3 text-[13px] font-medium text-casca-texto"
        >
          {t("Editar colunas")}
          <span className="grid size-[18px] place-items-center rounded-full bg-casca-contador text-[11px] text-casca-suave">
            {escolhidas.length}
          </span>
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-[260px] p-2" align="start" sideOffset={6}>
        <div className="relative mb-2">
          <input
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder={t("Buscar por...")}
            aria-label={t("Buscar por...")}
            className="h-8 w-full rounded-[4px] bg-casca-busca pr-8 pl-3 text-[13px] outline-none"
          />
          <Search size={14} aria-hidden className="pointer-events-none absolute top-1/2 right-2.5 -translate-y-1/2 text-casca-suave" />
        </div>
        <ul className="max-h-[300px] overflow-y-auto">
          {visiveis.map((c) => (
            <li key={c.chave} className="flex h-[34px] items-center gap-2 px-1">
              <CaixaDaCasca marcada={escolhidas.includes(c.chave)} aoMudar={() => aoAlternar(c.chave)} aria-label={c.nome} />
              <span className="truncate text-[13px] text-casca-texto">{c.nome}</span>
            </li>
          ))}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
