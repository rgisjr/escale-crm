"use client";
import { useState } from "react";

import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useGravarPreferencia } from "@/hooks/escale/usePreferenciasDeConversas";
import { useT } from "@/hooks/i18n/useT";
import {
  CAMPOS_ATIVOS_MAX,
  CAMPOS_DA_LINHA,
  ROTULO_DA_UNIDADE,
  ROTULO_DO_CAMPO_DA_LINHA,
  UNIDADES_DE_TEMPO,
  VISUALIZACAO_PADRAO,
  camposAtivos,
  podeLigar,
  type CampoDaLinha,
  type Limite,
  type Visualizacao,
} from "@/lib/escale/conversas/visualizacao";
import { CheckCheck, SlidersHorizontal, X } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

/** Toggles que dependem de outras fases ficam desligados com "Em breve" (N16). */
const EM_BREVE: ReadonlySet<CampoDaLinha> = new Set(["empresa"]);
const LIMITES = ["amarelo", "vermelho"] as const;
const ROTULO_DO_LIMITE = {
  amarelo: "Amarelo a partir de",
  vermelho: "Vermelho a partir de",
} as const;

/**
 * "PERSONALIZAR VISUALIZAÇÃO" (02-008, c44–c46): o painel de 355px sobre a
 * esquerda do centro, com a prévia, os sete toggles (no máximo cinco), os
 * limites de alerta e "Restaurar padrão". Grava na hora, por toggle.
 */
