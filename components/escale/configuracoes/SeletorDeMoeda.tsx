"use client";
import { useState } from "react";

import { BandeiraDaMoeda } from "@/components/escale/ui/BandeiraDaMoeda";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { MOEDAS_SERVIDAS, type MoedaServida } from "@/lib/money";
import { ChevronDown } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** A ordem da lista da Clint (P04); o Kwanza é nosso e fica no fim. */
const ORDEM: readonly MoedaServida[] = ["BRL", "USD", "EUR", "MXN", "AOA"];

/** "Moeda da origem" (P04): bandeira + nome, com o visual do react-select da Clint (F18). */
export function SeletorDeMoeda({
  valor,
  aoMudar,
  "aria-label": rotulo,
}: {
  valor: MoedaServida;
  aoMudar: (moeda: MoedaServida) => void;
  "aria-label": string;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const nome: Record<MoedaServida, string> = {
    BRL: t("Real (BRL)"),
    USD: t("Dólar Americano (USD)"),
    EUR: t("Euro (EUR)"),
    MXN: t("Peso Mexicano (MXN)"),
    AOA: t("Kwanza (AOA)"),
  };
  const moedas = ORDEM.filter((m) => MOEDAS_SERVIDAS.includes(m));
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-label={rotulo}
          aria-expanded={aberto}
          className={cn(
            "flex h-11 w-full items-center gap-2.5 rounded-[4px] bg-casca-raia px-3 text-left text-[11.9px] font-light text-casca-texto",
            aberto && "ring-1 ring-(--escale-seletor-foco)",
          )}
        >
          <BandeiraDaMoeda moeda={valor} />
          <span className="flex-1">{nome[valor]}</span>
          <ChevronDown size={14} aria-hidden className="text-casca-chevron" />
        </button>
      </PopoverTrigger>
      <PainelSuspenso
        aria-label={rotulo}
        sideOffset={4}
        className="w-[var(--radix-popover-trigger-width)] py-1"
      >
        <ul role="listbox" aria-label={rotulo}>
          {moedas.map((m) => (
            <li
              key={m}
              role="option"
              aria-selected={m === valor}
              tabIndex={0}
              onClick={() => {
                aoMudar(m);
                setAberto(false);
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  aoMudar(m);
                  setAberto(false);
                }
              }}
              className={cn(
                "flex h-[34px] cursor-pointer items-center gap-2.5 px-3 text-[11.9px] font-light",
                m === valor
                  ? "bg-(--escale-seletor-foco) text-white"
                  : "text-casca-texto hover:bg-(--escale-seletor-hover)",
              )}
            >
              <BandeiraDaMoeda moeda={m} />
              <span className="flex-1">{nome[m]}</span>
            </li>
          ))}
        </ul>
      </PainelSuspenso>
    </Popover>
  );
}
