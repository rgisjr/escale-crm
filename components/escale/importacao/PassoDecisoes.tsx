"use client";
import type { ReactNode } from "react";

import { useT } from "@/hooks/i18n/useT";
import {
  CATEGORIAS,
  NIVEIS,
  REGRAS,
  contagemDasDecisoes,
  decisoesDoNivel,
  nivelDasDecisoes,
  opcoesDaSituacao,
  situacoesAjustaveis,
  situacoesTravadas,
  type ColunaMapeada,
  type Decisoes,
  type Gravidade,
  type Nivel,
  type TipoDeImportacao,
} from "@/lib/escale/importacao/regras";
import { ROTULO_DO_MOTIVO, ROTULO_DO_NIVEL, rotuloDaAcao } from "@/lib/escale/importacao/textos";
import { Check, Flag, Shield, SlidersHorizontal, Zap } from "@/lib/ui/icons-da-casca";
import { cn } from "@/lib/utils";

import { ColunaCentral, Titulo } from "./pecas";

const ICONE_DO_NIVEL: Record<Nivel, (cor: string) => ReactNode> = {
  conservador: (cor) => <Shield size={18} className={cor} aria-hidden />,
  padrao: (cor) => <SlidersHorizontal size={18} className={cor} aria-hidden />,
  agressivo: (cor) => <Zap size={18} className={cor} aria-hidden />,
};
const COR_DA_GRAVIDADE: Record<Gravidade, string> = {
  CONFIG: "bg-[#2FB36B]",
  SOFT: "bg-[#F08A24]",
  HARD: "bg-[#D1264F]",
  SOFT_LOCKED: "bg-casca-marca",
};

function CartaoDoNivel({
  nivel,
  ativo,
  tipo,
  mapa,
  aoEscolher,
}: {
  nivel: Nivel;
  ativo: boolean;
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  aoEscolher: () => void;
}) {
  const t = useT();
  const conta = contagemDasDecisoes(decisoesDoNivel(nivel), tipo, mapa);
  return (
    <button
      type="button"
      aria-pressed={ativo}
      onClick={aoEscolher}
      className={cn(
        "flex flex-1 flex-col rounded-[8px] border-[1.5px] p-4 text-left",
        ativo ? "border-casca-marca bg-casca-marca-suave shadow-sm" : "border-[#ECEBF1] bg-white",
      )}
    >
      <span className="mb-2 flex items-center gap-2">
        {ICONE_DO_NIVEL[nivel](ativo ? "text-casca-marca" : "text-[#86858F]")}
        <span className="text-[13px] font-semibold text-casca-texto">{t(ROTULO_DO_NIVEL[nivel].rotulo)}</span>
        {nivel === "conservador" ? (
          <span className="ml-auto rounded-[4px] bg-casca-marca-suave px-1.5 py-0.5 text-[10px] font-semibold tracking-[0.06em] text-casca-marca uppercase">
            {t("Recomendado")}
          </span>
        ) : null}
      </span>
      <span className="min-h-[54px] text-[12px] leading-[1.5] text-[#5A5964]">{t(ROTULO_DO_NIVEL[nivel].texto)}</span>
      <span className="mt-2.5 flex gap-3 border-t border-[#F1F0F5] pt-2.5 text-[12px] font-semibold">
        <span className="text-[#1F9D55]">
          {conta.auto} {t("auto")}
        </span>
        <span className="text-[#C2570C]">
          {conta.revisar} {t("revisar")}
        </span>
      </span>
    </button>
  );
}

