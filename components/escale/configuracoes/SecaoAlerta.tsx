"use client";
import { useState } from "react";

import { CampoDeTexto } from "@/components/escale/origens/JanelaDaCasca";
import { PainelSuspenso } from "@/components/escale/ui/PainelSuspenso";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { Popover, PopoverTrigger } from "@/components/ui/popover";
import { useT } from "@/hooks/i18n/useT";
import { UNIDADES_DE_TEMPO, type UnidadeDeTempo } from "@/lib/escale/configuracoes/alerta";
import { LIMITE_NOVO, type LimiteNaTela } from "@/lib/escale/configuracoes/rascunho";
import {
  ArrowRight,
  CircleX,
  Clock,
  Eye,
  Plus,
  Trash2,
  TriangleAlert,
  X,
} from "@/lib/ui/icons-da-casca";

import type { PropsDaSecao } from "./JanelaDaOrigem";
import { PilulaDoPrazo } from "./PilulaDoPrazo";

const caixa =
  "flex items-center gap-3 rounded-[8px] border border-casca-borda px-4 py-3 text-[12px] text-casca-suave";

/** "● Limite de atenção" / "● Limite crítico" (P18): o ponto colorido e o rótulo 11px. */
function RotuloDoLimite({ tipo }: { tipo: "atencao" | "critico" }) {
  const t = useT();
  const atencao = tipo === "atencao";
  return (
    <span className="flex items-center gap-1.5 text-[11px] text-casca-texto">
      <span
        aria-hidden
        className={`size-[7px] rounded-full ${atencao ? "bg-(--escale-ponto-atencao)" : "bg-(--escale-ponto-critico)"}`}
      />
      {atencao ? t("Limite de atenção") : t("Limite crítico")}
    </span>
  );
}

/** O valor (com o ⚠ ou o ⊗ dentro) e a unidade de um lado do limite (P18, P19). */
function LadoDoLimite({
  tipo,
  valor,
  onMudar,
  onde,
}: {
  tipo: "atencao" | "critico";
  valor: LimiteNaTela;
  onMudar: (v: LimiteNaTela) => void;
  onde: string;
}) {
  const t = useT();
  const atencao = tipo === "atencao";
  const Icone = atencao ? TriangleAlert : CircleX;
  const chave = atencao ? "atencao" : "critico";
  const chaveDaUnidade = atencao ? "atencao_unidade" : "critico_unidade";
  const unidades = UNIDADES_DE_TEMPO.map((u) => ({
    valor: u,
    rotulo: u === "minutos" ? t("Minutos") : u === "horas" ? t("Horas") : t("Dias"),
  }));
  return (
    <div className="flex min-w-[200px] flex-1 gap-2">
      <div className="relative flex-1">
        <Icone
          size={14}
          aria-hidden
          className={`absolute top-1/2 left-3 -translate-y-1/2 ${atencao ? "text-(--escale-ponto-atencao)" : "text-(--escale-ponto-critico)"}`}
        />
        <CampoDeTexto
          inputMode="numeric"
          value={valor[chave]}
          placeholder={t("Valor")}
          onChange={(e) => onMudar({ ...valor, [chave]: e.target.value })}
          aria-label={`${atencao ? t("Limite de atenção") : t("Limite crítico")} — ${onde}`}
          className="h-11 pl-9 text-[11.9px] font-light"
        />
      </div>
      <div className="w-[120px] shrink-0">
        <SeletorDaCasca
          aparencia="janela"
          valor={valor[chaveDaUnidade]}
          opcoes={unidades}
          aoMudar={(u) => u && onMudar({ ...valor, [chaveDaUnidade]: u as UnidadeDeTempo })}
          aria-label={`${atencao ? t("Unidade do limite de atenção") : t("Unidade do limite crítico")} — ${onde}`}
        />
      </div>
    </div>
  );
}

/** Os dois lados com a seta no meio. `comRotulos` = a regra geral; nas exceções os rótulos ficam no cabeçalho. */
function CamposDoLimite({
  valor,
  onMudar,
  onde,
  comRotulos,
}: {
  valor: LimiteNaTela;
  onMudar: (v: LimiteNaTela) => void;
  onde: string;
  comRotulos: boolean;
}) {
  const lado = (tipo: "atencao" | "critico") => (
    <div className="grid min-w-[200px] flex-1 gap-1.5">
      {comRotulos ? <RotuloDoLimite tipo={tipo} /> : null}
      <LadoDoLimite tipo={tipo} valor={valor} onMudar={onMudar} onde={onde} />
    </div>
  );
  return (
    <div className="flex flex-1 items-end gap-4">
      {lado("atencao")}
      <ArrowRight size={14} aria-hidden className="mb-[15px] shrink-0 text-casca-suave" />
      {lado("critico")}
    </div>
  );
}

