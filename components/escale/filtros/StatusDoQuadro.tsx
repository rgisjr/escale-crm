"use client";
import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import {
  STATUS_DO_NEGOCIO,
  normalizarStatus,
  type StatusDoNegocio,
} from "@/lib/escale/filtros/tipos";

import { RotuloDoGrupo } from "./controles";
import { GatilhoComPainel } from "./GatilhoComPainel";

const ROTULOS: Record<StatusDoNegocio, string> = {
  open: "Em aberto",
  won: "Ganhos",
  lost: "Perdidos",
};

/**
 * O STATUS DO QUADRO (fork Escale, Fase 1D; gatilho "Status 1" da barra da Clint
 * na Casca V4). "Em aberto" é o padrão, e dá para juntar ganhos e perdidos. O
 * selo conta os status escolhidos. Pelo menos um fica marcado: um quadro sem
 * status seria vazio sem explicação. O conteúdo aberto não tem print (PRINT 28).
 */
export function StatusDoQuadro({
  status,
  onMudar,
}: {
  status: readonly StatusDoNegocio[];
  onMudar: (status: StatusDoNegocio[]) => void;
}) {
  const t = useT();

  function alternar(s: StatusDoNegocio) {
    const proximos = status.includes(s) ? status.filter((x) => x !== s) : [...status, s];
    if (proximos.length === 0) return;
    onMudar(normalizarStatus(proximos));
  }

  return (
    <GatilhoComPainel
      rotulo={t("Status")}
      contagem={status.length}
      testId="status-do-quadro"
      className="w-56"
    >
      <div className="space-y-2">
        <RotuloDoGrupo>{t("Status do negócio")}</RotuloDoGrupo>
        {STATUS_DO_NEGOCIO.map((s) => (
          <CaixaDaCasca
            key={s}
            marcada={status.includes(s)}
            aoMudar={() => alternar(s)}
            rotulo={t(ROTULOS[s])}
            desabilitada={status.length === 1 && status.includes(s)}
          />
        ))}
        <BotaoDaCasca
          type="button"
          variante="texto"
          tamanho="sm"
          onClick={() => onMudar([...STATUS_DO_NEGOCIO])}
        >
          {t("Mostrar todos")}
        </BotaoDaCasca>
      </div>
    </GatilhoComPainel>
  );
}
