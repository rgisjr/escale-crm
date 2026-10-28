"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarOpcoes } from "@/lib/ui/filtrar-opcoes";
import { ChevronDown } from "@/lib/ui/icons-da-casca";

type Opcao = { valor: string; rotulo: string };

/**
 * O SELETOR COM CHIPS DA MARCA (10-004): os escolhidos viram chips sólidos na cor
 * da marca dentro do gatilho. A lista aberta não tem print (PRD 7, seção 11):
 * segue o `SeletorMultiploDaCasca` (busca e caixinhas, sem fechar ao marcar). Provisório.
 */
export function SeletorComChipsDaMarca({
  valores,
  opcoes,
  aoMudar,
  placeholder,
  "aria-label": rotulo,
}: {
  valores: readonly string[];
  opcoes: Opcao[];
  aoMudar: (v: string[]) => void;
  placeholder: string;
  "aria-label": string;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const escolhidas = opcoes.filter((o) => valores.includes(o.valor));
  const visiveis = filtrarOpcoes(
    opcoes.map((o) => ({ ...o, value: o.valor, label: o.rotulo })),
    busca,
  );

  const alternar = (v: string, marcar: boolean) =>
    aoMudar(marcar ? [...valores.filter((x) => x !== v), v] : valores.filter((x) => x !== v));

  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotulo}
          aria-expanded={aberto}
          className="flex min-h-8 w-full max-w-[516px] items-center gap-2 rounded-[6px] bg-casca-raia px-3 py-1 text-left"
        >
          <span className="flex min-w-0 flex-1 flex-wrap gap-1">
            {escolhidas.length === 0 ? (
              <span className="text-[12px] text-casca-suave">{placeholder}</span>
            ) : (
              escolhidas.map((o) => (
                <span
                  key={o.valor}
                  data-testid="chip-da-marca"
                  className="rounded-[3px] bg-casca-marca px-1.5 py-0.5 text-[10px] font-medium text-white"
                >
                  {o.rotulo}
                </span>
              ))
            )}
          </span>
          <ChevronDown size={14} aria-hidden className="shrink-0 text-casca-chevron" />
        </button>
      </PopoverTrigger>
      <PainelSuspenso aria-label={rotulo} sideOffset={4} className="w-[var(--radix-popover-trigger-width)] p-1">
        <input
          type="search"
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder={t("Buscar")}
          aria-label={t("Buscar")}
          className="mb-1 h-8 w-full rounded-[4px] border-0 bg-casca-raia px-2 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-suave"
        />
        <ul className="max-h-64 overflow-y-auto">
          {visiveis.map((o) => (
            <li key={o.valor} className="rounded-[2px] px-2 py-1.5 hover:bg-(--escale-seletor-hover)">
              <CaixaDaCasca
                marcada={valores.includes(o.valor)}
                aoMudar={(m) => alternar(o.valor, m)}
                rotulo={o.rotulo}
              />
            </li>
          ))}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
