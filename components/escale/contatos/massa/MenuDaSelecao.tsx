"use client";
import { useState } from "react";

import { CLASSE_DA_LINHA_DO_MENU } from "@/components/escale/filtros/controles";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { ChevronDown, HelpCircle } from "@/lib/ui/icons-da-casca";

/**
 * A CAIXINHA DO CABEÇALHO E A SETINHA (03-001; menu como o 18b; decisão B3): a
 * caixinha marca ou desmarca SÓ a página; a setinha ("Selecionar") abre
 * "Selecionar esta página (N)", "Selecionar todos os {total} contatos" e
 * "Selecionar [N]" com o (?) — o campo aplica a cada número, como na Clint.
 */
export function MenuDaSelecao({
  estado,
  podeSelecionar,
  total,
  naPagina,
  aoMarcarPagina,
  aoSelecionarTodos,
  aoSelecionarQuantidade,
}: {
  estado: boolean | "indeterminada";
  podeSelecionar: boolean;
  total: number;
  naPagina: number;
  aoMarcarPagina: (marcar: boolean) => void;
  aoSelecionarTodos: () => void;
  aoSelecionarQuantidade: (n: number) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [quantidade, setQuantidade] = useState("");
  const semPermissao = t("Disponível para gerente ou acima.");
  return (
    <span className="flex items-center gap-1" title={podeSelecionar ? undefined : semPermissao}>
      <CaixaDaCasca
        marcada={estado}
        aoMudar={(m) => aoMarcarPagina(m)}
        aria-label={t("Selecionar todos")}
        desabilitada={!podeSelecionar}
      />
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={!podeSelecionar}
            title={podeSelecionar ? t("Selecionar") : semPermissao}
            aria-label={t("Selecionar")}
            className="grid size-5 place-items-center text-casca-meta hover:text-casca-texto disabled:cursor-not-allowed"
          >
            <ChevronDown size={12} aria-hidden />
          </button>
        </PopoverTrigger>
        <PainelSuspenso align="start" className="w-[240px] p-1">
          <button
            type="button"
            className={CLASSE_DA_LINHA_DO_MENU}
            onClick={() => {
              aoMarcarPagina(true);
              setAberto(false);
            }}
          >
            {t("Selecionar esta página ({n})").replace("{n}", String(naPagina))}
          </button>
          <button
            type="button"
            className={CLASSE_DA_LINHA_DO_MENU}
            onClick={() => {
              aoSelecionarTodos();
              setAberto(false);
            }}
          >
            {t("Selecionar todos os {total} contatos").replace(
              "{total}",
              total.toLocaleString("pt-BR"),
            )}
          </button>
          <div className="flex h-[34px] items-center gap-2 px-3 text-[11px] font-medium text-casca-texto">
            {t("Selecionar")}
            <input
              type="number"
              min={0}
              max={total}
              value={quantidade}
              placeholder="0"
              aria-label={t("Quantidade de contatos")}
              onChange={(e) => {
                setQuantidade(e.target.value);
                aoSelecionarQuantidade(Number(e.target.value));
              }}
              className="h-6 w-16 rounded-[5px] border border-casca-borda bg-casca-busca px-1 text-[12px] text-casca-texto"
            />
            <span
              title={t("Escolha quantos contatos você quer selecionar")}
              className="text-casca-marca"
            >
              <HelpCircle size={14} aria-hidden />
            </span>
          </div>
        </PainelSuspenso>
      </Popover>
    </span>
  );
}
