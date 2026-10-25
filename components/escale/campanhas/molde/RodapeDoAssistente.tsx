"use client";

import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import { Loader2 } from "@/lib/ui/icons-da-casca";

import { BOTAO_CONTORNADO, BOTAO_DA_MARCA } from "./estilos";

export interface BotaoPrincipalDoRodape {
  rotulo: string;
  aoClicar: () => void;
  carregando?: boolean;
  desabilitado?: boolean;
  icone?: ReactNode;
}

/**
 * O RODAPÉ DO ASSISTENTE (fork Escale, Fase 8B; 09-018, 09-044): à direita,
 * "Voltar", os extras ("Salvar como rascunho") e o principal. Fica no fim da
 * coluna do molde (não é `fixed`: a cerca `rodape-ocupado-contrato`).
 */
export function RodapeDoAssistente({
  aoVoltar,
  rotuloVoltar,
  voltarDesabilitado,
  extras,
  principal,
}: {
  aoVoltar?: () => void;
  rotuloVoltar?: string;
  voltarDesabilitado?: boolean;
  extras?: ReactNode;
  principal: BotaoPrincipalDoRodape;
}) {
  const t = useT();
  return (
    <footer className="flex h-14 shrink-0 items-center justify-end gap-2 border-t border-casca-divisoria bg-surface px-6">
      {aoVoltar && (
        <button
          type="button"
          onClick={aoVoltar}
          disabled={voltarDesabilitado}
          className={BOTAO_CONTORNADO}
        >
          {rotuloVoltar ?? t("Voltar")}
        </button>
      )}
      {extras}
      <button
        type="button"
        onClick={principal.aoClicar}
        disabled={principal.desabilitado || principal.carregando}
        aria-busy={principal.carregando || undefined}
        className={BOTAO_DA_MARCA}
      >
        {principal.carregando ? (
          <Loader2 className="size-3.5 animate-spin" aria-hidden />
        ) : (
          principal.icone
        )}
        {principal.rotulo}
      </button>
    </footer>
  );
}
