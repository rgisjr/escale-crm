"use client";
import { useState } from "react";
import { toast } from "sonner";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useT } from "@/hooks/i18n/useT";

/** "EDITAR DATA E HORA" (fork Escale, Fase 1I; P13): o ⋮ da atividade troca o prazo. */
export function JanelaEditarDataEHora({
  aberta,
  atividade,
  aoFechar,
  aoSalvar,
}: {
  aberta: boolean;
  atividade: { title: string; due_date: string | null };
  aoFechar: () => void;
  aoSalvar: (iso: string) => Promise<unknown>;
}) {
  const t = useT();
  const [quando, setQuando] = useState(() =>
    atividade.due_date ? new Date(atividade.due_date) : new Date(),
  );
  const [enviando, setEnviando] = useState(false);

  const salvar = async () => {
    setEnviando(true);
    try {
      await aoSalvar(quando.toISOString());
      toast.success(t("A data e a hora da atividade foram alteradas com sucesso"));
      aoFechar();
    } catch {
      toast.error(t("Erro ao atualizar atividade. Tente novamente."));
    } finally {
      setEnviando(false);
    }
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(92vw,520px)]">
      <CabecaDaJanela titulo={t("Editar data e hora")} descricao={atividade.title} />
      <SeletorDeDataEHora valor={quando} aoMudar={setQuando} />
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela
          variante="salvar"
          disabled={enviando}
          title={enviando ? t("Salvando…") : undefined}
          onClick={() => void salvar()}
        >
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
