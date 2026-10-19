"use client";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  ROTULO_DO_PRESET_DE_GRUPO,
  type FiltrosDoPainel,
} from "@/lib/escale/conversas/filtros-da-fila";

/** Grupos (B1; `component.ChatFilters.onlyConversations/onlyGroups`): um ou outro. */
export function SecaoGruposDaFila({
  painel,
  aoMudar,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
}) {
  const t = useT();
  const linha = (valor: "conversas" | "grupos", rotulo: string) => (
    <li className="flex h-7 items-center justify-between text-[13px] text-casca-texto">
      <span>{t(rotulo)}</span>
      <InterruptorDaCasca
        ligado={painel.grupos === valor}
        aria-label={t(rotulo)}
        aoMudar={(v) => aoMudar({ ...painel, grupos: v ? valor : undefined })}
      />
    </li>
  );
  return (
    <ul className="flex flex-col gap-1">
      {linha("conversas", ROTULO_DO_PRESET_DE_GRUPO.somente_conversas)}
      {linha("grupos", ROTULO_DO_PRESET_DE_GRUPO.somente_grupos)}
    </ul>
  );
}