export function PainelPersonalizarVisualizacao({
  visualizacao,
  aoFechar,
}: {
  visualizacao: Visualizacao;
  aoFechar: () => void;
}) {
  const t = useT();
  const gravar = useGravarPreferencia();
  const [limitesAbertos, setLimitesAbertos] = useState(false);
  const ativos = camposAtivos(visualizacao);
  const salvar = (valor: Visualizacao) => gravar.mutate({ chave: "visualizacao", valor });
  const mudarCampo = (campo: CampoDaLinha, ligado: boolean) =>
    salvar({ ...visualizacao, campos: { ...visualizacao.campos, [campo]: ligado } });
  const mudarLimite = (qual: "amarelo" | "vermelho", limite: Limite) =>
    salvar({ ...visualizacao, limites: { ...visualizacao.limites, [qual]: limite } });

  const linhaDoLimite = (qual: "amarelo" | "vermelho", rotulo: string) => {
    const l = visualizacao.limites[qual];
    return (
      <div key={qual} className="flex h-9 items-center gap-2 pl-4">
        <label htmlFor={`limite-${qual}`} className="w-[120px] text-[14px] text-casca-suave">
          {rotulo}
        </label>
        <input
          id={`limite-${qual}`}
          type="number"
          min={1}
          max={999}
          value={l.valor}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (Number.isInteger(n) && n >= 1 && n <= 999) mudarLimite(qual, { ...l, valor: n });
          }}
          className="h-8 w-12 rounded-casca-gatilho bg-casca-busca px-2 text-center text-[14px] text-casca-texto focus-visible:outline-2 focus-visible:outline-casca-marca"
        />
        <div className="w-[100px]">
          <SeletorDaCasca
            aparencia="janela"
            className="h-8"
            valor={l.unidade}
            opcoes={UNIDADES_DE_TEMPO.map((u) => ({ valor: u, rotulo: t(ROTULO_DA_UNIDADE[u]) }))}
            aoMudar={(u) => u && mudarLimite(qual, { ...l, unidade: u })}
            aria-label={`${rotulo} (${t("unidade")})`}
            buscaAPartirDe={99}
          />
        </div>
      </div>
    );
  };

  return (
    <aside
      aria-label={t("Personalizar visualização")}
      className="absolute inset-y-0 left-0 z-20 flex w-[355px] flex-col border-r border-casca-borda bg-surface shadow-casca-painel"
    >
      <div className="flex h-12 shrink-0 items-center justify-between px-4">
        <h2 className="text-[16px] font-medium text-casca-texto">
          {t("Personalizar visualização")}
        </h2>
        <button
          type="button"
          aria-label={t("Fechar")}
          onClick={aoFechar}
          className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
        >
          <X size={16} aria-hidden />
        </button>
      </div>
      <div className="mx-4 rounded-[8px] border border-casca-borda p-3">
        <div className="flex items-start gap-3">
          <span
            aria-hidden
            className="grid size-11 shrink-0 place-items-center rounded-full bg-casca-marca-media text-[17px] font-medium text-casca-marca"
          >
            M
          </span>
          <span className="flex min-w-0 flex-1 flex-col gap-1">
            <span className="flex items-center justify-between">
              <span className="truncate text-[15px] font-medium text-casca-texto">Maria Silva</span>
              <span className="text-[12px] text-casca-meta">21:05</span>
            </span>
            <span className="flex items-center justify-between gap-2">
              <span className="truncate text-[14px] text-casca-suave">
                {t("Oi! Ainda tenho interesse…")}
              </span>
              <span className="flex shrink-0 items-center gap-1.5">
                {visualizacao.campos.atendente ? (
                  <span
                    aria-hidden
                    className="grid size-5 place-items-center rounded-full bg-casca-marca text-[11px] font-semibold text-white"
                  >
                    R
                  </span>
                ) : null}
                <span
                  aria-hidden
                  className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-casca-novo px-1 text-[11px] font-semibold text-white"
                >
                  2
                </span>
              </span>
            </span>
            {visualizacao.campos.tempoSemResposta || visualizacao.campos.tags ? (
              <span className="flex items-center gap-1.5 pt-0.5 text-[12px]">
                {visualizacao.campos.tempoSemResposta ? (
                  <span className="text-casca-atencao">3h</span>
                ) : null}
                {visualizacao.campos.tags ? (
                  <span className="rounded-sm bg-casca-marca-suave px-1.5 text-[11px] text-casca-marca">
                    vip
                  </span>
                ) : null}
                <CheckCheck size={12} aria-hidden className="text-casca-meta" />
              </span>
            ) : null}
          </span>
        </div>
      </div>
      <ul className="mt-4 flex-1 overflow-y-auto px-4">
        {CAMPOS_DA_LINHA.map((campo) => {
          const ligado = visualizacao.campos[campo];
          const emBreve = EM_BREVE.has(campo);
          const bloqueado = emBreve || !podeLigar(visualizacao, campo);
          return (
            <li key={campo}>
              <div
                className={cn(
                  "flex h-8 items-center justify-between",
                  bloqueado && !ligado && "text-casca-meta",
                )}
              >
                <span className="text-[14px]">{t(ROTULO_DO_CAMPO_DA_LINHA[campo])}</span>
                <span className="flex items-center gap-2">
                  {campo === "tempoSemResposta" && ligado ? (
                    <button
                      type="button"
                      aria-label={t("Limites de alerta")}
                      title={t("Limites de alerta")}
                      onClick={() => setLimitesAbertos((v) => !v)}
                      className="grid size-6 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
                    >
                      <SlidersHorizontal size={14} aria-hidden />
                    </button>
                  ) : null}
                  <InterruptorDaCasca
                    ligado={ligado}
                    aoMudar={(v) => mudarCampo(campo, v)}
                    aria-label={t(ROTULO_DO_CAMPO_DA_LINHA[campo])}
                    desabilitado={bloqueado}
                    title={
                      emBreve
                        ? t("Em breve")
                        : !podeLigar(visualizacao, campo)
                          ? t("No máximo 5 campos ativos")
                          : undefined
                    }
                  />
                </span>
              </div>
              {campo === "tempoSemResposta" && ligado && limitesAbertos ? (
                <div className="pb-2">
                  {LIMITES.map((l) => linhaDoLimite(l, t(ROTULO_DO_LIMITE[l])))}
                </div>
              ) : null}
            </li>
          );
        })}
      </ul>
      <div className="flex h-12 shrink-0 items-center justify-between border-t border-casca-borda px-4 text-[14px]">
        <span className="text-casca-suave">{`${ativos} ${t("de")} ${CAMPOS_ATIVOS_MAX} ${t("campos ativos")}`}</span>
        <button
          type="button"
          onClick={() => salvar(VISUALIZACAO_PADRAO)}
          className="text-casca-texto hover:underline"
        >
          {t("Restaurar padrão")}
        </button>
      </div>
    </aside>
  );
}
