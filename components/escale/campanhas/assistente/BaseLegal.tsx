"use client";

import { useId } from "react";

import { useT } from "@/hooks/i18n/useT";
import { cn } from "@/lib/utils";

import { CartaoDeEscolha } from "../molde/CartaoDeEscolha";
import { CAMPO, ROTULO } from "../molde/estilos";

type Base = "consent" | "legitimate_interest";

/** A BASE LEGAL (fork Escale, Fase 8B; PRD B16): obrigatória, como no original (LGPD). */
export function BaseLegal({
  baseLegal,
  lia,
  aoMudar,
  erro,
}: {
  baseLegal: Base;
  lia: string | null;
  aoMudar: (v: { baseLegal: Base; lia: string | null }) => void;
  erro?: string | null;
}) {
  const t = useT();
  const id = useId();
  return (
    <div>
      <span className={ROTULO}>{t("Base legal")}</span>
      <div role="radiogroup" aria-label={t("Base legal")} className="grid grid-cols-2 gap-3">
        <CartaoDeEscolha
          selecionado={baseLegal === "consent"}
          aoEscolher={() => aoMudar({ baseLegal: "consent", lia: null })}
          titulo={t("Consentimento")}
          descricao={t("A pessoa autorizou receber mensagens.")}
        />
        <CartaoDeEscolha
          selecionado={baseLegal === "legitimate_interest"}
          aoEscolher={() => aoMudar({ baseLegal: "legitimate_interest", lia })}
          titulo={t("Interesse legítimo")}
          descricao={t("Uma avaliação (LIA) justifica o contato.")}
        />
      </div>
      {baseLegal === "legitimate_interest" && (
        <div className="mt-4">
          <label htmlFor={id} className={ROTULO}>
            {t("Referência da avaliação (LIA)")}
          </label>
          <input
            id={id}
            value={lia ?? ""}
            maxLength={120}
            onChange={(e) => aoMudar({ baseLegal, lia: e.target.value })}
            className={cn(CAMPO, erro && "border-casca-alerta")}
          />
          {erro && (
            <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
              {erro}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
