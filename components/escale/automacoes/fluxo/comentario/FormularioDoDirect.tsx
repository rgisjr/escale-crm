"use client";
import { useT } from "@/hooks/i18n/useT";
import { GATILHO_DE_MENCAO_EM_STORY, GATILHO_DE_MENSAGEM_DO_INSTAGRAM, GATILHO_DE_RESPOSTA_A_STORY } from "@/lib/escale/comentarios/constantes";
import type { ConfigDoDirect } from "@/lib/escale/comentarios/schema";
import { cn } from "@/lib/utils";

import { FiltroDePalavras } from "./FiltroDePalavras";
import { SeletorDeConta } from "./SeletorDeConta";

/**
 * O PAINEL DOS GATILHOS DE DIRECT DO INSTAGRAM (fork Escale, Fase 10D, D1/D2/D7): "Contato envia uma
 * mensagem", "Alguém marca a conta em um story" e "Alguém responde a um story". Provisório: sem print
 * do painel; o molde sai do painel de comentário da 10B e do controle de mensagem da Clint.
 */
export function FormularioDoDirect({
  evento,
  config,
  aoMudar,
}: {
  evento: string;
  config: ConfigDoDirect;
  aoMudar: (config: ConfigDoDirect) => void;
}) {
  const t = useT();
  const mencao = evento === GATILHO_DE_MENCAO_EM_STORY;
  const soInstagram = mencao || evento === GATILHO_DE_RESPOSTA_A_STORY;
  const { filtro } = config;
  const qualquer = evento === GATILHO_DE_MENSAGEM_DO_INSTAGRAM && filtro.modo === "qualquer";

  return (
    <div className="flex flex-col gap-5">
      <SeletorDeConta
        canal={config.channel_session_id}
        soInstagram={soInstagram}
        aoEscolher={(id) => aoMudar({ ...config, channel_session_id: id })}
      />
      <hr className="border-casca-divisoria" />
      {mencao ? (
        <p className="rounded-lg bg-casca-raia p-3 text-[12px] text-casca-texto-2">
          {t("Este gatilho dispara para toda menção recebida pela conta. Não há texto para filtrar.")}
        </p>
      ) : (
        <div className="flex flex-col gap-2">
          <p className="text-[12px] font-semibold text-casca-texto">{t("Filtro de mensagem")}</p>
          <div className="flex gap-2" role="group" aria-label={t("Filtro de mensagem")}>
            {(["qualquer", "palavras"] as const).map((modo) => (
              <button
                key={modo}
                type="button"
                aria-pressed={filtro.modo === modo}
                onClick={() =>
                  filtro.modo !== modo &&
                  aoMudar({
                    ...config,
                    filtro:
                      modo === "qualquer"
                        ? { modo: "qualquer" }
                        : { modo: "palavras", condicoes: [{ operador: "contem", valor: "" }], combinar: "qualquer" },
                  })
                }
                className={cn(
                  "h-8 flex-1 rounded-md border text-[12px]",
                  filtro.modo === modo
                    ? "border-casca-marca bg-casca-marca-suave text-casca-texto"
                    : "border-casca-divisoria text-casca-texto-2 hover:bg-casca-raia",
                )}
              >
                {modo === "qualquer" ? t("Qualquer mensagem") : t("Com palavras")}
              </button>
            ))}
          </div>
          <FiltroDePalavras filtro={filtro} aoMudar={(f) => aoMudar({ ...config, filtro: f })} />
          {qualquer ? (
            <p role="note" className="rounded-md border border-casca-aviso/40 p-2.5 text-[12px] text-casca-aviso">
              {t("Com \"Qualquer mensagem\", o agente de IA fica em silêncio por 10 minutos a cada mensagem desta conta, para a automação responder sozinha.")}
            </p>
          ) : filtro.modo === "palavras" ? (
            <p className="text-[11px] text-casca-suave">
              {t("Quando a mensagem casar com o filtro, o agente de IA fica em silêncio por 10 minutos nesta conversa.")}
            </p>
          ) : null}
        </div>
      )}
    </div>
  );
}
