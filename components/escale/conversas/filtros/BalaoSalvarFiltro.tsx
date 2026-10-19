"use client";
import { useState } from "react";
import { toast } from "sonner";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useCriarFiltroDaLista } from "@/hooks/escale/useFiltrosDaLista";
import { useT } from "@/hooks/i18n/useT";
import {
  enxugarFiltrosDoPainel,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";
import { Bookmark } from "@/lib/ui/icons-da-casca";

/** "Salvar filtro" (c71, c72; B6): o balão "NOME DO FILTRO". O 409 e o 422 trazem a mensagem da rota (2B). */
export function BalaoSalvarFiltro({ painel }: { painel: FiltrosDoPainel }) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const criar = useCriarFiltroDaLista("conversas");
  const salvar = () => {
    const limpo = nome.trim();
    if (!limpo || limpo.length > 60) {
      toast.error(t("Dê ao filtro um nome de 1 a 60 caracteres."));
      return;
    }
    criar.mutate(
      { nome: limpo, compartilhado: false, criterios: enxugarFiltrosDoPainel(painel) },
      {
        onSuccess: () => {
          toast.success(t("Filtro salvo."));
          setAberto(false);
          setNome("");
        },
        onError: (e) =>
          toast.error(
            e instanceof Error ? e.message : t("Ocorreu um erro ao executar a ação em massa!"),
          ),
      },
    );
  };
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          className="flex h-7 items-center gap-1 rounded-casca-gatilho px-2 text-[12px] font-medium text-casca-marca hover:bg-casca-marca-suave"
        >
          <Bookmark size={14} aria-hidden />
          {t("Salvar filtro")}
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="center" sideOffset={6} className="w-[260px] p-4">
        <label className="flex flex-col gap-2">
          <span className="text-[10px] font-semibold tracking-wide text-casca-sobrelinha uppercase">
            {t("Nome do filtro")}
          </span>
          <input
            autoFocus
            value={nome}
            maxLength={60}
            onChange={(e) => setNome(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") salvar();
            }}
            placeholder={t("Ex: Clientes em aberto")}
            className="h-8 rounded-casca-gatilho border border-casca-marca px-2.5 text-[13px] text-casca-texto outline-hidden placeholder:text-casca-meta"
          />
        </label>
        <div className="mt-3 flex justify-end gap-2">
          <button
            type="button"
            onClick={() => setAberto(false)}
            className="h-7 px-2 text-[12px] text-casca-texto"
          >
            {t("Cancelar")}
          </button>
          <button
            type="button"
            disabled={criar.isPending}
            onClick={salvar}
            className="h-7 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-semibold text-white disabled:opacity-60"
          >
            {t("Salvar")}
          </button>
        </div>
      </PainelSuspenso>
    </Popover>
  );
}
