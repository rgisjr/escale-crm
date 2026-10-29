"use client";
import { useState } from "react";
import { toast } from "sonner";

import { SeletorComChipsDaMarca } from "@/components/escale/indicadores/lista/SeletorComChipsDaMarca";
import { showApiError } from "@/components/feedback/ApiErrorToast";
import { useAcoesDosModelos } from "@/hooks/escale/useModelosDeIndicadores";
import { useOpcoesDaDimensao } from "@/hooks/escale/useOpcoesDaDimensao";
import { useT } from "@/hooks/i18n/useT";
import { ApiError } from "@/lib/api/types";
import { filtrosDoModeloSchema, type FiltrosDoModelo } from "@/lib/escale/indicadores/modelos/regras";
import type { ModeloNaLista } from "@/lib/escale/indicadores/modelos/tipos";

import { EscolhaDeTagsDoModelo } from "./EscolhaDeTagsDoModelo";

type Linha = { chave: "gruposDeOrigem" | "origens" | "usuarios"; rotulo: string; dimensao: string };
const LINHAS: readonly Linha[] = [
  { chave: "gruposDeOrigem", rotulo: "Grupo de origem:", dimensao: "negocio.grupo_de_origem" },
  { chave: "origens", rotulo: "Origem:", dimensao: "negocio.origem" },
  { chave: "usuarios", rotulo: "Usuário:", dimensao: "negocio.dono" },
];

function SeletorDaLinha({ linha, valores, aoMudar }: { linha: Linha; valores: readonly string[]; aoMudar: (v: string[]) => void }) {
  const t = useT();
  const opcoes = useOpcoesDaDimensao(linha.dimensao, true).data ?? [];
  return (
    <SeletorComChipsDaMarca
      aria-label={t(linha.rotulo)}
      valores={valores}
      opcoes={opcoes.map((o) => ({ valor: o.valor, rotulo: o.rotulo }))}
      aoMudar={aoMudar}
      placeholder={t("Selecione...")}
    />
  );
}

/**
 * "CONFIGURE FILTROS" (10-020): Grupo de origem, Origem, Usuário e Tags. O botão "Criar dashboard" fica no rodapé
 * do modal, então o passo expõe o estado por `aoCriar`/`ocupado` via o componente-pai (ver `RodapeDoPasso`).
 */
export function PassoConfigureFiltros({ filtros, aoMudar }: { filtros: FiltrosDoModelo; aoMudar: (f: FiltrosDoModelo) => void }) {
  const t = useT();
  return (
    <div>
      <p className="text-[15px] font-medium text-casca-texto">{t("Configure filtros")}</p>
      <p className="mt-5 text-[13px] leading-relaxed text-casca-texto-2">
        {t(
          "Defina quais filtros serão aplicados aos gráficos no seu dashboard de acordo com os dados a serem exibidos. Por exemplo, se os dados apresentados são as métricas do seu time de vendas, selecione os usuários que atuam em vendas.",
        )}
      </p>
      <div className="mt-5 flex flex-col gap-4">
        {LINHAS.map((linha) => (
          <div key={linha.chave} className="flex items-center gap-2">
            <span className="shrink-0 text-[13px] font-semibold whitespace-nowrap text-casca-texto">{t(linha.rotulo)}</span>
            <div className="min-w-0 flex-1">
              <SeletorDaLinha linha={linha} valores={filtros[linha.chave]} aoMudar={(v) => aoMudar({ ...filtros, [linha.chave]: v })} />
            </div>
          </div>
        ))}
        <div className="flex items-center gap-2">
          <span className="shrink-0 text-[13px] font-medium text-casca-texto">{t("Tags")}</span>
          <EscolhaDeTagsDoModelo tags={filtros.tags} aoMudar={(tags) => aoMudar({ ...filtros, tags })} />
        </div>
      </div>
    </div>
  );
}

export const FILTROS_VAZIOS: FiltrosDoModelo = filtrosDoModeloSchema.parse({});

/** O que o rodapé do modal faz com o botão "Criar dashboard" (6.4, item 6). */
export function useCriarDashboardDoModelo(aoCriar: (id: string) => void) {
  const t = useT();
  const { usar } = useAcoesDosModelos();
  function criar(modelo: ModeloNaLista, filtros: FiltrosDoModelo) {
    usar.mutate(
      { modelo: { origem: modelo.origem, id: modelo.id }, filtros },
      {
        onSuccess: ({ id }) => aoCriar(id),
        onError: (err) => {
          if (err instanceof ApiError && err.status === 409) showApiError(err);
          else toast.error(t("Falha ao criar dashboard a partir do template."));
        },
      },
    );
  }
  return { criar, ocupado: usar.isPending };
}
