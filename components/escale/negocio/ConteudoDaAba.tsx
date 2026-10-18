"use client";
import type { FichaCarregada } from "@/hooks/escale/useFichaDoNegocio";
import type { AbaDoNegocio } from "@/lib/escale/negocio/regras";

import { AbaArquivos } from "./abas/AbaArquivos";
import { AbaAtividades } from "./abas/AbaAtividades";
import { AbaConversas } from "./abas/AbaConversas";
import { AbaHistorico } from "./abas/AbaHistorico";
import { AbaContato, AbaEmpresa, AbaNegocio } from "./abas/AbasDeCampos";

/** FORK ESCALE · Fase 1G (C2): o conteúdo de cada aba da ficha. */
export function ConteudoDaAba({ aba, ficha }: { aba: AbaDoNegocio; ficha: FichaCarregada }) {
  switch (aba) {
    case "atividades":
      return <AbaAtividades lead={ficha.lead} stages={ficha.stages} pipeline={ficha.pipeline} />;
    case "contato":
      return <AbaContato lead={ficha.lead} pipeline={ficha.pipeline} />;
    case "empresa":
      return <AbaEmpresa />;
    case "negocio":
      return <AbaNegocio lead={ficha.lead} pipeline={ficha.pipeline} />;
    case "conversas":
      return <AbaConversas lead={ficha.lead} />;
    case "arquivos":
      return <AbaArquivos lead={ficha.lead} />;
    case "historico":
      return <AbaHistorico lead={ficha.lead} stages={ficha.stages} />;
  }
}
