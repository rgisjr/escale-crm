"use client";
import { useT } from "@/hooks/i18n/useT";
import { MAXIMO_DE_HORAS_DA_REPETICAO } from "@/lib/escale/comentarios/constantes";
import type { RepeticaoDoComentario as Repeticao } from "@/lib/escale/comentarios/schema";
import { cn } from "@/lib/utils";

/**
 * "QUANTAS VEZES A MESMA PESSOA RECEBE" (fork Escale, Fase 10D, D10): uma vez por pessoa (padrão) ou
 * de novo depois de N horas (1 a 720). Provisório: não existe na Clint.
 */
export function RepeticaoDoComentario({ repeticao, aoMudar }: { repeticao: Repeticao; aoMudar: (r: Repeticao) => void }) {
  const t = useT();
  const intervalo = repeticao.modo === "intervalo" ? repeticao.horas : null;
  const invalido = intervalo !== null && (!Number.isInteger(intervalo) || intervalo < 1 || intervalo > MAXIMO_DE_HORAS_DA_REPETICAO);

  return (
    <div className="flex flex-col gap-2" data-testid="repeticao-do-comentario">
      <p className="text-[13px] font-semibold text-casca-texto">{t("Quantas vezes a mesma pessoa recebe")}</p>
      <div className="flex gap-2" role="group" aria-label={t("Quantas vezes a mesma pessoa recebe")}>
        {(["uma_vez", "intervalo"] as const).map((modo) => (
          <button
            key={modo}
            type="button"
            aria-pressed={repeticao.modo === modo}
            onClick={() => repeticao.modo !== modo && aoMudar(modo === "uma_vez" ? { modo } : { modo, horas: 24 })}
            className={cn(
              "h-8 flex-1 rounded-md border text-[12px]",
              repeticao.modo === modo
                ? "border-casca-marca bg-casca-marca-suave text-casca-texto"
                : "border-casca-divisoria text-casca-texto-2 hover:bg-casca-raia",
            )}
          >
            {modo === "uma_vez" ? t("Uma vez por pessoa") : t("De novo depois de")}
          </button>
        ))}
      </div>
      {intervalo !== null ? (
        <div className="flex items-center gap-2">
          <input
            type="text"
            inputMode="numeric"
            aria-label={t("Horas")}
            value={Number.isNaN(intervalo) ? "" : String(intervalo)}
            onChange={(e) => aoMudar({ modo: "intervalo", horas: e.target.value.trim() === "" ? Number.NaN : Number(e.target.value) })}
            className="h-9 w-24 rounded-[4px] bg-casca-raia px-3 text-[13px] text-casca-texto outline-hidden"
          />
          <span className="text-[12px] text-casca-texto-2">{t("horas")}</span>
        </div>
      ) : null}
      {invalido ? (
        <p role="alert" className="text-[11px] text-casca-alerta">
          {t("Informe de 1 a 720 horas.")}
        </p>
      ) : null}
    </div>
  );
}
