"use client";
import { useMemo, useState } from "react";

import { BotaoDaCasca } from "@/components/escale/ui/BotaoDaCasca";
import { SeletorDaCasca } from "@/components/escale/ui/SeletorDaCasca";
import { useT } from "@/hooks/i18n/useT";
import type { CampoFiltravel } from "@/lib/escale/filtros/campos";
import { GRUPOS_DE_ORDEM, opcoesDeOrdem, rotulosDaDirecao } from "@/lib/escale/filtros/ordenar";
import { CRITERIOS_DE_ORDEM_MAX, type CriterioDeOrdem } from "@/lib/escale/filtros/tipos";
import { Plus, X } from "@/lib/ui/icons-da-casca";

/**
 * O CORPO DE "ORDENAR POR" (fork Escale, Fase 1D; textos da Clint, `DealSortControl`).
 * Na Fase 1E (E15) ele mora no painel do botão "↑↓ Ordenar" da linha de contagem
 * (`BotaoOrdenar`, print v2-19). Até 3 critérios, a ordem das linhas é a
 * prioridade, e nada muda até "Aplicar". Aplicar sem critério volta à ordem manual.
 * O painel nasce com o que está aplicado: quem o monta só o abre quando a pessoa clica.
 */
export function PainelDeOrdem({
  ordem,
  campos,
  onAplicar,
  onCancelar,
}: {
  ordem: readonly CriterioDeOrdem[] | undefined;
  campos: readonly CampoFiltravel[];
  onAplicar: (ordem: CriterioDeOrdem[] | undefined) => void;
  onCancelar: () => void;
}) {
  const t = useT();
  const [rascunho, setRascunho] = useState<CriterioDeOrdem[]>(() => [...(ordem ?? [])]);
  const opcoes = useMemo(() => opcoesDeOrdem(campos), [campos]);
  const porCampo = new Map(opcoes.map((o) => [o.campo, o]));
  const livre = opcoes.find((o) => !rascunho.some((r) => r.campo === o.campo));
  const cheio = rascunho.length >= CRITERIOS_DE_ORDEM_MAX;
  const rotuloDoGrupo = new Map(GRUPOS_DE_ORDEM.map((g) => [g.grupo, t(g.rotulo)]));
  const opcoesDaCaixa = opcoes.map((o) => ({
    valor: o.campo,
    rotulo: o.grupo === "campos" ? o.rotulo : t(o.rotulo),
    grupo: rotuloDoGrupo.get(o.grupo) ?? "",
  }));

  function trocar(indice: number, novo: CriterioDeOrdem | null) {
    setRascunho((antes) =>
      novo === null
        ? antes.filter((_, j) => j !== indice)
        : antes.map((r, j) => (j === indice ? novo : r)),
    );
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-semibold text-casca-texto">{t("Ordenar por")}</p>
        <p className="text-[11px] text-casca-suave">
          {t("Defina um ou mais critérios. A ordem das linhas define a prioridade.")}
        </p>
      </div>
      {rascunho.length === 0 ? (
        <div className="rounded-casca-gatilho border border-dashed border-casca-borda p-3 text-center">
          <p className="text-xs font-medium text-casca-texto">
            {t("Nenhum critério de ordenação")}
          </p>
          <p className="text-[11px] text-casca-suave">
            {t("Adicione um critério para ordenar ou aplique para voltar à ordem manual.")}
          </p>
        </div>
      ) : (
        rascunho.map((criterio, indice) => {
          const opcao = porCampo.get(criterio.campo);
          const direcoes = rotulosDaDirecao(opcao?.tipo ?? "texto");
          return (
            <div key={indice} className="flex items-center gap-2">
              <div className="min-w-0 flex-1">
                <SeletorDaCasca
                  aria-label={`${t("Campo")} ${indice + 1}`}
                  valor={criterio.campo}
                  opcoes={opcoesDaCaixa.map((o) => ({
                    ...o,
                    desabilitada:
                      o.valor !== criterio.campo && rascunho.some((r) => r.campo === o.valor),
                  }))}
                  aoMudar={(campo) => {
                    if (campo) trocar(indice, { campo, direcao: criterio.direcao });
                  }}
                />
              </div>
              <div className="w-40 shrink-0">
                <SeletorDaCasca<"asc" | "desc">
                  aria-label={`${t("Direção")} ${indice + 1}`}
                  valor={criterio.direcao}
                  opcoes={[
                    { valor: "asc", rotulo: t(direcoes.asc) },
                    { valor: "desc", rotulo: t(direcoes.desc) },
                  ]}
                  aoMudar={(direcao) => {
                    if (direcao) trocar(indice, { campo: criterio.campo, direcao });
                  }}
                />
              </div>
              <button
                type="button"
                aria-label={`${t("Remover critério")} ${indice + 1}`}
                onClick={() => trocar(indice, null)}
                className="grid size-7 shrink-0 place-items-center rounded-casca-gatilho text-casca-suave hover:bg-casca-raia"
              >
                <X size={14} aria-hidden />
              </button>
            </div>
          );
        })
      )}
      <div className="flex items-center justify-between gap-2">
        <BotaoDaCasca
          type="button"
          variante="texto"
          tamanho="sm"
          disabled={!livre || cheio}
          onClick={() => {
            if (livre) setRascunho((antes) => [...antes, { campo: livre.campo, direcao: "asc" }]);
          }}
        >
          <Plus size={14} aria-hidden />
          {t("Adicionar critério")}
        </BotaoDaCasca>
        <div className="flex gap-2">
          <BotaoDaCasca type="button" variante="texto" tamanho="sm" onClick={onCancelar}>
            {t("Cancelar")}
          </BotaoDaCasca>
          <BotaoDaCasca
            type="button"
            variante="marca"
            tamanho="sm"
            onClick={() => {
              onAplicar(rascunho.length > 0 ? rascunho : undefined);
            }}
          >
            {t("Aplicar")}
          </BotaoDaCasca>
        </div>
      </div>
    </div>
  );
}
