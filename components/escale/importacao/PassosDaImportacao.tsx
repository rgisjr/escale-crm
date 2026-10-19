"use client";
import { useT } from "@/hooks/i18n/useT";
import { Check } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/**
 * O INDICADOR DE PASSOS DA IMPORTAÇÃO (fork Escale, Fase 1E; generalizado na 2F; Clint v2, v2-06 a
 * v2-11): faixa de 64px com um círculo de 32px por passo e um traço entre eles.
 * `atual` é o passo em andamento, de 1 em diante; o que vem antes está concluído
 * (círculo cheio da marca com ✓) e o traço depois de um passo concluído também
 * é da marca. `atual` maior que o número de passos marca todos como concluídos.
 */
export function PassosDaImportacao({
  atual,
  rotulos,
}: {
  atual: number;
  rotulos: readonly string[];
}) {
  const t = useT();
  return (
    <div className="flex h-16 shrink-0 items-center border-b border-[#F1F0F5] px-6">
      <ol aria-label={t("Passos da importação")} className="flex w-full items-center">
        {rotulos.map((rotulo, i) => {
          const numero = i + 1;
          const concluido = numero < atual;
          const emAndamento = numero === atual;
          const ultimo = i === rotulos.length - 1;
          return (
            <li
              key={rotulo}
              aria-current={emAndamento ? "step" : undefined}
              className={cn("flex items-center", !ultimo && "flex-1")}
            >
              <span
                className={cn(
                  "grid size-8 shrink-0 place-items-center rounded-full border text-[13px]",
                  concluido && "border-casca-marca bg-casca-marca text-accent-foreground",
                  emAndamento &&
                    "border-casca-marca text-casca-marca ring-2 ring-casca-marca-suave",
                  !concluido && !emAndamento && "border-[#D9D8E0] text-casca-texto",
                )}
              >
                {concluido ? <Check size={16} strokeWidth={3} aria-hidden /> : numero}
              </span>
              <span className="ml-3 text-[13px] whitespace-nowrap text-casca-texto">{rotulo}</span>
              {ultimo ? null : (
                <span
                  aria-hidden
                  className={cn("mx-3 h-px flex-1", concluido ? "bg-casca-marca" : "bg-[#E4E4E9]")}
                />
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
