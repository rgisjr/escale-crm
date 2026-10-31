"use client";

import { Campo, CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { CaixaDaCasca } from "@/components/escale/ui/CaixaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { usePipelines, useWebhookSources } from "@/hooks/webhooks/useWebhookSources";
import { DIAS_MAX, DIAS_MIN, GATILHO_DE_DATA_DO_FUNIL } from "@/lib/automation/gatilho-de-data-do-funil";
import {
  DIRECOES_DO_SILENCIO,
  GATILHO_ETAPA_PARADA,
  GATILHO_SILENCIO,
  type DirecaoDoSilencio,
} from "@/lib/automation/gatilhos-de-tempo";
import type { TelaDoGatilho } from "@/lib/automation/desenho-da-regra";
import { camposDoFunil } from "@/lib/leads/campos-do-funil";
import { acoesQueFechamLaco, MENSAGEM_DO_LACO_DE_LEAD } from "@/lib/schemas/webhooks";

const TEXTO_DA_DIRECAO: Record<DirecaoDoSilencio, string> = {
  da_equipe: "Da equipe (nós não falamos)",
  do_cliente: "Do cliente (ele não respondeu)",
  qualquer: "De qualquer um",
};

/**
 * O FORMULÁRIO DO GATILHO (vista 3 do painel; sem print, provisório): os mesmos
 * campos e textos do painel do original, com os controles da casca.
 */
export function FormularioDoGatilho({
  evento,
  tela,
  aoMudarTela,
}: {
  evento: string;
  tela: TelaDoGatilho;
  aoMudarTela: (tela: TelaDoGatilho) => void;
}) {
  const t = useT();
  const { data: funisRes } = usePipelines();
  const { data: fontesRes } = useWebhookSources();
  const funis = funisRes?.data ?? [];
  const fontes = fontesRes?.data ?? [];
  const camposDeData = camposDoFunil(funis.find((p) => p.id === tela.data.pipeline_id)?.settings ?? null).filter(
    (c) => c.type === "date",
  );

  return (
    <div className="flex flex-col gap-5">
      {evento === "lead.created" ? (
        <Campo rotulo={t("Fonte do formulário")}>
          <SeletorDaCasca
            aria-label={t("Fonte do formulário")}
            aparencia="janela"
            valor={tela.fonte ?? ""}
            vazio={t("Qualquer fonte")}
            aoMudar={(v) => aoMudarTela({ ...tela, fonte: v === "" ? null : v })}
            opcoes={[
              ...(tela.fonte && !fontes.some((f) => f.id === tela.fonte)
                ? [{ valor: tela.fonte, rotulo: t("Fonte removida") }]
                : []),
              ...fontes.map((f) => ({ valor: f.id, rotulo: f.name })),
            ]}
          />
          <p className="text-[12px] text-casca-suave">
            {t("Escolha uma fonte para limitar esta automação a um formulário. Qualquer fonte mantém o comportamento geral.")}
          </p>
        </Campo>
      ) : null}

      {evento === GATILHO_DE_DATA_DO_FUNIL ? (
        <>
          <p className="text-[12px] text-casca-suave">
            {t(
              "O aviso sai no dia em que faltarem N dias para a data, uma vez por negócio. Para avisar DEPOIS da data, use N negativo — -60 confirma a entrega 60 dias após o casamento.",
            )}
          </p>
          <Campo rotulo={t("Funil do campo")}>
            <SeletorDaCasca
              aria-label={t("Funil do campo")}
              aparencia="janela"
              valor={tela.data.pipeline_id}
              vazio={t("Escolha o funil")}
              aoMudar={(v) => aoMudarTela({ ...tela, data: { ...tela.data, pipeline_id: v, campo: "" } })}
              opcoes={funis.map((p) => ({ valor: p.id, rotulo: p.name }))}
            />
          </Campo>
          <Campo rotulo={t("Campo de data")}>
            <SeletorDaCasca
              aria-label={t("Campo de data")}
              aparencia="janela"
              valor={tela.data.campo}
              vazio={t("Escolha o campo")}
              desabilitado={camposDeData.length === 0}
              aoMudar={(v) => aoMudarTela({ ...tela, data: { ...tela.data, campo: v } })}
              opcoes={camposDeData.map((c) => ({ valor: c.key, rotulo: c.label }))}
            />
            {tela.data.pipeline_id && camposDeData.length === 0 ? (
              <p className="text-[12px] text-casca-suave">
                {t("Este funil ainda não tem campo de data. Cadastre um em Funis → Campos personalizados para poder escolhê-lo aqui.")}
              </p>
            ) : null}
          </Campo>
          <Campo rotulo={t("Faltam N dias")}>
            <CampoDeTexto
              inputMode="numeric"
              aria-label={t("Faltam N dias")}
              value={tela.data.dias}
              placeholder={`${DIAS_MIN} … ${DIAS_MAX}`}
              onChange={(e) => aoMudarTela({ ...tela, data: { ...tela.data, dias: e.target.value } })}
            />
          </Campo>
        </>
      ) : null}

      {evento === GATILHO_SILENCIO || evento === GATILHO_ETAPA_PARADA ? (
        <>
          <p className="text-[12px] text-casca-suave">
            {evento === GATILHO_SILENCIO
              ? t(
                  "O lembrete sai quando se passarem N dias sem mensagem na direção escolhida. Chegando mensagem nova, o relógio zera — e um novo silêncio de N dias gera outro lembrete. Nada é enviado ao cliente.",
                )
              : t(
                  "O lembrete sai quando se passarem N dias com o card na mesma etapa. Mudando a etapa, o relógio zera. Nada é enviado ao cliente.",
                )}
          </p>
          <Campo rotulo={t("Depois de N dias")}>
            <CampoDeTexto
              inputMode="numeric"
              aria-label={t("Depois de N dias")}
              value={tela.tempo.dias}
              onChange={(e) => aoMudarTela({ ...tela, tempo: { ...tela.tempo, dias: e.target.value } })}
            />
          </Campo>
          {evento === GATILHO_SILENCIO ? (
            <Campo rotulo={t("Silêncio de")}>
              <SeletorDaCasca
                aria-label={t("Silêncio de")}
                aparencia="janela"
                valor={tela.tempo.direcao}
                aoMudar={(v) =>
                  aoMudarTela({ ...tela, tempo: { ...tela.tempo, direcao: (v || "da_equipe") as DirecaoDoSilencio } })
                }
                opcoes={DIRECOES_DO_SILENCIO.map((d) => ({ valor: d, rotulo: t(TEXTO_DA_DIRECAO[d]) }))}
              />
            </Campo>
          ) : null}
          <CaixaDaCasca
            marcada={tela.tempo.proteger_pela_agenda}
            aoMudar={(v) => aoMudarTela({ ...tela, tempo: { ...tela.tempo, proteger_pela_agenda: v } })}
            rotulo={t("Não gerar lembrete quando o cliente tiver compromisso marcado")}
          />
        </>
      ) : null}

      {acoesQueFechamLaco(evento, [{ type: "assign_owner" }]).length > 0 ? (
        <p className="rounded-md border border-casca-divisoria p-3 text-[12px] text-casca-suave">{t(MENSAGEM_DO_LACO_DE_LEAD)}</p>
      ) : null}
    </div>
  );
}
