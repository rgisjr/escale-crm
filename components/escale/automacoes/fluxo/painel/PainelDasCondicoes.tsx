"use client";

import { CURATED_FIELDS, OP_LABELS, type Op } from "@/app/app/webhooks/_components/RuleEditor";
import type { TriggerEvent } from "@/app/app/webhooks/_components/labels";
import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { usePipelineStages, usePipelines } from "@/hooks/webhooks/useWebhookSources";
import {
  MAXIMO_DE_CONDICOES,
  type DadosDaCaixa,
  type DadosDasCondicoes,
  type LinhaDeCondicao,
} from "@/lib/automation/desenho-da-regra";
import { Plus, Trash2 } from "@/lib/ui/icons-da-casca";

import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

/**
 * O PAINEL DAS CONDIÇÕES (07-025; D11): um grupo só, "Corresponde a todas as
 * condições" fixo, cada condição num bloco cinza e o "+" quadrado no canto. Sem
 * "Novo grupo de condições" e sem a saída "Não corresponde": o motor só tem E.
 */
export function PainelDasCondicoes({
  dados,
  evento,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDasCondicoes;
  evento: string;
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const { rascunho, setRascunho, sujo } = useRascunho(dados.linhas, aoMudarRascunho);
  const { data: funisRes } = usePipelines();
  const padrao = funisRes?.data?.find((p) => p.is_default) ?? funisRes?.data?.[0] ?? null;
  const { data: quadro } = usePipelineStages(padrao?.id ?? null);
  const etapas = quadro?.data?.stages ?? [];
  const campos = evento ? (CURATED_FIELDS[evento as TriggerEvent] ?? []) : [];
  const linhas = rascunho;
  const mudar = (i: number, patch: Partial<LinhaDeCondicao>) =>
    setRascunho(linhas.map((l, j) => (j === i ? { ...l, ...patch } : l)));

  return (
    <PainelDoNo
      tipo="condicoes"
      titulo={t("Condições")}
      aoCancelar={aoCancelar}
      aoSalvar={() => aoSalvar({ kind: "condicoes", linhas })}
      salvarDesabilitado={!sujo}
    >
      <ProblemasDoPainel lista={dados.problemas} />
      <div className="relative flex flex-col gap-3 rounded-lg border border-casca-divisoria p-5">
        <p className="text-[13px] text-casca-texto">
          {t("Corresponde a")} <strong>{t("todas as condições")}</strong>
        </p>
        {!evento ? (
          <p className="text-[12px] text-casca-suave">{t("Escolha o gatilho primeiro: cada gatilho tem os seus campos.")}</p>
        ) : null}
        {linhas.map((linha, i) => {
          // Linha nova começa na lista; só cai no modo avançado sozinha quando o campo gravado
          // não está na lista curada — a mesma regra do editor em lista.
          const avancado = linha.avancado ?? (linha.field !== "" && !campos.some((c) => c.value === linha.field));
          const curado = campos.find((c) => c.value === linha.field);
          return (
            <div key={i} className="flex flex-col gap-2 rounded-lg bg-casca-raia p-3" data-testid={`condicao-${i}`}>
              <div className="flex items-center gap-2">
                <div className="min-w-0 flex-1">
                  {avancado ? (
                    <CampoDeTexto
                      value={linha.field}
                      onChange={(e) => mudar(i, { field: e.target.value })}
                      placeholder={t("ex: lead.custom_fields.minha_chave")}
                      aria-label={t("Campo")}
                      className="h-8"
                    />
                  ) : (
                    <SeletorDaCasca
                      aria-label={t("Campo")}
                      aparencia="janela"
                      valor={linha.field}
                      vazio={t("Campo")}
                      aoMudar={(v) => mudar(i, { field: v, op: campos.find((c) => c.value === v)?.op ?? "eq" })}
                      opcoes={campos.map((c) => ({ valor: c.value, rotulo: t(c.label) }))}
                    />
                  )}
                </div>
                <button
                  type="button"
                  aria-label={t("Remover condição")}
                  onClick={() => setRascunho(linhas.filter((_, j) => j !== i))}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:text-casca-alerta"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              </div>
              <SeletorDaCasca
                aria-label={t("Operador")}
                aparencia="janela"
                valor={linha.op}
                aoMudar={(v) => mudar(i, { op: (v || "eq") as Op })}
                opcoes={(Object.keys(OP_LABELS) as Op[]).map((op) => ({
                  valor: op,
                  rotulo: t(curado?.lista && op === "contains" ? "tem a tag" : OP_LABELS[op]),
                }))}
              />
              {curado?.kind === "stage" && !avancado ? (
                <SeletorDaCasca
                  aria-label={t("Etapa")}
                  aparencia="janela"
                  valor={linha.value}
                  vazio={t("Etapa")}
                  aoMudar={(v) => mudar(i, { value: v })}
                  opcoes={etapas.map((s) => ({ valor: s.id, rotulo: s.name }))}
                />
              ) : (
                <CampoDeTexto
                  value={linha.value}
                  onChange={(e) => mudar(i, { value: e.target.value })}
                  placeholder={t("Valor")}
                  aria-label={t("Valor")}
                  className="h-8"
                />
              )}
              <button
                type="button"
                className="w-fit text-[11px] text-casca-suave underline underline-offset-4"
                onClick={() => mudar(i, { avancado: !avancado, ...(avancado && !curado ? { field: "" } : {}) })}
              >
                {avancado ? t("usar campo da lista") : t("usar campo avançado")}
              </button>
            </div>
          );
        })}
        <div className="flex justify-end">
          <button
            type="button"
            aria-label={t("Adicionar condição")}
            disabled={!evento || linhas.length >= MAXIMO_DE_CONDICOES}
            onClick={() => setRascunho([...linhas, { field: "", op: "eq", value: "" }])}
            className="grid size-9 place-items-center rounded-md border border-casca-divisoria text-casca-texto hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus size={16} aria-hidden />
          </button>
        </div>
      </div>
      <p className="mt-3 text-[11px] text-casca-suave">
        {t("Linhas sem campo ou sem valor são descartadas ao salvar. No máximo 10.")}
      </p>
    </PainelDoNo>
  );
}
