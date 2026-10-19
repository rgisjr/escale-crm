"use client";

import { useState } from "react";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

type Modo = "manter" | "limpar";

/** "Nova empresa" de trocar a empresa do contato (Clint `OrganizationChange`): Manter ou Limpar os campos. */
export function JanelaTrocarEmpresa({
  aberta,
  nome,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  nome: string;
  aoFechar: () => void;
  aoConfirmar: (campos: Modo) => void;
}) {
  const t = useT();
  const [modo, setModo] = useState<Modo | null>(null);
  const opcoes: Array<{ valor: Modo; titulo: string; texto: string }> = [
    {
      valor: "manter",
      titulo: t("Manter informações dos campos"),
      texto: t(
        "Mantenha os campos atuais, como Site, CNPJ, Estado, Cidade e todos os demais campos de empresa, sem alterações.",
      ),
    },
    {
      valor: "limpar",
      titulo: t("Limpar informações dos campos"),
      texto: t("Apague todos os campos preenchidos para essa empresa."),
    },
  ];

  return (
    <JanelaDaCasca aberta={aberta} onFechar={aoFechar} className="w-[min(640px,100%)]">
      <CabecaDaJanela titulo={t("Nova empresa")} descricao={nome} />
      <div className="flex flex-col gap-3 px-6 pb-2">
        <p className="text-[13px] font-medium text-casca-texto">
          {t("Selecione o que deseja fazer com os campos da nova empresa:")}
        </p>
        <div role="radiogroup" aria-label={t("Campos da nova empresa")} className="flex flex-col gap-2">
          {opcoes.map((o) => (
            <button
              key={o.valor}
              type="button"
              role="radio"
              aria-checked={modo === o.valor}
              aria-label={`${o.titulo}. ${o.texto}`}
              onClick={() => setModo(o.valor)}
              className={cn(
                "rounded-[8px] border px-4 py-3 text-left transition",
                modo === o.valor ? "border-casca-marca bg-casca-marca-suave" : "border-casca-borda hover:bg-casca-raia",
              )}
            >
              <span className="block text-[13px] font-medium text-casca-texto">{o.titulo}</span>
              <span className="block text-[12px] text-casca-suave">{o.texto}</span>
            </button>
          ))}
        </div>
        <p className="text-[11px] text-casca-meta">{t("O CNPJ não é copiado: cada empresa tem o seu.")}</p>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={aoFechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!modo} onClick={() => modo && aoConfirmar(modo)}>
          {t("Salvar")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
