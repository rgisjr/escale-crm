"use client";
import { useState } from "react";

import { AjudaDaCasca } from "@/components/escale/ui/AjudaDaCasca";
import { InterruptorDaCasca } from "@/components/escale/ui/InterruptorDaCasca";
import type { OrigemDaCriacao } from "@/hooks/escale/useCriacaoDeNegocio";
import { useT } from "@/hooks/i18n/useT";
import {
  CONDICOES_MAX,
  novaRegra,
  type CriacaoEmEdicao,
} from "@/lib/escale/conversas/criacao-de-negocio";
import { Briefcase, Plus } from "@/lib/ui/icons-da-casca";

import { CondicaoDeCriacao } from "./CondicaoDeCriacao";

/** A aba "Criação de negócio" (F1; 16/10-01 a 03, c104–c108). Controlada: o rascunho mora na janela. */
export function AbaCriacaoDeNegocio({
  rascunho,
  aoMudar,
  configurado,
  origens,
  podeEditar,
}: {
  rascunho: CriacaoEmEdicao;
  aoMudar: (c: CriacaoEmEdicao) => void;
  configurado: boolean;
  origens: OrigemDaCriacao[];
  podeEditar: boolean;
}) {
  const t = useT();
  const [aberta, setAberta] = useState<string | null>(null);
  const ligar = (v: boolean) =>
    aoMudar(
      v
        ? { ligado: true, regras: rascunho.regras.length ? rascunho.regras : [novaRegra(1)] }
        : { ...rascunho, ligado: false },
    );
  return (
    <div className="px-6 py-5">
      {!configurado && !rascunho.ligado ? (
        <p className="mb-3 rounded-lg bg-casca-pausa px-3 py-2 text-[12px] text-casca-pausa-texto">
          {t(
            "Hoje os negócios deste dispositivo nascem na origem padrão. Ligue a criação automática para escolher a origem e a etapa.",
          )}
        </p>
      ) : null}
      <div className="rounded-lg border border-casca-borda p-4">
        <div className="flex items-start gap-3">
          <Briefcase size={16} aria-hidden className="mt-0.5 shrink-0 text-casca-suave" />
          <div className="min-w-0 flex-1">
            <span className="flex items-center gap-1.5 text-[13px] font-semibold text-casca-texto">
              {t("Criar um negócio automaticamente")}
              <AjudaDaCasca
                texto={t(
                  "Se o contato já possui um negócio nessa origem, nenhum novo negócio é criado e o negócio existente não é alterado.",
                )}
              />
            </span>
            <p className="mt-0.5 text-[13px] text-casca-suave">
              {t(
                "Crie um negócio automaticamente em uma origem ao receber a primeira mensagem neste dispositivo.",
              )}
            </p>
          </div>
          <InterruptorDaCasca
            ligado={rascunho.ligado}
            aoMudar={ligar}
            desabilitado={!podeEditar}
            aria-label={t("Criar um negócio automaticamente")}
          />
        </div>
        {rascunho.ligado ? (
          <div className="mt-4 flex flex-col gap-2">
            {rascunho.regras.map((r, i) => (
              <CondicaoDeCriacao
                key={r.id}
                regra={r}
                numero={i + 1}
                aberta={aberta === r.id}
                aoAlternar={() => setAberta((a) => (a === r.id ? null : r.id))}
                aoMudar={(nova) =>
                  aoMudar({
                    ...rascunho,
                    regras: rascunho.regras.map((x) => (x.id === r.id ? nova : x)),
                  })
                }
                aoExcluir={
                  i > 0
                    ? () =>
                        aoMudar({
                          ...rascunho,
                          regras: rascunho.regras.filter((x) => x.id !== r.id),
                        })
                    : undefined
                }
                origens={origens}
                podeEditar={podeEditar}
              />
            ))}
            {podeEditar && rascunho.regras.length < CONDICOES_MAX ? (
              <button
                type="button"
                onClick={() =>
                  aoMudar({
                    ...rascunho,
                    regras: [...rascunho.regras, novaRegra(rascunho.regras.length + 1)],
                  })
                }
                className="mt-2 flex items-center gap-1.5 self-start text-[13px] font-medium text-casca-marca"
              >
                <Plus size={14} aria-hidden />
                {t("Adicionar nova condição")}
              </button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}
