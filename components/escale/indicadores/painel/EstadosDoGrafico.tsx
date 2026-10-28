"use client";
import { useT } from "@/hooks/i18n/useT";
import { MOSTRA_2A_LINHA_DO_VAZIO, MOSTRA_ICONE_DO_VAZIO } from "@/lib/escale/indicadores/graficos/regras-do-card";
import { ChartNoAxesColumn, Coins } from "@/lib/ui/icons-da-casca";

const CENTRO = "flex h-full flex-col items-center justify-center gap-1 text-center";

/** Sem linhas no período (provisório: sem print da Clint). O ícone e a 2ª linha somem em card baixo. */
export function VazioDoGrafico({ altura, comPeriodo }: { altura: number; comPeriodo: boolean }) {
  const t = useT();
  return (
    <div className={CENTRO}>
      {altura >= MOSTRA_ICONE_DO_VAZIO ? <ChartNoAxesColumn size={24} aria-hidden className="text-casca-suave" /> : null}
      <p className="text-[13px] font-medium text-casca-texto">
        {comPeriodo ? t("Nenhum resultado neste período.") : t("Sem dados")}
      </p>
      {comPeriodo && altura >= MOSTRA_2A_LINHA_DO_VAZIO ? (
        <p className="text-[12px] text-casca-suave">{t("Tente um intervalo maior.")}</p>
      ) : null}
    </div>
  );
}

/** Erro da consulta. `detalhe` (a mensagem da rota, ex.: consulta que demorou) troca a 2ª linha. */
export function ErroDoGrafico({ detalhe }: { detalhe?: string }) {
  const t = useT();
  return (
    <div className={CENTRO}>
      <p className="text-[13px] font-medium text-casca-texto">{t("Ops, ocorreu um erro inesperado")}</p>
      <p className="text-[12px] text-casca-marca">{detalhe ?? t("Entre em contato com suporte se esse problema persistir")}</p>
    </div>
  );
}

/** A soma misturou moedas: a 7A devolveu o aviso e nenhum número errado. */
export function MoedasDiferentes() {
  const t = useT();
  return (
    <div className={CENTRO}>
      <Coins size={32} aria-hidden className="text-casca-suave" />
      <p className="text-[13px] font-medium text-casca-texto">{t("Não foi possível calcular a soma dos valores.")}</p>
      <p className="text-[12px] text-casca-suave">{t("Os dados incluem origens com moedas diferentes cadastradas.")}</p>
    </div>
  );
}
