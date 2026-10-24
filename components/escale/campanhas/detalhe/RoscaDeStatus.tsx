"use client";
import { SecaoDoSumario } from "@/components/escale/campanhas/molde/SecaoDoSumario";
import { useT } from "@/hooks/i18n/useT";
import { numeroBr } from "@/lib/escale/campanhas/apresentacao";
import {
  ROTULO_DA_FATIA,
  fatiasDaRosca,
  type ChaveDaFatia,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { CLASSE_DA_FATIA, TRACO_DO_TRILHO_DA_ROSCA } from "@/lib/escale/campanhas/detalhe/cores";
import type { SumarioDaCampanha } from "@/lib/escale/campanhas/detalhe/tipos";
import { cn } from "@/lib/utils";

const RAIO = 40;
const TRACO = 14;
const CIRCUNFERENCIA = 2 * Math.PI * RAIO;

type Arco = { chave: ChaveDaFatia; comprimento: number; inicio: number };

/** "DISTRIBUIÇÃO POR STATUS" (009): a rosca de 100px com o total e a legenda com as cores medidas. */
export function RoscaDeStatus({ sumario }: { sumario: SumarioDaCampanha }) {
  const t = useT();
  const fatias = fatiasDaRosca(sumario);
  const total = fatias.reduce((a, f) => a + f.quantidade, 0);
  const arcos = fatias
    .filter((f) => f.quantidade > 0 && total > 0)
    .reduce<Arco[]>((acc, f) => {
      const anterior = acc[acc.length - 1];
      const inicio = anterior ? anterior.inicio + anterior.comprimento : 0;
      return [
        ...acc,
        { chave: f.chave, comprimento: (f.quantidade / total) * CIRCUNFERENCIA, inicio },
      ];
    }, []);
  return (
    <SecaoDoSumario titulo={t("Distribuição por status")}>
      <div className="flex items-center gap-6">
        <div className="relative size-[100px] shrink-0">
          <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
            <circle
              cx="50"
              cy="50"
              r={RAIO}
              fill="none"
              strokeWidth={TRACO}
              className={TRACO_DO_TRILHO_DA_ROSCA}
            />
            {arcos.map((a) => (
              <circle
                key={a.chave}
                data-fatia={a.chave}
                cx="50"
                cy="50"
                r={RAIO}
                fill="none"
                strokeWidth={TRACO}
                strokeDasharray={`${a.comprimento} ${CIRCUNFERENCIA - a.comprimento}`}
                strokeDashoffset={-a.inicio}
                className={CLASSE_DA_FATIA[a.chave].traco}
              />
            ))}
          </svg>
          <span className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-[18px] leading-5 font-semibold">{numeroBr(total)}</span>
            <span className="text-[11px] text-casca-suave">{t("contatos")}</span>
          </span>
        </div>
        <ul className="space-y-2.5">
          {fatias.map((f) => (
            <li key={f.chave} className="flex items-center gap-2 text-[11px]">
              <span
                aria-hidden
                className={cn("size-2 shrink-0 rounded-full", CLASSE_DA_FATIA[f.chave].fundo)}
              />
              <span className="w-[80px]">{t(ROTULO_DA_FATIA[f.chave])}</span>
              <span className="font-semibold">{numeroBr(f.quantidade)}</span>
            </li>
          ))}
        </ul>
      </div>
    </SecaoDoSumario>
  );
}
