"use client";
import type { ReactNode } from "react";

import { CartaoDoSumario } from "@/components/escale/campanhas/molde/CartaoDoSumario";
import { FunilDeConversao } from "@/components/escale/campanhas/molde/FunilDeConversao";
import { CLASSE_DO_BLOCO } from "@/components/escale/campanhas/molde/estilos";
import { useT } from "@/hooks/i18n/useT";
import {
  cartoesDoTopo,
  etapasDoFunil,
  rodapeDoSumario,
} from "@/lib/escale/campanhas/detalhe/apresentacao";
import type { FiltrosDeDestinatarios } from "@/lib/escale/campanhas/detalhe/filtros";
import type { DadosDoDetalhe, SituacaoDosNegocios } from "@/lib/escale/campanhas/detalhe/tipos";

import { LeuENaoRespondeu } from "./LeuENaoRespondeu";
import { MotivosDoErro } from "./MotivosDoErro";
import { NaoEnviados } from "./NaoEnviados";
import { ResultadoDaCampanha } from "./ResultadoDaCampanha";
import { RitmoDeEnvio } from "./RitmoDeEnvio";
import { RoscaDeStatus } from "./RoscaDeStatus";

/**
 * A ABA SUMÁRIO (009–011): à esquerda os cartões, o funil e a rosca, o ritmo,
 * os motivos, "Leu e não respondeu", "Não enviados", RESULTADO e "Enviado em";
 * à direita (340px, presa no topo) a coluna da mensagem.
 */
export function SumarioDaCampanha({
  dados,
  colunaDireita,
  aoVerContatos,
  aoCriarCampanhaDosNaoEnviados,
  criando,
  aoAbrirNegocios,
}: {
  dados: DadosDoDetalhe;
  colunaDireita: ReactNode;
  aoVerContatos: (filtros: FiltrosDeDestinatarios) => void;
  aoCriarCampanhaDosNaoEnviados: () => void;
  criando: boolean;
  aoAbrirNegocios: (situacao: SituacaoDosNegocios) => void;
}) {
  const t = useT();
  const s = dados.sumario;
  return (
    <div className="flex gap-8 px-8 py-4">
      <div className="min-w-0 flex-1 space-y-3">
        <div className="grid grid-cols-4 gap-3">
          {cartoesDoTopo(s).map((c) => (
            <CartaoDoSumario
              key={c.chave}
              rotulo={t(c.rotulo)}
              dica={t(c.dica)}
              valor={c.valor}
              complemento={c.complemento}
            />
          ))}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <FunilDeConversao etapas={etapasDoFunil(s).map((e) => ({ ...e, rotulo: t(e.rotulo) }))} />
          <RoscaDeStatus sumario={s} />
        </div>
        <RitmoDeEnvio pontos={dados.ritmo} />
        <MotivosDoErro motivos={dados.motivos} erros={s.erros} />
        <LeuENaoRespondeu sumario={s} aoVerContatos={aoVerContatos} />
        <NaoEnviados
          quantidade={s.naoEnviados}
          aoVerContatos={aoVerContatos}
          aoCriarCampanha={aoCriarCampanhaDosNaoEnviados}
          criando={criando}
        />
        <ResultadoDaCampanha resultado={dados.resultado} aoAbrirNegocios={aoAbrirNegocios} />
        <p className="pt-4 text-[12px]">{rodapeDoSumario(dados.campanha, t, dados.fuso)}</p>
      </div>
      <aside className="w-[340px] shrink-0">
        <div className="sticky top-4 space-y-4">{colunaDireita}</div>
      </aside>
    </div>
  );
}

/** Carregando (material 2.3): esqueletos nos cartões e nos blocos. */
export function SumarioCarregando() {
  const t = useT();
  return (
    <div aria-busy="true" aria-label={t("Carregando campanha")} className="space-y-3 px-8 py-4">
      <div className="grid grid-cols-4 gap-3">
        {["a", "b", "c", "d"].map((k) => (
          <CartaoDoSumario key={k} rotulo="" carregando />
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div className={`${CLASSE_DO_BLOCO} h-[260px] animate-pulse`} />
        <div className={`${CLASSE_DO_BLOCO} h-[260px] animate-pulse`} />
      </div>
    </div>
  );
}
