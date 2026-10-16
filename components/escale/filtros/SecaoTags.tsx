"use client";
import { useMemo } from "react";

import { PontoDaEtiqueta } from "@/components/tags/PontoDaEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";

import { Caixinha, alternarNaLista } from "./controles";

/**
 * Tags: as TRÊS caixas do card (negócio, contato e conversa), a mesma régua de
 * quem filtra (`applyFilters`). Com duas ou mais escolhidas, E ou OU.
 */
export function SecaoTags({
  filtros,
  onMudar,
  leads,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
  leads: readonly Lead[];
}) {
  const t = useT();
  const opcoes = useMemo(
    () =>
      [...new Set(leads.flatMap((l) => marcadoresDoCard(l)))].sort((a, b) =>
        a.localeCompare(b, "pt-BR"),
      ),
    [leads],
  );
  const escolhidas = filtros.tags ?? [];

  if (opcoes.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">{t("Nenhuma tag nos negócios deste quadro.")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {escolhidas.length > 1 ? (
        <div role="radiogroup" aria-label={t("Como juntar as tags")} className="flex gap-4 text-sm">
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="modo-das-tags"
              checked={filtros.modoDasTags !== "ou"}
              onChange={() => onMudar({ ...filtros, modoDasTags: undefined })}
            />
            {t("Todas (E)")}
          </label>
          <label className="flex items-center gap-1.5">
            <input
              type="radio"
              name="modo-das-tags"
              checked={filtros.modoDasTags === "ou"}
              onChange={() => onMudar({ ...filtros, modoDasTags: "ou" })}
            />
            {t("Qualquer uma (OU)")}
          </label>
        </div>
      ) : null}
      <div className="max-h-48 space-y-2 overflow-y-auto">
        {opcoes.map((tag) => (
          <Caixinha
            key={tag}
            marcada={escolhidas.includes(tag)}
            onMudar={() => onMudar({ ...filtros, tags: alternarNaLista(filtros.tags, tag) })}
          >
            <PontoDaEtiqueta tag={tag} />
            {tag}
          </Caixinha>
        ))}
      </div>
    </div>
  );
}
