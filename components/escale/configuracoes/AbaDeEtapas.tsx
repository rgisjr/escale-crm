"use client";
import { useT } from "@/hooks/i18n/useT";
import type { ConfiguracoesDaOrigem } from "@/lib/escale/configuracoes/montar";
import { Flag, Plus } from "@/lib/ui/icons-da-casca";

/**
 * A ABA "ETAPAS E ATIVIDADES" (01-009, variante superior), só para leitura
 * nesta fase (F14): as colunas das etapas abertas, sem atividades. O playbook e
 * o "+ Nova atividade" chegam na 1I.
 */
export function AbaDeEtapas({ config }: { config: ConfiguracoesDaOrigem }) {
  const t = useT();
  const abertas = config.etapas.filter((e) => !e.is_won && !e.is_lost);
  return (
    <div className="flex h-full [scrollbar-width:thin] gap-2.5 overflow-x-auto pb-3">
      {abertas.map((etapa, i) => (
        <section
          key={etapa.id}
          aria-label={etapa.name}
          className="flex h-full min-h-[340px] w-[230px] shrink-0 flex-col rounded-[4px] bg-casca-busca"
        >
          <header className="flex h-[38px] items-center gap-2 rounded-t-[4px] bg-casca-raia px-3">
            {i === 0 ? (
              <span
                role="img"
                aria-label={t("Etapa inicial")}
                className="grid size-[18px] place-items-center rounded-full bg-[#DCFCE7] text-[#16A34A]"
              >
                <Flag size={11} aria-hidden />
              </span>
            ) : null}
            <h4 className="truncate text-[12px] font-semibold text-casca-texto">{etapa.name}</h4>
          </header>
          <p className="mx-3 border-b border-casca-borda py-3 text-[11px] font-semibold text-casca-texto">
            {t("Nenhuma atividade nessa etapa")}
          </p>
          <button
            type="button"
            disabled
            title={t("Em breve")}
            className="mx-auto mt-4 flex items-center gap-1 text-[12px] font-medium text-casca-novo disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Plus size={13} aria-hidden />
            {t("Nova atividade")}
          </button>
        </section>
      ))}
    </div>
  );
}
