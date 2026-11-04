"use client";
import { useMemo } from "react";

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
import { ehCampoDeHorario } from "@/lib/automation/condicoes-de-horario";
import type { GrupoDeCondicoes } from "@/lib/escale/automacoes/fluxo/caixas";
import { FUSO_PADRAO } from "@/lib/tempo/fusos";
import { Plus, Trash2 } from "@/lib/ui/icons-da-casca";

import { LinhaDeHorario } from "./condicoes/LinhaDeHorario";
import { SeletorDeCondicao, type EscolhaDaCondicao } from "./condicoes/SeletorDeCondicao";
import { PainelDoNo, ProblemasDoPainel } from "./PainelDoNo";
import { useRascunho } from "./useRascunho";

const MAXIMO_DE_GRUPOS = 10;

/** `g1`, `g2`…: o primeiro que nenhum grupo usa (a ligação do canvas guarda `grupo:<id>`). */
function novoIdDeGrupo(grupos: readonly GrupoDeCondicoes[]): string {
  const usados = new Set(grupos.map((g) => g.id));
  let n = grupos.length + 1;
  while (usados.has(`g${n}`)) n += 1;
  return `g${n}`;
}

/**
 * O PAINEL DAS CONDIÇÕES (07-025; D11): grupos "Corresponde a todas / qualquer condição", cada um com as suas
 * linhas em blocos cinza e o "+" quadrado; "+ Novo grupo de condições" no fim. Cada grupo é uma saída do nó no
 * canvas, e "Não corresponde a nenhuma condição" é a última. Com um grupo "todas" só, grava o formato de sempre.
 */
export function PainelDasCondicoes({
  dados,
  evento,
  fuso = FUSO_PADRAO,
  aoCancelar,
  aoSalvar,
  aoMudarRascunho,
}: {
  dados: DadosDasCondicoes;
  evento: string;
  /** O fuso da organização (o "(UTC -3)" do horário). */
  fuso?: string;
  aoCancelar: () => void;
  aoSalvar: (dados: DadosDaCaixa) => void;
  aoMudarRascunho?: (sujo: boolean) => void;
}) {
  const t = useT();
  const inicial = useMemo<GrupoDeCondicoes[]>(
    () => dados.grupos ?? [{ id: "g1", modo: "todas", linhas: dados.linhas }],
    // O rascunho nasce UMA vez por painel (a tela remonta o painel por `key`).
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [],
  );
  const { rascunho: grupos, setRascunho, sujo } = useRascunho<GrupoDeCondicoes[]>(inicial, aoMudarRascunho);
  const { data: funisRes } = usePipelines();
  const padrao = funisRes?.data?.find((p) => p.is_default) ?? funisRes?.data?.[0] ?? null;
  const { data: quadro } = usePipelineStages(padrao?.id ?? null);
  const etapas = quadro?.data?.stages ?? [];
  const campos = evento ? (CURATED_FIELDS[evento as TriggerEvent] ?? []) : [];
  const mudarGrupo = (id: string, patch: Partial<GrupoDeCondicoes>) =>
    setRascunho(grupos.map((g) => (g.id === id ? { ...g, ...patch } : g)));

  function salvar() {
    const formatoDeSempre = !dados.grupos && grupos.length === 1 && grupos[0]!.modo === "todas";
    aoSalvar(
      formatoDeSempre
        ? { kind: "condicoes", linhas: grupos[0]!.linhas }
        : { kind: "condicoes", linhas: grupos[0]?.linhas ?? [], grupos },
    );
  }

  return (
    <PainelDoNo tipo="condicoes" titulo={t("Condições")} aoCancelar={aoCancelar} aoSalvar={salvar} salvarDesabilitado={!sujo}>
      <ProblemasDoPainel lista={dados.problemas} />
      {!evento ? (
        <p className="mb-3 text-[12px] text-casca-suave">{t("Escolha o gatilho primeiro: cada gatilho tem os seus campos.")}</p>
      ) : null}
      <div className="flex flex-col gap-4">
        {grupos.map((grupo, g) => (
          <div key={grupo.id} className="relative flex flex-col gap-3 rounded-lg border border-casca-divisoria p-5" data-testid={`grupo-${grupo.id}`}>
            <div className="flex items-center gap-2 text-[13px] text-casca-texto">
              <span className="shrink-0">{t("Corresponde a")}</span>
              <div className="min-w-0 flex-1">
                <SeletorDaCasca
                  aria-label={`${t("Corresponde a")} ${g + 1}`}
                  aparencia="janela"
                  valor={grupo.modo}
                  aoMudar={(v) => mudarGrupo(grupo.id, { modo: v === "qualquer" ? "qualquer" : "todas" })}
                  opcoes={[
                    { valor: "todas", rotulo: t("todas as condições") },
                    { valor: "qualquer", rotulo: t("qualquer condição") },
                  ]}
                />
              </div>
              {grupos.length > 1 ? (
                <button
                  type="button"
                  aria-label={`${t("Remover grupo")} ${g + 1}`}
                  onClick={() => setRascunho(grupos.filter((x) => x.id !== grupo.id))}
                  className="grid size-7 shrink-0 place-items-center rounded-md text-casca-suave hover:text-casca-alerta"
                >
                  <Trash2 size={14} aria-hidden />
                </button>
              ) : null}
            </div>
            <LinhasDoGrupo
              linhas={grupo.linhas}
              aoMudar={(linhas) => mudarGrupo(grupo.id, { linhas })}
              campos={campos}
              evento={evento}
              fuso={fuso}
              etapas={etapas}
            />
          </div>
        ))}
        <button
          type="button"
          disabled={!evento || grupos.length >= MAXIMO_DE_GRUPOS}
          onClick={() => setRascunho([...grupos, { id: novoIdDeGrupo(grupos), modo: "todas", linhas: [] }])}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} aria-hidden />
          {t("Novo grupo de condições")}
        </button>
      </div>
      <p className="mt-3 text-[11px] text-casca-suave">
        {t("Linhas sem campo ou sem valor são descartadas ao salvar. No máximo 10.")}
      </p>
    </PainelDoNo>
  );
}

