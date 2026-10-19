"use client";
import { useEffect, useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useMudarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";

/** "Renomear" de um filtro salvo (provisório, item 1 dos prints que faltam). */
export function JanelaRenomearFiltro({
  filtro,
  aoFechar,
}: {
  filtro: { id: string; nome: string } | null;
  aoFechar: () => void;
}) {
  const t = useT();
  const [nome, setNome] = useState("");
  const mudar = useMudarFiltroDaLista("conversas");
  useEffect(() => setNome(filtro?.nome ?? ""), [filtro]);
  if (!filtro) return null;
  return (
    <JanelaDaCasca aberta onFechar={aoFechar} className="w-[400px] p-0">
      <div className="flex h-14 items-center border-b border-casca-borda px-5 text-[15px] font-medium text-casca-texto">
        {t("Renomear filtro")}
      </div>
      <div className="px-5 py-4">
        <input
          autoFocus
          value={nome}
          maxLength={60}
          aria-label={t("Nome do filtro")}
          onChange={(e) => setNome(e.target.value)}
          className="h-8 w-full rounded-casca-gatilho bg-casca-busca px-3 text-[13px] text-casca-texto outline-hidden"
        />
      </div>
      <div className="px-5 pb-4">
        <RodapeDaJanela>
          <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
            {t("Cancelar")}
          </BotaoDaJanela>
          <BotaoDaJanela
            variante="salvar"
            disabled={mudar.isPending || !nome.trim()}
            onClick={() =>
              mudar.mutate(
                { id: filtro.id, nome: nome.trim() },
                {
                  onSuccess: aoFechar,
                  onError: (e) =>
                    toast.error(
                      e instanceof Error ? e.message : t("Já existe um filtro com esse nome."),
                    ),
                },
              )
            }
          >
            {t("Salvar")}
          </BotaoDaJanela>
        </RodapeDaJanela>
      </div>
    </JanelaDaCasca>
  );
}
