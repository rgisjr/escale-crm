"use client";
import { useEffect, useState } from "react";

import { JanelaDeConfirmacao } from "@/components/escale/ui/JanelaDeConfirmacao";
import { useT } from "@/hooks/i18n/useT";
import { telaDoGatilho, type DadosDoGatilho, type TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { opcaoDoEvento, precisaDeFormulario } from "@/lib/escale/automacoes/fluxo/gatilhos";
import { Plus } from "@/lib/ui/icons-da-casca";

import { DetalheDoGatilho } from "../CorposDoNo";
import { ICONE_DO_GATILHO } from "../visual-do-fluxo";
import { EscolhaDoGatilho } from "./EscolhaDoGatilho";
import { FormularioDoGatilho } from "./FormularioDoGatilho";
import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";

type Vista = "lista" | "escolha" | "formulario";

/**
 * O PAINEL DO GATILHO (07-013, 07-019, 07-022, 07-024; D7, D8): três vistas no mesmo
 * painel. Um gatilho por automação: um cartão e "Trocar gatilho". O painel edita um
 * rascunho; "Salvar" aplica no nó.
 */
export function PainelDoGatilho({
  dados,
  temCondicoes,
  aoCancelar,
  aoTrocar,
  aoMudarRascunho,
}: {
  dados: DadosDoGatilho;
  /** A caixa de condições tem linhas: trocar o evento as apaga (pede confirmação). */
  temCondicoes: boolean;
  aoCancelar: () => void;
  aoTrocar: (evento: string, tela: TelaDoGatilho) => void;
  /** Avisa a tela se o rascunho difere do nó (o guarda "Configuração … não salva"). */
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const [vista, setVista] = useState<Vista>("lista");
  const [evento, setEvento] = useState(dados.evento);
  const [tela, setTela] = useState(dados.tela);
  const [confirmando, setConfirmando] = useState(false);

  const sujo = evento !== dados.evento || JSON.stringify(tela) !== JSON.stringify(dados.tela);
  useEffect(() => {
    aoMudarRascunho?.(sujo);
  }, [sujo, aoMudarRascunho]);

  const opcao = opcaoDoEvento(evento);
  const Icone = opcao ? ICONE_DO_GATILHO[opcao.icone] : null;
  const abreFormulario = precisaDeFormulario(evento);

  function salvar() {
    if (evento !== dados.evento && temCondicoes) {
      setConfirmando(true);
      return;
    }
    aoTrocar(evento, tela);
  }

  function escolher(novo: string) {
    setEvento(novo);
    setTela(telaDoGatilho(null));
    setVista(precisaDeFormulario(novo) ? "formulario" : "lista");
  }

  const confirmar = (
    <JanelaDeConfirmacao
      aberta={confirmando}
      aoFechar={() => setConfirmando(false)}
      titulo={t("Trocar o gatilho?")}
      rotuloDoConfirmar={t("Trocar gatilho")}
      aoConfirmar={() => {
        setConfirmando(false);
        aoTrocar(evento, tela);
      }}
    >
      <p>{t("As condições foram feitas para o gatilho atual e serão apagadas.")}</p>
    </JanelaDeConfirmacao>
  );

  if (vista === "escolha") {
    return (
      <>
        <PainelDoNo
          tipo="gatilho"
          largura={800}
          titulo={t("Iniciar automação quando...")}
          aoVoltar={() => setVista("lista")}
          comRodape={false}
          aoCancelar={aoCancelar}
          aoSalvar={salvar}
        >
          <EscolhaDoGatilho evento={evento} aoEscolher={escolher} />
        </PainelDoNo>
        {confirmar}
      </>
    );
  }

  if (vista === "formulario") {
    return (
      <>
        <PainelDoNo
          tipo="gatilho"
          titulo={opcao ? t(opcao.titulo) : t("Iniciar automação quando...")}
          aoVoltar={() => setVista("lista")}
          aoCancelar={aoCancelar}
          aoSalvar={salvar}
          salvarDesabilitado={!evento}
        >
          <FormularioDoGatilho evento={evento} tela={tela} aoMudarTela={setTela} />
        </PainelDoNo>
        {confirmar}
      </>
    );
  }

  return (
    <>
      <PainelDoNo
        tipo="gatilho"
        titulo={t("Iniciar automação quando...")}
        comRodape={sujo}
        aoCancelar={aoCancelar}
        aoSalvar={salvar}
        salvarDesabilitado={!evento}
      >
        <ProblemasDoPainel lista={dados.problemas} />
        <p className="mb-4 text-[13px] text-casca-texto-2">
          {opcao ? t("Este gatilho inicia a automação.") : t("Escolha o gatilho que dará início à automação")}
        </p>
        {opcao && Icone ? (
          <div className="mb-4 rounded-lg border border-casca-divisoria p-4">
            {abreFormulario ? (
              <button
                type="button"
                aria-label={t(opcao.titulo)}
                onClick={() => setVista("formulario")}
                className="flex w-full items-start gap-3 text-left"
              >
                <CartaoDoGatilho evento={evento} tela={tela} />
              </button>
            ) : (
              <div className="flex items-start gap-3">
                <CartaoDoGatilho evento={evento} tela={tela} />
              </div>
            )}
          </div>
        ) : null}
        <button
          type="button"
          onClick={() => setVista("escolha")}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia"
        >
          <Plus size={14} aria-hidden />
          {opcao ? t("Trocar gatilho") : t("Novo gatilho")}
        </button>
      </PainelDoNo>
      {confirmar}
    </>
  );
}

/** O cartão do gatilho na lista: quadrado cinza com o ícone, o título e o chip do detalhe. */
function CartaoDoGatilho({ evento, tela }: { evento: string; tela: TelaDoGatilho }) {
  const t = useT();
  const opcao = opcaoDoEvento(evento);
  if (!opcao) return null;
  const Icone = ICONE_DO_GATILHO[opcao.icone];
  return (
    <>
      <span className="grid size-[34px] shrink-0 place-items-center rounded-md bg-casca-raia">
        <Icone size={16} className="text-casca-texto-2" aria-hidden />
      </span>
      <span className="min-w-0 flex-1">
        <span className="mb-1 block text-[13px] font-medium text-casca-texto">{t(opcao.titulo)}</span>
        <DetalheDoGatilho dados={{ kind: "gatilho", evento, tela }} />
      </span>
    </>
  );
}
