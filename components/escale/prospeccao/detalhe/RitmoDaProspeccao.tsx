"use client";
import { useState } from "react";
import { toast } from "sonner";

import { useAcaoDaProspeccao } from "@/hooks/escale/useProspeccaoDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { textoDoRitmo } from "@/lib/escale/prospeccao/apresentacao";
import { inteiroDoTexto } from "@/lib/escale/prospeccao/assistente";
import type { DetalheDaProspeccao } from "@/lib/escale/prospeccao/tipos";

import { CampoDeTexto } from "../campos";

/**
 * O RITMO DA PROSPECÇÃO (D10): o texto sempre; com a campanha pausada,
 * "Editar ritmo" troca o limite por dia e o intervalo (`adjust_pace` do
 * original, que só aceita campanha pausada).
 */
export function RitmoDaProspeccao({ detalhe }: { detalhe: DetalheDaProspeccao }) {
  const t = useT();
  const acao = useAcaoDaProspeccao();
  const [edicao, setEdicao] = useState<{ diario: string; intervalo: string } | null>(null);
  const config = detalhe.config;
  if (!config) return null;

  const diario = edicao ? inteiroDoTexto(edicao.diario) : null;
  const intervalo = edicao ? inteiroDoTexto(edicao.intervalo) : null;
  const valido =
    diario !== null &&
    diario >= 1 &&
    diario <= 50 &&
    intervalo !== null &&
    intervalo >= 5 &&
    intervalo <= 1440;

  async function salvar() {
    if (!valido || diario === null || intervalo === null) return;
    try {
      await acao.mutateAsync({
        action: "adjust_pace",
        id: detalhe.linha.id,
        daily_limit: diario,
        interval_minutes: intervalo,
      });
      toast.success(t("Ritmo atualizado. A campanha continua pausada."));
      setEdicao(null);
    } catch (e) {
      toast.error(
        e instanceof Error && e.message ? e.message : t("Não foi possível concluir a operação."),
      );
    }
  }

  return (
    <div className="space-y-2">
      <p className="text-[12px] text-casca-texto">
        {textoDoRitmo(config.daily_limit, config.interval_minutes, t)}
      </p>
      {detalhe.status === "paused" && !edicao ? (
        <button
          type="button"
          onClick={() =>
            setEdicao({
              diario: String(config.daily_limit),
              intervalo: String(config.interval_minutes),
            })
          }
          className="text-[12px] font-medium text-casca-marca hover:underline"
        >
          {t("Editar ritmo")}
        </button>
      ) : null}
      {edicao ? (
        <div className="space-y-3 rounded-md border border-casca-borda p-3">
          <div className="grid grid-cols-2 gap-3">
            <CampoDeTexto
              id="ritmo-diario"
              numerico
              rotulo={t("Máximo em 24 horas")}
              valor={edicao.diario}
              aoMudar={(v) => setEdicao({ ...edicao, diario: v })}
            />
            <CampoDeTexto
              id="ritmo-intervalo"
              numerico
              rotulo={t("Intervalo mínimo (minutos)")}
              valor={edicao.intervalo}
              aoMudar={(v) => setEdicao({ ...edicao, intervalo: v })}
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setEdicao(null)}
              className="h-8 rounded-casca-gatilho px-3 text-[12px] text-casca-texto-2 hover:bg-casca-raia"
            >
              {t("Cancelar")}
            </button>
            <button
              type="button"
              onClick={() => void salvar()}
              disabled={!valido || acao.isPending}
              className="h-8 rounded-casca-gatilho bg-casca-marca px-3 text-[12px] font-medium text-accent-foreground hover:bg-casca-marca-forte disabled:opacity-50"
            >
              {t("Salvar ritmo")}
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
