"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import { rotuloDaHora, varreDias } from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { PontoDoRitmo } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

const ALTURA_DAS_BARRAS = 120;
const BARRAS_LARGAS_ATE = 8;

/** "RITMO DE ENVIO" (009, 010): barras por hora na cor da marca, o número em cima e a hora embaixo. */
export function RitmoDeEnvio({ pontos }: { pontos: readonly PontoDoRitmo[] }) {
  const t = useT();
  const maximo = Math.max(1, ...pontos.map((p) => p.envios));
  const variosDias = varreDias(pontos);
  const largura = pontos.length <= BARRAS_LARGAS_ATE ? "w-[72px] shrink-0" : "min-w-3 flex-1";
  return (
    <SecaoDoSumario
      titulo={t("Ritmo de envio")}
      legenda={t("Calculado sobre os 1.000 disparos mais recentes.")}
    >
      {pontos.length === 0 ? (
        <p className="py-6 text-center text-[12px] text-casca-suave">{t("Nenhum envio ainda")}</p>
      ) : (
        <div className="overflow-x-auto">
          <div className="flex h-[150px] items-end justify-center gap-4 border-b border-casca-divisoria">
            {pontos.map((p) => (
              <div
                key={p.hora}
                data-hora={p.hora}
                className={cn("flex h-full flex-col items-center justify-end", largura)}
              >
                <span className="mb-1 text-[12px] font-semibold">{numeroBr(p.envios)}</span>
                <div
                  data-barra
                  className="w-full rounded-t-[4px] bg-casca-marca"
                  style={{
                    height: `${Math.max(2, Math.round((p.envios / maximo) * ALTURA_DAS_BARRAS))}px`,
                  }}
                />
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-4 pt-2">
            {pontos.map((p) => (
              <span
                key={p.hora}
                className={cn("text-center text-[12px] text-casca-suave", largura)}
              >
                {rotuloDaHora(p.hora, variosDias)}
              </span>
            ))}
          </div>
        </div>
      )}
    </SecaoDoSumario>
  );
}
