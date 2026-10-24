"use client";

import { Fragment, useEffect, useState } from "react";

import { useT } from "@/hooks/i18n/useT";
import type { ParteDaPrevia } from "@/lib/escale/campanhas/previa";
import { ArrowLeft, BatteryMedium, CheckCheck, EllipsisVertical, Phone, Signal, Video, Wifi } from "@/lib/ui/icons-da-casca";

const HORA = new Intl.DateTimeFormat("pt-BR", { hour: "2-digit", minute: "2-digit", hour12: false });

/** A hora de agora, só no navegador (no servidor ficaria diferente e a hidratação reclamaria). */
function useHora(): string {
  const [hora, setHora] = useState("");
  useEffect(() => setHora(HORA.format(new Date())), []);
  return hora;
}

/**
 * A PRÉVIA NO CELULAR (fork Escale, Fase 8B; 09-018, 09-025, 09-044): moldura,
 * barra de status e cabeçalho do WhatsApp com o nome do dispositivo, e o balão
 * com as variáveis em chip. Hora em 24 h (regra 5 do CLAUDE.md).
 */
export function PreviaDoCelular({
  dispositivo,
  partes,
  vazio,
}: {
  dispositivo: string | null;
  partes: readonly ParteDaPrevia[] | null;
  vazio: string;
}) {
  const t = useT();
  const hora = useHora();
  const nome = dispositivo ?? t("Dispositivo");
  return (
    <div className="sticky top-0 mx-auto flex h-[560px] w-[340px] flex-col overflow-hidden rounded-[44px] border-[10px] border-(--escale-celular-moldura) bg-(--escale-celular-fundo)">
      <div className="flex h-7 shrink-0 items-center justify-between bg-(--escale-celular-cabecalho) px-5 text-[13px] font-semibold text-white">
        <span>{hora}</span>
        <span aria-hidden className="flex items-center gap-1">
          <Signal className="size-3.5" />
          <Wifi className="size-3.5" />
          <BatteryMedium className="size-4" />
        </span>
      </div>
      <div className="flex h-14 shrink-0 items-center gap-2.5 bg-(--escale-celular-cabecalho) px-3 text-white">
        <ArrowLeft className="size-[18px] shrink-0" aria-hidden />
        <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full bg-white/25 text-[13px] font-semibold">
          {nome.trim().charAt(0).toUpperCase()}
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[15px] font-semibold">{nome}</span>
          <span className="block text-[11px] opacity-80">{t("online")}</span>
        </span>
        <span aria-hidden className="flex shrink-0 items-center gap-3">
          <Video className="size-[18px]" />
          <Phone className="size-4" />
          <EllipsisVertical className="size-4" />
        </span>
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-3">
        {partes && partes.length > 0 ? (
          <div className="max-w-[85%] rounded-[8px] rounded-tl-none bg-(--escale-celular-balao) p-2.5 text-[13px] whitespace-pre-wrap text-casca-texto shadow-xs">
            {partes.map((p, i) =>
              p.tipo === "texto" ? (
                <Fragment key={i}>{p.texto}</Fragment>
              ) : (
                <span key={i} className="mx-0.5 rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 font-medium text-casca-marca">
                  {p.rotulo}
                </span>
              ),
            )}
            <span className="mt-1 flex items-center justify-end gap-1 text-[11px] text-casca-meta">
              {hora}
              <CheckCheck className="size-3.5 text-(--escale-celular-visto)" aria-hidden />
            </span>
          </div>
        ) : (
          <p className="flex h-full items-center justify-center px-6 text-center text-[13px] text-casca-suave">{vazio}</p>
        )}
      </div>
    </div>
  );
}
