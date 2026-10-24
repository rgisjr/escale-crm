"use client";
import * as Popover from "@radix-ui/react-popover";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import type { FiltroDasSugestoes } from "@/hooks/escale/useSugestoesDeMescla";
import { useT } from "@/hooks/i18n/useT";
import { REGRAS_DE_MESCLA, ROTULO_DA_REGRA, type RegraDeMescla } from "@/lib/escale/mescla/regras";
import { Funnel } from "@/lib/ui/icons-da-casca";

/** "Filtros" da lista de sugestões (Clint `SuggestionsMerge`): Critérios, Confiança, Tags e Outros. */
export function FiltrosDaMescla({
  filtro,
  aoMudar,
}: {
  filtro: FiltroDasSugestoes;
  aoMudar: (novo: FiltroDasSugestoes) => void;
}) {
  const t = useT();
  const ativos =
    (filtro.regras.length > 0 ? 1 : 0) + (filtro.min > 0 || filtro.max < 100 ? 1 : 0) + (filtro.tags.length > 0 ? 1 : 0) + (filtro.validos ? 1 : 0);
  const alternarRegra = (r: RegraDeMescla, marcada: boolean) =>
    aoMudar({ ...filtro, regras: marcada ? [...filtro.regras, r] : filtro.regras.filter((x) => x !== r) });
  return (
    <Popover.Root>
      <Popover.Trigger className="flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda px-2.5 text-[13px] text-casca-texto hover:bg-casca-raia">
        <Funnel size={14} aria-hidden />
        {t("Filtros")}
        {ativos > 0 ? (
          <span className="rounded-full bg-casca-marca px-1.5 text-[11px] font-semibold text-white">{ativos}</span>
        ) : null}
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content align="start" sideOffset={6} className="z-50 w-[280px] rounded-lg border border-casca-borda bg-surface p-4 text-[13px] shadow-casca-painel">
          <p className="text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Critérios")}</p>
          <p className="mt-1 text-[12px] text-casca-meta">{t("Casou por")}</p>
          <div className="mt-2 flex flex-col gap-2">
            {REGRAS_DE_MESCLA.map((r) => (
              <CaixaDaCasca key={r} marcada={filtro.regras.includes(r)} aoMudar={(m) => alternarRegra(r, m)} rotulo={t(ROTULO_DA_REGRA[r])} aria-label={t(ROTULO_DA_REGRA[r])} />
            ))}
          </div>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Confiança")}</p>
          <div className="mt-2 flex items-center gap-2">
            <input type="number" min={0} max={100} aria-label={t("Confiança")} value={filtro.min} onChange={(e) => aoMudar({ ...filtro, min: Number(e.target.value) || 0 })} className="h-8 w-16 rounded-md bg-casca-busca px-2" />
            <span className="text-casca-suave">{t("até")}</span>
            <input type="number" min={0} max={100} aria-label={t("até")} value={filtro.max} onChange={(e) => aoMudar({ ...filtro, max: Number(e.target.value) || 100 })} className="h-8 w-16 rounded-md bg-casca-busca px-2" />
          </div>
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Tags")}</p>
          <input
            aria-label={t("Filtrar por tags")}
            placeholder={t("Filtrar por tags")}
            value={filtro.tags.join(", ")}
            onChange={(e) => aoMudar({ ...filtro, tags: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })}
            className="mt-2 h-8 w-full rounded-md bg-casca-busca px-2"
          />
          <p className="mt-4 text-[11px] font-semibold tracking-[0.08em] text-casca-suave uppercase">{t("Outros")}</p>
          <div className="mt-2">
            <CaixaDaCasca marcada={filtro.validos} aoMudar={(m) => aoMudar({ ...filtro, validos: m })} rotulo={t("Ignorar telefones inválidos")} aria-label={t("Ignorar telefones inválidos")} />
          </div>
          <div className="mt-4 flex justify-end">
            <button type="button" onClick={() => aoMudar({ ...filtro, regras: [], min: 0, max: 100, tags: [], validos: false })} className="text-[13px] font-medium text-casca-marca hover:underline">
              {t("Limpar")}
            </button>
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
