"use client";
import { useState } from "react";

import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useTagDeIdioma } from "@/hooks/i18n/useLocaleDeData";
import { useT } from "@/hooks/i18n/useT";
import { horaValida, mascararHora } from "@/lib/escale/negocio/atividades";
import {
  dataDoIso,
  diasDoMes,
  formatarDataBr,
  isoDaData,
  mesVizinho,
} from "@/lib/escale/ui/periodos";
import { Calendar, ChevronLeft, ChevronRight } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

const doisDigitos = (n: number) => String(n).padStart(2, "0");
const horaDe = (d: Date) => `${doisDigitos(d.getHours())}:${doisDigitos(d.getMinutes())}`;

/**
 * DATA E HORA DA CLINT (fork Escale, Fase 1I; print 002, P16): a caixa
 * "dd/mm/aaaa 📅" abre o calendário de UM dia (a mesma grade do
 * `CalendarioDePeriodo`: semana de domingo a sábado), "às", e a hora em texto
 * HH:mm (24 h). Nunca o `<input type="date|time">` do navegador.
 */
export function SeletorDeDataEHora({
  valor,
  aoMudar,
}: {
  valor: Date;
  aoMudar: (d: Date) => void;
}) {
  const t = useT();
  const idioma = useTagDeIdioma();
  const [aberto, setAberto] = useState(false);
  const [mes, setMes] = useState({ ano: valor.getFullYear(), mes0: valor.getMonth() });
  const [hora, setHora] = useState(horaDe(valor));
  const escolhido = isoDaData(valor);
  const dias = diasDoMes(mes.ano, mes.mes0);
  const titulo = new Date(mes.ano, mes.mes0, 1).toLocaleDateString(idioma, {
    month: "long",
    year: "numeric",
  });
  const semana = dias
    .slice(0, 7)
    .map((d) =>
      dataDoIso(d.iso)
        .toLocaleDateString(idioma, { weekday: "short" })
        .replace(".", "")
        .slice(0, 3)
        .toUpperCase(),
    );

  const abrir = (sim: boolean) => {
    if (sim) setMes({ ano: valor.getFullYear(), mes0: valor.getMonth() });
    setAberto(sim);
  };
  const escolherDia = (iso: string) => {
    const d = dataDoIso(iso);
    d.setHours(valor.getHours(), valor.getMinutes(), 0, 0);
    aoMudar(d);
    setAberto(false);
  };
  const digitarHora = (texto: string) => {
    const mascarada = mascararHora(texto);
    setHora(mascarada);
    const hm = horaValida(mascarada);
    if (!hm) return;
    const d = new Date(valor);
    d.setHours(hm.h, hm.m, 0, 0);
    aoMudar(d);
  };

  return (
    <div className="flex items-center gap-3">
      <Popover open={aberto} onOpenChange={abrir}>
        <PopoverTrigger asChild>
          <button
            type="button"
            aria-label={t("Data")}
            className="flex h-[52px] w-[208px] items-center justify-between rounded-[4px] bg-casca-raia px-4 text-[14px] text-casca-texto hover:bg-casca-marca-suave"
          >
            {formatarDataBr(escolhido)}
            <Calendar size={18} aria-hidden className="text-casca-texto-2" />
          </button>
        </PopoverTrigger>
        <PainelSuspenso className="w-[300px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <button
              type="button"
              aria-label={t("Mês anterior")}
              onClick={() => setMes((m) => mesVizinho(m.ano, m.mes0, -1))}
              className="grid size-7 place-items-center rounded-[6px] hover:bg-casca-raia"
            >
              <ChevronLeft size={16} aria-hidden />
            </button>
            <p className="text-sm font-medium text-casca-texto capitalize">{titulo}</p>
            <button
              type="button"
              aria-label={t("Próximo mês")}
              onClick={() => setMes((m) => mesVizinho(m.ano, m.mes0, 1))}
              className="grid size-7 place-items-center rounded-[6px] hover:bg-casca-raia"
            >
              <ChevronRight size={16} aria-hidden />
            </button>
          </div>
          <div aria-hidden className="mb-2 grid grid-cols-7 gap-x-1.5">
            {semana.map((d) => (
              <span key={d} className="text-center text-[0.7rem] font-semibold text-casca-texto">
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-1.5 gap-y-[7px]">
            {dias.map((d) => (
              <button
                key={d.iso}
                type="button"
                aria-label={formatarDataBr(d.iso)}
                aria-pressed={d.iso === escolhido}
                onClick={() => escolherDia(d.iso)}
                className={cn(
                  "h-[30px] w-8 rounded-[6px] text-[0.8rem] font-medium transition-colors",
                  d.iso === escolhido
                    ? "bg-casca-marca text-accent-foreground"
                    : d.doMes
                      ? "text-casca-texto hover:bg-casca-raia"
                      : "text-casca-meta hover:bg-casca-raia",
                )}
              >
                {Number(d.iso.slice(8))}
              </button>
            ))}
          </div>
        </PainelSuspenso>
      </Popover>
      <span className="text-[14px] text-casca-suave">{t("às")}</span>
      <input
        type="text"
        inputMode="numeric"
        aria-label={t("Hora")}
        value={hora}
        maxLength={5}
        placeholder="00:00"
        onChange={(e) => digitarHora(e.target.value)}
        className="h-[52px] w-[74px] rounded-[4px] border-0 bg-casca-raia px-3 text-center text-[14px] text-casca-texto outline-hidden focus:ring-2 focus:ring-casca-marca"
      />
    </div>
  );
}
