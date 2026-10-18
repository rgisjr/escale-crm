"use client";
import { useState } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  Campo,
  CampoDeTexto,
  JanelaDaCasca,
  RodapeDaJanela,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { useAssignableMembers } from "@/hooks/inbox/useAssignableMembers";
import { numeroDoValor } from "@/lib/escale/filtros/campos";

import { CamposDaOportunidade, type OrigemParaCriar } from "../CamposDaOportunidade";

export type NovoNegocioEmMassa = {
  pipeline_id: string;
  stage_id: string;
  owner_user_id: string | null;
  valor_centavos: number | null;
};

/**
 * "Adicionar um novo negócio" para os contatos marcados (Clint `DealAddModal`; print
 * 2b-31): Origem* e Etapa*, Dono e Valor, o Contato* desligado com "N Contatos
 * selecionados" e, no rodapé, só "Adicionar negócio" (fechar é pelo X).
 */
export function JanelaCriarNegocios({
  aberta,
  quantidade,
  origens,
  enviando,
  aoFechar,
  aoConfirmar,
}: {
  aberta: boolean;
  quantidade: number;
  origens: OrigemParaCriar[];
  enviando: boolean;
  aoFechar: () => void;
  aoConfirmar: (novo: NovoNegocioEmMassa) => void;
}) {
  const t = useT();
  const membros = useAssignableMembers(aberta);
  const [destino, setDestino] = useState({ origemId: "", etapaId: "" });
  const [dono, setDono] = useState("");
  const [valor, setValor] = useState("");
  const numero = valor.trim() ? numeroDoValor(valor) : null;
  const valorInvalido = valor.trim() !== "" && (numero === null || numero < 0);
  const pode = Boolean(destino.etapaId) && !valorInvalido;

  const fechar = () => {
    setDestino({ origemId: "", etapaId: "" });
    setDono("");
    setValor("");
    aoFechar();
  };

  return (
    <JanelaDaCasca aberta={aberta} onFechar={fechar}>
      <CabecaDaJanela titulo={t("Adicionar um novo negócio")} />
      <div className="grid gap-4">
        <CamposDaOportunidade
          origens={origens}
          origemId={destino.origemId}
          etapaId={destino.etapaId}
          aoMudar={setDestino}
        />
        <Campo rotulo={t("Dono do negócio")}>
          <SeletorDaCasca
            aparencia="janela"
            valor={dono}
            opcoes={(membros.data ?? []).map((m) => ({
              valor: m.user_id,
              rotulo: m.full_name ?? t("Sem nome"),
            }))}
            aoMudar={setDono}
            aria-label={t("Dono do negócio")}
            vazio={t("Escolher dono do negócio")}
          />
        </Campo>
        <Campo rotulo={t("Valor do negócio")}>
          <CampoDeTexto
            value={valor}
            inputMode="decimal"
            placeholder={t("Clique aqui para adicionar")}
            aria-label={t("Valor do negócio")}
            onChange={(e) => setValor(e.target.value)}
          />
        </Campo>
        <Campo rotulo={t("Contato")} obrigatorio>
          <CampoDeTexto
            value={t("{n} Contatos selecionados").replace(
              "{n}",
              quantidade.toLocaleString("pt-BR"),
            )}
            readOnly
            disabled
            aria-label={t("Contato")}
            title={t("Os contatos marcados na lista")}
          />
        </Campo>
      </div>
      <RodapeDaJanela>
        <BotaoDaJanela
          variante="salvar"
          disabled={!pode || enviando}
          title={!pode ? t("Escolha a origem e a etapa.") : enviando ? t("Aguarde…") : undefined}
          onClick={() =>
            aoConfirmar({
              pipeline_id: destino.origemId,
              stage_id: destino.etapaId,
              owner_user_id: dono || null,
              valor_centavos: numero === null ? null : Math.round(numero * 100),
            })
          }
        >
          {t("Adicionar negócio")}
        </BotaoDaJanela>
      </RodapeDaJanela>
    </JanelaDaCasca>
  );
}
