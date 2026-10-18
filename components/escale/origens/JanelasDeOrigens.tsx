"use client";
// Fase 1F: a janela grande da Clint (01-013).
import { JanelaDaOrigem } from "@/components/escale/configuracoes/JanelaDaOrigem";
import type { AbaDaOrigem } from "@/lib/escale/configuracoes/abrir";
import type { Origens } from "@/lib/escale/origens/regras";

import { JanelaDaCasca } from "./JanelaDaCasca";
import { FormAdicionarOrigem, FormArquivarOrigem, FormExcluirOrigem } from "./JanelasDaOrigem";
import {
  FormAdicionarGrupo,
  FormArquivarGrupo,
  FormConfigGrupo,
  FormCustomizarGrupo,
  FormExcluirGrupo,
} from "./JanelasDoGrupo";

export type Janela =
  | { tipo: "adicionar-origem"; grupoId: string | null }
  | { tipo: "adicionar-grupo" }
  | {
      tipo:
        | "config-grupo"
        | "customizar"
        | "arquivar-grupo"
        | "excluir-grupo"
        | "config-origem"
        | "arquivar-origem"
        | "excluir-origem";
      id: string;
      aba?: AbaDaOrigem;
    };

export interface PropsDaJanela {
  origens: Origens;
  onFechar: () => void;
  onOrigens: (origens: Origens) => void;
}

/**
 * As janelas do painel Origens (fork Escale, Fase 1B; visual da Clint na casca V3).
 *
 * É uma janela só (`JanelaDaCasca`), com o conteúdo da ação pedida pelo `+` ou
 * por um ⋮. Só gerente+ chega aqui: o painel esconde os botões, e as rotas
 * cobram `requireRole("manager")`.
 */
export function JanelasDeOrigens({
  janela,
  onAbrirOrigem,
  ...comuns
}: PropsDaJanela & { janela: Janela | null; onAbrirOrigem: (id: string) => void }) {
  // `key`: outra origem recomeça do zero, sem herdar o rascunho da anterior.
  if (janela?.tipo === "config-origem") {
    return <JanelaDaOrigem key={janela.id} {...comuns} id={janela.id} abaInicial={janela.aba} />;
  }
  return (
    <JanelaDaCasca aberta={janela !== null} onFechar={comuns.onFechar}>
      {janela?.tipo === "adicionar-origem" && (
        <FormAdicionarOrigem {...comuns} grupoId={janela.grupoId} onAbrirOrigem={onAbrirOrigem} />
      )}
      {janela?.tipo === "adicionar-grupo" && <FormAdicionarGrupo {...comuns} />}
      {janela?.tipo === "config-grupo" && <FormConfigGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "customizar" && <FormCustomizarGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "arquivar-grupo" && <FormArquivarGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "excluir-grupo" && <FormExcluirGrupo {...comuns} id={janela.id} />}
      {janela?.tipo === "arquivar-origem" && <FormArquivarOrigem {...comuns} id={janela.id} />}
      {janela?.tipo === "excluir-origem" && <FormExcluirOrigem {...comuns} id={janela.id} />}
    </JanelaDaCasca>
  );
}
