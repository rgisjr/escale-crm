"use client";

import { useState } from "react";
import { toast } from "sonner";

import { BotaoDaJanela, CabecaDaJanela, JanelaDaCasca, RodapeDaJanela } from "@/components/escale/origens/JanelaDaCasca";
import { useMudarEmpresa } from "@/hooks/escale/useEmpresa";
import { useT } from "@/hooks/i18n/useT";

import { type EscolhaDoContato, PassoContatoDaEmpresa } from "./PassoContatoDaEmpresa";

/** "Vincular existente" da aba Contatos da empresa: escolhe um contato que já existe e o põe na empresa. */
export function JanelaVincularContato({
  aberta,
  empresaId,
  aoFechar,
}: {
  aberta: boolean;
  empresaId: string;
  aoFechar: () => void;
}) {
  const t = useT();
  const { vincular } = useMudarEmpresa(empresaId);
  const [escolha, setEscolha] = useState<EscolhaDoContato>({ modo: "existente", contato: null });
  const contato = escolha.modo === "existente" ? escolha.contato : null;

  const fechar = () => {
    setEscolha({ modo: "existente", contato: null });
    aoFechar();
  };

  async function salvar() {
    if (!contato) return;
    try {
      await vincular.mutateAsync(contato.id);
      toast.success(t("Contato {name} adicionado à empresa.").replace("{name}", contato.nome));
      fechar();
    } catch {
      toast.error(t("Não foi possível adicionar o contato. Tente novamente."));
    }
  }

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar} className="w-[min(560px,100%)]">
      <CabecaDaJanela titulo={t("Vincular contato existente")} descricao={t("Contato da empresa")} />
      <div className="flex flex-col gap-3 px-6 pb-4">
        <PassoContatoDaEmpresa valor={escolha} aoMudar={setEscolha} soExistente />
        {contato?.temEmpresa ? (
          <p className="text-[12px] text-casca-suave">{t("Este contato sai da empresa atual.")}</p>
        ) : null}
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela variante="cancelar" onClick={fechar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <BotaoDaJanela variante="salvar" disabled={!contato || vincular.isPending} onClick={() => void salvar()}>
          {vincular.isPending ? t("Salvando…") : t("Vincular contato")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
