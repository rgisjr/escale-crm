"use client";
import { Campo } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";

export type OrigemParaCriar = {
  id: string;
  nome: string;
  etapas: Array<{ id: string; nome: string }>;
};

/** Origem* e Etapa* (Clint `NewContactModal` com "Desejo criar uma oportunidade"; também a janela de novo negócio). */
export function CamposDaOportunidade({
  origens,
  origemId,
  etapaId,
  aoMudar,
}: {
  origens: OrigemParaCriar[];
  origemId: string;
  etapaId: string;
  aoMudar: (v: { origemId: string; etapaId: string }) => void;
}) {
  const t = useT();
  const origem = origens.find((o) => o.id === origemId);
  return (
    <>
      <Campo rotulo={t("Origem")} obrigatorio>
        <SeletorDaCasca
          aparencia="janela"
          valor={origemId}
          opcoes={origens.map((o) => ({ valor: o.id, rotulo: o.nome }))}
          aoMudar={(v) => aoMudar({ origemId: v, etapaId: "" })}
          aria-label={t("Origem")}
          vazio={t("Selecione")}
          vazioSoNoGatilho
        />
      </Campo>
      <Campo rotulo={t("Etapa")} obrigatorio>
        <SeletorDaCasca
          aparencia="janela"
          valor={etapaId}
          opcoes={(origem?.etapas ?? []).map((e) => ({ valor: e.id, rotulo: e.nome }))}
          aoMudar={(v) => aoMudar({ origemId, etapaId: v })}
          aria-label={t("Etapa")}
          vazio={t("Selecione")}
          vazioSoNoGatilho
          desabilitado={!origem}
          dica={origem ? undefined : t("Escolha a origem primeiro.")}
        />
      </Campo>
    </>
  );
}
