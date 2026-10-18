"use client";
import { useRouter } from "next/navigation";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";

/**
 * "DONO DO NEGÓCIO" (fork Escale, Fase 1J, Q5; código `kc` da Clint, sem print):
 * a origem é visível, mas a regra dela esconde este negócio. Um botão só, que
 * volta para a lista de negócios. Fechar pela cortina ou Esc faz o mesmo.
 */
export function AvisoDeOutroDono() {
  const t = useT();
  const router = useRouter();
  const voltar = () => router.push("/app/escale/negocios");
  return (
    <JanelaDaCasca aberta onFechar={voltar}>
      <CabecaDaJanela titulo={t("Dono do negócio")} />
      <p className="text-[13px] text-casca-texto">
        {t("Atenção! Esse negócio pertence a outro dono.")}
      </p>
      <RodapeDaJanela>
        <BotaoDaJanela variante="salvar" onClick={voltar}>
          {t("Voltar para listagem de negócios")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
