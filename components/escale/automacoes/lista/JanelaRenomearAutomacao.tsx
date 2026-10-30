"use client";
import { JanelaDaCasca } from "@/components/escale/origens/JanelaDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { AutomacaoDaLista } from "@/lib/escale/automacoes/tipos";

import { CabecalhoDaJanelaDeNome, CampoDoNome, RodapeDaJanelaDeNome, useCampoDoNome } from "./CampoDoNome";

type NomeDaAutomacao = Pick<AutomacaoDaLista, "id" | "nome">;

function Conteudo({
  automacao,
  aoFechar,
  aoSalvar,
  ocupado,
}: {
  automacao: NomeDaAutomacao;
  aoFechar: () => void;
  aoSalvar: (nome: string) => void;
  ocupado: boolean;
}) {
  const t = useT();
  const campo = useCampoDoNome(automacao.nome);
  const mudou = campo.nome.trim() !== automacao.nome;

  function salvar() {
    const nome = campo.validar();
    if (nome === null || !mudou) return;
    aoSalvar(nome);
  }

  return (
    <>
      <CabecalhoDaJanelaDeNome titulo={t("Renomear automação")} />
      <div className="flex flex-col gap-5 px-6 py-6">
        <CampoDoNome valor={campo.nome} aoMudar={campo.setNome} aoEnter={salvar} />
      </div>
      <RodapeDaJanelaDeNome aoCancelar={aoFechar} aoSalvar={salvar} desabilitado={campo.vazio || !mudou} ocupado={ocupado} />
    </>
  );
}

/**
 * "Renomear automação" (Q10): o nome atual, até 80 caracteres. Quem abre decide o que
 * fazer com o nome: a lista grava na hora; o fluxo da casca (Fase 5B, D4) renomeia no
 * rascunho e grava no próximo Salvar.
 */
export function JanelaRenomearAutomacao({
  automacao,
  aoFechar,
  aoSalvar,
  ocupado = false,
}: {
  automacao: NomeDaAutomacao | null;
  aoFechar: () => void;
  aoSalvar: (nome: string) => void;
  ocupado?: boolean;
}) {
  return (
    <JanelaDaCasca aberta={automacao !== null} onFechar={aoFechar} ocupado={ocupado} className="w-[min(576px,calc(100vw-2rem))] gap-0 rounded-xl p-0">
      {automacao && <Conteudo key={automacao.id} automacao={automacao} aoFechar={aoFechar} aoSalvar={aoSalvar} ocupado={ocupado} />}
    </JanelaDaCasca>
  );
}
