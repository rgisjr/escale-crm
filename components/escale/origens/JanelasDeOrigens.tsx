"use client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import type { Origens } from "@/lib/escale/origens/regras";

import {
  FormAdicionarOrigem,
  FormArquivarOrigem,
  FormConfigOrigem,
  FormExcluirOrigem,
} from "./JanelasDaOrigem";
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
    };

export interface PropsDaJanela {
  origens: Origens;
  onFechar: () => void;
  onOrigens: (origens: Origens) => void;
}

/**
 * As janelas do painel Origens (fork Escale, Fase 1B): um Dialog só, com o
 * conteúdo da ação pedida pelo `+` ou por um ⋮. Só gerente+ chega aqui — o
 * painel esconde os botões, e as rotas cobram `requireRole("manager")`.
 */
export function JanelasDeOrigens({
  janela,
  onAbrirOrigem,
  ...comuns
}: PropsDaJanela & { janela: Janela | null; onAbrirOrigem: (id: string) => void }) {
  return (
    <Dialog
      open={janela !== null}
      onOpenChange={(aberto) => {
        if (!aberto) comuns.onFechar();
      }}
    >
      <DialogContent className="max-h-[85dvh] max-w-md overflow-y-auto">
        {janela?.tipo === "adicionar-origem" && (
          <FormAdicionarOrigem {...comuns} grupoId={janela.grupoId} onAbrirOrigem={onAbrirOrigem} />
        )}
        {janela?.tipo === "adicionar-grupo" && <FormAdicionarGrupo {...comuns} />}
        {janela?.tipo === "config-grupo" && <FormConfigGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "customizar" && <FormCustomizarGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "arquivar-grupo" && <FormArquivarGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "excluir-grupo" && <FormExcluirGrupo {...comuns} id={janela.id} />}
        {janela?.tipo === "config-origem" && <FormConfigOrigem {...comuns} id={janela.id} />}
        {janela?.tipo === "arquivar-origem" && <FormArquivarOrigem {...comuns} id={janela.id} />}
        {janela?.tipo === "excluir-origem" && <FormExcluirOrigem {...comuns} id={janela.id} />}
      </DialogContent>
    </Dialog>
  );
}