export function PassoDecisoes({
  tipo,
  mapa,
  decisoes,
  aoMudar,
}: {
  tipo: TipoDeImportacao;
  mapa: readonly ColunaMapeada[];
  decisoes: Decisoes;
  aoMudar: (decisoes: Decisoes) => void;
}) {
  const t = useT();
  const nivel = nivelDasDecisoes(decisoes, tipo, mapa);
  const conta = contagemDasDecisoes(decisoes, tipo, mapa);
  const situacoes = situacoesAjustaveis(tipo, mapa);
  const temTravadas = situacoesTravadas(tipo, mapa).length > 0;
  return (
    <>
      <Titulo
        titulo={t("Escolha o nível de automação")}
        subtitulo={t("Decisões seguras são aplicadas sozinhas. As de risco ficam numa fila de revisão — nada é substituído sem a sua confirmação.")}
      />
      <ColunaCentral largura="max-w-[760px]">
        <div className="mt-4 flex gap-3">
          {NIVEIS.map((n) => (
            <CartaoDoNivel key={n} nivel={n} ativo={nivel === n} tipo={tipo} mapa={mapa} aoEscolher={() => aoMudar(decisoesDoNivel(n))} />
          ))}
        </div>
        <div className="mt-6 flex items-baseline justify-between">
          <p className="text-[13px] font-semibold text-casca-texto">{t("Ajuste cada situação")}</p>
          <p className="text-[12px] text-[#5A5964]">
            {nivel === "personalizado"
              ? t("Personalizado — você alterou um preset")
              : t('Partindo do preset "{preset}"').replace("{preset}", t(ROTULO_DO_NIVEL[nivel].rotulo))}
          </p>
        </div>
        <div className="mt-3 overflow-hidden rounded-[8px] border border-[#ECEBF1]">
          {CATEGORIAS.map((categoria) => {
            const daCategoria = situacoes.filter((m) => REGRAS[m].categoria === categoria.id);
            if (daCategoria.length === 0) return null;
            return (
              <section key={categoria.id}>
                <h3 className="border-b border-[#F1F0F5] bg-[#FAFAFC] px-4 py-2 text-[10px] font-semibold tracking-[0.08em] text-[#86858F] uppercase">
                  {t(categoria.rotulo)}
                </h3>
                {daCategoria.map((m) => (
                  <div
                    key={m}
                    role="group"
                    aria-label={t(ROTULO_DO_MOTIVO[m].rotulo)}
                    className="flex items-center gap-3 border-b border-[#F1F0F5] px-4 py-3 last:border-b-0"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="flex items-center gap-2">
                        <span aria-hidden className={cn("size-2 shrink-0 rounded-full", COR_DA_GRAVIDADE[REGRAS[m].gravidade])} />
                        <span className="text-[13px] font-medium text-casca-texto">{t(ROTULO_DO_MOTIVO[m].rotulo)}</span>
                      </p>
                      <p className="mt-0.5 ml-4 text-[12px] leading-[1.45] text-[#5A5964]">{t(ROTULO_DO_MOTIVO[m].descricao)}</p>
                    </div>
                    <div className="flex shrink-0 flex-wrap justify-end gap-1.5">
                      {opcoesDaSituacao(m).map((acao) => {
                        const escolhida = decisoes[m] === acao;
                        const revisar = acao === "PENDING_REVIEW";
                        return (
                          <button
                            key={acao}
                            type="button"
                            aria-pressed={escolhida}
                            onClick={() => aoMudar({ ...decisoes, [m]: acao })}
                            className={cn(
                              "inline-flex h-[30px] items-center gap-1 rounded-[6px] border px-2.5 text-[12px] font-medium whitespace-nowrap",
                              escolhida && revisar && "border-[#F08A24] bg-[#FFEBD6] text-[#C2570C]",
                              escolhida && !revisar && "border-casca-marca bg-casca-marca-suave text-casca-marca",
                              !escolhida && "border-[#ECEBF1] bg-white text-[#5A5964]",
                            )}
                          >
                            {revisar ? <Flag size={11} aria-hidden /> : null}
                            {t(rotuloDaAcao(acao, m).curto)}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </section>
            );
          })}
        </div>
        <div className="mt-4 flex items-center gap-4 rounded-[8px] border border-[#ECEBF1] bg-[#F8F8FA] px-4 py-3">
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center rounded-[6px] border border-[#BFE8CF] bg-[#EEFBF2] text-[#1F9D55]">
              <Check size={16} />
            </span>
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[16px] font-semibold text-casca-texto">{conta.auto}</span>
              <span className="text-[10px] text-[#5A5964]">{t("auto-resolvem")}</span>
            </span>
          </span>
          <span className="flex items-center gap-2.5">
            <span aria-hidden className="grid size-8 place-items-center rounded-[6px] border border-[#FAD3AE] bg-[#FFEBD6] text-[#C2570C]">
              <Flag size={15} />
            </span>
            <span className="flex flex-col leading-[1.15]">
              <span className="text-[16px] font-semibold text-casca-texto">{conta.revisar}</span>
              <span className="text-[10px] text-[#5A5964]">{t("vão para revisão")}</span>
            </span>
          </span>
          {temTravadas ? (
            <p className="ml-auto max-w-[280px] text-right text-[12px] leading-[1.4] text-[#5A5964]">
              {t("Linhas que batem com dois contatos sempre vão para revisão — não dá para decidir com segurança automaticamente.")}
            </p>
          ) : null}
        </div>
      </ColunaCentral>
    </>
  );
}
