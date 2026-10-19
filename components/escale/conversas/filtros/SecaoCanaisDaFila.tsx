"use client";
import { useChannelSessions } from "@/hooks/channels/useChannelSessions";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoPainel } from "@/lib/escale/conversas/filtros-da-fila";
import {
  ROTULO_DO_GRUPO,
  agruparDispositivos,
  bolinhaDoDispositivo,
} from "@/lib/escale/conversas/nova-conversa";

import { GrupoDaFila } from "./GrupoDaFila";
import { SeletorDoFiltro } from "./SeletorDoFiltro";

/** Canais (c35, c36; N7): os dispositivos agrupados, com "Desconectado". */
export function SecaoCanaisDaFila({
  painel,
  aoMudar,
}: {
  painel: FiltrosDoPainel;
  aoMudar: (f: FiltrosDoPainel) => void;
}) {
  const t = useT();
  const { data: canais = [] } = useChannelSessions();
  const opcoes = agruparDispositivos(canais).flatMap((g) =>
    g.canais.map((c) => ({
      valor: c.id,
      rotulo: c.display_name?.trim() || c.phone_number || t("Sem nome"),
      grupo: t(ROTULO_DO_GRUPO[g.grupo]),
      ...(bolinhaDoDispositivo(c.status) === "vermelha" ? { selo: t("Desconectado") } : {}),
    })),
  );
  return (
    <GrupoDaFila rotulo={t("Canais e Dispositivos")}>
      <SeletorDoFiltro
        aria-label={t("Canais e Dispositivos")}
        valores={painel.canais ?? []}
        opcoes={opcoes}
        aoMudar={(ids) => aoMudar({ ...painel, canais: ids })}
      />
    </GrupoDaFila>
  );
}
