"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { CAMPO_HORA, type CampoDeHorario, type OperadorDeHorario } from "@/lib/automation/condicoes-de-horario";
import type { LinhaDeCondicao } from "@/lib/automation/desenho-da-regra";
import { resumoDoHorario, textoDoResumoDoHorario } from "@/lib/escale/automacoes/fluxo/condicoes";
import { Calendar, Clock, Trash2 } from "@/lib/ui/icons-da-casca";

import { EditorDeHorario } from "./EditorDeHorario";

/**
 * A condição "Horário atual" no painel: bloco cinza "🕒 Horário atual **está entre**" com o intervalo
 * embaixo (as frases do nó da Clint). Clicar reabre o editor com o que estava gravado.
 */
export function LinhaDeHorario({
  linha,
  indice,
  fuso,
  aoMudar,
  aoRemover,
}: {
  linha: LinhaDeCondicao;
  indice: number;
  fuso: string;
  aoMudar: (op: OperadorDeHorario, value: string) => void;
  aoRemover: () => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const resumo = resumoDoHorario(linha);
  const Icone = linha.field === CAMPO_HORA ? Clock : Calendar;
  return (
    <div className="flex items-start gap-2 rounded-lg bg-casca-raia p-3" data-testid={`condicao-${indice}`}>
      <Popover open={aberto} onOpenChange={setAberto}>
        <PopoverTrigger asChild>
          <button type="button" aria-label={t("Editar condição de horário")} className="min-w-0 flex-1 text-left">
            <span className="flex items-center gap-1.5 text-[13px] text-casca-texto">
              <Icone size={13} aria-hidden className="shrink-0 text-casca-texto-2" />
              {t("Horário atual")}
              <u className="font-semibold">{resumo ? t(resumo.frase) : t("Revise o horário da condição.")}</u>
            </span>
            {resumo ? (
              <span className="mt-1 block text-[12px] text-casca-texto-2">{textoDoResumoDoHorario(linha.field, resumo, t)}</span>
            ) : null}
          </button>
        </PopoverTrigger>
        <PainelSuspenso side="right" align="start" sideOffset={12} className="p-0">
          <EditorDeHorario
            campo={linha.field as CampoDeHorario}
            inicial={linha}
            fuso={fuso}
            aoCancelar={() => setAberto(false)}
            aoConfirmar={(op, value) => {
              aoMudar(op, value);
              setAberto(false);
            }}
          />
        </PainelSuspenso>
      </Popover>
      <button
        type="button"
        aria-label={t("Remover condição")}
        onClick={aoRemover}
        className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:text-casca-alerta"
      >
        <Trash2 size={14} aria-hidden />
      </button>
    </div>
  );
}
