"use client";
import { useState } from "react";

import {
  BotaoDaJanela,
  CabecaDaJanela,
  JanelaDaCasca,
} from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { DecisaoDosNegocios } from "@/lib/escale/etapas/rascunho";
import { Trash2 } from "@/lib/ui/icons-da-casca";

export interface EtapaComNegocios {
  id: string;
  nome: string;
  negocios: number;
}

type Escolha = DecisaoDosNegocios | "mover-sem-destino";

/**
 * A JANELA DE EXCLUSÃO COM NEGÓCIOS (fork Escale, Fase 1L; Clint `StageExclusionModal`): para
 * cada etapa excluída que tem negócios, "Mover para outra etapa" (escolhe o destino) ou
 * "Excluir todos os negócios". Só a seção de negócios existe no Escale (integrações,
 * automações e campos obrigatórios da etapa não têm equivalente aqui). O botão vermelho só
 * liga com tudo decidido.
 */
export function JanelaExcluirEtapa({
  etapas,
  destinos,
  aoConfirmar,
  aoCancelar,
}: {
  etapas: readonly EtapaComNegocios[];
  destinos: ReadonlyArray<{ id: string; nome: string }>;
  aoConfirmar: (decisoes: Record<string, DecisaoDosNegocios>) => void;
  aoCancelar: () => void;
}) {
  const t = useT();
  const [escolhas, setEscolhas] = useState<Record<string, Escolha>>({});
  const completo = etapas.every((e) => {
    const d = escolhas[e.id];
    return d !== undefined && d !== "mover-sem-destino";
  });

  function confirmar() {
    const decisoes: Record<string, DecisaoDosNegocios> = {};
    for (const [id, d] of Object.entries(escolhas)) {
      if (d !== "mover-sem-destino") decisoes[id] = d;
    }
    aoConfirmar(decisoes);
  }

  return (
    <JanelaDaCasca aberta onFechar={aoCancelar} className="w-[min(36rem,calc(100vw-2rem))]">
      <CabecaDaJanela
        titulo={t("Excluir etapa")}
        descricao={t(
          "A etapa que você está tentando excluir possui itens vinculados, como negócios em andamento, integrações, automações e regras de criação automática. Para continuar, é necessário definir o que deve ser feito com cada um desses itens.",
        )}
      />
      <div className="grid gap-4">
        <h3 className="text-[14px] font-semibold text-casca-texto">{t("Migrar negócios")}</h3>
        {etapas.map((e) => {
          const d = escolhas[e.id];
          const acao = d === "mover-sem-destino" ? "mover" : d?.acao;
          const destinoId =
            d !== undefined && d !== "mover-sem-destino" && d.acao === "mover" ? d.destinoId : "";
          return (
            <fieldset key={e.id} className="grid gap-2 rounded-[8px] border border-casca-borda p-4">
              <legend className="px-1 text-[13px] font-semibold text-casca-texto">
                {e.nome} · {e.negocios} {e.negocios === 1 ? t("negócio") : t("negócios")}
              </legend>
              <label className="flex items-center gap-2 text-[13px] text-casca-texto">
                <input
                  type="radio"
                  name={`acao-${e.id}`}
                  checked={acao === "mover"}
                  onChange={() => setEscolhas((x) => ({ ...x, [e.id]: "mover-sem-destino" }))}
                />
                {t("Mover para outra etapa")}
              </label>
              {acao === "mover" ? (
                <SeletorDaCasca
                  aparencia="janela"
                  aria-label={t("Escolha a etapa")}
                  vazio={t("Escolha a etapa")}
                  valor={destinoId}
                  opcoes={destinos.map((o) => ({ valor: o.id, rotulo: o.nome }))}
                  aoMudar={(id) => {
                    if (id)
                      setEscolhas((x) => ({ ...x, [e.id]: { acao: "mover", destinoId: id } }));
                  }}
                />
              ) : null}
              <label className="flex items-center gap-2 text-[13px] text-casca-texto">
                <input
                  type="radio"
                  name={`acao-${e.id}`}
                  checked={acao === "excluir"}
                  onChange={() => setEscolhas((x) => ({ ...x, [e.id]: { acao: "excluir" } }))}
                />
                {t("Excluir todos os negócios")}
              </label>
            </fieldset>
          );
        })}
      </div>
      <div className="flex justify-end gap-2.5">
        <BotaoDaJanela variante="cancelar" onClick={aoCancelar}>
          {t("Cancelar")}
        </BotaoDaJanela>
        <span
          title={completo ? undefined : t("Preencha todos os campos obrigatórios para continuar")}
        >
          <BotaoDaJanela
            variante="perigo"
            disabled={!completo}
            onClick={confirmar}
            className="gap-2"
          >
            <Trash2 size={16} aria-hidden />
            {t("Confirmar e excluir etapa")}
          </BotaoDaJanela>
        </span>
      </div>
    </JanelaDaCasca>
  );
}
