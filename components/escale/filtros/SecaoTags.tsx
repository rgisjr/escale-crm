"use client";
import { useMemo, type ReactNode } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PontoDaEtiqueta } from "@/components/tags/PontoDaEtiqueta";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro } from "@/lib/escale/filtros/tipos";
import { marcadoresDoCard } from "@/lib/kanban/marcadores-do-card";
import type { Lead } from "@/lib/types/leads";
import { cn } from "@/lib/utils";

import { alternarNaLista } from "./controles";

/**
 * Tags: as TRÊS caixas do card (negócio, contato e conversa), a mesma régua de
 * quem filtra (`applyFilters`). Com duas ou mais escolhidas, E ou OU. O conteúdo
 * do gatilho "Tags" na variante superior não tem print (PRINT 26): esta é a
 * lógica da 1D com o visual da Clint.
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
      <p className="text-xs text-casca-suave">{t("Nenhuma tag nos negócios deste quadro.")}</p>
    );
  }

  return (
    <div className="space-y-3">
      {escolhidas.length > 1 ? (
        <div role="radiogroup" aria-label={t("Como juntar as tags")} className="flex gap-1">
          <BotaoDoModo
            marcado={filtros.modoDasTags !== "ou"}
            onClick={() => onMudar({ ...filtros, modoDasTags: undefined })}
          >
            {t("Todas (E)")}
          </BotaoDoModo>
          <BotaoDoModo
            marcado={filtros.modoDasTags === "ou"}
            onClick={() => onMudar({ ...filtros, modoDasTags: "ou" })}
          >
            {t("Qualquer uma (OU)")}
          </BotaoDoModo>
        </div>
      ) : null}
      <div className="max-h-56 space-y-2 overflow-y-auto">
        {opcoes.map((tag) => (
          <div key={tag} className="flex items-center gap-2">
            <CaixaDaCasca
              marcada={escolhidas.includes(tag)}
              aoMudar={() => onMudar({ ...filtros, tags: alternarNaLista(filtros.tags, tag) })}
              rotulo={tag}
            />
            <PontoDaEtiqueta tag={tag} className="ml-auto" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Um lado do E/OU, no segmentado das abas do Data da Clint: escuro quando marcado. */
function BotaoDoModo({
  marcado,
  onClick,
  children,
}: {
  marcado: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={marcado}
      onClick={onClick}
      className={cn(
        "h-7 rounded-casca-gatilho px-2.5 text-[11px] font-medium",
        marcado ? "bg-casca-escuro text-white" : "bg-casca-raia text-casca-texto-2",
      )}
    >
      {children}
    </button>
  );
}
