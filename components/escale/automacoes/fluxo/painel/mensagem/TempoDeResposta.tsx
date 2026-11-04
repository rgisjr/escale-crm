"use client";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { TempoDeResposta as Tempo } from "@/lib/escale/automacoes/fluxo/caixas";
import { RECUSA_TEMPO_DE_RESPOSTA } from "@/lib/escale/automacoes/fluxo/sequencia";

const UNIDADES = [
  { valor: "minutos", rotulo: "Minutos" },
  { valor: "horas", rotulo: "Horas" },
  { valor: "dias", rotulo: "Dias" },
] as const;

/**
 * "SE O CONTATO NÃO RESPONDER EM" (07-027, E22): a caixa de marcar e, marcada, o número com a unidade. Marcar cria a
 * saída "Não respondeu" do nó; o mínimo é 1 minuto.
 */
export function TempoDeResposta({ tempo, aoMudar }: { tempo: Tempo; aoMudar: (tempo: Tempo) => void }) {
  const t = useT();
  return (
    <div className="flex flex-col gap-3">
      <CaixaDaCasca
        marcada={tempo !== null}
        aoMudar={(marcada) => aoMudar(marcada ? { quantidade: 15, unidade: "minutos" } : null)}
        rotulo={t("Se o contato não responder em")}
      />
      {tempo ? (
        <>
          <div className="flex items-center gap-3">
            <CampoDeTexto
              inputMode="numeric"
              aria-label={t("Tempo de resposta")}
              value={tempo.quantidade > 0 ? String(tempo.quantidade) : ""}
              onChange={(e) => aoMudar({ ...tempo, quantidade: Number(e.target.value.replace(/\D/g, "").slice(0, 4)) })}
              className="w-[88px]"
            />
            <div className="w-[140px]">
              <SeletorDaCasca
                aria-label={t("Unidade do tempo de resposta")}
                aparencia="janela"
                valor={tempo.unidade}
                aoMudar={(v) => aoMudar({ ...tempo, unidade: (v || "minutos") as NonNullable<Tempo>["unidade"] })}
                opcoes={UNIDADES.map((u) => ({ valor: u.valor, rotulo: t(u.rotulo) }))}
              />
            </div>
          </div>
          {tempo.quantidade < 1 ? (
            <p role="alert" className="text-[12px] text-casca-alerta">
              {t(RECUSA_TEMPO_DE_RESPOSTA)}
            </p>
          ) : null}
        </>
      ) : null}
    </div>
  );
}