/** ALERTA DE TEMPO NA ETAPA (Fase 1F, D7; Clint P15 a P19 e `StageTimeAlerts`). */
export function SecaoAlerta({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const [previa, setPrevia] = useState(false);
  const [escolhendo, setEscolhendo] = useState(false);
  const { geral, excecoes } = rascunho.alerta;
  const abertas = config.etapas.filter((e) => !e.is_won && !e.is_lost);
  const livres = abertas.filter((e) => !excecoes.some((x) => x.etapa === e.id));
  const numeroDa = (id: string) => abertas.findIndex((e) => e.id === id) + 1;
  const nomeDa = (id: string) => config.etapas.find((e) => e.id === id)?.name ?? "—";
  const regraGeral = t("Regra geral do funil");
  const mudarAlerta = (f: (a: typeof rascunho.alerta) => typeof rascunho.alerta) =>
    mudar((r) => ({ ...r, alerta: f(r.alerta) }));

  return (
    <div className="grid gap-5">
      <div className="flex items-start gap-3">
        <span
          aria-hidden
          className="grid size-[30px] shrink-0 place-items-center rounded-full bg-casca-marca-suave text-casca-marca"
        >
          <Clock size={16} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-medium text-casca-texto">
            {t(
              "Defina quanto tempo um negócio pode ficar parado em cada etapa antes de receber destaque visual no Kanban.",
            )}
          </p>
          <p className="text-[11px] text-casca-suave">
            {t(
              "A regra geral vale para todas as etapas do funil. Crie exceções só para etapas com ritmo diferente.",
            )}
          </p>
        </div>
        <div className="relative">
          <button
            type="button"
            onMouseEnter={() => setPrevia(true)}
            onMouseLeave={() => setPrevia(false)}
            onFocus={() => setPrevia(true)}
            onBlur={() => setPrevia(false)}
            className="flex h-8 items-center gap-1.5 rounded-[5px] border border-casca-marca-media px-3 text-[12px] text-casca-marca"
          >
            <Eye size={14} aria-hidden />
            {t("Como aparece no card")}
          </button>
          {previa ? (
            <div
              role="tooltip"
              className="absolute top-[calc(100%+6px)] right-0 z-30 w-[240px] rounded-[8px] bg-surface p-3 shadow-casca-painel"
            >
              <p className="mb-2 text-[10px] font-semibold tracking-wider text-casca-suave uppercase">
                {t("No rodapé do card")}
              </p>
              <div className="grid gap-2 text-[12px] text-casca-texto-2">
                <span className="flex items-center gap-2">
                  <PilulaDoPrazo nivel="ok" tempo="2h" />
                  {t("dentro do prazo · cinza")}
                </span>
                <span className="flex items-center gap-2">
                  <PilulaDoPrazo nivel="atencao" tempo="5h" />
                  {t("passou de atenção · âmbar")}
                </span>
                <span className="flex items-center gap-2">
                  <PilulaDoPrazo nivel="critico" tempo="11h" />
                  {t("passou de crítico · vermelho")}
                </span>
              </div>
            </div>
          ) : null}
        </div>
      </div>

      <section className="grid gap-3 border-b border-casca-borda pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-casca-texto">{regraGeral}</span>
          <span className="text-[11px] text-casca-suave">
            {t("vale para todas as etapas, exceto as que tiverem regra própria abaixo")}
          </span>
          {geral ? (
            <button
              type="button"
              onClick={() => mudarAlerta((a) => ({ ...a, geral: null }))}
              className="ml-auto flex h-8 items-center gap-1.5 rounded-[5px] border border-casca-borda px-3 text-[12px] text-casca-texto hover:bg-casca-raia"
            >
              <Trash2 size={13} aria-hidden />
              {t("Remover regra geral")}
            </button>
          ) : null}
        </div>
        {geral ? (
          <CamposDoLimite
            comRotulos
            valor={geral}
            onde={regraGeral}
            onMudar={(v) => mudarAlerta((a) => ({ ...a, geral: v }))}
          />
        ) : (
          <div className={caixa}>
            <CircleX size={16} aria-hidden className="shrink-0 text-casca-meta" />
            <span className="flex-1">
              {t(
                "Sem regra geral. Apenas as etapas listadas em Exceções abaixo terão alerta de tempo.",
              )}
            </span>
            <button
              type="button"
              onClick={() => mudarAlerta((a) => ({ ...a, geral: { ...LIMITE_NOVO } }))}
              className="flex h-8 shrink-0 items-center gap-1 rounded-[5px] border border-casca-borda bg-surface px-3 text-[12px] text-casca-texto hover:bg-casca-raia"
            >
              <Plus size={14} aria-hidden />
              {t("Definir regra geral")}
            </button>
          </div>
        )}
      </section>

      <section className="grid gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[12px] font-semibold text-casca-texto">
            {t("Exceções por etapa")}
          </span>
          <span className="rounded-full bg-casca-marca-suave px-2 text-[10px] leading-[18px] font-semibold text-casca-marca">
            {excecoes.length}
          </span>
          <span className="text-[11px] text-casca-suave">
            {t("etapas com regra própria; todas as outras seguem a geral acima")}
          </span>
          <Popover open={escolhendo} onOpenChange={setEscolhendo}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className="ml-auto flex h-8 items-center gap-1.5 rounded-[5px] bg-casca-marca px-4 text-[12px] font-medium text-white hover:brightness-95"
              >
                <Plus size={14} aria-hidden />
                {t("Adicionar etapa")}
              </button>
            </PopoverTrigger>
            <PainelSuspenso
              aria-label={t("Selecionar etapa")}
              align="end"
              sideOffset={6}
              className="w-[270px] p-1"
            >
              <p className="px-3 pt-2 pb-1.5 text-[10px] font-semibold tracking-wider text-casca-suave uppercase">
                {t("Selecionar etapa")}
              </p>
              <div className="max-h-64 overflow-y-auto">
                {livres.length === 0 ? (
                  <p className="px-3 py-2 text-[12px] text-casca-suave">
                    {t("Todas as etapas já têm regra própria.")}
                  </p>
                ) : (
                  livres.map((e) => (
                    <button
                      key={e.id}
                      type="button"
                      onClick={() => {
                        mudarAlerta((a) => ({
                          ...a,
                          excecoes: [
                            ...a.excecoes,
                            { etapa: e.id, limite: { ...(a.geral ?? LIMITE_NOVO) } },
                          ],
                        }));
                        setEscolhendo(false);
                      }}
                      className="flex w-full items-center gap-3 rounded-[2px] px-3 py-2 text-left text-[12px] text-casca-texto hover:bg-casca-raia"
                    >
                      <span aria-hidden className="w-3 text-[10px] text-casca-suave">
                        {numeroDa(e.id)}
                      </span>
                      {e.name}
                    </button>
                  ))
                )}
              </div>
            </PainelSuspenso>
          </Popover>
        </div>

        {excecoes.length === 0 ? (
          <div className={caixa}>
            <TriangleAlert size={16} aria-hidden className="shrink-0 text-casca-meta" />
            {t("Nenhuma exceção configurada. Todas as etapas seguem a regra geral.")}
          </div>
        ) : (
          <div>
            <div className="flex items-center gap-4 pb-2">
              <span className="w-[150px] shrink-0" />
              <span className="min-w-[200px] flex-1">
                <RotuloDoLimite tipo="atencao" />
              </span>
              <span className="w-[14px] shrink-0" />
              <span className="min-w-[200px] flex-1">
                <RotuloDoLimite tipo="critico" />
              </span>
              <span className="w-4 shrink-0" />
            </div>
            {excecoes.map((x) => (
              <div
                key={x.etapa}
                className="flex items-center gap-4 border-t border-casca-borda py-3"
              >
                <span className="flex w-[150px] shrink-0 items-center gap-3">
                  <span aria-hidden className="w-3 text-[10px] text-casca-suave">
                    {numeroDa(x.etapa)}
                  </span>
                  <span className="truncate text-[12px] font-medium text-casca-texto">
                    {nomeDa(x.etapa)}
                  </span>
                </span>
                <CamposDoLimite
                  comRotulos={false}
                  valor={x.limite}
                  onde={nomeDa(x.etapa)}
                  onMudar={(v) =>
                    mudarAlerta((a) => ({
                      ...a,
                      excecoes: a.excecoes.map((y) =>
                        y.etapa === x.etapa ? { ...y, limite: v } : y,
                      ),
                    }))
                  }
                />
                <button
                  type="button"
                  aria-label={`${t("Voltar à regra geral")}: ${nomeDa(x.etapa)}`}
                  onClick={() =>
                    mudarAlerta((a) => ({
                      ...a,
                      excecoes: a.excecoes.filter((y) => y.etapa !== x.etapa),
                    }))
                  }
                  className="w-4 shrink-0 text-casca-meta hover:text-casca-texto"
                >
                  <X size={14} aria-hidden />
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
