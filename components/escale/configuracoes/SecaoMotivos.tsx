"use client";
import { BalaoDoNome } from "@/components/escale/ui/BalaoDoNome";
import { SeletorDeChipsDaCasca } from "@/components/escale/ui/SeletorDeChipsDaCasca";
import { useT } from "@/hooks/i18n/useT";
import { CirclePlus, CircleSlash } from "@/lib/ui/icons-da-casca";

import { CabecaDaSecao } from "./CabecaDaSecao";
import type { PropsDaSecao } from "./JanelaDaOrigem";

/**
 * MOTIVO DE PERDA (Fase 1F, D5; Clint variante superior, P07 a P09): o
 * catálogo da organização num seletor com chips. Os chips são os que valem
 * nesta origem; o ⊕ cria um motivo novo pelo balão "Nome".
 */
export function SecaoMotivos({ config, rascunho, mudar }: PropsDaSecao) {
  const t = useT();
  const pode = config.podeAdministrar;
  const { selecionados, novos } = rascunho.motivos;
  const todos = [...config.motivos.map((m) => m.rotulo), ...novos];

  function acrescentar(bruto: string): string | null {
    const rotulo = bruto.trim();
    if (!rotulo) return t("Esse motivo de perda está vazio.");
    if (todos.some((x) => x.toLowerCase() === rotulo.toLowerCase()))
      return t("Esse motivo de perda já existe.");
    mudar((r) => ({
      ...r,
      motivos: {
        selecionados: [...r.motivos.selecionados, rotulo],
        novos: [...r.motivos.novos, rotulo],
      },
    }));
    return null;
  }

  return (
    <div className="grid gap-2">
      <CabecaDaSecao
        icone={CircleSlash}
        descricao={t("Configure aqui os motivos de perda desta origem.")}
      />
      {!pode ? (
        <p className="text-[12px] text-casca-suave">
          {t("Só administrador muda os motivos de perda. Você vê a lista como ela está.")}
        </p>
      ) : null}
      <p className="text-[11px] text-casca-texto">
        {selecionados.length} {t("Motivos de perda selecionados")}
      </p>
      <div className="flex items-start gap-12">
        <div className="max-w-[695px] min-w-0 flex-1">
          <SeletorDeChipsDaCasca
            aria-label={t("Motivos de perda da origem")}
            valores={selecionados}
            opcoes={todos}
            desabilitado={!pode}
            aoMudar={(valores) =>
              mudar((r) => ({ ...r, motivos: { ...r.motivos, selecionados: valores } }))
            }
          />
        </div>
        {pode ? (
          <BalaoDoNome
            aria-label={t("Novo motivo de perda")}
            placeholder={t("Adicione um motivo de perda")}
            align="end"
            aoSalvar={acrescentar}
            gatilho={
              <button
                type="button"
                aria-label={t("Adicionar Motivo de Perda")}
                className="mt-1 text-casca-texto hover:text-casca-marca"
              >
                <CirclePlus size={16} strokeWidth={1.5} aria-hidden />
              </button>
            }
          />
        ) : null}
      </div>
    </div>
  );
}
