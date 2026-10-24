"use client";
import { useState } from "react";

import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import {
  COLUNAS_DOS_DESTINATARIOS,
  COLUNAS_PADRAO,
  ROTULO_DA_COLUNA,
  type ColunaDosDestinatarios,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import { SlidersHorizontal } from "@/lib/ui/icons-da-casca";

/**
 * "PERSONALIZAR COLUNAS" (012; sem print do painel aberto, provisório): o botão
 * de 32px com o número de colunas escondidas e uma caixinha por coluna; a última
 * visível não desliga; "Redefinir" volta às do print.
 */
export function PainelDeColunasDosDestinatarios({
  visiveis,
  aoMudar,
}: {
  visiveis: readonly ColunaDosDestinatarios[];
  aoMudar: (colunas: ColunaDosDestinatarios[]) => void;
}) {
  const t = useT();
  const [aberto, setAberto] = useState(false);
  const escondidas = COLUNAS_DOS_DESTINATARIOS.length - visiveis.length;
  const alternar = (c: ColunaDosDestinatarios, marcar: boolean) =>
    aoMudar(COLUNAS_DOS_DESTINATARIOS.filter((x) => (x === c ? marcar : visiveis.includes(x))));
  return (
    <Popover open={aberto} onOpenChange={setAberto}>
      <PopoverTrigger asChild>
        <button
          type="button"
          aria-label={t("Personalizar colunas")}
          className="inline-flex h-8 items-center gap-1.5 rounded-casca-gatilho border border-casca-borda bg-surface px-2 text-casca-texto hover:bg-casca-raia"
        >
          <SlidersHorizontal size={16} aria-hidden />
          <span className="grid size-[18px] place-items-center rounded-full bg-casca-busca text-[11px]">
            {escondidas}
          </span>
        </button>
      </PopoverTrigger>
      <PainelSuspenso align="end" className="w-[220px] p-3">
        <p className="mb-2 text-[13px] font-medium">{t("Personalizar colunas")}</p>
        <ul className="space-y-2">
          {COLUNAS_DOS_DESTINATARIOS.map((c) => {
            const marcada = visiveis.includes(c);
            return (
              <li key={c}>
                <CaixaDaCasca
                  marcada={marcada}
                  rotulo={t(ROTULO_DA_COLUNA[c])}
                  desabilitada={marcada && visiveis.length === 1}
                  aoMudar={(v) => alternar(c, v)}
                />
              </li>
            );
          })}
        </ul>
        <button
          type="button"
          onClick={() => aoMudar([...COLUNAS_PADRAO])}
          className="mt-3 text-[12px] font-medium text-casca-marca hover:underline"
        >
          {t("Redefinir")}
        </button>
      </PainelSuspenso>
    </Popover>
  );
}