/** As linhas de UM grupo, cada uma num bloco cinza, e o "+ Adicionar condição" (o seletor da Clint). */
function LinhasDoGrupo({
  linhas,
  aoMudar,
  campos,
  evento,
  fuso,
  etapas,
}: {
  linhas: LinhaDeCondicao[];
  aoMudar: (linhas: LinhaDeCondicao[]) => void;
  campos: ReturnType<() => (typeof CURATED_FIELDS)[TriggerEvent]>;
  evento: string;
  fuso: string;
  etapas: Array<{ id: string; name: string }>;
}) {
  const t = useT();
  const mudar = (i: number, patch: Partial<LinhaDeCondicao>) => aoMudar(linhas.map((l, j) => (j === i ? { ...l, ...patch } : l)));
  // FORK ESCALE · automações: o "+ Adicionar condição" abre o seletor da Clint.
  function adicionar(escolha: EscolhaDaCondicao) {
    const nova: LinhaDeCondicao =
      escolha.tipo === "campo"
        ? { field: escolha.campo.value, op: escolha.campo.op, value: "" }
        : escolha.tipo === "avancado"
          ? { field: "", op: "eq", value: "", avancado: true }
          : { field: escolha.campo, op: escolha.op, value: escolha.value };
    aoMudar([...linhas, nova]);
  }
  return (
    <>
      {linhas.map((linha, i) => {
        if (ehCampoDeHorario(linha.field)) {
          return (
            <LinhaDeHorario
              key={i}
              indice={i}
              linha={linha}
              fuso={fuso}
              aoMudar={(op, value) => mudar(i, { op, value })}
              aoRemover={() => aoMudar(linhas.filter((_, j) => j !== i))}
            />
          );
        }
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
                onClick={() => aoMudar(linhas.filter((_, j) => j !== i))}
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
      <SeletorDeCondicao campos={campos} fuso={fuso} aoEscolher={adicionar}>
        <button
          type="button"
          disabled={!evento || linhas.length >= MAXIMO_DE_CONDICOES}
          className="flex h-12 w-full items-center justify-center gap-2 rounded-lg border border-dashed border-casca-divisoria text-[13px] font-medium text-casca-marca-forte hover:bg-casca-raia disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar condição")}
        </button>
      </SeletorDeCondicao>
    </>
  );
}
