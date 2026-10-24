"use client";
import { useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { Loader2 } from "@/lib/ui/icons-da-casca";

/** As etapas depois de escolher (Clint `ll`/`il`): confirmar, mesclando, concluído e erro. */
export function ConfirmarMescla({
  grupos,
  absorvidos,
  emMassa,
  aoVoltar,
  aoConfirmar,
}: {
  grupos: number;
  absorvidos: number;
  emMassa: boolean;
  aoVoltar: () => void;
  aoConfirmar: () => void;
}) {
  const t = useT();
  const [entendi, setEntendi] = useState(false);
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-4 px-5 py-8">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Confirmar mescla irreversível")}</h3>
      <p className="text-[13px] text-casca-suave">
        {emMassa
          ? t("Você está mesclando vários grupos de uma vez. Revise antes de confirmar.")
          : t("Esta ação consolida os contatos em um único vencedor e não pode ser desfeita.")}
      </p>
      <div className="flex gap-6 text-[13px]">
        <span><strong>{grupos}</strong> {grupos === 1 ? t("grupo") : t("grupos")}</span>
        <span><strong>{absorvidos}</strong> {t("contatos absorvidos")}</span>
      </div>
      <CaixaDaCasca
        marcada={entendi}
        aoMudar={setEntendi}
        rotulo={t("Entendo que a mescla é definitiva e não pode ser desfeita.")}
        aria-label={t("Entendo que a mescla é definitiva e não pode ser desfeita.")}
      />
      <div className="flex justify-between">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVoltar}>{t("Voltar")}</BotaoDaCasca>
        <button
          type="button"
          disabled={!entendi}
          onClick={aoConfirmar}
          className="h-[31px] rounded-casca-gatilho bg-destructive px-4 text-[13px] font-medium text-white disabled:opacity-50"
        >
          {`${t("Confirmar e mesclar")} (${emMassa ? grupos : absorvidos + 1})`}
        </button>
      </div>
    </div>
  );
}

export function Mesclando() {
  const t = useT();
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-5 text-center">
      <Loader2 size={28} aria-hidden className="animate-spin text-casca-marca" />
      <p className="text-[15px] font-medium text-casca-texto">{t("Mesclando contatos…")}</p>
      <p className="max-w-[360px] text-[13px] text-casca-suave">
        {t("Consolidando os contatos, leva só alguns instantes. Mantenha esta janela aberta.")}
      </p>
    </div>
  );
}

export function MesclaConcluida({
  contatos,
  falhas,
  aoVoltar,
  aoVerContato,
  aoConcluir,
}: {
  contatos: number;
  falhas: string[];
  aoVoltar: () => void;
  aoVerContato: (() => void) | null;
  aoConcluir: () => void;
}) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-3 px-5 py-8 text-center">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Contatos mesclados")}</h3>
      <p className="text-[13px] text-casca-suave">{`${contatos} ${t("contatos mesclados.")}`}</p>
      {falhas.length > 0 ? (
        <ul className="text-left text-[12px] text-casca-alerta">
          {falhas.map((f, i) => <li key={i}>{f}</li>)}
        </ul>
      ) : null}
      <div className="mt-2 flex justify-center gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVoltar}>{t("Voltar para a lista")}</BotaoDaCasca>
        {aoVerContato ? <BotaoDaCasca variante="texto" tamanho="md" onClick={aoVerContato}>{t("Ver contato")}</BotaoDaCasca> : null}
        <BotaoDaCasca variante="marca" tamanho="md" onClick={aoConcluir}>{t("Concluir")}</BotaoDaCasca>
      </div>
    </div>
  );
}

export function FalhaDaMescla({ mensagem, aoTentarDeNovo, aoFechar }: { mensagem: string; aoTentarDeNovo: () => void; aoFechar: () => void }) {
  const t = useT();
  return (
    <div className="mx-auto flex max-w-[520px] flex-1 flex-col justify-center gap-3 px-5 py-8 text-center">
      <h3 className="text-[17px] font-semibold text-casca-texto">{t("Falha ao mesclar contatos.")}</h3>
      <p className="text-[13px] text-casca-suave">{mensagem}</p>
      <div className="mt-2 flex justify-center gap-2">
        <BotaoDaCasca variante="texto" tamanho="md" onClick={aoFechar}>{t("Fechar")}</BotaoDaCasca>
        <BotaoDaCasca variante="marca" tamanho="md" onClick={aoTentarDeNovo}>{t("Tentar de novo")}</BotaoDaCasca>
      </div>
    </div>
  );
}
