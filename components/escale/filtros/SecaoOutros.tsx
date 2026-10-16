"use client";
import { useState } from "react";

import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { FiltrosDoQuadro, IntervaloDeTempo, UnidadeDeTempo } from "@/lib/escale/filtros/tipos";

import { CampoNumerico, RotuloDoGrupo } from "./controles";

type ChaveDeTempo = "tempoNaEtapa" | "tempoDesdeEntrada";

/**
 * Outros (Clint: "ATIVIDADES CONCLUÍDAS Min/Max" e "TEMPO NA ETAPA Min/Max +
 * dias na etapa"), mais o tempo desde a entrada que o usuário descreveu. A
 * unidade escolhida sem número ainda fica guardada aqui, para não se perder.
 */
export function SecaoOutros({
  filtros,
  onMudar,
}: {
  filtros: FiltrosDoQuadro;
  onMudar: (filtros: FiltrosDoQuadro) => void;
}) {
  const t = useT();
  const [unidadeNaEtapa, setUnidadeNaEtapa] = useState<UnidadeDeTempo>(
    filtros.tempoNaEtapa?.unidade ?? "dias",
  );
  const [unidadeDesdeEntrada, setUnidadeDesdeEntrada] = useState<UnidadeDeTempo>(
    filtros.tempoDesdeEntrada?.unidade ?? "dias",
  );
  const atividades = filtros.atividadesConcluidas;
  const rotuloDasAtividades = t("Atividades concluídas");

  function mudarTempo(
    chave: ChaveDeTempo,
    unidade: UnidadeDeTempo,
    parcial: { min?: number; max?: number },
  ) {
    const novo: IntervaloDeTempo = { ...filtros[chave], ...parcial, unidade };
    onMudar(
      chave === "tempoNaEtapa"
        ? { ...filtros, tempoNaEtapa: novo }
        : { ...filtros, tempoDesdeEntrada: novo },
    );
  }

  return (
    <div className="space-y-5">
      <div className="space-y-1.5">
        <RotuloDoGrupo ajuda={t("Conta as atividades marcadas como concluídas neste negócio.")}>
          {rotuloDasAtividades}
        </RotuloDoGrupo>
        <div className="grid grid-cols-2 gap-2">
          <CampoNumerico
            key={`amin:${atividades?.min ?? ""}`}
            rotulo={`${rotuloDasAtividades}: ${t("Mín.")}`}
            dica={t("Mín.")}
            valor={atividades?.min}
            onMudar={(v) =>
              onMudar({ ...filtros, atividadesConcluidas: { ...atividades, min: v } })
            }
          />
          <CampoNumerico
            key={`amax:${atividades?.max ?? ""}`}
            rotulo={`${rotuloDasAtividades}: ${t("Máx.")}`}
            dica={t("Máx.")}
            valor={atividades?.max}
            onMudar={(v) =>
              onMudar({ ...filtros, atividadesConcluidas: { ...atividades, max: v } })
            }
          />
        </div>
      </div>
      <BlocoDeTempo
        titulo={t("Tempo na etapa")}
        ajuda={t("Conta desde a última vez que o negócio entrou na etapa em que está.")}
        intervalo={filtros.tempoNaEtapa}
        unidade={unidadeNaEtapa}
        rotulos={{ dias: t("dias na etapa"), horas: t("horas na etapa") }}
        onUnidade={(u) => {
          setUnidadeNaEtapa(u);
          if (filtros.tempoNaEtapa) mudarTempo("tempoNaEtapa", u, {});
        }}
        onIntervalo={(parcial) => mudarTempo("tempoNaEtapa", unidadeNaEtapa, parcial)}
      />
      <BlocoDeTempo
        titulo={t("Tempo desde a entrada")}
        ajuda={t("Conta desde que o negócio foi criado nesta origem.")}
        intervalo={filtros.tempoDesdeEntrada}
        unidade={unidadeDesdeEntrada}
        rotulos={{ dias: t("dias desde a entrada"), horas: t("horas desde a entrada") }}
        onUnidade={(u) => {
          setUnidadeDesdeEntrada(u);
          if (filtros.tempoDesdeEntrada) mudarTempo("tempoDesdeEntrada", u, {});
        }}
        onIntervalo={(parcial) => mudarTempo("tempoDesdeEntrada", unidadeDesdeEntrada, parcial)}
      />
    </div>
  );
}

function BlocoDeTempo({
  titulo,
  ajuda,
  intervalo,
  unidade,
  rotulos,
  onUnidade,
  onIntervalo,
}: {
  titulo: string;
  ajuda: string;
  intervalo: IntervaloDeTempo | undefined;
  unidade: UnidadeDeTempo;
  rotulos: Record<UnidadeDeTempo, string>;
  onUnidade: (unidade: UnidadeDeTempo) => void;
  onIntervalo: (parcial: { min?: number; max?: number }) => void;
}) {
  const t = useT();
  return (
    <div className="space-y-1.5">
      <RotuloDoGrupo ajuda={ajuda}>{titulo}</RotuloDoGrupo>
      <div className="grid grid-cols-2 gap-2">
        <CampoNumerico
          key={`min:${intervalo?.min ?? ""}`}
          rotulo={`${titulo}: ${t("Mín.")}`}
          dica={t("Mín.")}
          valor={intervalo?.min}
          onMudar={(v) => onIntervalo({ min: v })}
        />
        <CampoNumerico
          key={`max:${intervalo?.max ?? ""}`}
          rotulo={`${titulo}: ${t("Máx.")}`}
          dica={t("Máx.")}
          valor={intervalo?.max}
          onMudar={(v) => onIntervalo({ max: v })}
        />
      </div>
      <SeletorDaCasca<UnidadeDeTempo>
        aria-label={`${titulo}: ${t("Unidade")}`}
        valor={unidade}
        opcoes={[
          { valor: "dias", rotulo: rotulos.dias },
          { valor: "horas", rotulo: rotulos.horas },
        ]}
        aoMudar={(v) => onUnidade(v === "horas" ? "horas" : "dias")}
      />
    </div>
  );
}
