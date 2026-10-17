"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O SELETOR COM CAIXINHAS DA CLINT (P13 e P14 de docs/clint/prints-1f;
 * react-select `isMulti`, `closeMenuOnSelect: false`): gatilho lavanda que
 * fica navy aberto, e a lista com caixinhas. `exclusiva` é o "Todas as etapas":
 * marcá-la limpa as outras; marcar outra a limpa.
 */
export function SeletorMultiploDaCasca<V extends string>({
  valores,
  opcoes,
  aoMudar,
  "aria-label": rotulo,
  vazio,
  desabilitado = false,
  exclusiva,
}: {
  valores: readonly V[];
  opcoes: { valor: V; rotulo: string }[];
  aoMudar: (valores: V[]) => void;
  "aria-label": string;
  vazio: string;
  desabilitado?: boolean;
  exclusiva?: V;
}) {
  const [aberto, setAberto] = useState(false);
  const nomes = opcoes.filter((o) => valores.includes(o.valor)).map((o) => o.rotulo);

  function alternar(v: V, marcar: boolean) {
    if (!marcar) return aoMudar(valores.filter((x) => x !== v));
    if (exclusiva !== undefined && v === exclusiva) return aoMudar([v]);
    return aoMudar([...valores.filter((x) => x !== exclusiva), v]);
  }

  return (
    <Popover open={aberto && !desabilitado} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotulo}
          aria-expanded={aberto}
          disabled={desabilitado}
          className={cn(
            "flex h-10 w-full items-center gap-2 rounded-[5px] px-3 text-left text-[11px] transition disabled:cursor-not-allowed disabled:opacity-60",
            aberto ? "bg-casca-escuro font-medium text-white" : "bg-casca-raia text-casca-texto",
          )}
        >
          <span className="min-w-0 flex-1 truncate">
            {nomes.length === 0 ? vazio : nomes.join(", ")}
          </span>
          <ChevronDown
            size={14}
            aria-hidden
            className={cn("shrink-0", aberto ? "text-white" : "text-casca-chevron")}
          />
        </button>
      </PopoverTrigger>
      <PainelSuspenso
        aria-label={rotulo}
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] p-1"
      >
        <ul className="max-h-64 overflow-y-auto">
          {opcoes.map((o) => (
            <li
              key={o.valor}
              className="rounded-[2px] px-2 py-1.5 hover:bg-(--escale-seletor-hover)"
            >
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
