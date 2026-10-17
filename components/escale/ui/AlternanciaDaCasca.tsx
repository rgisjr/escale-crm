"use client";
import { cn } from "@/lib/utils";

/**
 * Os dois lados da Clint ("Durante a etapa | Ao entrar" lá; "Ao sair | Ao entrar" aqui, F7; P12 e P13 de
 * docs/clint/prints-1f): o ativo é branco com contorno e texto azuis; o outro,
 * cinza claro, sem contorno.
 */
export function AlternanciaDaCasca<V extends string>({
  valor,
  opcoes,
  aoMudar,
  "aria-label": rotulo,
  desabilitada = false,
}: {
  valor: V;
  opcoes: { valor: V; rotulo: string }[];
  aoMudar: (v: V) => void;
  "aria-label": string;
  desabilitada?: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={rotulo} className="inline-flex items-center gap-1">
      {opcoes.map((o) => {
        const ativa = o.valor === valor;
        return (
          <button
            key={o.valor}
            type="button"
            role="radio"
            aria-checked={ativa}
            disabled={desabilitada}
            onClick={() => aoMudar(o.valor)}
            className={cn(
              "h-[26px] rounded-[5px] border px-2 text-[11px] whitespace-nowrap transition disabled:cursor-not-allowed disabled:opacity-60",
              ativa
                ? "border-(--escale-alternancia-ativa) bg-surface font-medium text-(--escale-alternancia-ativa)"
                : "border-transparent bg-(--escale-alternancia) text-casca-texto",
            )}
          >
            {o.rotulo}
          </button>
        );
      })}
    </div>
  );
}
