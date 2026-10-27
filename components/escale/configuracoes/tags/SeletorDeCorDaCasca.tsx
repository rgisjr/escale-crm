"use client";
import { useT } from "@/hooks/i18n/useT";
import { PALETA_DA_CASCA } from "@/lib/escale/tags/paleta";
import { cn } from "@/lib/utils";

/** As 16 bolinhas da Clint (print 04): duas fileiras de 8; a escolhida com anel. */
export function SeletorDeCorDaCasca({ valor, aoMudar }: { valor: string; aoMudar: (chave: string) => void }) {
  const t = useT();
  return (
    <div role="radiogroup" aria-label={t("Cor")} className="grid grid-cols-8 gap-2">
      {PALETA_DA_CASCA.map((tom) => {
        const escolhida = tom.chave === valor;
        return (
          <button
            key={tom.chave}
            type="button"
            role="radio"
            aria-checked={escolhida}
            aria-label={t(tom.nome)}
            title={t(tom.nome)}
            onClick={() => aoMudar(tom.chave)}
            className={cn(
              "size-5 rounded-full outline-offset-2 focus-visible:outline-2 focus-visible:outline-casca-marca",
              escolhida && "ring-2 ring-white ring-inset",
            )}
            style={{ backgroundColor: tom.chave, boxShadow: escolhida ? `0 0 0 2px ${tom.chave}` : undefined }}
          />
        );
      })}
    </div>
  );
}
