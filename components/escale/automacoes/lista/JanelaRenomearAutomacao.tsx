"use client";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { useAcoesDasAutomacoes } from "@/hooks/escale/useAutomacoesDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { AutomacaoDaLista } from "@/lib/escale/automacoes/tipos";

import { CabecalhoDaJanelaDeNome, CampoDoNome, RodapeDaJanelaDeNome, useCampoDoNome } from "./CampoDoNome";

function Conteudo({ automacao, aoFechar }: { automacao: AutomacaoDaLista; aoFechar: () => void }) {
  const t = useT();
  const acoes = useAcoesDasAutomacoes();
  const campo = useCampoDoNome(automacao.nome);
  const mudou = campo.nome.trim() !== automacao.nome;

  function salvar() {
    const nome = campo.validar();
    if (nome === null || !mudou) return;
    acoes.renomear.mutate({ id: automacao.id, nome }, { onSuccess: aoFechar });
  }

  return (
    <>
      <CabecalhoDaJanelaDeNome titulo={t("Renomear automação")} />
      <div className="flex flex-col gap-5 px-6 py-6">
        <CampoDoNome valor={campo.nome} aoMudar={campo.setNome} aoEnter={salvar} />
      </div>
      <RodapeDaJanelaDeNome
        aoCancelar={aoFechar}
        aoSalvar={salvar}
        desabilitado={campo.vazio || !mudou}
        ocupado={acoes.renomear.isPending}
      />
    </>
  );
}

/** "Renomear automação" (Q10): o nome atual, até 80 caracteres. */
export function JanelaRenomearAutomacao({
  automacao,
  aoFechar,
}: {
  automacao: AutomacaoDaLista | null;
  aoFechar: () => void;
}) {
  return (
    <JanelaDaCasca aberta={automacao !== null} onFechar={aoFechar} className="w-[min(576px,calc(100vw-2rem))] gap-0 rounded-xl p-0">
      {automacao && <Conteudo key={automacao.id} automacao={automacao} aoFechar={aoFechar} />}
    </JanelaDaCasca>
  );
}
