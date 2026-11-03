"use client";
import { useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorMultiploDaCasca } from "@/components/escale/ui/SeletorMultiploDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, rotuloDoFuso, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import {
  DIAS_NA_ORDEM,
  NOME_DO_DIA,
  estadoDoEditorDeHorario,
  mascaraDeDataEHora,
  mascaraDeHora,
  montarValorDoHorario,
} from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, ChevronLeft, Clock } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const OPCOES: readonly { op: OperadorDeHorario; rotulo: string }[] = [
  { op: "depois_de", rotulo: "Depois de" },
  { op: "antes_de", rotulo: "Antes de" },
  { op: "entre", rotulo: "Entre" },
];

/**
 * O EDITOR DE "HORÁRIO ATUAL" (prints da Clint de 03/11/2026, Hora e Data): "< Voltar", o título com o
 * ícone, as três opções à esquerda com a divisória, os campos cinza à direita, "(UTC -3)" e Cancelar /
 * Confirmar. Hora e data em texto com máscara, nunca o controle nativo do navegador. Confirmar só liga
 * com o valor completo.
 */
export function EditorDeHorario({
  campo,
  inicial,
  fuso,
  aoVoltar,
  aoCancelar,
  aoConfirmar,
}: {
  campo: CampoDeHorario;
  inicial?: { op: string; value: string };
  fuso: string;
  aoVoltar?: () => void;
  aoCancelar: () => void;
  aoConfirmar: (op: OperadorDeHorario, value: string) => void;
}) {
  const t = useT();
  const [estado, setEstado] = useState(() => estadoDoEditorDeHorario(campo, inicial));
  const ehHora = campo === CAMPO_HORA;
  const Icone = ehHora ? Clock : Calendar;
  const mascara = ehHora ? mascaraDeHora : mascaraDeDataEHora;
  const entre = estado.op === "entre";
  const valor = montarValorDoHorario(campo, estado.op, estado.de, estado.ate, estado.dias);
  const classeDoCampo = ehHora ? "w-[88px] px-0 text-center" : "w-[220px]";
  const placeholderDaData = t("dd/MM/yyyy HH:mm");

  return (
    <div className="flex w-[560px] flex-col p-5" data-testid="editor-de-horario">
      {aoVoltar ? (
        <button type="button" onClick={aoVoltar} className="flex w-fit items-center gap-1 text-[13px] text-casca-marca">
          <ChevronLeft size={14} aria-hidden />
          {t("Voltar")}
        </button>
      ) : null}
      <p className="mt-6 flex items-center gap-1.5 text-[14px] font-semibold text-casca-texto">
        <Icone size={14} aria-hidden />
        {ehHora ? t("Hora") : t("Data")}
      </p>
      <div className="mt-6 flex min-h-[150px]">
        <div
          role="radiogroup"
          aria-label={ehHora ? t("Hora") : t("Data")}
          className="flex w-[150px] shrink-0 flex-col gap-4 border-r border-casca-divisoria pt-2"
        >
          {OPCOES.map((o) => (
            <button
              key={o.op}
              type="button"
              role="radio"
              aria-checked={estado.op === o.op}
              onClick={() => setEstado({ ...estado, op: o.op })}
              className="flex items-center gap-2 text-left text-[14px] text-casca-texto"
            >
              <span
                aria-hidden
                className={cn(
                  "inline-block size-3.5 rounded-full border",
                  estado.op === o.op
                    ? "border-casca-marca bg-casca-marca shadow-[inset_0_0_0_3px_var(--escale-superficie)]"
                    : "border-casca-borda",
                )}
              />
              {t(o.rotulo)}
            </button>
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-3 pl-5">
          <div className="flex items-center gap-3">
            <CampoDeTexto
              inputMode="numeric"
              aria-label={entre ? (ehHora ? t("Hora inicial") : t("Data inicial")) : ehHora ? t("Hora") : t("Data")}
              value={estado.de}
              placeholder={ehHora ? "08:00" : placeholderDaData}
              onChange={(e) => setEstado({ ...estado, de: mascara(e.target.value) })}
              className={classeDoCampo}
            />
            {entre ? (
              <>
                <span className="text-[14px] text-casca-texto">{t("até")}</span>
                <CampoDeTexto
                  inputMode="numeric"
                  aria-label={ehHora ? t("Hora final") : t("Data final")}
                  value={estado.ate}
                  placeholder={ehHora ? "18:00" : placeholderDaData}
                  onChange={(e) => setEstado({ ...estado, ate: mascara(e.target.value) })}
                  className={classeDoCampo}
                />
              </>
            ) : null}
          </div>
          {ehHora ? (
            <div className="flex flex-col gap-2">
              <span className="text-[14px] text-casca-texto">{t("Dias da semana")}</span>
              <SeletorMultiploDaCasca
                aria-label={t("Dias da semana")}
                vazio={t("Selecione os dias")}
                valores={estado.dias}
                aoMudar={(dias) => setEstado({ ...estado, dias })}
                opcoes={DIAS_NA_ORDEM.map((d) => ({ valor: String(d), rotulo: t(NOME_DO_DIA[d]) }))}
              />
            </div>
          ) : null}
          <span className="text-[13px] text-casca-suave">{rotuloDoFuso(fuso)}</span>
        </div>
      </div>
      <div className="mt-6 flex justify-end gap-2">
        <button
          type="button"
          onClick={aoCancelar}
          className="h-10 rounded-md border border-casca-borda px-5 text-[14px] text-casca-texto hover:bg-casca-raia"
        >
          {t("Cancelar")}
        </button>
        <button
          type="button"
          disabled={valor === null}
          onClick={() => {
            if (valor !== null) aoConfirmar(estado.op, valor);
          }}
          className="h-10 rounded-md bg-casca-marca px-5 text-[14px] font-medium text-white disabled:opacity-60"
        >
          {t("Confirmar")}
        </button>
      </div>
    </div>
  );
}
