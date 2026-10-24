"use client";
import { useT } from "@/hooks/i18n/useT";
import type { StatusDaCampanha } from "@/lib/campanhas/tipos";
import {
  DICA_DO_STATUS,
  ROTULO_DO_STATUS,
  STATUS_QUE_PULSAM,
  TOM_DO_STATUS,
} from "@/lib/escale/campanhas/apresentacao";
import { CLASSE_DO_TOM } from "@/lib/escale/campanhas/cores";
import { cn } from "@/lib/utils";

import { DicaAoPassar } from "./DicaAoPassar";

/** O SELO DE STATUS (002; N5): o rótulo e o tom da Clint; pulsa enquanto o servidor trabalha. */
export function SeloDoStatus({ status }: { status: StatusDaCampanha }) {
  const t = useT();
  return (
    <DicaAoPassar texto={t(DICA_DO_STATUS[status])}>
      <span
        data-status={status}
        className={cn(
          "inline-flex h-[22px] items-center rounded-[4px] px-1.5 text-[12px] leading-none whitespace-nowrap",
          CLASSE_DO_TOM[TOM_DO_STATUS[status]],
          STATUS_QUE_PULSAM.has(status) && "motion-safe:animate-pulse",
        )}
      >
        {t(ROTULO_DO_STATUS[status])}
      </span>
    </DicaAoPassar>
  );
}
