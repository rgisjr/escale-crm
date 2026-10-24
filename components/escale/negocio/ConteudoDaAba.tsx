"use client";
import type { FichaCarregada } from "@/hooks/escale/useFichaDoNegocio";
import type { AbaDoNegocio } from "@/lib/escale/negocio/regras";

import { FotoDaFicha } from "./FotoDaFicha";
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
      return <AbaEmpresa contatoId={ficha.lead.contact_id} />;
    case "negocio":
      return <AbaNegocio lead={ficha.lead} pipeline={ficha.pipeline} />;
    case "conversas":
      return <AbaConversas contatoId={ficha.lead.contact_id} foto={<FotoDaFicha lead={ficha.lead} tamanho="conversa" />} />;
    case "arquivos":
      return <AbaArquivos contatoId={ficha.lead.contact_id} leadId={ficha.lead.id} />;
    case "historico":
      return (
        <AbaHistorico
          alvo={{ tipo: "negocio", id: ficha.lead.id }}
          nomesDasEtapas={Object.fromEntries(ficha.stages.map((s) => [s.id, s.name]))}
        />
      );
  }
}
