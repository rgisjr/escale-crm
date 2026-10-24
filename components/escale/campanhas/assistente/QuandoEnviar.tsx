"use client";

import { SeletorDeDataEHora } from "@/components/escale/ui/SeletorDeDataEHora";
import { useT } from "@/hooks/i18n/useT";
import type { QuandoEnviar as Quando } from "@/lib/escale/campanhas/assistente";
import { quandoPadrao } from "@/lib/escale/campanhas/estado-do-assistente";

import { CartaoDeEscolha } from "../molde/CartaoDeEscolha";
import { ROTULO } from "../molde/estilos";

/** "QUANDO ENVIAR" (fork Escale, Fase 8B; 09-021, 09-022; N19: o seletor da casca, nunca o nativo). */
export function QuandoEnviar({
  quando,
  aoMudar,
  erro,
}: {
  quando: Quando;
  aoMudar: (q: Quando) => void;
  erro?: string | null;
}) {
  const t = useT();
  return (
    <div>
      <span className={ROTULO}>{t("Quando enviar")}</span>
      <div role="radiogroup" aria-label={t("Quando enviar")} className="grid grid-cols-2 gap-3">
        <CartaoDeEscolha
          selecionado={quando.modo === "agora"}
          aoEscolher={() => aoMudar({ modo: "agora" })}
          titulo={t("Enviar agora")}
          descricao={t("A campanha entra na fila imediatamente.")}
        />
        <CartaoDeEscolha
          selecionado={quando.modo === "agendar"}
          aoEscolher={() =>
            quando.modo !== "agendar" && aoMudar({ modo: "agendar", em: quandoPadrao(new Date()) })
          }
          titulo={t("Criar agendamento")}
          descricao={t("Escolha data e horário para o disparo.")}
        />
      </div>
      {quando.modo === "agendar" && (
        <div className="mt-4">
          <span className={ROTULO}>{t("Data e horário")}</span>
          <SeletorDeDataEHora
            valor={new Date(quando.em)}
            aoMudar={(d) => aoMudar({ modo: "agendar", em: d.toISOString() })}
          />
        </div>
      )}
      {erro && (
        <p role="alert" className="mt-1.5 text-[11px] text-casca-alerta">
          {erro}
        </p>
      )}
    </div>
  );
}
