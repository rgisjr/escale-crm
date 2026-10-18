"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { filtrarVariaveis, type CampoDaVariavel } from "@/lib/escale/playbook/variaveis";
import { Plus } from "@/lib/ui/icons-da-casca";

/** "ADICIONAR VARIÁVEIS" (fork Escale, Fase 1I; P10): o popover da Clint, com busca e os grupos. */
export function VariaveisDaMensagem({
  aoEscolher,
  campos = [],
}: {
  aoEscolher: (nome: string) => void;
  campos?: readonly CampoDaVariavel[];
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [busca, setBusca] = useState("");
  const grupos = filtrarVariaveis(busca, t, campos);

  const mudar = (sim: boolean) => {
    setAberto(sim);
    if (!sim) setBusca("");
  };

  return (
    <Popover open={aberto} onOpenChange={mudar}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-1.5 text-[13px] font-medium text-casca-marca hover:underline"
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar variáveis")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso className="w-[280px] p-0">
        <p className="border-b border-casca-borda px-4 py-3 text-[13px] font-semibold text-casca-texto">
          {t("Variáveis")}
        </p>
        <div className="p-3">
          <input
            type="text"
            aria-label={t("Buscar variável")}
            placeholder={t("Buscar variável")}
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="h-8 w-full rounded-[4px] border-0 bg-casca-raia px-3 text-[12px] text-casca-texto outline-hidden placeholder:text-casca-meta focus:ring-2 focus:ring-casca-marca"
          />
        </div>
        <div className="max-h-[260px] overflow-y-auto pb-2">
          {grupos.length === 0 ? (
            <p className="px-4 py-3 text-[12px] text-casca-suave">
              {t("Nenhuma variável encontrada")}
            </p>
          ) : (
            grupos.map((g) => (
              <div key={g.grupo} role="group" aria-label={t(g.grupo)}>
                <p className="px-4 pt-2 pb-1 text-[10px] font-semibold tracking-[0.1em] text-casca-meta uppercase">
                  {t(g.grupo)}
                </p>
                {g.itens.map((v) => (
                  <button
                    key={v.nome}
                    type="button"
                    onClick={() => {
                      aoEscolher(v.nome);
                      mudar(false);
                    }}
                    className="flex w-full items-center justify-between gap-2 px-4 py-1.5 text-left text-[12px] text-casca-texto hover:bg-casca-raia"
                  >
                    <span>{t(v.rotulo)}</span>
                    <span className="truncate text-[10px] text-casca-meta">{v.nome}</span>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
